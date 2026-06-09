import { create } from "zustand";
import { logger } from "@/services/logger";
import { dbCreateUser, dbGetUserByEmail } from "@/services/database";
import type { User } from "@/types";

const CTX = "authStore";

// ─── Web Crypto password hashing (PBKDF2) ────────────────────────────────────
// Works natively in Tauri webview and any modern browser — no Node deps needed.

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  // Random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 },
    keyMaterial,
    256
  );
  // Encode as hex: "salt$hash"
  const toHex = (buf: ArrayBuffer) =>
    Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  return `${toHex(salt.buffer)}$${toHex(bits)}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = stored.split("$");
    if (!saltHex || !hashHex) return false;

    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 },
      keyMaterial,
      256
    );
    const candidate = Array.from(new Uint8Array(bits))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    return candidate === hashHex;
  } catch {
    return false;
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface AuthStore {
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;

  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  enterGuest: () => void;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isGuest: false,
  isLoading: false,
  error: null,

  signUp: async (email, password, name) => {
    set({ isLoading: true, error: null });
    logger.info(CTX, "Sign-up attempt", { email });
    try {
      if (!email || !password || !name) throw new Error("All fields are required.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");

      const existing = await dbGetUserByEmail(email);
      if (existing) throw new Error("An account with this email already exists.");

      const hash = await hashPassword(password);
      const user = await dbCreateUser(email, hash, name);

      logger.info(CTX, "User created", { userId: user.id, email });
      set({ user, isGuest: false, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-up failed. Please try again.";
      logger.error(CTX, "Sign-up error", err);
      set({ error: msg, isLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    logger.info(CTX, "Sign-in attempt", { email });
    try {
      if (!email || !password) throw new Error("Email and password required.");

      const row = await dbGetUserByEmail(email);
      if (!row) throw new Error("No account found with this email.");

      const valid = await verifyPassword(password, row.password_hash);
      if (!valid) throw new Error("Incorrect password.");

      const user: User = {
        id: row.id,
        email: row.email,
        name: row.name,
        created_at: row.created_at,
      };

      logger.info(CTX, "Sign-in successful", { userId: user.id });
      set({ user, isGuest: false, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      logger.error(CTX, "Sign-in error", err);
      set({ error: msg, isLoading: false });
    }
  },

  enterGuest: () => {
    logger.info(CTX, "Guest mode entered");
    set({ user: null, isGuest: true, error: null });
  },

  signOut: () => {
    logger.info(CTX, "User signed out");
    set({ user: null, isGuest: false, error: null });
  },

  refreshUser: async () => {
    const current = (useAuthStore.getState()).user;
    if (!current) return;
    try {
      const row = await dbGetUserByEmail(current.email);
      if (row) {
        set({
          user: { id: row.id, email: row.email, name: row.name, created_at: row.created_at },
        });
        logger.info(CTX, "User refreshed", { name: row.name });
      }
    } catch (err) {
      logger.warn(CTX, "Failed to refresh user", err);
    }
  },

  clearError: () => set({ error: null }),
}));
