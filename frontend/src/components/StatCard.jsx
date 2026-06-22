/**
 * Dashboard metric card.
 * @param {{ icon: React.ComponentType, label: string, value: React.ReactNode, accent?: string, hint?: string }} props
 */
export default function StatCard({ icon: Icon, label, value, accent = "text-brand-accent bg-brand-accent/10", hint }) {
  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-brand-muted">{label}</p>
          <p className="mt-1 text-3xl font-bold font-heading text-brand-navy">{value}</p>
          {hint && <p className="mt-1 text-xs text-brand-muted">{hint}</p>}
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
