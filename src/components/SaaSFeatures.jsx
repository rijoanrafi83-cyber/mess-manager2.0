import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { NotificationsPortal } from "./NotificationsPortal";

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
  onClose,
}) {
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState({
    top: 72,
    left: 12,
    width: 352,
  });
  const unreadCount = notifications.filter((item) => !item.read).length;
  const grouped = useMemo(() => {
    const groups = new Map();

    notifications.forEach((item) => {
      const key = item.category || item.type || "general";
      groups.set(key, [...(groups.get(key) || []), item]);
    });

    return [...groups.entries()];
  }, [notifications]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const updatePanelPosition = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect();

      if (!buttonRect) {
        return;
      }

      const viewportWidth = window.innerWidth;
      const gutter = 12;
      const width = Math.min(352, viewportWidth - gutter * 2);
      const top = Math.max(gutter, buttonRect.bottom + 8);
      const preferredLeft = buttonRect.right - width;
      const left = Math.min(
        Math.max(gutter, preferredLeft),
        viewportWidth - width - gutter
      );

      setPanelStyle({
        top,
        left,
        width,
      });
    };

    updatePanelPosition();

    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (
        buttonRef.current?.contains(event.target) ||
        panelRef.current?.contains(event.target)
      ) {
        return;
      }

      onClose?.();
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  const markAllRead = () => {
    if (ownerId) {
      markAllNotificationsRead(ownerId);
    }
  };

  const clearAll = () => {
    if (ownerId) {
      clearNotifications(ownerId);
    }
  };

  return (
    <div className="relative z-[150]">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        className="relative rounded-xl p-2.5 transition-all hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]"
        title="Notifications"
      >
        <Bell size={20} className="theme-subtext" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationsPortal>
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={panelStyle}
              className="fixed z-[1000] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border shadow-2xl bg-white dark:bg-slate-950/95 dark:backdrop-blur-xl md:bg-[var(--bg-card)] md:dark:bg-slate-900/90"
            >
              <div className="flex items-center justify-between gap-3 border-b p-4 bg-opacity-50">
                <div>
                  <h3 className="font-semibold theme-text text-base">Notifications</h3>
                  <p className="text-xs theme-muted-text mt-0.5">
                    {unreadCount} unread
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="rounded-lg p-2 hover:bg-white/10"
                    title="Mark all read"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                    title="Clear notifications"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="max-h-[min(70vh,32rem)] overflow-y-auto">
                {grouped.length > 0 ? (
                  grouped.map(([category, items]) => (
                    <section
                      key={category}
                      className="border-b last:border-b-0"
                    >
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
                              item.read
                                ? "bg-slate-500/40"
                                : "bg-violet-500"
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
      </NotificationsPortal>
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
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[120] border-t theme-topbar px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 shadow-[0_-18px_45px_rgba(0,0,0,0.18)] backdrop-blur-2xl md:hidden">
      <div className="mx-auto max-w-screen-sm overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-1.5 px-0.5">
          {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group relative flex min-h-[3.05rem] w-[4.55rem] flex-shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border px-2 text-[10px] font-black transition-all duration-200 active:scale-95 ${
                isActive
                  ? "theme-accent-bg border-transparent text-white shadow-lg shadow-[color-mix(in_srgb,var(--accent)_22%,transparent)]"
                  : "border-white/10 bg-white/[0.04] theme-muted-text hover:bg-white/10 hover:text-[var(--text-primary)]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <motion.span
                  layout
                  className={`absolute inset-x-2 top-1 h-0.5 rounded-full ${
                    isActive
                      ? "bg-white/80"
                      : "bg-transparent"
                  }`}
                />
                <Icon
                  size={17}
                  className={
                    isActive
                      ? "text-white"
                      : "theme-muted-text group-hover:text-[var(--text-primary)]"
                  }
                />
                <span className="max-w-full truncate leading-tight">
                  {label}
                </span>
              </>
            )}
          </NavLink>
          ))}
        </div>
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
