// ─── Auth ───────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export type AuthMode = "choose" | "signup" | "signin" | "guest";

export interface AuthState {
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
}

// ─── Categories ─────────────────────────────────────────────────────────────

export type TransactionType = "income" | "expense";

export interface Category {
  id: number;
  user_id: number | null; // null = predefined global
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  is_predefined: boolean;
}

// ─── Transactions ────────────────────────────────────────────────────────────

export interface Transaction {
  id: number;
  user_id: number | null;
  category_id: number;
  category_name: string;
  category_color: string;
  category_icon: string;
  type: TransactionType;
  amount: number;
  name: string;
  description: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM
  created_at: string;
  updated_at: string;
}

export interface NewTransaction {
  category_id: number;
  type: TransactionType;
  amount: number;
  name: string;
  description: string;
  date: string;
  time: string;
}

export interface UpdateTransaction extends Partial<NewTransaction> {
  id: number;
}

// ─── Date Filter ─────────────────────────────────────────────────────────────

export type DateFilter =
  | "this_month"
  | "last_3_months"
  | "this_year"
  | "last_5_years"
  | "last_10_years"
  | "all_time"
  | "custom";

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface CategoryTotal {
  category_id: number;
  category_name: string;
  category_color: string;
  category_icon: string;
  type: TransactionType;
  total: number;
  percentage: number;
  count: number;
}

export interface MonthlyTotal {
  month: string;  // YYYY-MM
  income: number;
  expense: number;
  net: number;
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export interface Goal {
  id: number;
  user_id: number | null;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;       // YYYY-MM-DD
  monthly_target: number;
  is_active: boolean;
  created_at: string;
  // computed
  progress_percent: number;
  days_left: number;
  is_on_track: boolean;
}

export interface NewGoal {
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  monthly_target: number;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardSummary {
  total_balance: number;
  month_income: number;
  month_expense: number;
  month_net: number;
  year_income: number;
  year_expense: number;
  recent_transactions: Transaction[];
}

// ─── Store ───────────────────────────────────────────────────────────────────

export interface TransactionStore {
  transactions: Transaction[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
}

export interface GoalStore {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
}
