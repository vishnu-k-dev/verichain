import { Check, Loader2 } from "lucide-react";

/**
 * 3-step issuance progress indicator.
 * @param {{ steps: string[], current: number, error?: boolean }} props
 *   current: index of the active step; steps before it are done.
 *   Use current >= steps.length to mark everything complete.
 */
export default function StepProgress({ steps, current, error = false }) {
  return (
    <ol className="space-y-3">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current && !error;
        const failed = i === current && error;
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={[
                "grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold transition",
                done && "border-brand-success bg-brand-success text-white",
                active && "border-brand-accent bg-brand-accent/10 text-brand-accent",
                failed && "border-brand-danger bg-brand-danger/10 text-brand-danger",
                !done && !active && !failed && "border-slate-300 text-slate-400",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {done ? (
                <Check className="h-4 w-4" />
              ) : active ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                i + 1
              )}
            </span>
            <span
              className={[
                "text-sm font-medium",
                done && "text-brand-navy",
                active && "text-brand-navy",
                failed && "text-brand-danger",
                !done && !active && !failed && "text-slate-400",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
