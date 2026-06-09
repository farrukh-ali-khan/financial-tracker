import { format, parseISO } from "date-fns";

/**
 * Format a number as PKR currency — consistent "Rs. X,XXX" everywhere.
 * compact=true → short form: Rs. 1.2K, Rs. 3.5L, Rs. 1.2Cr
 */
export function formatCurrency(amount: number, compact = false): string {
  if (compact) {
    if (Math.abs(amount) >= 10_000_000) return `Rs. ${(amount / 10_000_000).toFixed(1)}Cr`;
    if (Math.abs(amount) >= 100_000)    return `Rs. ${(amount / 100_000).toFixed(1)}L`;
    if (Math.abs(amount) >= 1_000)      return `Rs. ${(amount / 1_000).toFixed(1)}K`;
    return `Rs. ${amount.toFixed(0)}`;
  }
  // Full format — always consistent "Rs. 1,23,456.78"
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  const formatted = abs.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}Rs. ${formatted}`;
}

/**
 * Format YYYY-MM-DD to "15 May 2024"
 */
export function formatDate(dateStr: string): string {
  try { return format(parseISO(dateStr), "dd MMM yyyy"); }
  catch { return dateStr; }
}

/**
 * Format YYYY-MM-DD + HH:MM to "15 May 2024, 2:30 PM"
 */
export function formatDateTime(dateStr: string, timeStr: string): string {
  try { return format(parseISO(`${dateStr}T${timeStr}:00`), "dd MMM yyyy, h:mm a"); }
  catch { return `${dateStr} ${timeStr}`; }
}

/**
 * Format YYYY-MM to "May 2024"
 */
export function formatMonth(monthStr: string): string {
  try { return format(parseISO(`${monthStr}-01`), "MMM yyyy"); }
  catch { return monthStr; }
}

/** Today as YYYY-MM-DD */
export function todayDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** Current time as HH:MM */
export function currentTime(): string {
  return format(new Date(), "HH:mm");
}

/** Percentage string capped at 100 */
export function formatPercent(value: number): string {
  return `${Math.min(100, Math.round(value))}%`;
}
