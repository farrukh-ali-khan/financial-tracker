import { useEffect, useState } from "react";
import {
  Plus, Search, Pencil, Trash2,
  ArrowUpCircle, ArrowDownCircle, SlidersHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";
import { AddTransactionModal } from "@/components/transactions/AddTransactionModal";
import { EditTransactionModal } from "@/components/transactions/EditTransactionModal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { formatCurrency, formatDateTime } from "@/utils/formatters";
import { getDateRange } from "@/utils/calculations";
import { logger } from "@/services/logger";
import type { Transaction, DateFilter, TransactionType } from "@/types";

const FILTER_LABELS: Record<DateFilter, string> = {
  this_month:    "This Month",
  last_3_months: "Last 3 Months",
  this_year:     "This Year",
  last_5_years:  "Last 5 Years",
  last_10_years: "Last 10 Years",
  all_time:      "All Time",
  custom:        "Custom",
};

const TYPE_OPTIONS = [
  { value: "",        label: "All Types" },
  { value: "income",  label: "💰 Income" },
  { value: "expense", label: "💸 Expense" },
];

export function TransactionsPage() {
  const { user, isGuest } = useAuthStore();
  const {
    transactions, categories, isLoading,
    loadTransactions, loadCategories, deleteTransaction, activeFilter, setFilter,
  } = useTransactionStore();

  const userId = isGuest ? null : (user?.id ?? null);

  const [showAdd, setShowAdd]             = useState(false);
  const [editTx, setEditTx]               = useState<Transaction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);
  const [search, setSearch]               = useState("");
  const [typeFilter, setTypeFilter]       = useState("");
  const [catFilter, setCatFilter]         = useState("");

  const catOptions = [
    { value: "", label: "All Categories" },
    ...categories.map(c => ({ value: String(c.id), label: `${c.icon} ${c.name}` })),
  ];

  useEffect(() => {
    logger.info("TransactionsPage", "Init", { userId });
    loadCategories(userId);
    loadTransactions(userId, activeFilter);
  }, [userId]);

  function applyFilter(f: DateFilter) {
    setFilter(f);
    loadTransactions(userId, f);
  }

  async function handleDelete(tx: Transaction) {
    try {
      await deleteTransaction(tx.id);
      toast.success("Transaction deleted.");
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setConfirmDelete(null);
    }
  }

  const filtered = transactions.filter(tx => {
    if (typeFilter && tx.type !== typeFilter)             return false;
    if (catFilter  && String(tx.category_id) !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        tx.name.toLowerCase().includes(q) ||
        tx.category_name.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalIncome  = filtered.filter(t => t.type === "income") .reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // Group by date
  const grouped = new Map<string, Transaction[]>();
  for (const tx of filtered) {
    const list = grouped.get(tx.date) ?? [];
    list.push(tx);
    grouped.set(tx.date, list);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">{filtered.length} entries · {FILTER_LABELS[activeFilter]}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Date filter pills */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as DateFilter[]).filter(f => f !== "custom").map(f => (
          <button key={f} onClick={() => applyFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all
              ${activeFilter === f
                ? "bg-brand-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}>
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Search + custom dropdowns */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 z-10 pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions…" className="input pl-9 py-2" />
        </div>
        <CustomSelect
          value={typeFilter}
          onChange={setTypeFilter}
          options={TYPE_OPTIONS}
          className="w-40"
        />
        <CustomSelect
          value={catFilter}
          onChange={setCatFilter}
          options={catOptions}
          className="w-52"
        />
      </div>

      {/* Summary cards */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 flex items-center gap-3">
            <ArrowUpCircle size={20} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Income</p>
              <p className="text-sm font-semibold text-emerald-400">{formatCurrency(totalIncome)}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <ArrowDownCircle size={20} className="text-red-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Expense</p>
              <p className="text-sm font-semibold text-red-400">{formatCurrency(totalExpense)}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <SlidersHorizontal size={20} className="text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Net</p>
              <p className={`text-sm font-semibold ${totalIncome - totalExpense >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(totalIncome - totalExpense)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transaction list */}
      {isLoading ? (
        <div className="card p-10 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 flex flex-col items-center justify-center text-slate-600">
          <ArrowUpCircle size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No transactions found.</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-brand-400 text-sm hover:text-brand-300">
            Add one →
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {[...grouped.entries()].map(([date, txList]) => (
            <div key={date}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 px-1">
                {new Date(date + "T00:00:00").toLocaleDateString("en-PK", {
                  weekday: "short", day: "numeric", month: "long", year: "numeric",
                })}
              </p>
              <div className="card overflow-hidden divide-y divide-slate-800/50">
                {txList.map(tx => (
                  <div key={tx.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors group">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                      style={{ backgroundColor: `${tx.category_color}20` }}>
                      {tx.category_icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{tx.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: `${tx.category_color}20`, color: tx.category_color }}>
                          {tx.category_name}
                        </span>
                        <span className="text-xs text-slate-600">{tx.time}</span>
                        {tx.description && (
                          <span className="text-xs text-slate-600 truncate">{tx.description}</span>
                        )}
                      </div>
                    </div>
                    <p className={`text-sm font-semibold shrink-0 ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                      {tx.type === "income" ? "+" : "−"}{formatCurrency(tx.amount)}
                    </p>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <button onClick={() => setEditTx(tx)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setConfirmDelete(tx)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddTransactionModal onClose={() => { setShowAdd(false); loadTransactions(userId, activeFilter); }} />}
      {editTx  && <EditTransactionModal transaction={editTx} onClose={() => { setEditTx(null); loadTransactions(userId, activeFilter); }} />}

      {confirmDelete && (
        <div className="modal-backdrop">
          <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <h3 className="text-base font-semibold text-slate-100">Delete Transaction?</h3>
              <p className="text-sm text-slate-400">
                <span className="text-slate-200 font-medium">"{confirmDelete.name}"</span> —{" "}
                {formatCurrency(confirmDelete.amount)} will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={() => handleDelete(confirmDelete)} className="btn-danger flex-1">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
