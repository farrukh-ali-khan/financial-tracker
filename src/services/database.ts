import Database from "@tauri-apps/plugin-sql";
import { logger } from "./logger";
import type {
  User,
  Category,
  Transaction,
  NewTransaction,
  Goal,
  NewGoal,
  CategoryTotal,
  MonthlyTotal,
  TransactionType,
} from "@/types";

const DB_PATH = "sqlite:financial_tracker.db";
const CTX = "database";

let _db: Database | null = null;
// Promise-based lock — any concurrent getDB() call awaits this instead of
// opening a second connection. Eliminates the React StrictMode 4x init bug.
let _initPromise: Promise<Database> | null = null;

function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (window as any).__TAURI_INTERNALS__ !== "undefined"
  );
}

// ─── Connection ──────────────────────────────────────────────────────────────

export async function getDB(): Promise<Database> {
  if (!isTauri()) {
    throw new Error(
      "Database is only available inside the Tauri desktop app. " +
      "Run `cargo tauri dev` — do not open http://localhost:1420 directly in a browser."
    );
  }

  // If already initialised, return immediately
  if (_db) return _db;

  // If another call is already initialising, wait for it — don't open a 2nd connection
  if (_initPromise) return _initPromise;

  // First caller: create the promise and store it so concurrent callers share it
  _initPromise = (async () => {
    logger.info(CTX, "Opening database connection", { path: DB_PATH });
    _db = await Database.load(DB_PATH);
    await initSchema();
    logger.info(CTX, "Database ready");
    return _db;
  })();

  return _initPromise;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

async function initSchema(): Promise<void> {
  logger.info(CTX, "Initializing database schema");
  const db = _db!;

  await db.execute(`PRAGMA journal_mode=WAL;`);
  await db.execute(`PRAGMA foreign_keys=ON;`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      email        TEXT    UNIQUE NOT NULL,
      password_hash TEXT   NOT NULL,
      name         TEXT    NOT NULL DEFAULT '',
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name          TEXT    NOT NULL,
      type          TEXT    NOT NULL CHECK(type IN ('income','expense')),
      color         TEXT    NOT NULL DEFAULT '#3B82F6',
      icon          TEXT    NOT NULL DEFAULT '💰',
      is_predefined INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(name, type, is_predefined) ON CONFLICT IGNORE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      type        TEXT    NOT NULL CHECK(type IN ('income','expense')),
      amount      REAL    NOT NULL CHECK(amount > 0),
      name        TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      date        TEXT    NOT NULL,
      time        TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS goals (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name           TEXT    NOT NULL,
      target_amount  REAL    NOT NULL CHECK(target_amount > 0),
      current_amount REAL    NOT NULL DEFAULT 0,
      deadline       TEXT    NOT NULL,
      monthly_target REAL    NOT NULL DEFAULT 0,
      is_active      INTEGER NOT NULL DEFAULT 1,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Indexes for fast query filtering
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_tx_type     ON transactions(type);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_cat_user    ON categories(user_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_goal_user   ON goals(user_id);`);

  await seedPredefinedCategories(db);

  // One-time cleanup: remove duplicate predefined categories — keep lowest id per (name, type)
  await db.execute(`
    DELETE FROM categories
    WHERE is_predefined=1
      AND id NOT IN (
        SELECT MIN(id) FROM categories
        WHERE is_predefined=1
        GROUP BY name, type
      )
  `);

  // One-time cleanup: remove duplicate goals — keep lowest id per (user_id, name)
  await db.execute(`
    DELETE FROM goals WHERE id NOT IN (
      SELECT MIN(id) FROM goals GROUP BY user_id, name
    )
  `);
}

async function seedPredefinedCategories(db: Database): Promise<void> {
  const existing = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM categories WHERE is_predefined=1`
  );
  if (existing[0].count > 0) return;

  logger.info(CTX, "Seeding predefined categories");

  const income: [string, string, string][] = [
    ["Salary",     "#22c55e", "💼"],
    ["Freelance",  "#10b981", "💻"],
    ["Business",   "#059669", "🏢"],
    ["Investment", "#0d9488", "📈"],
    ["Gift",       "#14b8a6", "🎁"],
    ["Other",      "#6b7280", "💰"],
  ];

  const expense: [string, string, string][] = [
    ["Food & Dining", "#ef4444", "🍔"],
    ["Transport",     "#f97316", "🚗"],
    ["Shopping",      "#f59e0b", "🛍️"],
    ["Health",        "#ec4899", "💊"],
    ["Housing",       "#8b5cf6", "🏠"],
    ["Education",     "#3b82f6", "📚"],
    ["Entertainment", "#6366f1", "🎬"],
    ["Utilities",     "#0ea5e9", "💡"],
    ["Travel",        "#14b8a6", "✈️"],
    ["Savings",       "#22c55e", "🐷"],   // ← goal savings transactions
    ["Other",         "#6b7280", "💸"],
  ];

  for (const [name, color, icon] of income) {
    await db.execute(
      `INSERT OR IGNORE INTO categories (name,type,color,icon,is_predefined) VALUES (?,?,?,?,1)`,
      [name, "income", color, icon]
    );
  }
  for (const [name, color, icon] of expense) {
    await db.execute(
      `INSERT OR IGNORE INTO categories (name,type,color,icon,is_predefined) VALUES (?,?,?,?,1)`,
      [name, "expense", color, icon]
    );
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function dbCreateUser(
  email: string,
  passwordHash: string,
  name: string
): Promise<User> {
  logger.info(CTX, "Creating user", { email });
  const db = await getDB();
  const result = await db.execute(
    `INSERT INTO users (email,password_hash,name) VALUES (?,?,?)`,
    [email, passwordHash, name]
  );
  const users = await db.select<User[]>(
    `SELECT id,email,name,created_at FROM users WHERE id=?`,
    [result.lastInsertId]
  );
  return users[0];
}

export async function dbGetUserByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
  const db = await getDB();
  const rows = await db.select<(User & { password_hash: string })[]>(
    `SELECT id,email,name,created_at,password_hash FROM users WHERE email=?`,
    [email]
  );
  return rows[0] ?? null;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function dbGetCategories(
  userId: number | null,
  type?: TransactionType
): Promise<Category[]> {
  const db = await getDB();
  const typeClause = type ? `AND type=?` : "";
  const args: unknown[] = type ? [type] : [];

  if (userId) {
    return db.select<Category[]>(
      `SELECT * FROM categories
       WHERE id IN (
         SELECT MIN(id) FROM categories
         WHERE (user_id=? OR is_predefined=1) ${typeClause}
         GROUP BY name, type
       )
       ORDER BY is_predefined DESC, name ASC`,
      [userId, ...args]
    );
  }
  // Guest: only predefined, deduplicated
  return db.select<Category[]>(
    `SELECT * FROM categories
     WHERE id IN (
       SELECT MIN(id) FROM categories
       WHERE is_predefined=1 ${typeClause}
       GROUP BY name, type
     )
     ORDER BY name ASC`,
    args
  );
}

export async function dbAddCategory(
  userId: number | null,
  name: string,
  type: TransactionType,
  color: string,
  icon: string
): Promise<Category> {
  logger.info(CTX, "Adding custom category", { name, type });
  const db = await getDB();
  const result = await db.execute(
    `INSERT INTO categories (user_id,name,type,color,icon,is_predefined) VALUES (?,?,?,?,?,0)`,
    [userId, name, type, color, icon]
  );
  const rows = await db.select<Category[]>(
    `SELECT * FROM categories WHERE id=?`,
    [result.lastInsertId]
  );
  return rows[0];
}

export async function dbDeleteCategory(id: number): Promise<void> {
  logger.warn(CTX, "Deleting category", { id });
  const db = await getDB();
  await db.execute(`DELETE FROM categories WHERE id=? AND is_predefined=0`, [id]);
}

// ─── Transactions ─────────────────────────────────────────────────────────────

const TX_SELECT = `
  SELECT
    t.*,
    c.name  AS category_name,
    c.color AS category_color,
    c.icon  AS category_icon
  FROM transactions t
  JOIN categories c ON t.category_id=c.id
`;

export async function dbGetTransactions(
  userId: number | null,
  startDate?: string,
  endDate?: string,
  type?: TransactionType
): Promise<Transaction[]> {
  const db = await getDB();
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (userId !== null) {
    conditions.push("t.user_id=?");
    args.push(userId);
  } else {
    conditions.push("t.user_id IS NULL");
  }

  if (startDate) { conditions.push("t.date>=?"); args.push(startDate); }
  if (endDate)   { conditions.push("t.date<=?"); args.push(endDate); }
  if (type)      { conditions.push("t.type=?");  args.push(type); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return db.select<Transaction[]>(
    `${TX_SELECT} ${where} ORDER BY t.date DESC, t.time DESC`,
    args
  );
}

export async function dbAddTransaction(
  userId: number | null,
  tx: NewTransaction
): Promise<Transaction> {
  logger.info(CTX, "Adding transaction", { name: tx.name, amount: tx.amount, type: tx.type });
  const db = await getDB();
  const result = await db.execute(
    `INSERT INTO transactions (user_id,category_id,type,amount,name,description,date,time)
     VALUES (?,?,?,?,?,?,?,?)`,
    [userId, tx.category_id, tx.type, tx.amount, tx.name, tx.description, tx.date, tx.time]
  );
  const rows = await db.select<Transaction[]>(
    `${TX_SELECT} WHERE t.id=?`,
    [result.lastInsertId]
  );
  return rows[0];
}

export async function dbUpdateTransaction(
  id: number,
  fields: Partial<NewTransaction>
): Promise<Transaction> {
  logger.info(CTX, "Updating transaction", { id, fields });
  const db = await getDB();
  const sets: string[] = [];
  const args: unknown[] = [];

  if (fields.category_id !== undefined) { sets.push("category_id=?"); args.push(fields.category_id); }
  if (fields.type        !== undefined) { sets.push("type=?");        args.push(fields.type); }
  if (fields.amount      !== undefined) { sets.push("amount=?");      args.push(fields.amount); }
  if (fields.name        !== undefined) { sets.push("name=?");        args.push(fields.name); }
  if (fields.description !== undefined) { sets.push("description=?"); args.push(fields.description); }
  if (fields.date        !== undefined) { sets.push("date=?");        args.push(fields.date); }
  if (fields.time        !== undefined) { sets.push("time=?");        args.push(fields.time); }

  sets.push("updated_at=datetime('now')");
  args.push(id);

  await db.execute(
    `UPDATE transactions SET ${sets.join(",")} WHERE id=?`,
    args
  );
  const rows = await db.select<Transaction[]>(`${TX_SELECT} WHERE t.id=?`, [id]);
  return rows[0];
}

export async function dbDeleteTransaction(id: number): Promise<void> {
  logger.warn(CTX, "Deleting transaction", { id });
  const db = await getDB();
  await db.execute(`DELETE FROM transactions WHERE id=?`, [id]);
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function dbGetCategoryTotals(
  userId: number | null,
  startDate: string,
  endDate: string
): Promise<CategoryTotal[]> {
  const db = await getDB();
  const userClause = userId !== null ? `t.user_id=?` : `t.user_id IS NULL`;
  const args: unknown[] = userId !== null ? [userId, startDate, endDate] : [startDate, endDate];

  const rows = await db.select<Omit<CategoryTotal, "percentage">[]>(
    `SELECT
       c.id    AS category_id,
       c.name  AS category_name,
       c.color AS category_color,
       c.icon  AS category_icon,
       t.type,
       SUM(t.amount) AS total,
       COUNT(*)      AS count
     FROM transactions t
     JOIN categories c ON t.category_id=c.id
     WHERE ${userClause} AND t.date>=? AND t.date<=?
     GROUP BY c.id, t.type
     ORDER BY total DESC`,
    args
  );

  // Compute percentages per type
  const incomeTotal = rows.filter(r => r.type === "income").reduce((s, r) => s + r.total, 0);
  const expenseTotal = rows.filter(r => r.type === "expense").reduce((s, r) => s + r.total, 0);

  return rows.map(r => ({
    ...r,
    percentage: r.type === "income"
      ? incomeTotal  > 0 ? (r.total / incomeTotal)  * 100 : 0
      : expenseTotal > 0 ? (r.total / expenseTotal) * 100 : 0,
  }));
}

export async function dbGetMonthlyTotals(
  userId: number | null,
  months = 12
): Promise<MonthlyTotal[]> {
  const db = await getDB();
  const userClause = userId !== null ? `user_id=?` : `user_id IS NULL`;
  const args: unknown[] = userId !== null
    ? [userId, userId]
    : [];

  return db.select<MonthlyTotal[]>(
    `SELECT
       strftime('%Y-%m', date) AS month,
       SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
       SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense,
       SUM(CASE WHEN type='income'  THEN amount ELSE -amount END) AS net
     FROM transactions
     WHERE ${userClause}
     GROUP BY month
     ORDER BY month DESC
     LIMIT ?`,
    [...args, months]
  );
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export async function dbGetGoals(userId: number | null): Promise<Goal[]> {
  const db = await getDB();
  const userClause = userId !== null ? `user_id=?` : `user_id IS NULL`;
  const args: unknown[] = userId !== null ? [userId] : [];

  // Total net savings = income − expenses for this user
  const netRows = await db.select<{ net: number }[]>(
    `SELECT COALESCE(
       SUM(CASE WHEN type='income' THEN amount ELSE -amount END),
       0
     ) AS net
     FROM transactions WHERE ${userClause}`,
    args
  );
  const totalNet = Math.max(0, netRows[0]?.net ?? 0);

  const rows = await db.select<Omit<Goal, "progress_percent" | "days_left" | "is_on_track">[]>(
    `SELECT * FROM goals WHERE ${userClause} AND is_active=1 ORDER BY deadline ASC`,
    args
  );

  if (rows.length === 0) return [];

  // Divide net savings EQUALLY among all active goals
  const equalShare = totalNet / rows.length;

  const now = new Date();
  return rows.map(g => {
    const current_amount = Math.min(equalShare, g.target_amount);
    const progress = g.target_amount > 0
      ? Math.min((current_amount / g.target_amount) * 100, 100)
      : 0;
    const deadline   = new Date(g.deadline);
    const daysLeft   = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000));
    const monthsLeft = daysLeft / 30.44;
    const needed     = Math.max(0, g.target_amount - current_amount);
    const isOnTrack  = monthsLeft > 0
      ? needed / monthsLeft <= g.monthly_target * 1.05
      : current_amount >= g.target_amount;

    return { ...g, current_amount, progress_percent: progress, days_left: daysLeft, is_on_track: isOnTrack };
  });
}

export async function dbAddGoal(userId: number | null, goal: NewGoal): Promise<void> {
  logger.info(CTX, "Adding goal", { name: goal.name });
  const db = await getDB();
  await db.execute(
    `INSERT INTO goals (user_id, name, target_amount, current_amount, deadline, monthly_target)
     VALUES (?, ?, ?, 0, ?, ?)`,
    [userId, goal.name, goal.target_amount, goal.deadline, goal.monthly_target]
  );
  logger.info(CTX, "Goal added successfully", { name: goal.name });
}

export async function dbUpdateGoal(
  id: number,
  fields: Partial<NewGoal>
): Promise<void> {
  logger.info(CTX, "Updating goal", { id });
  const db = await getDB();
  const sets: string[] = [];
  const args: unknown[] = [];

  if (fields.name           !== undefined) { sets.push("name=?");           args.push(fields.name); }
  if (fields.target_amount  !== undefined) { sets.push("target_amount=?");  args.push(fields.target_amount); }
  if (fields.deadline       !== undefined) { sets.push("deadline=?");       args.push(fields.deadline); }
  if (fields.monthly_target !== undefined) { sets.push("monthly_target=?"); args.push(fields.monthly_target); }

  if (sets.length === 0) throw new Error("No fields to update");

  args.push(id);
  await db.execute(`UPDATE goals SET ${sets.join(",")} WHERE id=?`, args);
  logger.info(CTX, "Goal updated", { id });
}

export async function dbDeleteGoal(id: number): Promise<void> {
  logger.warn(CTX, "Deleting goal", { id });
  const db = await getDB();
  await db.execute(`UPDATE goals SET is_active=0 WHERE id=?`, [id]);
}

export async function dbAddSavingsToGoal(id: number, amount: number): Promise<void> {
  logger.info(CTX, "Adding savings to goal", { id, amount });
  const db = await getDB();
  await db.execute(
    `UPDATE goals
     SET current_amount = MIN(target_amount, current_amount + ?)
     WHERE id=?`,
    [amount, id]
  );
}

/** Returns the predefined "Savings" expense category id */
export async function dbGetSavingsCategoryId(): Promise<number> {
  const db = await getDB();
  const rows = await db.select<{ id: number }[]>(
    `SELECT id FROM categories WHERE name='Savings' AND type='expense' AND is_predefined=1 LIMIT 1`
  );
  if (rows.length === 0) throw new Error("Savings category not found in database.");
  return rows[0].id;
}
