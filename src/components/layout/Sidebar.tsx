import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Target,
  DollarSign,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard",    icon: LayoutDashboard, label: "Dashboard"    },
  { to: "/transactions", icon: ArrowLeftRight,  label: "Transactions" },
  { to: "/reports",      icon: BarChart3,       label: "Reports"      },
  { to: "/goals",        icon: Target,          label: "Goals"        },
  { to: "/settings",     icon: Settings,        label: "Settings"     },
];

export function Sidebar() {
  return (
    <aside className="w-[220px] shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[60px] border-b border-slate-800">
        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
          <DollarSign size={18} className="text-white" />
        </div>
        <span className="font-semibold text-slate-100 text-[15px] tracking-tight">
          FinTracker
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
               ${
                 isActive
                   ? "bg-brand-600/20 text-brand-400"
                   : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
               }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? "text-brand-400" : "text-slate-500"} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Version */}
      <div className="px-5 pb-4 text-xs text-slate-600">v1.0.0</div>
    </aside>
  );
}
