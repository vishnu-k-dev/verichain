import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FilePlus2,
  Users,
  Building2,
  ShieldCheck,
  ScanLine,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import Logo from "./Logo.jsx";
import RoleBadge from "./RoleBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const NAV = {
  common: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  institution: [
    { to: "/institution/issue", label: "Issue Transcript", icon: FilePlus2 },
    { to: "/institution/students", label: "Students", icon: Users },
  ],
  admin: [{ to: "/admin/institutions", label: "Institutions", icon: Building2 }],
  student: [],
  verifier: [],
  public: [
    { to: "/verify", label: "Verify", icon: ShieldCheck },
    { to: "/scan", label: "Scan QR", icon: ScanLine },
  ],
};

export default function AppLayout({ children }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = [...NAV.common, ...(NAV[role] || []), ...NAV.public];

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = (user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen lg:flex">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-brand-navy/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/dashboard" onClick={() => setOpen(false)}>
            <Logo size="sm" />
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5 text-brand-muted" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-brand-accent/10 text-brand-accent"
                    : "text-brand-muted hover:bg-slate-100 hover:text-brand-navy",
                ].join(" ")
              }
            >
              <l.icon className="h-[18px] w-[18px]" />
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <button onClick={onLogout} className="btn-ghost w-full justify-start">
            <LogOut className="h-[18px] w-[18px]" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-5 backdrop-blur">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5 text-brand-navy" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <RoleBadge role={role} />
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-navy text-xs font-bold text-white">
                {initials}
              </span>
              <div className="hidden sm:block">
                <p className="max-w-[180px] truncate text-sm font-semibold text-brand-navy">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
