import { create } from "zustand";
import { logger } from "@/services/logger";
import {
  dbGetTransactions,
  dbAddTransaction,
  dbUpdateTransaction,
  dbDeleteTransaction,
  dbGetCategories,
  dbAddCategory,
  dbDeleteCategory,
  dbGetCategoryTotals,
  dbGetMonthlyTotals,
} from "@/services/database";
import type {
  Transaction,
  Category,
  NewTransaction,
  CategoryTotal,
  MonthlyTotal,
  TransactionType,
  DateFilter,
} from "@/types";
import { getDateRange } from "@/utils/calculations";

const CTX = "transactionStore";

interface TransactionStore {
  transactions: Transaction[];
  categories: Category[];
  categoryTotals: CategoryTotal[];
  monthlyTotals: MonthlyTotal[];
  isLoading: boolean;
  error: string | null;
  activeFilter: DateFilter;
  activeCategoryFilter: number | null;
  activeTypeFilter: TransactionType | null;

  // Actions
  loadCategories: (userId: number | null) => Promise<void>;
  loadTransactions: (
    userId: number | null,
    filter?: DateFilter,
    categoryId?: number | null,
    type?: TransactionType | null
  ) => Promise<void>;
  addTransaction: (userId: number | null, tx: NewTransaction) => Promise<Transaction>;
  updateTransaction: (id: number, fields: Partial<NewTransaction>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  addCategory: (
    userId: number | null,
    name: string,
    type: TransactionType,
    color: string,
    icon: string
  ) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  loadReportData: (userId: number | null, startDate: string, endDate: string) => Promise<void>;
  setFilter: (f: DateFilter) => void;
  setCategoryFilter: (id: number | null) => void;
  setTypeFilter: (t: TransactionType | null) => void;
  clearError: () => void;
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  categories: [],
  categoryTotals: [],
  monthlyTotals: [],
  isLoading: false,
  error: null,
  activeFilter: "this_month",
  activeCategoryFilter: null,
  activeTypeFilter: null,

  loadCategories: async (userId) => {
    logger.debug(CTX, "Loading categories", { userId });
    try {
      const categories = await dbGetCategories(userId);
      set({ categories });
      logger.debug(CTX, "Categories loaded", { count: categories.length });
    } catch (err) {
      logger.error(CTX, "Failed to load categories", err);
      set({ error: "Failed to load categories." });
    }
  },

  loadTransactions: async (userId, filter, categoryId, type) => {
    const f = filter ?? get().activeFilter;
    const { start, end } = getDateRange(f);
    logger.info(CTX, "Loading transactions", { userId, filter: f, start, end });
    set({ isLoading: true, error: null });
    try {
      const transactions = await dbGetTransactions(
        userId,
        start,
        end,
        type ?? get().activeTypeFilter ?? undefined
      );
      set({
        transactions,
        isLoading: false,
        activeFilter: f,
        activeCategoryFilter: categoryId ?? get().activeCategoryFilter,
        activeTypeFilter: type ?? get().activeTypeFilter,
      });
      logger.info(CTX, "Transactions loaded", { count: transactions.length });
    } catch (err) {
      logger.error(CTX, "Failed to load transactions", err);
      set({ error: "Failed to load transactions.", isLoading: false });
    }
  },

  addTransaction: async (userId, tx) => {
    logger.info(CTX, "Adding transaction", { name: tx.name });
    set({ isLoading: true, error: null });
    try {
      const newTx = await dbAddTransaction(userId, tx);
      set(state => ({
        transactions: [newTx, ...state.transactions],
        isLoading: false,
      }));
      return newTx;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add transaction.";
      logger.error(CTX, "Failed to add transaction", err);
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  updateTransaction: async (id, fields) => {
    logger.info(CTX, "Updating transaction", { id });
    set({ isLoading: true, error: null });
    try {
      const updated = await dbUpdateTransaction(id, fields);
      set(state => ({
        transactions: state.transactions.map(t => (t.id === id ? updated : t)),
        isLoading: false,
      }));
    } catch (err) {
      logger.error(CTX, "Failed to update transaction", err);
      set({ error: "Failed to update transaction.", isLoading: false });
      throw err;
    }
  },

  deleteTransaction: async (id) => {
    logger.warn(CTX, "Deleting transaction", { id });
    set({ isLoading: true, error: null });
    try {
      await dbDeleteTransaction(id);
      set(state => ({
        transactions: state.transactions.filter(t => t.id !== id),
        isLoading: false,
      }));
    } catch (err) {
      logger.error(CTX, "Failed to delete transaction", err);
      set({ error: "Failed to delete transaction.", isLoading: false });
    }
  },

  addCategory: async (userId, name, type, color, icon) => {
    logger.info(CTX, "Adding category", { name, type });
    try {
      const cat = await dbAddCategory(userId, name, type, color, icon);
      set(state => ({ categories: [...state.categories, cat] }));
    } catch (err) {
      logger.error(CTX, "Failed to add category", err);
      set({ error: "Failed to add category." });
      throw err;
    }
  },

  deleteCategory: async (id) => {
    logger.warn(CTX, "Deleting category", { id });
    try {
      await dbDeleteCategory(id);
      set(state => ({ categories: state.categories.filter(c => c.id !== id) }));
    } catch (err) {
      logger.error(CTX, "Failed to delete category", err);
    }
  },

  loadReportData: async (userId, startDate, endDate) => {
    logger.info(CTX, "Loading report data", { startDate, endDate });
    set({ isLoading: true, error: null });
    try {
      const [categoryTotals, monthlyTotals] = await Promise.all([
        dbGetCategoryTotals(userId, startDate, endDate),
        dbGetMonthlyTotals(userId, 12),
      ]);
      set({ categoryTotals, monthlyTotals, isLoading: false });
    } catch (err) {
      logger.error(CTX, "Failed to load report data", err);
      set({ error: "Failed to load report data.", isLoading: false });
    }
  },

  setFilter: (f) => set({ activeFilter: f }),
  setCategoryFilter: (id) => set({ activeCategoryFilter: id }),
  setTypeFilter: (t) => set({ activeTypeFilter: t }),
  clearError: () => set({ error: null }),
}));
