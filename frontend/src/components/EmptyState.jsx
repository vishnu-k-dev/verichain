/**
 * Friendly empty placeholder.
 * @param {{ icon: React.ComponentType, title: string, desc?: string, children?: React.ReactNode }} props
 */
export default function EmptyState({ icon: Icon, title, desc, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-brand-muted">
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="mt-4 font-heading text-lg font-semibold text-brand-navy">{title}</h3>
      {desc && <p className="mt-1 max-w-sm text-sm text-brand-muted">{desc}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
