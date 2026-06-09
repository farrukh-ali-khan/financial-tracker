import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { CustomTimePicker } from "@/components/ui/CustomTimePicker";
import { todayDate, currentTime } from "@/utils/formatters";
import type { TransactionType } from "@/types";

interface Props {
  onClose: () => void;
  defaultType?: TransactionType;
}

const ICON_OPTIONS = ["💰","💼","💻","🍔","🚗","🛍️","💊","🏠","📚","🎬","💡","✈️","🎁","📈","💸","🐷"];
const COLOR_OPTIONS = [
  "#22c55e","#10b981","#3b82f6","#8b5cf6","#ec4899",
  "#ef4444","#f97316","#f59e0b","#0ea5e9","#6b7280",
];

export function AddTransactionModal({ onClose, defaultType = "expense" }: Props) {
  const { user, isGuest } = useAuthStore();
  const { categories, addTransaction, addCategory, loadCategories } = useTransactionStore();

  const [type, setType]               = useState<TransactionType>(defaultType);
  const [categoryId, setCategoryId]   = useState<string>("");
  const [amount, setAmount]           = useState("");
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate]               = useState(todayDate());
  const [time, setTime]               = useState(currentTime());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showAddCat, setShowAddCat]   = useState(false);
  const [newCatName, setNewCatName]   = useState("");
  const [newCatColor, setNewCatColor] = useState(COLOR_OPTIONS[0]);
  const [newCatIcon, setNewCatIcon]   = useState(ICON_OPTIONS[0]);

  const userId = isGuest ? null : (user?.id ?? null);
  const filteredCats = categories.filter(c => c.type === type);
  const catOptions = [
    { value: "", label: "Select category…" },
    ...filteredCats.map(c => ({ value: String(c.id), label: `${c.icon} ${c.name}` })),
  ];

  useEffect(() => { loadCategories(userId); }, [userId]);
  useEffect(() => { setCategoryId(""); }, [type]);

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    try {
      await addCategory(userId, newCatName.trim(), type, newCatColor, newCatIcon);
      toast.success("Category added!");
      setNewCatName("");
      setShowAddCat(false);
    } catch {
      toast.error("Failed to add category.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId)                        { toast.error("Please select a category."); return; }
    if (!amount || parseFloat(amount) <= 0) { toast.error("Enter a valid amount."); return; }
    if (!name.trim())                       { toast.error("Transaction name is required."); return; }

    setIsSubmitting(true);
    try {
      await addTransaction(userId, {
        category_id: Number(categoryId),
        type, amount: parseFloat(amount),
        name: name.trim(), description: description.trim(), date, time,
      });
      toast.success(`${type === "income" ? "Income" : "Expense"} added!`);
      onClose();
    } catch {
      toast.error("Failed to add transaction.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">Add Transaction</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Type toggle */}
          <div className="flex bg-slate-800 p-1 rounded-xl">
            {(["expense","income"] as TransactionType[]).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150
                  ${type === t
                    ? t === "income" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    : "text-slate-400 hover:text-slate-200"}`}>
                {t === "income" ? "💰 Income" : "💸 Expense"}
              </button>
            ))}
          </div>

          <div>
            <label className="label">Amount (PKR)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" min="0.01" step="0.01" className="input" autoFocus required />
          </div>

          <div>
            <label className="label">Transaction Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Monthly Salary, Lunch" className="input" required />
          </div>

          <div>
            <label className="label">Category</label>
            <CustomSelect value={categoryId} onChange={setCategoryId} options={catOptions} placeholder="Select category…" />
            {!showAddCat ? (
              <button type="button" onClick={() => setShowAddCat(true)}
                className="mt-2 flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
                <Plus size={12} /> Add custom category
              </button>
            ) : (
              <div className="mt-3 p-3 bg-slate-800 rounded-xl space-y-3">
                <p className="text-xs font-medium text-slate-400">New Category</p>
                <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  placeholder="Category name" className="input text-xs py-2" />
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Icon</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ICON_OPTIONS.map(icon => (
                      <button key={icon} type="button" onClick={() => setNewCatIcon(icon)}
                        className={`w-8 h-8 rounded-lg text-base transition-all
                          ${newCatIcon === icon ? "bg-brand-600/30 ring-1 ring-brand-500" : "bg-slate-700 hover:bg-slate-600"}`}>
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Color</p>
                  <div className="flex gap-1.5">
                    {COLOR_OPTIONS.map(color => (
                      <button key={color} type="button" onClick={() => setNewCatColor(color)}
                        className={`w-6 h-6 rounded-full transition-all
                          ${newCatColor === color ? "ring-2 ring-white ring-offset-1 ring-offset-slate-800" : ""}`}
                        style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleAddCategory} className="btn-primary text-xs py-1.5 px-3">Add</button>
                  <button type="button" onClick={() => setShowAddCat(false)} className="btn-ghost text-xs py-1.5 px-3">Cancel</button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label">Description <span className="text-slate-600">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Any additional notes…" className="input resize-none" rows={2} />
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
              {isSubmitting ? "Saving…" : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
