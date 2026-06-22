import { ShieldCheck } from "lucide-react";

/**
 * Brand wordmark. @param {{ size?: 'sm'|'md'|'lg', withText?: boolean }} props
 */
export default function Logo({ size = "md", withText = true }) {
  const dims = { sm: 28, md: 36, lg: 44 }[size];
  const text = { sm: "text-lg", md: "text-xl", lg: "text-2xl" }[size];
  return (
    <div className="flex items-center gap-2.5 select-none">
      <span
        className="grid place-items-center rounded-xl bg-brand-navy text-white shadow-soft"
        style={{ width: dims, height: dims }}
      >
        <ShieldCheck style={{ width: dims * 0.58, height: dims * 0.58 }} className="text-brand-accent" />
      </span>
      {withText && (
        <span className={`font-heading font-bold tracking-tight ${text}`}>
          Veri<span className="text-brand-accent">Chain</span>
        </span>
      )}
    </div>
  );
}
