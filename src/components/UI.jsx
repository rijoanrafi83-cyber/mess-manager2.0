import { motion } from "framer-motion";
import { Loader2, X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
export function PageWrapper({ children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className={`min-h-full p-4 sm:p-6 md:p-8 max-w-7xl mx-auto overflow-x-hidden theme-app ${className}`}
    >
      {children}
    </motion.div>
  );
}
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold theme-text tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm theme-muted-text mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
    </div>
  );
}
export function StatCard({ label, value, sub, icon: Icon, iconBg = "bg-violet-500/15", iconColor = "text-violet-500", trend, trendUp }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="theme-card theme-hover border rounded-2xl p-5 flex items-start gap-4"
    >
      {Icon && (
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className={iconColor} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs theme-muted-text font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold theme-text">{value}</p>
        {sub && <p className="text-xs theme-muted-text mt-0.5">{sub}</p>}
        {trend && (
          <p className={`text-xs font-medium mt-1 ${trendUp ? "text-green-500" : "text-red-500"}`}>
            {trendUp ? "↑" : "↓"} {trend}
          </p>
        )}
      </div>
    </motion.div>
  );
}
export function Card({ children, className = "", noPad = false }) {
  return (
    <div className={`theme-card theme-gradient-border border rounded-2xl overflow-hidden ${noPad ? "" : "p-4 sm:p-6"} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, actions, className = "" }) {
  return (
    <div className={`flex items-center justify-between gap-4 mb-6 ${className}`}>
      <div>
        <h3 className="font-semibold theme-text text-sm">{title}</h3>
        {subtitle && <p className="text-xs theme-muted-text mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
const btnBase = "inline-flex items-center gap-2 font-medium rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--accent)_22%,transparent)]";
const btnSizes = {
  xs: "px-2.5 py-1.5 text-xs",
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};
const btnVariants = {
  primary: "theme-accent-bg hover:brightness-110 active:scale-[.98] text-white shadow-lg shadow-[color-mix(in_srgb,var(--accent)_22%,transparent)]",
  secondary: "theme-muted hover:bg-[var(--bg-card)] theme-subtext",
  danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500",
  ghost: "hover:bg-[var(--bg-card-muted)] theme-subtext hover:text-[var(--text-primary)]",
  success: "bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400",
};

export function Button({ children, variant = "primary", size = "md", loading = false, className = "", ...props }) {
  return (
    <button
      className={`${btnBase} ${btnSizes[size]} ${btnVariants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}
export function Input({ label, error, helper, className = "", wrapperClass = "", ...props }) {
  return (
    <div className={`space-y-1.5 ${wrapperClass}`}>
      {label && (
        <label className="block text-xs font-medium theme-subtext">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        className={`w-full px-3 py-2.5 rounded-xl text-sm theme-field border
          ${error ? "border-red-500 focus:ring-red-500" : "theme-focus"}
          placeholder:text-gray-400 dark:placeholder:text-gray-600
          focus:outline-none transition-all ${className}`}
        {...props}
      />
      {error  && <p className="text-xs text-red-500">{error}</p>}
      {helper && <p className="text-xs theme-muted-text">{helper}</p>}
    </div>
  );
}
export function Select({ label, error, className = "", wrapperClass = "", children, ...props }) {
  return (
    <div className={`space-y-1.5 ${wrapperClass}`}>
      {label && <label className="block text-xs font-medium theme-subtext">{label}</label>}
      <select
        className={`w-full px-3 py-2.5 rounded-xl text-sm theme-field border
          ${error ? "border-red-500" : "theme-focus"}
          focus:outline-none transition-all ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
export function Textarea({ label, error, className = "", wrapperClass = "", ...props }) {
  return (
    <div className={`space-y-1.5 ${wrapperClass}`}>
      {label && <label className="block text-xs font-medium theme-subtext">{label}</label>}
      <textarea
        rows={3}
        className={`w-full px-3 py-2.5 rounded-xl text-sm theme-field border
          ${error ? "border-red-500" : "theme-focus"}
          placeholder:text-gray-400 dark:placeholder:text-gray-600
          focus:outline-none transition-all resize-none ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
export function Modal({ open, onClose, title, subtitle, children, size = "md" }) {
  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl", "2xl": "max-w-3xl" };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`relative w-full ${widths[size]} glass-popover rounded-2xl max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-start justify-between p-6 pb-0 flex-shrink-0">
          <div>
            <h2 className="font-bold theme-text text-base">{title}</h2>
            {subtitle && <p className="text-sm theme-muted-text mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 rounded-lg hover:bg-[var(--bg-card-muted)] transition-colors flex-shrink-0 theme-focus"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </motion.div>
    </div>
  );
}
const badgeVariants = {
  default:  "theme-muted text-gray-700 dark:text-gray-300",
  success:  "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400",
  warning:  "bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  danger:   "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400",
  info:     "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400",
  purple:   "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400",
};

export function Badge({ children, variant = "default", className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ring-white/10 ${badgeVariants[variant]} ${className}`}>
      {children}
    </span>
  );
}
export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse theme-muted rounded-xl ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="theme-card border rounded-2xl p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl theme-muted flex items-center justify-center mb-4">
          <Icon size={24} className="text-gray-400" />
        </div>
      )}
      <p className="font-semibold theme-text mb-1">{title}</p>
      {description && <p className="text-sm theme-muted-text max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function Table({ columns, data, onRowClick, loading, emptyState }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }
  if (!data?.length) return emptyState || null;
  return (
    <div className="overflow-x-auto rounded-2xl border theme-muted">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-[color-mix(in_srgb,var(--bg-elevated)_64%,transparent)]">
            {columns.map((col) => (
              <th key={col.key} className={`text-left py-3 px-4 text-xs font-semibold theme-muted-text uppercase tracking-wider ${col.className || ""}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-soft)]">
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick?.(row)}
              className={`transition-colors ${onRowClick ? "cursor-pointer hover:bg-[var(--bg-card)]" : ""}`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`py-3.5 px-4 theme-subtext ${col.className || ""}`}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
import { Search } from "lucide-react";
export function SearchInput({ value, onChange, placeholder = "Search...", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 theme-muted-text" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm theme-field border placeholder:text-gray-400 focus:outline-none theme-focus transition-all"
      />
    </div>
  );
}
const alertConfig = {
  info:    { Icon: Info,          bg: "bg-blue-50 dark:bg-blue-500/10",   text: "text-blue-700 dark:text-blue-400",   border: "border-blue-200 dark:border-blue-500/20" },
  success: { Icon: CheckCircle,   bg: "bg-green-50 dark:bg-green-500/10", text: "text-green-700 dark:text-green-400", border: "border-green-200 dark:border-green-500/20" },
  warning: { Icon: AlertTriangle, bg: "bg-yellow-50 dark:bg-yellow-500/10", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-200 dark:border-yellow-500/20" },
  danger:  { Icon: AlertCircle,   bg: "bg-red-50 dark:bg-red-500/10",     text: "text-red-700 dark:text-red-400",     border: "border-red-200 dark:border-red-500/20" },
};

export function Alert({ type = "info", title, children }) {
  const { Icon, bg, text, border } = alertConfig[type];
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${bg} ${border}`}>
      <Icon size={16} className={`${text} flex-shrink-0 mt-0.5`} />
      <div>
        {title && <p className={`font-medium text-sm ${text} mb-0.5`}>{title}</p>}
        <p className={`text-sm ${text} opacity-80`}>{children}</p>
      </div>
    </div>
  );
}
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5.5 rounded-full transition-colors ${checked ? "bg-violet-600" : "bg-gray-300 dark:bg-white/20"}`}
      >
        <motion.div
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
        />
      </div>
      {label && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
    </label>
  );
}
export function NumberInput({ label, value, onChange, min = 0, max = 99, className = "" }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, Number(value) - 1))}
          className="w-8 h-8 rounded-lg theme-muted text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-[var(--bg-card)] transition-colors text-lg font-bold"
        >−</button>
        <span className="w-10 text-center text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, Number(value) + 1))}
          className="w-8 h-8 rounded-lg theme-muted text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-[var(--bg-card)] transition-colors text-lg font-bold"
        >+</button>
      </div>
    </div>
  );
}
