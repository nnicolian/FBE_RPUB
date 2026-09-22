export default function PageHeader({ icon, title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-navy to-brand text-white flex items-center justify-center text-xl shrink-0">
          {icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight">{title}</h1>
          {subtitle && <p className="text-slate-500 text-sm">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
