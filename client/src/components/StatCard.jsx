export default function StatCard({ label, value, sub, gradient = "from-brand-500 to-accent-500", icon }) {
  return (
    <div className="card p-5 relative overflow-hidden group">
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{value}</div>
          {sub && <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{sub}</div>}
        </div>
        {icon && (
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md shrink-0`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
