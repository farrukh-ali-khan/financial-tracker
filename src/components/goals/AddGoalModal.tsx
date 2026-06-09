import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { useGoalStore } from "@/store/goalStore";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { format, addMonths } from "date-fns";

interface Props {
  onClose: () => void;
  editGoal?: {
    id: number;
    name: string;
    target_amount: number;
    deadline: string;
    monthly_target: number;
  };
}

export function AddGoalModal({ onClose, editGoal }: Props) {
  const { user, isGuest } = useAuthStore();
  const { addGoal, updateGoal } = useGoalStore();
  const userId = isGuest ? null : (user?.id ?? null);

  const defaultDeadline = format(addMonths(new Date(), 12), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  const [name,     setName]     = useState(editGoal?.name ?? "");
  const [target,   setTarget]   = useState(editGoal?.target_amount.toString() ?? "");
  const [deadline, setDeadline] = useState(editGoal?.deadline ?? defaultDeadline);
  const [monthly,  setMonthly]  = useState(editGoal?.monthly_target.toString() ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function autoCalcMonthly(t?: string, d?: string) {
    const amt = parseFloat(t ?? target);
    const dl  = d ?? deadline;
    if (!amt || isNaN(amt) || amt <= 0 || !dl) return;
    const months = Math.max(
      1,
      Math.ceil((new Date(dl).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44))
    );
    setMonthly(Math.ceil(amt / months).toString());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim())                       { toast.error("Goal name is required.");      return; }
    if (!target || parseFloat(target) <= 0) { toast.error("Target amount is required.");  return; }
    if (!deadline)                          { toast.error("Deadline is required.");       return; }

    setIsSubmitting(true);
    try {
      const payload = {
        name:           name.trim(),
        target_amount:  parseFloat(target),
        current_amount: 0,
        deadline,
        monthly_target: parseFloat(monthly || "0"),
      };

      if (editGoal) {
        await updateGoal(userId, editGoal.id, payload);
        toast.success("Goal updated!");
      } else {
        await addGoal(userId, payload);
        toast.success("Goal created! Savings auto-sync from your transactions.");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save goal.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              {editGoal ? "Edit Goal" : "New Savings Goal"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Progress auto-syncs from income − expenses, split equally among all goals.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 ml-4">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Goal Name</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Umrah Trip, New Car, Emergency Fund"
              className="input" autoFocus required
            />
          </div>

          <div>
            <label className="label">Target Amount (PKR)</label>
            <input
              type="number" value={target}
              onChange={e => { setTarget(e.target.value); setMonthly(""); }}
              onBlur={e => autoCalcMonthly(e.target.value, deadline)}
              placeholder="e.g. 250000" min="1" className="input" required
            />
          </div>

          <div>
            <label className="label">Target Deadline</label>
            <CustomDatePicker
              value={deadline}
              onChange={d => { setDeadline(d); setMonthly(""); autoCalcMonthly(target, d); }}
              min={today}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Monthly Savings Target (PKR)</label>
              <button type="button" onClick={() => autoCalcMonthly()}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                Auto-calculate
              </button>
            </div>
            <input
              type="number" value={monthly} onChange={e => setMonthly(e.target.value)}
              placeholder="How much to save per month" min="0" className="input"
            />
            <p className="text-xs text-slate-600 mt-1">
              Used to check if you are "On Track" or "Behind Target" each month.
            </p>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 text-xs text-slate-500 leading-relaxed">
            💡 <span className="text-slate-400">How it works:</span> Your net savings (income − expenses)
            is divided equally among all active goals. No manual tracking needed.
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? "Saving…" : editGoal ? "Save Changes" : "Create Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
