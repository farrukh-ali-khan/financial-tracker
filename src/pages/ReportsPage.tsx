import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";
import { useGoalStore } from "@/store/goalStore";
import { CategoryBreakdown } from "@/components/reports/CategoryBreakdown";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { formatCurrency, formatMonth } from "@/utils/formatters";
import { getDateRange } from "@/utils/calculations";
import { logger } from "@/services/logger";
import type { DateFilter } from "@/types";

const FILTER_OPTIONS = [
  { value: "this_month",    label: "This Month"    },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "this_year",     label: "This Year"     },
  { value: "last_5_years",  label: "Last 5 Years"  },
  { value: "all_time",      label: "All Time"      },
];

const CUSTOM_TOOLTIP = ({ active, payload }: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) => {
  if (active && payload?.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-xl">
        <p className="text-slate-300 font-medium">{payload[0].name}</p>
        <p className="text-slate-100 font-bold mt-0.5">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export function ReportsPage() {
  const { user, isGuest } = useAuthStore();
  const { categoryTotals, monthlyTotals, isLoading, loadReportData } = useTransactionStore();
  const { goals, loadGoals } = useGoalStore();
  const userId = isGuest ? null : (user?.id ?? null);

  const [period, setPeriod]       = useState<DateFilter>("this_month");
  const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");

  useEffect(() => {
    const { start, end } = getDateRange(period);
    logger.info("ReportsPage", "Loading data", { period, start, end });
    loadReportData(userId, start, end);
    loadGoals(userId);
  }, [userId, period]);

  const pieData = categoryTotals
    .filter(d => d.type === activeTab)
    .map(d => ({ name: d.category_name, value: d.total, color: d.category_color }));

  const barData = [...monthlyTotals].reverse().map(m => ({
    month: formatMonth(m.month),
    Income: m.income, Expense: m.expense, Net: m.net,
  }));

  const totalIncome  = categoryTotals.filter(d => d.type === "income") .reduce((s, d) => s + d.total, 0);
  const totalExpense = categoryTotals.filter(d => d.type === "expense").reduce((s, d) => s + d.total, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Visual breakdown of your finances</p>
        </div>
        <CustomSelect
          value={period}
          onChange={v => setPeriod(v as DateFilter)}
          options={FILTER_OPTIONS}
          className="w-44"
        />
      </div>

      {isLoading ? (
        <div className="card p-16 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-xs text-slate-500 mb-1">Total Income</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500 mb-1">Total Expense</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(totalExpense)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500 mb-1">Net Savings</p>
              <p className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(totalIncome - totalExpense)}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Pie */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-200">Category Distribution</h3>
                <div className="flex bg-slate-800 p-0.5 rounded-lg">
                  {(["expense","income"] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all
                        ${activeTab === t
                          ? t === "income" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                          : "text-slate-400 hover:text-slate-200"}`}>
                      {t === "income" ? "Income" : "Expense"}
                    </button>
                  ))}
                </div>
              </div>
              {pieData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-600 text-sm">No data for this period.</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<CUSTOM_TOOLTIP />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
                    {pieData.slice(0, 6).map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-slate-400 truncate max-w-[80px]">{d.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Bar */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">Monthly Trend (12 months)</h3>
              {barData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-600 text-sm">No monthly data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}
                      tickFormatter={v => formatCurrency(v, true)} />
                    <Tooltip content={<CUSTOM_TOOLTIP />} />
                    <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
                    <Bar dataKey="Income"  fill="#22c55e" radius={[4,4,0,0]} maxBarSize={24} />
                    <Bar dataKey="Expense" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Category breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">Income Breakdown</h3>
              <CategoryBreakdown data={categoryTotals} type="income" />
            </div>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">Expense Breakdown</h3>
              <CategoryBreakdown data={categoryTotals} type="expense" />
            </div>
          </div>

          {/* Goals Summary */}
          {goals.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">🎯 Savings Goals Progress</h3>
              <div className="space-y-4">
                {goals.map(goal => (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-slate-300">{goal.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">
                          {formatCurrency(goal.current_amount, true)} / {formatCurrency(goal.target_amount, true)}
                        </span>
                        <span className={`text-xs font-semibold ${
                          goal.progress_percent >= 100 ? "text-emerald-400"
                            : goal.is_on_track ? "text-brand-400" : "text-amber-400"
                        }`}>{goal.progress_percent.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${goal.progress_percent}%`,
                          backgroundColor: goal.progress_percent >= 100 ? "#22c55e"
                            : goal.is_on_track ? "#0e8be8" : "#f59e0b",
                        }} />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {goal.days_left > 0
                        ? `${goal.days_left} days left · Need ${formatCurrency(goal.monthly_target, true)}/month`
                        : "Deadline reached"}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Total Goals</p>
                  <p className="text-lg font-bold text-slate-200">{goals.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Total Saved</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {formatCurrency(goals.reduce((s, g) => s + g.current_amount, 0), true)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Total Target</p>
                  <p className="text-lg font-bold text-slate-300">
                    {formatCurrency(goals.reduce((s, g) => s + g.target_amount, 0), true)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Need Per Month</p>
                  <p className="text-lg font-bold text-amber-400">
                    {formatCurrency(goals.filter(g => g.progress_percent < 100).reduce((s, g) => s + g.monthly_target, 0), true)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
