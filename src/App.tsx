import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { AuthPage }        from "@/components/auth/AuthPage";
import { Sidebar }         from "@/components/layout/Sidebar";
import { TopBar }          from "@/components/layout/TopBar";
import { DashboardPage }   from "@/pages/DashboardPage";
import { TransactionsPage} from "@/pages/TransactionsPage";
import { ReportsPage }     from "@/pages/ReportsPage";
import { GoalsPage }       from "@/pages/GoalsPage";
import { SettingsPage }    from "@/pages/SettingsPage";

function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/"             element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"    element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/reports"      element={<ReportsPage />} />
            <Route path="/goals"        element={<GoalsPage />} />
            <Route path="/settings"     element={<SettingsPage />} />
            <Route path="*"             element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { user, isGuest } = useAuthStore();
  const isAuthenticated = !!user || isGuest;

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#f1f5f9",
            border: "1px solid #334155",
            borderRadius: "12px",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#22c55e", secondary: "#f1f5f9" } },
          error:   { iconTheme: { primary: "#ef4444", secondary: "#f1f5f9" } },
        }}
      />
      {isAuthenticated ? <AppShell /> : <AuthPage />}
    </BrowserRouter>
  );
}
