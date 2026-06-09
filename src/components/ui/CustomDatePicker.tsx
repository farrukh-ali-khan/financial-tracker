import { useState, useRef, useEffect } from "react";
import { ChevronDown, Calendar, Check } from "lucide-react";
import { format, getDaysInMonth, isValid, parseISO } from "date-fns";

interface Props {
  value: string;         // YYYY-MM-DD
  onChange: (date: string) => void;
  min?: string;          // YYYY-MM-DD
  className?: string;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function CustomDatePicker({ value, onChange, min, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const parsed = value ? parseISO(value) : null;
  const init = {
    day:   parsed && isValid(parsed) ? parsed.getDate()     : new Date().getDate(),
    month: parsed && isValid(parsed) ? parsed.getMonth()    : new Date().getMonth(),
    year:  parsed && isValid(parsed) ? parsed.getFullYear() : new Date().getFullYear(),
  };

  const [selDay,   setSelDay]   = useState(init.day);
  const [selMonth, setSelMonth] = useState(init.month);
  const [selYear,  setSelYear]  = useState(init.year);

  // Sync local state when parent value changes externally
  useEffect(() => {
    const p = value ? parseISO(value) : null;
    if (p && isValid(p)) {
      setSelDay(p.getDate());
      setSelMonth(p.getMonth());
      setSelYear(p.getFullYear());
    }
  }, [value]);

  // Close on outside click only
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const daysInMonth = getDaysInMonth(new Date(selYear, selMonth, 1));
  const days   = range(1, daysInMonth);
  const months = range(0, 11);
  const minYear = min ? parseInt(min.slice(0, 4)) : 2000;
  const years   = range(minYear, new Date().getFullYear() + 20).reverse();

  function handleSelectMonth(m: number) {
    // Clamp day when month changes without closing
    const maxDay = getDaysInMonth(new Date(selYear, m, 1));
    setSelMonth(m);
    setSelDay(d => Math.min(d, maxDay));
  }

  function handleDone() {
    const maxDay  = getDaysInMonth(new Date(selYear, selMonth, 1));
    const safeDay = Math.min(selDay, maxDay);
    onChange(format(new Date(selYear, selMonth, safeDay), "yyyy-MM-dd"));
    setOpen(false);
  }

  const displayLabel = value
    ? format(parseISO(value), "dd MMM yyyy")
    : "Select date";

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger button */}
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
          <Calendar size={14} className="text-slate-400 shrink-0" />
          <span className={value ? "text-slate-100" : "text-slate-500"}>{displayLabel}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Picker panel — stays open until Done or outside click */}
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700
                     rounded-xl shadow-2xl z-[100] p-4 animate-fade-in"
          // Stop propagation so outside-click handler doesn't fire on panel clicks
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Live preview */}
          <p className="text-xs text-center text-brand-400 font-medium mb-3">
            {format(
              new Date(selYear, selMonth, Math.min(selDay, getDaysInMonth(new Date(selYear, selMonth, 1)))),
              "dd MMMM yyyy"
            )}
          </p>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {/* Day column */}
            <div>
              <p className="text-xs text-slate-500 mb-1.5 font-medium text-center">Day</p>
              <div className="max-h-40 overflow-y-auto space-y-0.5 pr-0.5">
                {days.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelDay(d)}
                    className={`w-full text-center px-1 py-1.5 rounded-lg text-sm transition-colors
                      ${selDay === d
                        ? "bg-brand-600 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-700"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Month column */}
            <div>
              <p className="text-xs text-slate-500 mb-1.5 font-medium text-center">Month</p>
              <div className="max-h-40 overflow-y-auto space-y-0.5 pr-0.5">
                {months.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleSelectMonth(m)}
                    className={`w-full text-center px-1 py-1.5 rounded-lg text-xs transition-colors
                      ${selMonth === m
                        ? "bg-brand-600 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-700"}`}
                  >
                    {MONTHS[m].slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Year column */}
            <div>
              <p className="text-xs text-slate-500 mb-1.5 font-medium text-center">Year</p>
              <div className="max-h-40 overflow-y-auto space-y-0.5 pr-0.5">
                {years.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setSelYear(y)}
                    className={`w-full text-center px-1 py-1.5 rounded-lg text-sm transition-colors
                      ${selYear === y
                        ? "bg-brand-600 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-700"}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Done button — only this closes the picker */}
          <button
            type="button"
            onClick={handleDone}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500
                       text-white text-sm font-medium py-2 rounded-xl transition-all"
          >
            <Check size={14} /> Confirm Date
          </button>
        </div>
      )}
    </div>
  );
}
