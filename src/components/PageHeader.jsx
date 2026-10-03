// Page title in the SAIP / FIP style. `icon` is a lucide-react icon component (e.g. icon={BookOpen});
// a plain string still works for older callers.
export default function PageHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-white shrink-0">
            {typeof Icon === 'string' ? <span className="text-lg">{Icon}</span> : <Icon className="h-5 w-5" />}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ink-500 mt-0.5 max-w-3xl">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
