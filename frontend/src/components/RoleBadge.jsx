import { Shield, Building2, GraduationCap, Search } from "lucide-react";

const ROLE_CONFIG = {
  admin: { label: "Admin", icon: Shield, cls: "bg-brand-navy/10 text-brand-navy" },
  institution: { label: "Institution", icon: Building2, cls: "bg-brand-blue/10 text-brand-blue" },
  student: { label: "Student", icon: GraduationCap, cls: "bg-brand-accent/10 text-brand-accent" },
  verifier: { label: "Verifier", icon: Search, cls: "bg-brand-gold/15 text-amber-700" },
};

/** Color-coded role chip. @param {{ role: string }} props */
export default function RoleBadge({ role, className = "" }) {
  const cfg = ROLE_CONFIG[role] || {
    label: role || "User",
    icon: Shield,
    cls: "bg-slate-100 text-slate-600",
  };
  const Icon = cfg.icon;
  return (
    <span className={`badge ${cfg.cls} ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}
