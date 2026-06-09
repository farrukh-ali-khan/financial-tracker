import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useTransactionStore } from "@/store/transactionStore";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { CustomTimePicker } from "@/components/ui/CustomTimePicker";
import type { Transaction } from "@/types";

interface Props {
  transaction: Transaction;
  onClose: () => void;
}

export function EditTransactionModal({ transaction: tx, onClose }: Props) {
  const { updateTransaction, categories } = useTransactionStore();

  const [amount, setAmount]           = useState(tx.amount.toString());
  const [name, setName]               = useState(tx.name);
  const [description, setDescription] = useState(tx.description);
  const [categoryId, setCategoryId]   = useState<string>(String(tx.category_id));
  const [date, setDate]               = useState(tx.date);
  const [time, setTime]               = useState(tx.time);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCats = categories.filter(c => c.type === tx.type);
  const catOptions = filteredCats.map(c => ({ value: String(c.id), label: `${c.icon} ${c.name}` }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { toast.error("Enter a valid amount."); return; }
    if (!name.trim())                       { toast.error("Name is required."); return; }

    setIsSubmitting(true);
    try {
      await updateTransaction(tx.id, {
        amount: parseFloat(amount), name: name.trim(),
        description: description.trim(), category_id: Number(categoryId), date, time,
      });
      toast.success("Transaction updated!");
      onClose();
    } catch {
      toast.error("Failed to update transaction.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">Edit Transaction</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-lg
            ${tx.type === "income" ? "badge-income" : "badge-expense"}`}>
            {tx.type === "income" ? "💰 Income" : "💸 Expense"}
          </div>

          <div>
            <label className="label">Amount (PKR)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              className="input" min="0.01" step="0.01" required autoFocus />
          </div>

          <div>
            <label className="label">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" required />
          </div>

          <div>
            <label className="label">Category</label>
            <CustomSelect value={categoryId} onChange={setCategoryId} options={catOptions} />
          </div>

          <div>
            <label className="label">Description <span className="text-slate-600">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="input resize-none" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <CustomDatePicker value={date} onChange={setDate} />
            </div>
            <div>
              <label className="label">Time</label>
              <CustomTimePicker value={time} onChange={setTime} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
