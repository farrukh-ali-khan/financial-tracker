import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";
import { AddTransactionModal } from "@/components/transactions/AddTransactionModal";
import { formatCurrency, formatDateTime } from "@/utils/formatters";
import { computeBalance, filterThisMonth } from "@/utils/calculations";
import { logger } from "@/services/logger";

export function DashboardPage() {
  const { user, isGuest } = useAuthStore();
  const { transactions, isLoading, loadTransactions, loadCategories } = useTransactionStore();
  const [showAdd, setShowAdd] = useState(false);
  const userId = isGuest ? null : (user?.id ?? null);

  useEffect(() => {
    logger.info("DashboardPage", "Loading dashboard data", { userId });
    loadCategories(userId);
    loadTransactions(userId, "all_time");
  }, [userId]);

  const thisMonth = filterThisMonth(transactions);
  const allTime   = computeBalance(transactions);
  const monthly   = computeBalance(thisMonth);
  const recent    = transactions.slice(0, 8);

  if (isLoading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading your data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Net Balance */}
        <div className="card p-5 col-span-1 sm:col-span-1 bg-gradient-to-br from-brand-900/50 to-slate-900 border-brand-800/50">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-400">Net Balance (All Time)</p>
            <div className="w-9 h-9 rounded-xl bg-brand-600/20 flex items-center justify-center">
              <Wallet size={18} className="text-brand-400" />
            </div>
          </div>
          <p className={`text-3xl font-bold tracking-tight ${allTime.netBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrency(allTime.netBalance)}
          </p>
          <p className="text-xs text-slate-500 mt-1">{allTime.transactionCount} total transactions</p>
        </div>

        {/* Monthly Income */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-400">This Month Income</p>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {formatCurrency(monthly.totalIncome)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight size={12} className="text-emerald-500" />
            <p className="text-xs text-slate-500">{thisMonth.filter(t => t.type === "income").length} income entries</p>
          </div>
        </div>

        {/* Monthly Expense */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-400">This Month Expense</p>
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
              <TrendingDown size={18} className="text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-400">
            {formatCurrency(monthly.totalExpense)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowDownRight size={12} className="text-red-500" />
            <p className="text-xs text-slate-500">{thisMonth.filter(t => t.type === "expense").length} expense entries</p>
          </div>
        </div>
      </div>

      {/* Month Net */}
      {thisMonth.length > 0 && (
        <div className={`card p-4 flex items-center gap-3 border-l-4 ${
          monthly.netBalance >= 0
            ? "border-l-emerald-500"
            : "border-l-red-500"
        }`}>
          <div className="flex-1">
            <p className="text-sm text-slate-400">
              This Month Net — {monthly.netBalance >= 0 ? "You saved" : "You overspent by"}
            </p>
            <p className={`text-xl font-semibold ${monthly.netBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatCurrency(Math.abs(monthly.netBalance))}
            </p>
          </div>
          {monthly.totalIncome > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-500">Savings rate</p>
              <p className="text-lg font-semibold text-slate-300">
                {((monthly.netBalance / monthly.totalIncome) * 100).toFixed(0)}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recent Transactions */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">Recent Transactions</h2>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 btn-primary py-1.5 px-3 text-xs"
          >
            <Plus size={13} /> Add New
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600">
            <Wallet size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No transactions yet.</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 text-brand-400 text-sm hover:text-brand-300">
              Add your first transaction →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {recent.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/40 transition-colors">
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                  style={{ backgroundColor: `${tx.category_color}20` }}
                >
                  {tx.category_icon}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{tx.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {tx.category_name} · {formatDateTime(tx.date, tx.time)}
                  </p>
                </div>
                {/* Amount */}
                <p className={`text-sm font-semibold shrink-0 ${
                  tx.type === "income" ? "text-emerald-400" : "text-red-400"
                }`}>
                  {tx.type === "income" ? "+" : "−"}{formatCurrency(tx.amount, true)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddTransactionModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
