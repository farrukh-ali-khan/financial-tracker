import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: string;
}

interface Props {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Fully custom dropdown — replaces native <select> everywhere so dark theme
 * works reliably in Tauri/WebKit without any CSS hacks.
 */
export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className = "",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => String(o.value) === String(value));

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`
          w-full flex items-center justify-between gap-2 text-left
          bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm
          text-slate-100 transition-all duration-150
          hover:border-slate-600
          focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          ${open ? "ring-2 ring-brand-500 border-transparent" : ""}
        `}
      >
        <span className={selected ? "text-slate-100" : "text-slate-500"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div className="
          absolute top-full left-0 right-0 mt-1
          bg-slate-800 border border-slate-700 rounded-xl shadow-2xl
          z-[100] overflow-hidden
          animate-fade-in
          max-h-60 overflow-y-auto
        ">
          {options.map(opt => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(String(opt.value));
                  setOpen(false);
                }}
                className={`
                  w-full flex items-center justify-between gap-2
                  text-left px-4 py-2.5 text-sm transition-colors
                  ${isSelected
                    ? "bg-brand-600/20 text-brand-400"
                    : "text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                  }
                `}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={13} className="text-brand-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
