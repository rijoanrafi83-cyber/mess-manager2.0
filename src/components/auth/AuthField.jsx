import { motion } from "framer-motion";

export function AuthField({
  label,
  icon: Icon,
  action,
  error,
  className = "",
  ...props
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider theme-muted-text">
        {label}
      </span>
      <span className="relative block">
        {Icon && (
          <Icon
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 theme-muted-text"
          />
        )}
        <input
          {...props}
          className={`theme-field theme-focus w-full rounded-2xl border py-3.5 text-sm outline-none placeholder:text-[color-mix(in_srgb,var(--text-muted)_72%,transparent)] ${
            Icon ? "pl-12" : "pl-4"
          } ${action ? "pr-14" : "pr-4"} ${
            error ? "border-red-500" : ""
          }`}
        />
        {action && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {action}
          </span>
        )}
      </span>
      {error && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 block text-xs font-semibold text-red-500"
        >
          {error}
        </motion.span>
      )}
    </label>
  );
}

export function IconButton({
  children,
  label,
  ...props
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="theme-focus rounded-lg p-1.5 theme-muted-text hover:bg-[var(--bg-card-muted)] hover:text-[var(--text-primary)]"
      {...props}
    >
      {children}
    </button>
  );
}
