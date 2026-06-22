import { ShieldCheck, ShieldX, ShieldAlert, ShieldQuestion } from "lucide-react";

const STATES = {
  VALID: {
    icon: ShieldCheck,
    ring: "ring-brand-success/30",
    glow: "bg-brand-success/15",
    color: "text-brand-success",
    title: "Authentic",
    subtitle: "This transcript is authentic and unmodified.",
  },
  REVOKED: {
    icon: ShieldAlert,
    ring: "ring-brand-danger/30",
    glow: "bg-brand-danger/15",
    color: "text-brand-danger",
    title: "Revoked",
    subtitle: "This transcript has been revoked by the issuing institution.",
  },
  INVALID: {
    icon: ShieldX,
    ring: "ring-brand-danger/30",
    glow: "bg-brand-danger/15",
    color: "text-brand-danger",
    title: "Not Valid",
    subtitle: "This document does not match the on-chain record.",
  },
  NOT_FOUND: {
    icon: ShieldQuestion,
    ring: "ring-slate-300",
    glow: "bg-slate-200",
    color: "text-brand-muted",
    title: "No Record",
    subtitle: "No record found for this transcript ID.",
  },
};

/**
 * Big animated shield used on the verification portal.
 * @param {{ status: 'VALID'|'REVOKED'|'INVALID'|'NOT_FOUND' }} props
 */
export default function VerificationBadge({ status = "NOT_FOUND" }) {
  const s = STATES[status] || STATES.NOT_FOUND;
  const Icon = s.icon;
  return (
    <div className="flex flex-col items-center text-center animate-scale-in">
      <div className={`relative grid place-items-center rounded-full p-1 ring-8 ${s.ring}`}>
        <span className={`absolute inset-0 rounded-full blur-xl ${s.glow}`} aria-hidden />
        <span className="relative grid h-24 w-24 place-items-center rounded-full bg-white shadow-soft">
          <Icon className={`h-12 w-12 ${s.color}`} strokeWidth={2} />
        </span>
      </div>
      <h2 className={`mt-5 text-2xl font-bold ${s.color}`}>{s.title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-brand-muted">{s.subtitle}</p>
    </div>
  );
}
