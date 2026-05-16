import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

export function SmartHero({
  eyebrow,
  title,
  subtitle,
  icon: Icon = Sparkles,
  actions,
  metrics = [],
  className = "",
}) {
  return (
    <motion.section
      {...fadeUp}
      className={`relative overflow-hidden rounded-[2rem] border theme-card p-5 sm:p-7 lg:p-8 mb-7 ${className}`}
    >
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_10%,color-mix(in_srgb,var(--accent)_22%,transparent),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(14,165,233,.16),transparent_30%)]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-40" />

      <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 theme-muted text-xs font-semibold theme-accent-text mb-4">
            <Icon size={14} />
            {eyebrow}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight theme-text">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 max-w-2xl text-sm sm:text-base theme-muted-text leading-6">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>

      {metrics.length > 0 && (
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 mt-7">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border theme-muted p-4"
            >
              <p className="text-[11px] uppercase tracking-[0.18em] theme-muted-text font-bold">
                {metric.label}
              </p>
              <p className="mt-2 text-xl sm:text-2xl font-black theme-text truncate">
                {metric.value}
              </p>
              {metric.caption && (
                <p className="mt-1 text-xs theme-muted-text truncate">{metric.caption}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}

export function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = "accent",
  trend,
}) {
  const tones = {
    accent: "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]",
    blue: "bg-blue-500/10 text-blue-500",
    green: "bg-emerald-500/10 text-emerald-500",
    orange: "bg-orange-500/10 text-orange-500",
    red: "bg-red-500/10 text-red-500",
    cyan: "bg-cyan-500/10 text-cyan-500",
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-3xl border theme-card p-5"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--accent)_16%,transparent),transparent_42%)]" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] theme-muted-text font-bold">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black theme-text truncate">{value}</p>
          {caption && <p className="mt-1 text-xs theme-muted-text">{caption}</p>}
          {trend && (
            <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold theme-accent-text">
              <ArrowUpRight size={13} />
              {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tones[tone] || tones.accent}`}>
            <Icon size={19} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function SmartSection({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`rounded-3xl border theme-card overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 border-b">
          <div>
            <h2 className="text-base font-black theme-text">{title}</h2>
            {subtitle && <p className="text-sm theme-muted-text mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function PersonAvatar({ name = "?", size = "md", status }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
  const sizes = {
    sm: "w-8 h-8 text-xs rounded-xl",
    md: "w-10 h-10 text-sm rounded-2xl",
    lg: "w-14 h-14 text-lg rounded-2xl",
  };
  return (
    <div className="relative shrink-0">
      <div className={`${sizes[size]} theme-accent-bg flex items-center justify-center text-white font-black shadow-lg shadow-[color-mix(in_srgb,var(--accent)_24%,transparent)]`}>
        {initials}
      </div>
      {status && (
        <span className={`absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-card)] ${status === "active" ? "bg-emerald-500" : "bg-amber-500"}`} />
      )}
    </div>
  );
}

export function MiniBarList({ items = [], valueKey = "value", labelKey = "label", format = (v) => v }) {
  const max = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1);
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm theme-muted-text">No data available yet.</p>
      ) : (
        items.map((item) => {
          const value = Number(item[valueKey] || 0);
          return (
            <div key={item.id || item[labelKey]}>
              <div className="flex items-center justify-between gap-3 text-sm mb-2">
                <span className="font-semibold theme-text truncate">{item[labelKey]}</span>
                <span className="theme-muted-text font-medium">{format(value)}</span>
              </div>
              <div className="h-2 rounded-full theme-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(4, (value / max) * 100)}%` }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full theme-accent-bg"
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export function ActivityTimeline({ items = [], empty = "No recent activity." }) {
  if (!items.length) {
    return <p className="text-sm theme-muted-text">{empty}</p>;
  }

  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <div key={item.id || `${item.title}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
          {index !== items.length - 1 && (
            <span className="absolute left-4 top-9 bottom-0 w-px bg-[var(--border-soft)]" />
          )}
          <div className={`relative z-10 w-8 h-8 rounded-xl flex items-center justify-center ${item.tone || "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]"}`}>
            {item.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold theme-text truncate">{item.title}</p>
              {item.value && <p className="text-sm font-black theme-text shrink-0">{item.value}</p>}
            </div>
            {item.meta && <p className="text-xs theme-muted-text mt-1">{item.meta}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FilterSurface({ children, className = "" }) {
  return (
    <div className={`rounded-3xl border theme-card p-3 sm:p-4 mb-5 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-3">{children}</div>
    </div>
  );
}
