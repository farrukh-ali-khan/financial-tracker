import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Target, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { useGoalStore } from "@/store/goalStore";
import { useTransactionStore } from "@/store/transactionStore";
import { AddGoalModal } from "@/components/goals/AddGoalModal";
import { formatCurrency, formatDate, formatPercent } from "@/utils/formatters";
import { computeBalance, filterThisMonth } from "@/utils/calculations";
import { logger } from "@/services/logger";
import type { Goal } from "@/types";

export function GoalsPage() {
  const { user, isGuest } = useAuthStore();
  const { goals, isLoading, loadGoals, deleteGoal } = useGoalStore();
  const { transactions, loadTransactions } = useTransactionStore();
  const userId = isGuest ? null : (user?.id ?? null);

  const [showAdd, setShowAdd]               = useState(false);
  const [editGoal, setEditGoal]             = useState<Goal | null>(null);
  const [confirmDelete, setConfirmDelete]   = useState<Goal | null>(null);

  useEffect(() => {
    logger.info("GoalsPage", "Loading goals + transactions", { userId });
    loadTransactions(userId, "all_time").then(() => loadGoals(userId));
  }, [userId]);

  const monthlyNet = computeBalance(filterThisMonth(transactions)).netBalance;
  const allTimeNet = computeBalance(transactions).netBalance;

  async function handleDelete(goal: Goal) {
    try {
      await deleteGoal(userId, goal.id);
      toast.success("Goal removed.");
    } catch {
      toast.error("Failed to delete goal.");
    } finally {
      setConfirmDelete(null);
    }
  }

  const activeGoals    = goals.filter(g => g.progress_percent < 100);
  const completedGoals = goals.filter(g => g.progress_percent >= 100);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Savings Goals</h1>
          <p className="page-subtitle">{activeGoals.length} active · {completedGoals.length} completed</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* Net savings banner */}
      {transactions.length > 0 && goals.length > 0 && (
        <div className="card p-4 border-l-4 border-l-brand-500">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm text-slate-300 font-medium">Your Net Savings (All Time)</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Goal progress is automatically synced from income − expenses, split equally.
              </p>
            </div>
            <p className={`text-xl font-bold ${allTimeNet >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatCurrency(allTimeNet)}
            </p>
          </div>
          {monthlyNet > 0 && (
            <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-800">
              This month: <span className="text-emerald-400 font-medium">{formatCurrency(monthlyNet)}</span> net savings
            </p>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="card p-16 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>

      /* Empty state */
      ) : goals.length === 0 ? (
        <div className="card p-16 flex flex-col items-center justify-center text-slate-600">
          <Target size={44} className="mb-3 opacity-30" />
          <p className="text-sm mb-1">No savings goals yet.</p>
          <p className="text-xs text-slate-700 mb-4">Add income & expenses first, then set a savings target.</p>
          <button onClick={() => setShowAdd(true)} className="text-brand-400 text-sm hover:text-brand-300">
            Create your first goal →
          </button>
        </div>

      /* Goal lists */
      ) : (
        <>
          {activeGoals.length > 0 && (
            <div className="space-y-4">
              {activeGoals.map(goal => (
                <GoalCard key={goal.id} goal={goal}
                  onEdit={() => setEditGoal(goal)}
                  onDelete={() => setConfirmDelete(goal)} />
              ))}
            </div>
          )}

          {completedGoals.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 px-1">
                Completed 🎉
              </p>
              <div className="space-y-3">
                {completedGoals.map(goal => (
                  <GoalCard key={goal.id} goal={goal} completed
                    onEdit={() => setEditGoal(goal)}
                    onDelete={() => setConfirmDelete(goal)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add modal */}
      {showAdd && (
        <AddGoalModal onClose={() => { setShowAdd(false); loadGoals(userId); }} />
      )}

      {/* Edit modal */}
      {editGoal && (
        <AddGoalModal
          onClose={() => { setEditGoal(null); loadGoals(userId); }}
          editGoal={{
            id:             editGoal.id,
            name:           editGoal.name,
            target_amount:  editGoal.target_amount,
            deadline:       editGoal.deadline,
            monthly_target: editGoal.monthly_target,
          }}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="modal-backdrop">
          <div className="modal-box max-w-sm">
            <div className="p-6 space-y-4">
              <h3 className="text-base font-semibold text-slate-100">Remove Goal?</h3>
              <p className="text-sm text-slate-400">
                <span className="text-slate-200 font-medium">"{confirmDelete.name}"</span> will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={() => handleDelete(confirmDelete)} className="btn-danger flex-1">Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  completed?: boolean;
}

function GoalCard({ goal, onEdit, onDelete, completed = false }: GoalCardProps) {
  const [showYears, setShowYears] = useState(false);

  const barColor    = completed ? "#22c55e" : goal.is_on_track ? "#0e8be8" : "#f59e0b";
  const statusIcon  = completed
    ? <CheckCircle2 size={15} className="text-emerald-400" />
    : goal.is_on_track
      ? <CheckCircle2 size={15} className="text-brand-400" />
      : <AlertTriangle size={15} className="text-amber-400" />;
  const statusLabel = completed ? "Completed!" : goal.is_on_track ? "On Track" : "Behind Target";
  const statusColor = completed ? "text-emerald-400" : goal.is_on_track ? "text-brand-400" : "text-amber-400";

  // Time breakdown
  const totalDays = goal.days_left;
  const years     = Math.floor(totalDays / 365);
  const remDays   = totalDays % 365;
  const months    = Math.floor(remDays / 30);
  const days      = remDays % 30;

  function deadlineLabel(): string {
    if (completed)       return "Done";
    if (totalDays === 0) return "Today!";
    if (showYears) {
      const parts: string[] = [];
      if (years  > 0) parts.push(`${years}y`);
      if (months > 0) parts.push(`${months}mo`);
      if (years === 0 && days > 0) parts.push(`${days}d`);
      return parts.join(" ") || "< 1mo";
    }
    return `${totalDays}d`;
  }

  const needPerMonth = totalDays > 0
    ? Math.round(Math.max(0, goal.target_amount - goal.current_amount) / Math.max(1, totalDays / 30.44))
    : 0;

  return (
    <div className={`card p-5 group hover:border-slate-700 transition-all ${completed ? "opacity-75" : ""}`}>
      {/* Title row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 text-xl">🎯</div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-100 truncate">{goal.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {statusIcon}
              <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
              {!completed && needPerMonth > 0 && (
                <span className="text-xs text-slate-600">
                  · need {formatCurrency(needPerMonth, true)}/mo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons — visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400
                       hover:bg-slate-700 hover:text-slate-200 transition-all" title="Edit">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400
                       hover:bg-red-500/20 hover:text-red-400 transition-all" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">
            {formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}
          </span>
          <span className="text-sm font-bold text-slate-200">{formatPercent(goal.progress_percent)}</span>
        </div>
        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${goal.progress_percent}%`, backgroundColor: barColor }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div className="bg-slate-800/60 rounded-xl p-2.5 text-center">
          <p className="text-xs text-slate-500 mb-0.5">Remaining</p>
          <p className="text-sm font-semibold text-slate-200">
            {formatCurrency(Math.max(0, goal.target_amount - goal.current_amount), true)}
          </p>
        </div>

        {/* Clickable time toggle */}
        <button type="button"
          onClick={() => !completed && setShowYears(v => !v)}
          className={`bg-slate-800/60 rounded-xl p-2.5 text-center transition-all
            ${!completed ? "hover:bg-slate-700/60 cursor-pointer" : ""}`}
          title={completed ? "" : showYears ? "Switch to days" : "Switch to years & months"}
        >
          <p className="text-xs text-slate-500 mb-0.5 flex items-center justify-center gap-1">
            <Clock size={10} />
            {showYears ? "Time Left" : "Days Left"}
            {!completed && <span className="text-slate-600 text-[10px]">⇄</span>}
          </p>
          <p className={`text-sm font-semibold ${totalDays < 30 && !completed ? "text-amber-400" : "text-slate-200"}`}>
            {deadlineLabel()}
          </p>
        </button>

        <div className="bg-slate-800/60 rounded-xl p-2.5 text-center">
          <p className="text-xs text-slate-500 mb-0.5">Monthly Target</p>
          <p className="text-sm font-semibold text-slate-200">
            {goal.monthly_target > 0 ? formatCurrency(goal.monthly_target, true) : "—"}
          </p>
        </div>
      </div>

      {/* Deadline line */}
      {!completed && (
        <p className="text-xs text-slate-600 mt-3">
          Deadline: {formatDate(goal.deadline)}
          {years > 0 && (
            <span className="ml-2 text-slate-700">
              ({years} year{years > 1 ? "s" : ""}{months > 0 ? ` ${months} month${months > 1 ? "s" : ""}` : ""})
            </span>
          )}
        </p>
      )}
    </div>
  );
}
