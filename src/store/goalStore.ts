import { create } from "zustand";
import { logger } from "@/services/logger";
import { notifyGoalProgress } from "@/services/notifications";
import { dbGetGoals, dbAddGoal, dbUpdateGoal, dbDeleteGoal } from "@/services/database";
import type { Goal, NewGoal } from "@/types";

const CTX = "goalStore";

interface GoalStore {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;

  loadGoals: (userId: number | null) => Promise<void>;
  addGoal: (userId: number | null, goal: NewGoal) => Promise<void>;
  updateGoal: (userId: number | null, id: number, fields: Partial<NewGoal>) => Promise<void>;
  deleteGoal: (userId: number | null, id: number) => Promise<void>;
  checkAndNotify: () => void;
  clearError: () => void;
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: [],
  isLoading: false,
  error: null,

  loadGoals: async (userId) => {
    logger.info(CTX, "Loading goals", { userId });
    set({ isLoading: true, error: null });
    try {
      const goals = await dbGetGoals(userId);
      set({ goals, isLoading: false });
      logger.info(CTX, "Goals loaded", { count: goals.length });
      get().checkAndNotify();
    } catch (err) {
      logger.error(CTX, "Failed to load goals", err);
      set({ error: "Failed to load goals.", isLoading: false });
    }
  },

  addGoal: async (userId, goal) => {
    logger.info(CTX, "Adding goal", { name: goal.name });
    set({ isLoading: true, error: null });
    try {
      await dbAddGoal(userId, goal);           // void — no return value
      const goals = await dbGetGoals(userId);  // re-fetch with auto-synced progress
      set({ goals, isLoading: false });
      logger.info(CTX, "Goal added and goals refreshed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add goal.";
      logger.error(CTX, "Failed to add goal", err);
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  updateGoal: async (userId, id, fields) => {
    logger.info(CTX, "Updating goal", { id });
    set({ isLoading: true, error: null });
    try {
      await dbUpdateGoal(id, fields);          // void — no return value
      const goals = await dbGetGoals(userId);  // re-fetch
      set({ goals, isLoading: false });
      logger.info(CTX, "Goal updated and goals refreshed");
    } catch (err) {
      logger.error(CTX, "Failed to update goal", err);
      set({ error: "Failed to update goal.", isLoading: false });
      throw err;
    }
  },

  deleteGoal: async (userId, id) => {
    logger.warn(CTX, "Deleting goal", { id });
    try {
      await dbDeleteGoal(id);
      const goals = await dbGetGoals(userId);
      set({ goals });
      logger.info(CTX, "Goal deleted");
    } catch (err) {
      logger.error(CTX, "Failed to delete goal", err);
      set({ error: "Failed to delete goal." });
    }
  },

  checkAndNotify: () => {
    for (const goal of get().goals) {
      notifyGoalProgress(goal.id, goal.name, goal.progress_percent, goal.is_on_track);
    }
  },

  clearError: () => set({ error: null }),
}));
