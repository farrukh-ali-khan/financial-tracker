import { format, startOfMonth, subMonths, startOfYear, subYears } from "date-fns";
import type { Transaction, DateFilter, DateRange } from "@/types";

/**
 * Returns { start, end } YYYY-MM-DD strings for a given DateFilter.
 */
export function getDateRange(filter: DateFilter): DateRange {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");

  switch (filter) {
    case "this_month":
      return {
        start: format(startOfMonth(now), "yyyy-MM-dd"),
        end: today,
      };
    case "last_3_months":
      return {
        start: format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd"),
        end: today,
      };
    case "this_year":
      return {
        start: format(startOfYear(now), "yyyy-MM-dd"),
        end: today,
      };
    case "last_5_years":
      return {
        start: format(startOfYear(subYears(now, 4)), "yyyy-MM-dd"),
        end: today,
      };
    case "last_10_years":
      return {
        start: format(startOfYear(subYears(now, 9)), "yyyy-MM-dd"),
        end: today,
      };
    case "all_time":
    default:
      return { start: "2000-01-01", end: today };
  }
}

export interface BalanceSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
}

/**
 * Compute income / expense / net from a list of transactions.
 */
export function computeBalance(transactions: Transaction[]): BalanceSummary {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.type === "income")  totalIncome  += tx.amount;
    else                       totalExpense += tx.amount;
  }

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    transactionCount: transactions.length,
  };
}

/**
 * Returns the current month YYYY-MM string.
 */
export function currentYearMonth(): string {
  return format(new Date(), "yyyy-MM");
}

/**
 * Filter transactions to the current calendar month.
 */
export function filterThisMonth(transactions: Transaction[]): Transaction[] {
  const prefix = currentYearMonth();
  return transactions.filter(t => t.date.startsWith(prefix));
}

/**
 * Group transactions by date for timeline display.
 */
export function groupByDate(
  transactions: Transaction[]
): Map<string, Transaction[]> {
  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const group = map.get(tx.date) ?? [];
    group.push(tx);
    map.set(tx.date, group);
  }
  return map;
}
