import { useState } from "react";
import { DollarSign, Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import type { AuthMode } from "@/types";

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("choose");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { signUp, signIn, enterGuest, isLoading, error, clearError } = useAuthStore();

  function handleModeChange(m: AuthMode) {
    clearError();
    setMode(m);
    setName("");
    setEmail("");
    setPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup") await signUp(email, password, name);
    else if (mode === "signin") await signIn(email, password);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mb-4">
            <DollarSign size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">FinTracker</h1>
          <p className="text-slate-500 text-sm mt-1">Personal Finance Manager</p>
        </div>

        <div className="card p-6">
          {/* Choose mode */}
          {mode === "choose" && (
            <div className="space-y-3">
              <button
                onClick={() => handleModeChange("signup")}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <User size={16} /> Create Account
              </button>
              <button
                onClick={() => handleModeChange("signin")}
                className="w-full btn-ghost flex items-center justify-center gap-2"
              >
                <Mail size={16} /> Sign In
              </button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-slate-900 px-3 text-xs text-slate-500">or</span>
                </div>
              </div>
              <button
                onClick={enterGuest}
                className="w-full flex items-center justify-center gap-2 text-sm text-slate-400
                           hover:text-slate-200 transition-colors py-2"
              >
                Continue as Guest <ArrowRight size={14} />
              </button>
              <p className="text-xs text-slate-600 text-center">
                Guest data is stored locally and cleared on sign-out.
              </p>
            </div>
          )}

          {/* Sign Up / Sign In Form */}
          {(mode === "signup" || mode === "signin") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">
                  {mode === "signup" ? "Create Account" : "Sign In"}
                </h2>
                <button
                  type="button"
                  onClick={() => handleModeChange("choose")}
                  className="text-sm text-slate-500 hover:text-slate-300"
                >
                  Back
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400
                                text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              {mode === "signup" && (
                <div>
                  <label className="label">Full Name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your name"
                      className="input pl-9"
                      autoFocus
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input pl-9"
                    autoFocus={mode === "signin"}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Min. 6 characters" : "••••••••"}
                    className="input pl-9 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500
                               hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full btn-primary mt-2">
                {isLoading
                  ? "Please wait…"
                  : mode === "signup"
                  ? "Create Account"
                  : "Sign In"}
              </button>

              <p className="text-center text-sm text-slate-500">
                {mode === "signup" ? "Already have an account? " : "No account? "}
                <button
                  type="button"
                  onClick={() => handleModeChange(mode === "signup" ? "signin" : "signup")}
                  className="text-brand-400 hover:text-brand-300 font-medium"
                >
                  {mode === "signup" ? "Sign In" : "Create one"}
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
