import { Loader2 } from "lucide-react";

/**
 * Inline loading spinner.
 * @param {{ size?: number, label?: string, className?: string }} props
 */
export default function LoadingSpinner({ size = 20, label, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 text-brand-muted ${className}`} role="status">
      <Loader2 className="animate-spin" style={{ width: size, height: size }} />
      {label && <span className="text-sm">{label}</span>}
    </span>
  );
}

/** Full-area centered spinner for page/section loading. */
export function PageSpinner({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LoadingSpinner size={28} label={label} />
    </div>
  );
}
