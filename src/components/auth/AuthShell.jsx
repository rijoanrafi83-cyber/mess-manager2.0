import { motion } from "framer-motion";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Moon,
  Sun,
  UtensilsCrossed,
} from "lucide-react";

import { useTheme } from "../../context/ThemeContext";

export function AuthShell({
  eyebrow = "Smart mess operations",
  title,
  subtitle,
  children,
  sideTitle = "Run your mess with clarity.",
  sideText = "Track members, meals, bazaar, deposits, billing, and reports from one calm workspace.",
}) {
  const { dark, setDark, themePreset } = useTheme();

  return (
    <main className="min-h-screen theme-app relative overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,color-mix(in_srgb,var(--accent)_13%,transparent),transparent_34%,color-mix(in_srgb,var(--chart-2)_10%,transparent)_72%,transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--bg-elevated)_48%,transparent),transparent_58%)]" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="hidden lg:block"
        >
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border theme-muted px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] theme-muted-text">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            {themePreset.label} Workspace
          </div>

          <h1 className="max-w-xl text-5xl font-black leading-[1.02] tracking-tight theme-text">
            {sideTitle}
          </h1>

          <p className="mt-5 max-w-xl text-base leading-8 theme-subtext">
            {sideText}
          </p>

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {[
              ["Meals", "Live ledger"],
              ["Bills", "Auto totals"],
              ["Reports", "Clean exports"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border theme-card p-4"
              >
                <p className="text-xs uppercase tracking-wider theme-muted-text">
                  {label}
                </p>
                <p className="mt-2 text-sm font-bold theme-text">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="mx-auto w-full max-w-md"
        >
          <div className="theme-card theme-gradient-border rounded-[2rem] border p-5 shadow-2xl sm:p-7">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl theme-accent-bg text-white shadow-lg shadow-[color-mix(in_srgb,var(--accent)_24%,transparent)]">
                  <UtensilsCrossed size={22} />
                </div>
                <div>
                  <p className="text-sm font-black theme-text">
                    MessManager
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider theme-muted-text">
                    Smart Manager
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDark((value) => !value)}
                className="theme-focus rounded-xl border theme-muted p-2 theme-subtext hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
                aria-label="Toggle color mode"
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>

            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] theme-accent-text">
                {eyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight theme-text">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-2 text-sm leading-6 theme-subtext">
                  {subtitle}
                </p>
              )}
            </div>

            {children}
          </div>
        </motion.section>
      </div>
    </main>
  );
}

export function AuthStatus({
  type = "error",
  children,
}) {
  if (!children) return null;

  const isSuccess = type === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
        isSuccess
          ? "border-green-500/25 bg-green-500/10 text-green-500"
          : "border-red-500/25 bg-red-500/10 text-red-500"
      }`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </motion.div>
  );
}

export function AuthButton({
  loading,
  loadingText,
  children,
  ...props
}) {
  return (
    <motion.button
      whileHover={{ y: props.disabled || loading ? 0 : -1 }}
      whileTap={{ scale: props.disabled || loading ? 1 : 0.985 }}
      disabled={loading || props.disabled}
      className="theme-accent-bg theme-focus flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-black text-white shadow-xl shadow-[color-mix(in_srgb,var(--accent)_25%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
