import { useState, useRef, useEffect } from "react";
import { ChevronDown, Clock } from "lucide-react";

interface Props {
  value: string;            // HH:MM
  onChange: (time: string) => void;
  className?: string;
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

const HOURS   = range(0, 23);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/**
 * Fully custom time picker — hour and minute dropdowns.
 * No native time input; works correctly in Tauri WebKit.
 */
export function CustomTimePicker({ value, onChange, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [selHour,   setSelHour]   = useState(() => value ? parseInt(value.split(":")[0]) : new Date().getHours());
  const [selMinute, setSelMinute] = useState(() => {
    if (!value) return 0;
    const m = parseInt(value.split(":")[1]);
    // Round to nearest 5
    return MINUTES.reduce((prev, curr) => Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev);
  });

  useEffect(() => {
    if (value) {
      setSelHour(parseInt(value.split(":")[0]) || 0);
      const m = parseInt(value.split(":")[1]) || 0;
      setSelMinute(MINUTES.reduce((prev, curr) => Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev));
    }
  }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function apply(h: number, m: number) {
    onChange(`${pad(h)}:${pad(m)}`);
    setOpen(false);
  }

  const hour12 = selHour % 12 || 12;
  const ampm   = selHour < 12 ? "AM" : "PM";
  const displayLabel = value ? `${hour12}:${pad(selMinute)} ${ampm}` : "Select time";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 text-left
          bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm
          text-slate-100 transition-all hover:border-slate-600
          focus:outline-none focus:ring-2 focus:ring-brand-500
          ${open ? "ring-2 ring-brand-500 border-transparent" : ""}`}
      >
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-slate-400 shrink-0" />
          <span className={value ? "text-slate-100" : "text-slate-500"}>{displayLabel}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700
                        rounded-xl shadow-2xl z-[100] p-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            {/* Hour */}
            <div>
              <p className="text-xs text-slate-500 mb-1.5 font-medium">Hour</p>
              <div className="max-h-44 overflow-y-auto space-y-0.5 pr-1">
                {HOURS.map(h => {
                  const h12 = h % 12 || 12;
                  const ap  = h < 12 ? "AM" : "PM";
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => { setSelHour(h); apply(h, selMinute); }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors
                        ${selHour === h
                          ? "bg-brand-600 text-white font-medium"
                          : "text-slate-300 hover:bg-slate-700"}`}
                    >
                      {h12} {ap}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minute */}
            <div>
              <p className="text-xs text-slate-500 mb-1.5 font-medium">Minute</p>
              <div className="max-h-44 overflow-y-auto space-y-0.5 pr-1">
                {MINUTES.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setSelMinute(m); apply(selHour, m); }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors
                      ${selMinute === m
                        ? "bg-brand-600 text-white font-medium"
                        : "text-slate-300 hover:bg-slate-700"}`}
                  >
                    :{pad(m)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
