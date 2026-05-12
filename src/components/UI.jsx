// src/components/UI.jsx
// All shared primitive UI components

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

export function EmptyState({ icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <span className="text-5xl">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{desc}</p>
    </div>
  );
}

export function ConfirmDialog({ open, title, desc, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{desc}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all placeholder-gray-400 dark:placeholder-gray-500";
export const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export function Avatar({ name = "?", size = 8 }) {
  const colors = [
    "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400",
    "bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-400",
    "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400",
    "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400",
    "bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

export function Card({ title, sub, children, action }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      {(title || sub || action) && (
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <div>
            {title && <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>}
            {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function PageHeader({ title, sub, badge }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        {sub && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {badge && (
        <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-full text-sm font-medium flex-shrink-0">
          {badge}
        </span>
      )}
    </div>
  );
}

export function StatusBadge({ value }) {
  const ok = value >= 0;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap
      ${ok ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
           : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
      {ok ? `Advance ৳${value.toFixed(2)}` : `Due ৳${Math.abs(value).toFixed(2)}`}
    </span>
  );
}

export function BtnPrimary({ onClick, disabled, children, className = "" }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
      {children}
    </button>
  );
}

export function BtnSecondary({ onClick, children }) {
  return (
    <button onClick={onClick}
      className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors">
      {children}
    </button>
  );
}

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  const cl = { success: "bg-emerald-500", error: "bg-red-500", info: "bg-indigo-500", warning: "bg-amber-500" };
  return (
    <div className="fixed top-4 right-4 z-[999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`${cl[t.type] || cl.info} text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl`}>
          {t.type === "success" ? "✓ " : t.type === "error" ? "✗ " : "ℹ "}{t.msg}
        </div>
      ))}
    </div>
  );
}