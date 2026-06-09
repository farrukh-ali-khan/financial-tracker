import type { CategoryTotal } from "@/types";
import { formatCurrency, formatPercent } from "@/utils/formatters";

interface Props {
  data: CategoryTotal[];
  type: "income" | "expense";
}

export function CategoryBreakdown({ data, type }: Props) {
  const filtered = data.filter(d => d.type === type);
  const total    = filtered.reduce((s, d) => s + d.total, 0);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-600">
        <p className="text-sm">No {type} data for this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map(item => (
        <div key={item.category_id} className="group">
          {/* Label row */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-base">{item.category_icon}</span>
              <span className="text-sm text-slate-300 font-medium">{item.category_name}</span>
              <span className="text-xs text-slate-600">{item.count} entries</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">{formatPercent(item.percentage)}</span>
              <span className={`text-sm font-semibold ${
                type === "income" ? "text-emerald-400" : "text-red-400"
              }`}>
                {formatCurrency(item.total)}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: item.category_color,
              }}
            />
          </div>
        </div>
      ))}

      {/* Total row */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-4">
        <span className="text-sm font-medium text-slate-400">Total</span>
        <span className={`text-base font-bold ${
          type === "income" ? "text-emerald-400" : "text-red-400"
        }`}>
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
