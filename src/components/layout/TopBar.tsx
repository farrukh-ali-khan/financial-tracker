import { useState } from "react";
import { LogOut, User, AlertTriangle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const TITLES: Record<string, string> = {
  "/dashboard":    "Dashboard",
  "/transactions": "Transactions",
  "/reports":      "Reports & Analytics",
  "/goals":        "Savings Goals",
  "/settings":     "Settings",
};

export function TopBar() {
  const location = useLocation();
  const { user, isGuest, signOut } = useAuthStore();
  const [showGuestWarning, setShowGuestWarning] = useState(false);

  const title       = TITLES[location.pathname] ?? "Financial Tracker";
  const displayName = isGuest ? "Guest" : (user?.name || user?.email || "User");

  function handleSignOutClick() {
    if (isGuest) {
      // Warn guest that all data will be lost
      setShowGuestWarning(true);
    } else {
      signOut();
    }
  }

  return (
    <>
      <header className="h-[60px] px-6 flex items-center justify-between border-b border-slate-800 bg-slate-900 shrink-0">
        <h1 className="text-lg font-semibold text-slate-100 tracking-tight">{title}</h1>

        <div className="flex items-center gap-3">
          {/* User badge */}
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl">
            <User size={14} className="text-slate-400" />
            <span className="text-sm text-slate-300">{displayName}</span>
            {isGuest && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md">
                Guest
              </span>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOutClick}
            title={isGuest ? "Exit guest mode" : "Sign out"}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400
                       hover:bg-slate-800 hover:text-slate-200 transition-all"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Guest sign-out warning modal */}
      {showGuestWarning && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 animate-slide-up">
            {/* Icon + title */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">Leave Guest Mode?</h3>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  All your guest data — transactions, goals, and categories — will be
                  <span className="text-red-400 font-medium"> permanently deleted</span> when
                  you exit. This cannot be undone.
                </p>
              </div>
            </div>

            {/* Tip */}
            <div className="bg-slate-800/60 rounded-xl p-3 text-xs text-slate-500 leading-relaxed">
              💡 <span className="text-slate-400">Tip:</span> Create a free account to save
              your data permanently and access it anytime.
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowGuestWarning(false)}
                className="btn-ghost flex-1"
              >
                Stay in Guest Mode
              </button>
              <button
                onClick={() => { setShowGuestWarning(false); signOut(); }}
                className="btn-danger flex-1"
              >
                Exit & Delete Data
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
