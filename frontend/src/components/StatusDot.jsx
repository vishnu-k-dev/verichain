/** Small colored status indicator with label. */
export default function StatusDot({ ok, okText = "Yes", badText = "No" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-brand-success" : "bg-slate-300"}`} />
      <span className={ok ? "text-brand-navy" : "text-brand-muted"}>{ok ? okText : badText}</span>
    </span>
  );
}
