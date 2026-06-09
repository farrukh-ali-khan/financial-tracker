import { useEffect, useState } from "react";
import { User, Lock, Tags, Download, Trash2, Eye, EyeOff, Plus, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";
import { dbGetUserByEmail, dbGetTransactions, dbGetGoals, getDB } from "@/services/database";
import { logger } from "@/services/logger";
import type { TransactionType } from "@/types";

const CTX = "SettingsPage";

const ICON_OPTIONS = ["💰","💼","💻","🍔","🚗","🛍️","💊","🏠","📚","🎬","💡","✈️","🎁","📈","💸","🐷"];
const COLOR_OPTIONS = [
  "#22c55e","#10b981","#3b82f6","#8b5cf6","#ec4899",
  "#ef4444","#f97316","#f59e0b","#0ea5e9","#6b7280",
];

// ─── Password helpers (Web Crypto PBKDF2) ────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const enc  = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key  = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 }, key, 256
  );
  const hex = (b: ArrayBuffer) =>
    Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("");
  return `${hex(salt.buffer)}$${hex(bits)}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = stored.split("$");
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
    const enc  = new TextEncoder();
    const key  = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 }, key, 256
    );
    const candidate = Array.from(new Uint8Array(bits))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    return candidate === hashHex;
  } catch { return false; }
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: string[][]): void {
  const csv  = rows.map(r =>
    r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function exportToExcel(
  transactions: Awaited<ReturnType<typeof dbGetTransactions>>,
  goals: Awaited<ReturnType<typeof dbGetGoals>>
): Promise<void> {
  const XLSX = await import("xlsx");
  const txRows = transactions.map(t => ({
    Date: t.date, Time: t.time, Type: t.type,
    Category: t.category_name, Name: t.name, Description: t.description,
    "Amount (PKR)": t.amount,
  }));
  const goalRows = goals.map(g => ({
    Name: g.name,
    "Target (PKR)": g.target_amount,
    "Saved (PKR)": g.current_amount,
    "Progress %": +g.progress_percent.toFixed(1),
    "Monthly Target (PKR)": g.monthly_target,
    Deadline: g.deadline,
    Status: g.progress_percent >= 100 ? "Completed" : g.is_on_track ? "On Track" : "Behind Target",
  }));
  const wb   = XLSX.utils.book_new();
  const wsTx = XLSX.utils.json_to_sheet(txRows);
  const wsGl = XLSX.utils.json_to_sheet(goalRows);
  wsTx["!cols"] = [12,8,10,16,24,28,14].map(w => ({ wch: w }));
  wsGl["!cols"] = [20,14,14,12,20,12,14].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsTx, "Transactions");
  XLSX.utils.book_append_sheet(wb, wsGl, "Savings Goals");
  XLSX.writeFile(wb, `financial-tracker-${new Date().toISOString().slice(0,10)}.xlsx`);
}

async function exportToPDF(
  transactions: Awaited<ReturnType<typeof dbGetTransactions>>,
  goals: Awaited<ReturnType<typeof dbGetGoals>>
): Promise<void> {
  const { default: jsPDF }     = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc  = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const date = new Date().toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" });

  // ── Page 1: Transactions ──
  doc.setFillColor(14, 139, 232);
  doc.rect(0, 0, 297, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("Financial Tracker — Full Report", 10, 12);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${date}`, 240, 12);

  const totalIncome  = transactions.filter(t => t.type === "income") .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net          = totalIncome - totalExpense;

  doc.setTextColor(30, 41, 59); doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(`Total Income: Rs. ${totalIncome.toLocaleString("en-PK")}`,   10,  26);
  doc.text(`Total Expense: Rs. ${totalExpense.toLocaleString("en-PK")}`, 80,  26);
  doc.text(`Net Savings: Rs. ${net.toLocaleString("en-PK")}`,           160, 26);
  doc.text(`Transactions: ${transactions.length}`,                       240, 26);

  doc.setFontSize(11); doc.text("Transactions", 10, 34);

  autoTable(doc, {
    startY: 37,
    head: [["Date","Type","Category","Name","Description","Amount (PKR)"]],
    body: transactions.slice(0, 500).map(t => [
      t.date, t.type, t.category_name, t.name,
      t.description || "—",
      t.amount.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
    ]),
    theme: "striped",
    headStyles: { fillColor: [14,139,232], textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [30,41,59] },
    alternateRowStyles: { fillColor: [248,250,252] },
    columnStyles: { 5: { halign: "right" } },
    margin: { left: 10, right: 10 },
  });

  // ── Page 2: Goals ──
  doc.addPage();
  doc.setFillColor(14, 139, 232);
  doc.rect(0, 0, 297, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("Savings Goals", 10, 12);

  autoTable(doc, {
    startY: 25,
    head: [["Goal Name","Target (PKR)","Saved (PKR)","Progress","Monthly Target","Deadline","Status"]],
    body: goals.map(g => [
      g.name,
      g.target_amount.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
      g.current_amount.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
      `${g.progress_percent.toFixed(1)}%`,
      g.monthly_target > 0
        ? g.monthly_target.toLocaleString("en-PK", { minimumFractionDigits: 2 })
        : "—",
      g.deadline,
      g.progress_percent >= 100 ? "Completed ✓" : g.is_on_track ? "On Track" : "Behind",
    ]),
    theme: "striped",
    headStyles: { fillColor: [14,139,232], textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [30,41,59] },
    alternateRowStyles: { fillColor: [248,250,252] },
    columnStyles: { 1:{halign:"right"}, 2:{halign:"right"}, 3:{halign:"center"}, 4:{halign:"right"} },
    margin: { left: 10, right: 10 },
  });

  // Page numbers
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount}`, 280, 205, { align: "right" });
  }

  doc.save(`financial-tracker-report-${new Date().toISOString().slice(0,10)}.pdf`);
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user, isGuest } = useAuthStore();
  const userId = isGuest ? null : (user?.id ?? null);

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your profile, categories and data</p>
      </div>

      {isGuest && (
        <div className="card p-4 border-l-4 border-l-amber-500 flex items-start gap-3">
          <span className="text-xl shrink-0">👤</span>
          <div>
            <p className="text-sm font-medium text-slate-200">You are in Guest Mode</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Profile and password settings require a registered account.
              Category management and data export are still available below.
            </p>
          </div>
        </div>
      )}

      {!isGuest && (
        <ProfileSection
          userId={userId!}
          userEmail={user?.email ?? ""}
          userName={user?.name ?? ""}
        />
      )}
      {!isGuest && <PasswordSection userEmail={user?.email ?? ""} />}
      <CategorySection userId={userId} />
      <ExportSection   userId={userId} />
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────

function ProfileSection({ userId, userEmail, userName }: {
  userId: number; userEmail: string; userName: string;
}) {
  const { refreshUser }   = useAuthStore();
  const [name, setName]   = useState(userName);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) { toast.error("Name cannot be empty."); return; }
    setSaving(true);
    try {
      const db = await getDB();
      await db.execute(
        `UPDATE users SET name=?, updated_at=datetime('now') WHERE id=?`,
        [name.trim(), userId]
      );
      await refreshUser();
      toast.success("Name updated!");
      logger.info(CTX, "Profile name updated", { userId });
    } catch (err) {
      logger.error(CTX, "Failed to update name", err);
      toast.error("Failed to update name.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center">
          <User size={16} className="text-brand-400" />
        </div>
        <h2 className="text-sm font-semibold text-slate-200">Profile</h2>
      </div>
      <div className="space-y-3">
        <div>
          <label className="label">Full Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="input" placeholder="Your name" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" value={userEmail} disabled
            className="input opacity-50 cursor-not-allowed" />
          <p className="text-xs text-slate-600 mt-1">Email cannot be changed.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2 px-4">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Password ─────────────────────────────────────────────────────────────────

function PasswordSection({ userEmail }: { userEmail: string }) {
  const [current, setCurrent]         = useState("");
  const [next,    setNext]            = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext,    setShowNext]    = useState(false);
  const [saving, setSaving]           = useState(false);

  async function handleChange() {
    if (!current || !next || !confirm) { toast.error("Fill all fields.");            return; }
    if (next.length < 6)               { toast.error("Min. 6 characters.");          return; }
    if (next !== confirm)              { toast.error("Passwords do not match.");      return; }
    setSaving(true);
    try {
      const row = await dbGetUserByEmail(userEmail);
      if (!row) throw new Error("User not found.");
      const valid = await verifyPassword(current, row.password_hash);
      if (!valid) throw new Error("Current password is incorrect.");
      const newHash = await hashPassword(next);
      const db      = await getDB();
      await db.execute(
        `UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE email=?`,
        [newHash, userEmail]
      );
      toast.success("Password changed!");
      setCurrent(""); setNext(""); setConfirm("");
      logger.info(CTX, "Password changed", { email: userEmail });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to change password.";
      logger.error(CTX, "Password change error", err);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { label: "Current Password", val: current, set: setCurrent, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
    { label: "New Password",     val: next,    set: setNext,    show: showNext,    toggle: () => setShowNext(v => !v) },
    { label: "Confirm New",      val: confirm, set: setConfirm, show: showNext,    toggle: () => setShowNext(v => !v) },
  ];

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center">
          <Lock size={16} className="text-brand-400" />
        </div>
        <h2 className="text-sm font-semibold text-slate-200">Change Password</h2>
      </div>
      <div className="space-y-3">
        {fields.map(({ label, val, set, show, toggle }) => (
          <div key={label}>
            <label className="label">{label}</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"} value={val}
                onChange={e => set(e.target.value)}
                placeholder="••••••••" className="input pr-10"
              />
              <button type="button" onClick={toggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        ))}
        <button onClick={handleChange} disabled={saving} className="btn-primary text-sm py-2 px-4">
          {saving ? "Updating…" : "Update Password"}
        </button>
      </div>
    </div>
  );
}

// ─── Categories ───────────────────────────────────────────────────────────────

function CategorySection({ userId }: { userId: number | null }) {
  const { categories, loadCategories, addCategory, deleteCategory } = useTransactionStore();
  const [tab,      setTab]      = useState<TransactionType>("expense");
  const [showAdd,  setShowAdd]  = useState(false);
  const [newName,  setNewName]  = useState("");
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);
  const [newIcon,  setNewIcon]  = useState(ICON_OPTIONS[0]);

  useEffect(() => { loadCategories(userId); }, [userId]);

  const predefined = categories.filter(c =>  c.is_predefined && c.type === tab);
  const custom     = categories.filter(c => !c.is_predefined && c.type === tab);

  async function handleAdd() {
    if (!newName.trim()) { toast.error("Category name required."); return; }
    try {
      await addCategory(userId, newName.trim(), tab, newColor, newIcon);
      toast.success("Category added!");
      setNewName(""); setShowAdd(false);
    } catch { toast.error("Failed to add category."); }
  }

  async function handleDelete(id: number, name: string) {
    try {
      await deleteCategory(id);
      toast.success(`"${name}" removed.`);
    } catch { toast.error("Cannot delete — category may be in use."); }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center">
          <Tags size={16} className="text-brand-400" />
        </div>
        <h2 className="text-sm font-semibold text-slate-200">Categories</h2>
      </div>

      {/* Type tab */}
      <div className="flex bg-slate-800 p-1 rounded-xl mb-4 w-fit">
        {(["expense","income"] as TransactionType[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all
              ${tab === t
                ? t === "income" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                : "text-slate-400 hover:text-slate-200"}`}>
            {t === "income" ? "💰 Income" : "💸 Expense"}
          </button>
        ))}
      </div>

      {/* Built-in */}
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Built-in</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {predefined.map(c => (
          <span key={c.id}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-400">
            <span style={{ color: c.color }}>{c.icon}</span> {c.name}
          </span>
        ))}
      </div>

      {/* Custom */}
      {custom.length > 0 && (
        <>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Custom</p>
          <div className="space-y-1.5 mb-4">
            {custom.map(c => (
              <div key={c.id}
                className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{c.icon}</span>
                  <span className="text-sm text-slate-300">{c.name}</span>
                </div>
                <button onClick={() => handleDelete(c.id, c.name)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-500
                             hover:bg-red-500/20 hover:text-red-400 transition-all">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add custom */}
      {!showAdd ? (
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors">
          <Plus size={13} /> Add custom category
        </button>
      ) : (
        <div className="bg-slate-800/60 rounded-xl p-4 space-y-3 mt-2">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Category name" className="input text-sm py-2" autoFocus />
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Icon</p>
            <div className="flex flex-wrap gap-1.5">
              {ICON_OPTIONS.map(icon => (
                <button key={icon} type="button" onClick={() => setNewIcon(icon)}
                  className={`w-8 h-8 rounded-lg text-base transition-all
                    ${newIcon === icon ? "bg-brand-600/30 ring-1 ring-brand-500" : "bg-slate-700 hover:bg-slate-600"}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Color</p>
            <div className="flex gap-1.5">
              {COLOR_OPTIONS.map(color => (
                <button key={color} type="button" onClick={() => setNewColor(color)}
                  className={`w-6 h-6 rounded-full transition-all
                    ${newColor === color ? "ring-2 ring-white ring-offset-1 ring-offset-slate-800" : ""}`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
              <Check size={12} /> Add
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-ghost text-xs py-1.5 px-3">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

function ExportSection({ userId }: { userId: number | null }) {
  const [exporting, setExporting] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<void>) {
    setExporting(id);
    logger.info(CTX, `Exporting ${id}`);
    try {
      await fn();
      toast.success("Export complete!");
    } catch (err) {
      logger.error(CTX, `Export ${id} failed`, err);
      toast.error("Export failed. Check that you have data to export.");
    } finally {
      setExporting(null);
    }
  }

  const options = [
    {
      id: "csv-tx", icon: "📊", label: "Transactions CSV",
      sub: "All entries — opens in any spreadsheet",
      fn: async () => {
        const list = await dbGetTransactions(userId);
        downloadCSV(`transactions-${new Date().toISOString().slice(0,10)}.csv`, [
          ["Date","Time","Type","Category","Name","Description","Amount (PKR)"],
          ...list.map(t => [t.date, t.time, t.type, t.category_name, t.name,
            t.description || "", t.amount.toFixed(2)]),
        ]);
      },
    },
    {
      id: "csv-goals", icon: "🎯", label: "Goals CSV",
      sub: "All savings goals with progress",
      fn: async () => {
        const list = await dbGetGoals(userId);
        downloadCSV(`goals-${new Date().toISOString().slice(0,10)}.csv`, [
          ["Name","Target (PKR)","Saved (PKR)","Progress %","Monthly Target (PKR)","Deadline","Status"],
          ...list.map(g => [
            g.name, g.target_amount.toFixed(2), g.current_amount.toFixed(2),
            g.progress_percent.toFixed(1), g.monthly_target.toFixed(2),
            g.deadline,
            g.progress_percent >= 100 ? "Completed" : g.is_on_track ? "On Track" : "Behind Target",
          ]),
        ]);
      },
    },
    {
      id: "excel", icon: "📗", label: "Excel (.xlsx)",
      sub: "Transactions + Goals — two sheets",
      fn: async () => {
        const [tx, gl] = await Promise.all([dbGetTransactions(userId), dbGetGoals(userId)]);
        await exportToExcel(tx, gl);
      },
    },
    {
      id: "pdf", icon: "📄", label: "Full Report PDF",
      sub: "Formatted, print-ready — all data",
      fn: async () => {
        const [tx, gl] = await Promise.all([dbGetTransactions(userId), dbGetGoals(userId)]);
        await exportToPDF(tx, gl);
      },
    },
  ];

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center">
          <Download size={16} className="text-brand-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Export Data</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Download as CSV, Excel, or formatted PDF report
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map(opt => (
          <button key={opt.id} onClick={() => run(opt.id, opt.fn)}
            disabled={exporting !== null}
            className="card p-4 text-left hover:border-slate-700 transition-all group disabled:opacity-50">
            <div className="text-2xl mb-2">{opt.icon}</div>
            <p className="text-sm font-medium text-slate-200 group-hover:text-slate-100">
              {exporting === opt.id ? "Exporting…" : opt.label}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{opt.sub}</p>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-600 mt-4">
        CSV and Excel open in Microsoft Excel, Google Sheets, or LibreOffice Calc.
        PDF is formatted for printing or sharing.
      </p>
    </div>
  );
}
