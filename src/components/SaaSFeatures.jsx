import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  ChevronRight,
  Cloud,
  CloudOff,
  Download,
  LayoutDashboard,
  Search,
  Trash2,
  UtensilsCrossed,
  BarChart3,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import {
  clearNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/firestoreService";

function formatTime(value) {
  const date =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value?.seconds
        ? new Date(value.seconds * 1000)
        : value
          ? new Date(value)
          : null;

  if (!date || Number.isNaN(date.getTime())) return "Just now";

  return new Intl.DateTimeFormat([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function SyncIndicator({ online, loading, pendingWrites = false }) {
  const state = !online
    ? {
        label: "Offline",
        icon: WifiOff,
        tone: "text-amber-400 bg-amber-500/10",
      }
    : loading || pendingWrites
      ? {
          label: "Syncing",
          icon: Cloud,
          tone: "text-cyan-400 bg-cyan-500/10",
        }
      : {
          label: "Saved",
          icon: Wifi,
          tone: "text-emerald-400 bg-emerald-500/10",
        };
  const Icon = state.icon;

  return (
    <div
      className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold sm:flex ${state.tone}`}
      title="Realtime sync state"
    >
      <Icon size={14} />
      {state.label}
    </div>
  );
}

export function InstallCTA({ pwa }) {
  if (pwa.installed) return null;

  return (
    <button
      type="button"
      onClick={pwa.canInstall ? pwa.install : undefined}
      className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold theme-muted-text transition hover:bg-white/10 hover:text-[var(--text-primary)] lg:flex"
      title={
        pwa.isiOS
          ? "On iPhone, use Share then Add to Home Screen"
          : "Install MessManager"
      }
    >
      <Download size={14} />
      Install App
    </button>
  );
}

export function NotificationsCenter({
  ownerId,
  notifications = [],
  open,
  onToggle,
}) {
  const unreadCount = notifications.filter((item) => !item.read).length;
  const grouped = useMemo(() => {
    const groups = new Map();

    notifications.forEach((item) => {
      const key = item.category || item.type || "general";
      groups.set(key, [...(groups.get(key) || []), item]);
    });

    return [...groups.entries()];
  }, [notifications]);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="relative rounded-xl p-2.5 transition-all hover:bg-white/10"
        title="Notifications"
      >
        <Bell size={20} className="theme-subtext" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 z-[150] mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border theme-card shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b p-4">
              <div>
                <h3 className="font-semibold theme-text">Notifications</h3>
                <p className="text-xs theme-muted-text">
                  {unreadCount} unread
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => markAllNotificationsRead(ownerId)}
                  className="rounded-lg p-2 hover:bg-white/10"
                  title="Mark all read"
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => clearNotifications(ownerId)}
                  className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                  title="Clear notifications"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {grouped.length > 0 ? (
                grouped.map(([category, items]) => (
                  <section key={category} className="border-b last:border-b-0">
                    <p className="px-4 pt-3 text-[11px] font-black uppercase tracking-wider theme-muted-text">
                      {category}
                    </p>
                    {items.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => markNotificationRead(item.id)}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/10"
                      >
                        <span
                          className={`mt-1 h-2.5 w-2.5 rounded-full ${
                            item.read ? "bg-slate-500/40" : "bg-violet-500"
                          }`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold theme-text">
                            {item.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 theme-muted-text">
                            {item.message}
                          </span>
                          <span className="mt-1 block text-[11px] theme-muted-text">
                            {formatTime(item.createdAt)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </section>
                ))
              ) : (
                <div className="p-8 text-center text-sm theme-muted-text">
                  No notifications
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ActivityLogViewer({ logs = [] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        const haystack = `${log.title} ${log.message} ${log.actorName} ${log.type}`.toLowerCase();
        const matchesQuery = haystack.includes(query.toLowerCase());
        const matchesType = type === "all" || log.type === type;
        return matchesQuery && matchesType;
      }),
    [logs, query, type]
  );

  const types = ["all", ...new Set(logs.map((log) => log.type).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <label className="relative block">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 theme-muted-text"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search logs"
            className="w-full rounded-2xl border theme-field py-3 pl-10 pr-3 text-sm outline-none"
          />
        </label>
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="rounded-2xl border theme-field px-3 py-3 text-sm outline-none"
        >
          {types.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "All types" : item}
            </option>
          ))}
        </select>
      </div>

      <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {filtered.slice(0, 60).map((log) => (
          <div
            key={log.id}
            className="rounded-2xl border theme-muted p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold theme-text">
                  {log.title}
                </p>
                <p className="mt-1 text-xs leading-5 theme-muted-text">
                  {log.actorName || "Workspace user"} · {log.device || "Device"} · {log.browser || "Browser"}
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold theme-subtext">
                {log.action}
              </span>
            </div>
            {log.message && (
              <p className="mt-2 text-xs theme-muted-text">{log.message}</p>
            )}
            <p className="mt-3 text-[11px] theme-muted-text">
              {formatTime(log.createdAt)}
            </p>
          </div>
        ))}

        {!filtered.length && (
          <div className="rounded-2xl border theme-muted p-8 text-center text-sm theme-muted-text">
            No activity logs match the filter.
          </div>
        )}
      </div>
    </div>
  );
}

export function MobileBottomNav({ items = [] }) {
  const allowed = items.filter((item) =>
    ["/dashboard", "/meals", "/reports", "/settings"].includes(item.to)
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[120] border-t theme-topbar px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {allowed.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition ${
                isActive
                  ? "theme-accent-bg text-white"
                  : "theme-muted-text hover:bg-white/10"
              }`
            }
          >
            <Icon size={18} />
            <span className="leading-none">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function OnboardingModal({ open, onClose }) {
  const [step, setStep] = useState(0);
  const slides = [
    {
      icon: LayoutDashboard,
      title: "Welcome to your workspace",
      text: "Track meals, bazaar, deposits, reports, and due risk from one responsive dashboard.",
    },
    {
      icon: UtensilsCrossed,
      title: "Meal workflow",
      text: "Add daily meals, keep permanent meal automation active, and review member consumption trends.",
    },
    {
      icon: BarChart3,
      title: "Reports and insights",
      text: "Use reports for monthly settlement, exports, smart insights, and achievement cards.",
    },
    {
      icon: Cloud,
      title: "Mobile and offline",
      text: "Install the app, keep working during weak network, and watch sync status in the topbar.",
    },
  ];
  const active = slides[step];
  const Icon = active.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[220] grid place-items-center bg-black/60 p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border theme-card"
          >
            <div className="flex items-center justify-between border-b p-4">
              <p className="text-sm font-bold theme-text">Workspace Welcome</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                <Icon size={26} />
              </div>
              <h2 className="text-2xl font-black theme-text">{active.title}</h2>
              <p className="mt-3 text-sm leading-6 theme-muted-text">
                {active.text}
              </p>
              <div className="mt-6 flex items-center gap-2">
                {slides.map((slide, index) => (
                  <button
                    key={slide.title}
                    type="button"
                    onClick={() => setStep(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === step
                        ? "w-8 bg-[var(--accent)]"
                        : "w-2 bg-white/20"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t p-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-bold theme-muted-text hover:bg-white/10"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() =>
                  step === slides.length - 1 ? onClose() : setStep(step + 1)
                }
                className="inline-flex items-center gap-2 rounded-xl theme-accent-bg px-4 py-2 text-sm font-bold text-white"
              >
                {step === slides.length - 1 ? "Start" : "Next"}
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function OfflineBanner({ online }) {
  if (online) return null;

  return (
    <div className="border-b bg-amber-500/10 px-4 py-2 text-center text-xs font-bold text-amber-300">
      <CloudOff size={14} className="mr-2 inline" />
      Offline mode active. Changes will sync automatically when the network returns.
    </div>
  );
}
