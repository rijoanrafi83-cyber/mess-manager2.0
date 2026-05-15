import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Activity,
  Bell,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  Globe,
  HardDrive,
  Import,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  Mail,
  MonitorSmartphone,
  Moon,
  Palette,
  Phone,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  UploadCloud,
  User,
  UserRound,
  Wifi,
} from "lucide-react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from "firebase/auth";

import toast from "react-hot-toast";

import { auth, db } from "../firebase";
import { addActivityLog } from "../services/firestoreService";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  DEFAULT_THEME_ID,
  THEME_OPTIONS,
} from "../theme/themeConfig";
import {
  getSharedRoleLoginSettings,
  saveSharedRoleLoginSettings,
} from "../services/sharedRoleAuthService";
import { ActivityLogViewer } from "../components/SaaSFeatures";
import { ROLES } from "../utils/roles";

const ACCENT_COLORS = [
  {
    label: "Violet",
    value: "#8b5cf6",
    ring: "ring-violet-400",
  },
  {
    label: "Cyan",
    value: "#06b6d4",
    ring: "ring-cyan-400",
  },
  {
    label: "Emerald",
    value: "#10b981",
    ring: "ring-emerald-400",
  },
  {
    label: "Amber",
    value: "#f59e0b",
    ring: "ring-amber-400",
  },
  {
    label: "Rose",
    value: "#f43f5e",
    ring: "ring-rose-400",
  },
  {
    label: "Indigo",
    value: "#6366f1",
    ring: "ring-indigo-400",
  },
];

const DEFAULT_PREFERENCES = {
  darkMode: true,
  notifications: true,
  mealReminders: true,
  dueAlerts: true,
  weeklyDigest: false,
  autoBackup: true,
  firebaseSync: true,
  autoSave: false,
  compactMode: false,
  reduceMotion: false,
  themeMode: "system",
  themeId: DEFAULT_THEME_ID,
  accentColor: "#8b5cf6",
  density: 2,
};

const SETTINGS_LOAD_TIMEOUT_MS = 12000;

const withSettingsTimeout = (promise, message) => {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new Error(message)),
      SETTINGS_LOAD_TIMEOUT_MS
    );
  });

  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timeoutId);
  });
};

const DEFAULT_SHARED_ROLE_LOGINS = {
  [ROLES.MEMBER]: {
    role: ROLES.MEMBER,
    email: "",
    password: "",
    enabled: false,
  },
  [ROLES.MANAGER]: {
    role: ROLES.MANAGER,
    email: "",
    password: "",
    enabled: false,
  },
};

const sanitizeSharedRoleLogins = (logins = DEFAULT_SHARED_ROLE_LOGINS) => ({
  [ROLES.MEMBER]: {
    ...(logins[ROLES.MEMBER] || DEFAULT_SHARED_ROLE_LOGINS[ROLES.MEMBER]),
    password: "",
  },
  [ROLES.MANAGER]: {
    ...(logins[ROLES.MANAGER] || DEFAULT_SHARED_ROLE_LOGINS[ROLES.MANAGER]),
    password: "",
  },
});

const buildSettingsSignature = ({
  formData,
  preferences,
  sharedRoleLogins,
}) =>
  JSON.stringify({
    formData,
    preferences,
    sharedRoleLogins: sanitizeSharedRoleLogins(sharedRoleLogins),
  });

const TONE_STYLES = {
  violet: {
    bg: "bg-violet-500/15",
    text: "text-violet-300",
  },
  cyan: {
    bg: "bg-cyan-500/15",
    text: "text-cyan-300",
  },
  fuchsia: {
    bg: "bg-fuchsia-500/15",
    text: "text-fuchsia-300",
  },
  pink: {
    bg: "bg-pink-500/15",
    text: "text-pink-300",
  },
  red: {
    bg: "bg-red-500/15",
    text: "text-red-300",
  },
  green: {
    bg: "bg-green-500/15",
    text: "text-green-300",
  },
  blue: {
    bg: "bg-blue-500/15",
    text: "text-blue-300",
  },
  indigo: {
    bg: "bg-indigo-500/15",
    text: "text-indigo-300",
  },
  slate: {
    bg: "bg-slate-500/15",
    text: "text-slate-300",
  },
};

const getDeviceType = () => {
  if (typeof navigator === "undefined") {
    return "Unknown";
  }

  if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
    return "Mobile";
  }

  if (/iPad|Tablet/i.test(navigator.userAgent)) {
    return "Tablet";
  }

  return "Desktop";
};

const getBrowserName = () => {
  if (typeof navigator === "undefined") {
    return "Browser";
  }

  const ua = navigator.userAgent;

  if (ua.includes("Edg/")) return "Microsoft Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Safari/")) return "Safari";
  if (ua.includes("Firefox/")) return "Firefox";

  return "Browser";
};

const formatDateTime = (value) => {
  if (!value) return "Not available";

  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const SectionCard = ({
  title,
  subtitle,
  icon: Icon,
  tone = "violet",
  children,
  actions,
}) => {
  const toneStyle =
    TONE_STYLES[tone] ||
    TONE_STYLES.violet;

  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 14,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.24,
      }}
      className="theme-card rounded-[1.75rem] border backdrop-blur-2xl overflow-hidden"
    >
      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneStyle.bg}`}
          >
            <Icon
              size={22}
              className={toneStyle.text}
            />
          </div>

          <div>
            <h2 className="text-lg font-bold tracking-tight theme-text">
              {title}
            </h2>
            <p className="mt-1 text-sm theme-muted-text">
              {subtitle}
            </p>
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      <div className="p-5">
        {children}
      </div>
    </motion.section>
  );
};

const Field = ({
  label,
  icon: Icon,
  helper,
  className = "",
  ...props
}) => (
  <label className={`block ${className}`}>
    <span className="mb-2 block text-xs font-semibold uppercase tracking-wider theme-muted-text">
      {label}
    </span>
    <span className="relative block">
      {Icon && (
        <Icon
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 theme-muted-text"
        />
      )}
      <input
        {...props}
        className={`w-full rounded-2xl border theme-field py-3.5 ${
          Icon ? "pl-12" : "pl-4"
        } pr-4 text-sm outline-none transition placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60`}
      />
    </span>
    {helper && (
      <span className="mt-2 block text-xs theme-muted-text">
        {helper}
      </span>
    )}
  </label>
);

const SmartSwitch = ({
  checked,
  onChange,
  title,
  description,
  icon: Icon,
  accent = "#8b5cf6",
  disabled = false,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className="group flex w-full items-center justify-between gap-4 rounded-2xl border theme-muted p-4 text-left transition hover:bg-[var(--bg-card)] disabled:cursor-not-allowed disabled:opacity-60"
  >
    <span className="flex min-w-0 items-center gap-3">
      {Icon && (
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `${accent}22`,
            color: accent,
          }}
        >
          <Icon size={18} />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-sm font-semibold theme-text">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 theme-muted-text">
          {description}
        </span>
      </span>
    </span>

    <span
      className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition ${
        checked ? "" : "theme-elevated"
      }`}
      style={{
        backgroundColor: checked ? accent : undefined,
      }}
    >
      <motion.span
        layout
        transition={{
          type: "spring",
          stiffness: 520,
          damping: 32,
        }}
        className="block h-5 w-5 rounded-full bg-white shadow-lg"
        style={{
          x: checked ? 20 : 0,
        }}
      />
    </span>
  </button>
);

const MiniStat = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="rounded-2xl border theme-muted p-4">
    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 theme-subtext">
      <Icon size={17} />
    </div>
    <p className="text-xs uppercase tracking-wider theme-muted-text">
      {label}
    </p>
    <p className="mt-1 truncate text-sm font-semibold theme-text">
      {value}
    </p>
  </div>
);

const RoleLoginSettings = ({
  title,
  subtitle,
  icon: Icon,
  login,
  accent,
  onChange,
}) => (
  <div className="rounded-2xl border theme-muted p-4">
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `${accent}22`,
            color: accent,
          }}
        >
          <Icon size={18} />
        </span>
        <div>
          <p className="text-sm font-bold theme-text">
            {title}
          </p>
          <p className="mt-1 text-xs leading-5 theme-muted-text">
            {subtitle}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          onChange({
            enabled: !login.enabled,
          })
        }
        className={`rounded-full px-3 py-1 text-xs font-black ${
          login.enabled
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-red-500/15 text-red-400"
        }`}
      >
        {login.enabled ? "Enabled" : "Disabled"}
      </button>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <Field
        label={`${title} Email`}
        icon={Mail}
        type="email"
        value={login.email || ""}
        onChange={(event) =>
          onChange({
            email: event.target.value,
          })
        }
        placeholder={`${login.role}@your-mess.com`}
      />
      <Field
        label={`${title} Password`}
        icon={KeyRound}
        type="password"
        value={login.password || ""}
        onChange={(event) =>
          onChange({
            password: event.target.value,
          })
        }
        placeholder="Leave blank to keep current"
        helper="Enter a new password to rotate credentials immediately."
      />
    </div>
  </div>
);

export default function SettingsPage({
  settings,
  userProfile,
  activityLogs = [],
  sessionActivity = [],
  onReplayOnboarding,
}) {
  const authContext = useAuth();
  const {
    themeMode: activeThemeMode,
    resolvedTheme,
    themeId,
    themePreset,
    accentColor,
    reducedMotion,
    setTheme,
    setThemeMode,
    setAccentColor,
    setReducedMotion,
  } = useTheme();
  const currentUser =
    authContext.currentUser ||
    auth.currentUser;
  const fileInputRef = useRef(null);
  const autoSaveTimer = useRef(null);
  const didInitialLoad = useRef(false);
  const isHydrating = useRef(false);
  const loadRequestRef = useRef(0);
  const savedSettingsSignature = useRef("");
  const latestSettingsSignature = useRef("");
  const savedAutoSave = useRef(DEFAULT_PREFERENCES.autoSave);
  const appearanceRef = useRef({
    themeMode: "system",
    themeId: DEFAULT_THEME_ID,
    accentColor: DEFAULT_PREFERENCES.accentColor,
    reduceMotion: false,
  });

  const profile =
    userProfile ||
    authContext.userProfile;
  const isAdmin =
    profile?.role === ROLES.ADMIN;
  const workspaceOwnerId =
    isAdmin
      ? currentUser?.uid
      : profile?.ownerId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [syncStatus, setSyncStatus] = useState("Ready");

  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [sharedRoleLogins, setSharedRoleLogins] =
    useState(DEFAULT_SHARED_ROLE_LOGINS);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  const selectedAccent =
    preferences.accentColor ||
    themePreset.accent ||
    DEFAULT_PREFERENCES.accentColor;

  useEffect(() => {
    appearanceRef.current = {
      themeMode: activeThemeMode,
      themeId,
      accentColor,
      reduceMotion: reducedMotion,
    };
  }, [
    accentColor,
    activeThemeMode,
    reducedMotion,
    themeId,
  ]);

  const settingsSnapshot = useMemo(
    () => ({
      formData,
      preferences,
      exportedAt: new Date().toISOString(),
      appSettings: settings || null,
    }),
    [
      formData,
      preferences,
      settings,
    ]
  );

  useEffect(() => {
    latestSettingsSignature.current =
      buildSettingsSignature({
        formData,
        preferences,
        sharedRoleLogins,
      });
  }, [
    formData,
    preferences,
    sharedRoleLogins,
  ]);

  const updatePreference = (key, value) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateSharedRoleLogin = (role, patch) => {
    setSharedRoleLogins((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        ...patch,
      },
    }));
  };

  const getLocalAppearancePreferences = useCallback(
    () => {
      if (typeof window === "undefined") {
        return null;
      }

      const hasLocalTheme =
        localStorage.getItem("mm_theme_name") ||
        localStorage.getItem("mm_theme_mode") ||
        localStorage.getItem("mm_accent_color");

      if (!hasLocalTheme) {
        return null;
      }

      return {
        ...appearanceRef.current,
      };
    },
    []
  );

  const applyThemePreference = useCallback(
    (nextMode) => {
      const normalizedMode =
        typeof nextMode === "boolean"
          ? nextMode
            ? "dark"
            : "light"
          : nextMode || "system";

      setThemeMode(normalizedMode);
    },
    [
      setThemeMode,
    ]
  );

  const persistSettings = useCallback(
    async ({
      silent = false,
    } = {}) => {
      if (!currentUser) {
        toast.error("User not logged in");
        return false;
      }

      try {
        setSaving(true);
        let persistedSharedRoleLogins =
          sharedRoleLogins;

        await updateProfile(currentUser, {
          displayName: formData.fullName,
        });

        await setDoc(
          doc(db, "users", currentUser.uid),
          {
            fullName: formData.fullName,
            email: currentUser.email,
            phone: formData.phone,
            darkMode:
              preferences.themeMode === "system"
                ? resolvedTheme === "dark"
                : preferences.themeMode === "dark",
            themeMode: preferences.themeMode,
            themeId: preferences.themeId,
            accentColor: preferences.accentColor,
            reduceMotion: preferences.reduceMotion,
            notifications: preferences.notifications,
            autoBackup: preferences.autoBackup,
            preferences,
            sharedRoleLogins:
              sanitizeSharedRoleLogins(sharedRoleLogins),
            updatedAt: new Date().toISOString(),
          },
          {
            merge: true,
          }
        );

        if (isAdmin) {
          const savedLogins =
            await saveSharedRoleLoginSettings(
              workspaceOwnerId,
              sharedRoleLogins
            );

          persistedSharedRoleLogins = savedLogins;
          setSharedRoleLogins(savedLogins);

          await setDoc(
            doc(db, "adminProfiles", currentUser.uid),
            {
              displayName: formData.fullName,
              fullName: formData.fullName,
              email: currentUser.email,
              phone: formData.phone,
              role: ROLES.ADMIN,
              ownerId: currentUser.uid,
              accountStatus: "active",
              status: "active",
              updatedAt: serverTimestamp(),
            },
            {
              merge: true,
            }
          );
        }

        if (profile?.role !== ROLES.ADMIN) {
          await setDoc(
            doc(db, "memberAccess", currentUser.uid),
            {
              displayName: formData.fullName,
              email: currentUser.email,
              updatedAt: serverTimestamp(),
            },
            {
              merge: true,
            }
          );
        }

        setTheme(preferences.themeId);
        applyThemePreference(preferences.themeMode);
        setAccentColor(preferences.accentColor);
        setReducedMotion(preferences.reduceMotion);

        const now = new Date().toISOString();
        savedSettingsSignature.current =
          buildSettingsSignature({
            formData,
            preferences,
            sharedRoleLogins:
              persistedSharedRoleLogins,
          });
        savedAutoSave.current =
          Boolean(preferences.autoSave);
        setLastSavedAt(now);
        setSyncStatus("Synced");

        if (!silent) {
          toast.success("Settings saved");
        }

        if (workspaceOwnerId) {
          addActivityLog(workspaceOwnerId, {
            type: "settings",
            action: "update",
            title: "Settings saved",
            message: "Profile or workspace preferences changed",
            entityType: "settings",
            entityId: workspaceOwnerId,
            actor: profile,
          }).catch(() => {});
        }

        return true;
      } catch (error) {
        console.error(error);
        setSyncStatus("Sync failed");

        if (!silent) {
          toast.error(
            error.message ||
              "Failed to save settings"
          );
        }

        return false;
      } finally {
        setSaving(false);
      }
    },
    [
      applyThemePreference,
      currentUser,
      formData,
      isAdmin,
      preferences,
      profile,
      resolvedTheme,
      sharedRoleLogins,
      setAccentColor,
      setReducedMotion,
      setTheme,
      workspaceOwnerId,
    ]
  );

  useEffect(() => {
    const requestId =
      loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    let cancelled = false;

    const loadUserData = async () => {
      isHydrating.current = true;
      let nextFormData = formData;
      let savedPreferences = preferences;
      let nextSharedRoleLogins = sharedRoleLogins;

      try {
        if (!currentUser) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        const userRef = doc(
          db,
          "users",
          currentUser.uid
        );

        const snap = await withSettingsTimeout(
          getDoc(userRef),
          "Settings took too long to load. Please try again."
        );

        if (
          cancelled ||
          loadRequestRef.current !== requestId
        ) {
          return;
        }

        const data = snap.exists()
          ? snap.data()
          : {};

        const localAppearance =
          getLocalAppearancePreferences();

        savedPreferences = {
          ...DEFAULT_PREFERENCES,
          themeMode:
            data.preferences?.themeMode ||
            data.themeMode ||
            (typeof data.darkMode === "boolean"
              ? data.darkMode
                ? "dark"
                : "light"
              : DEFAULT_PREFERENCES.themeMode),
          themeId:
            data.preferences?.themeId ||
            data.themeId ||
            DEFAULT_PREFERENCES.themeId,
          darkMode:
            data.darkMode ??
            DEFAULT_PREFERENCES.darkMode,
          notifications:
            data.notifications ??
            DEFAULT_PREFERENCES.notifications,
          autoBackup:
            data.autoBackup ??
            DEFAULT_PREFERENCES.autoBackup,
          ...(data.preferences || {}),
          ...(localAppearance || {}),
        };

        nextFormData = {
          fullName:
            data.fullName ||
            profile?.displayName ||
            profile?.fullName ||
            currentUser.displayName ||
            "",
          email:
            currentUser.email ||
            profile?.email ||
            "",
          phone:
            data.phone ||
            profile?.phone ||
            "",
        };
        setFormData(nextFormData);

        setPreferences(savedPreferences);
        setLastSavedAt(data.updatedAt || null);
        setSyncStatus(snap.exists() ? "Synced" : "Local defaults");

        if (isAdmin && workspaceOwnerId) {
          const sharedLogins =
            await withSettingsTimeout(
              getSharedRoleLoginSettings(
                workspaceOwnerId
              ),
              "Role login settings took too long to load."
            );

          if (
            cancelled ||
            loadRequestRef.current !== requestId
          ) {
            return;
          }

          nextSharedRoleLogins = sharedLogins;
          setSharedRoleLogins(sharedLogins);
        }

        if (!localAppearance) {
          setTheme(savedPreferences.themeId);
          applyThemePreference(savedPreferences.themeMode);
          setAccentColor(savedPreferences.accentColor);
          setReducedMotion(savedPreferences.reduceMotion);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          toast.error("Failed to load settings");
        }
      } finally {
        if (
          cancelled ||
          loadRequestRef.current !== requestId
        ) {
          return;
        }

        savedSettingsSignature.current =
          buildSettingsSignature({
            formData:
              nextFormData,
            preferences:
              savedPreferences,
            sharedRoleLogins:
              nextSharedRoleLogins,
          });
        savedAutoSave.current =
          Boolean(savedPreferences.autoSave);
        didInitialLoad.current = true;
        isHydrating.current = false;
        setLoading(false);
      }
    };

    loadUserData();

    return () => {
      cancelled = true;
    };
  }, [
    applyThemePreference,
    currentUser,
    getLocalAppearancePreferences,
    profile?.displayName,
    profile?.email,
    profile?.fullName,
    profile?.phone,
    profile?.role,
    isAdmin,
    workspaceOwnerId,
    setAccentColor,
    setReducedMotion,
    setTheme,
  ]);

  useEffect(() => {
    const isDisablingAutoSave =
      savedAutoSave.current === true &&
      preferences.autoSave === false;

    if (
      !didInitialLoad.current ||
      isHydrating.current ||
      !preferences.firebaseSync ||
      (!preferences.autoSave && !isDisablingAutoSave)
    ) {
      return;
    }

    const nextSignature =
      buildSettingsSignature({
        formData,
        preferences,
        sharedRoleLogins,
      });

    if (
      nextSignature ===
      savedSettingsSignature.current
    ) {
      return;
    }

    clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(() => {
      if (
        latestSettingsSignature.current ===
        savedSettingsSignature.current
      ) {
        return;
      }

      persistSettings({
        silent: true,
      }).then((ok) => {
        if (ok) {
          toast.success("Preferences auto-saved", {
            id: "settings-autosave",
          });
        }
      });
    }, 900);

    return () => {
      clearTimeout(autoSaveTimer.current);
    };
  }, [
    formData,
    persistSettings,
    preferences,
    sharedRoleLogins,
  ]);

  const handleSaveSettings = () => {
    persistSettings();
  };

  const handlePasswordChange = async () => {
    try {
      if (!currentUser) {
        toast.error("User not logged in");
        return;
      }

      if (!currentPassword || !newPassword) {
        toast.error("Fill all password fields");
        return;
      }

      if (newPassword.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }

      setPasswordSaving(true);

      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );

      await reauthenticateWithCredential(
        currentUser,
        credential
      );

      await updatePassword(
        currentUser,
        newPassword
      );

      setCurrentPassword("");
      setNewPassword("");

      toast.success("Password changed successfully");
    } catch (error) {
      console.error(error);
      toast.error(
        error.message ||
          "Failed to update password"
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleManualSync = async () => {
    if (!preferences.firebaseSync) {
      toast.error("Enable Firebase sync first");
      return;
    }

    setSyncing(true);
    setSyncStatus("Syncing...");

    const ok = await persistSettings({
      silent: true,
    });

    setSyncStatus(ok ? "Synced" : "Sync failed");
    setSyncing(false);

    toast[ok ? "success" : "error"](
      ok ? "Firebase sync complete" : "Firebase sync failed"
    );
  };

  const handleExportSettings = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          settingsSnapshot,
          null,
          2
        ),
      ],
      {
        type: "application/json",
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "messmanager-settings.json";
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Settings exported");
  };

  const handleImportSettings = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const text = await file.text();
      const imported = JSON.parse(text);

      if (!imported.formData || !imported.preferences) {
        throw new Error("Invalid settings file");
      }

      setFormData((prev) => ({
        ...prev,
        fullName:
          imported.formData.fullName ||
          prev.fullName,
        phone:
          imported.formData.phone ||
          "",
      }));

      const importedPreferences = {
        ...DEFAULT_PREFERENCES,
        ...imported.preferences,
        themeId:
          imported.preferences.themeId ||
          DEFAULT_PREFERENCES.themeId,
        accentColor:
          imported.preferences.accentColor ||
          DEFAULT_PREFERENCES.accentColor,
      };

      setPreferences(importedPreferences);
      setTheme(importedPreferences.themeId);
      applyThemePreference(importedPreferences.themeMode);
      setAccentColor(importedPreferences.accentColor);
      setReducedMotion(importedPreferences.reduceMotion);

      toast.success("Settings imported. Review and save.");
    } catch (error) {
      console.error(error);
      toast.error(
        error.message ||
          "Could not import settings"
      );
    }
  };

  const handleResetPreferences = async () => {
    setPreferences(DEFAULT_PREFERENCES);
    setTheme(DEFAULT_PREFERENCES.themeId);
    applyThemePreference(DEFAULT_PREFERENCES.themeMode);
    setAccentColor(DEFAULT_PREFERENCES.accentColor);
    setReducedMotion(DEFAULT_PREFERENCES.reduceMotion);
    setResetOpen(false);

    toast.success("Preferences reset. Save to sync.");
  };

  const passwordStrength = useMemo(() => {
    let score = 0;

    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 10) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    return Math.min(score, 5);
  }, [newPassword]);

  const deviceInfo = useMemo(
    () => ({
      type: getDeviceType(),
      browser: getBrowserName(),
      language:
        navigator.language || "Unknown",
      online: navigator.onLine,
      platform:
        navigator.platform || "Unknown",
    }),
    []
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center theme-app">
        <div className="flex items-center gap-3 rounded-2xl border theme-card px-5 py-4">
          <Loader2 className="animate-spin text-violet-300" />
          <span className="text-sm font-medium theme-subtext">
            Loading settings...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen theme-app px-4 py-6 sm:px-6 lg:px-8"
      style={{
        "--settings-accent": selectedAccent,
      }}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="theme-card overflow-hidden rounded-[2rem] border p-5 sm:p-7"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-violet-200">
                <Sparkles size={14} />
                Workspace control
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Settings
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 theme-subtext">
                Manage your profile, security, sync, appearance, and operating preferences from one polished workspace.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[540px]">
              <MiniStat
                icon={Wifi}
                label="Sync"
                value={syncStatus}
              />
              <MiniStat
                icon={Shield}
                label="Role"
                value={profile?.role || "User"}
              />
              <MiniStat
                icon={Palette}
                label="Accent"
                value={
                  ACCENT_COLORS.find(
                    (color) =>
                      color.value === selectedAccent
                  )?.label || "Custom"
                }
              />
              <MiniStat
                icon={Activity}
                label="Saved"
                value={
                  lastSavedAt
                    ? formatDateTime(lastSavedAt)
                    : "Not yet"
                }
              />
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
          <div className="space-y-6">
            <SectionCard
              title="Profile Settings"
              subtitle="Your account identity and contact details"
              icon={User}
              tone="violet"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Full name"
                  icon={User}
                  value={formData.fullName}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      fullName: event.target.value,
                    })
                  }
                  placeholder="Your name"
                />
                <Field
                  label="Email address"
                  icon={Mail}
                  disabled
                  value={formData.email}
                  helper="Email is managed by Firebase Authentication."
                />
                <Field
                  label="Phone number"
                  icon={Phone}
                  value={formData.phone}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      phone: event.target.value,
                    })
                  }
                  placeholder="+880..."
                  className="md:col-span-2"
                />
              </div>
            </SectionCard>

            <SectionCard
              title="App Preferences"
              subtitle="Adjust how MessManager behaves during daily work"
              icon={SlidersHorizontal}
              tone="cyan"
            >
              <div className="mb-5 rounded-2xl border theme-muted p-4">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold theme-text">
                      Theme Mode
                    </p>
                    <p className="mt-1 text-xs theme-muted-text">
                      Use light, dark, or follow your device.
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold theme-subtext">
                    {resolvedTheme}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Light",
                      value: "light",
                      icon: Sun,
                    },
                    {
                      label: "Dark",
                      value: "dark",
                      icon: Moon,
                    },
                    {
                      label: "System",
                      value: "system",
                      icon: MonitorSmartphone,
                    },
                  ].map((option) => {
                    const Icon =
                      option.icon;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          updatePreference(
                            "themeMode",
                            option.value
                          );
                          updatePreference(
                            "darkMode",
                            option.value === "system"
                              ? resolvedTheme === "dark"
                              : option.value === "dark"
                          );
                          applyThemePreference(
                            option.value
                          );
                        }}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                          preferences.themeMode === option.value
                            ? "border-white/20 text-white"
                            : "border-white/10 theme-muted-text hover:bg-white/10 hover:text-[var(--text-primary)]"
                        }`}
                        style={{
                          background:
                            preferences.themeMode === option.value
                              ? selectedAccent
                              : "transparent",
                        }}
                      >
                        <Icon size={15} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <SmartSwitch
                  checked={preferences.autoSave}
                  onChange={(value) =>
                    updatePreference("autoSave", value)
                  }
                  title="Auto-save Preferences"
                  description="Save changes shortly after editing."
                  icon={Save}
                  accent={selectedAccent}
                />
                <SmartSwitch
                  checked={preferences.compactMode}
                  onChange={(value) =>
                    updatePreference("compactMode", value)
                  }
                  title="Compact Layout"
                  description="Prefer denser views for faster scanning."
                  icon={MonitorSmartphone}
                  accent={selectedAccent}
                />
                <SmartSwitch
                  checked={preferences.reduceMotion}
                  onChange={(value) => {
                    updatePreference("reduceMotion", value);
                    setReducedMotion(value);
                  }}
                  title="Reduced Motion"
                  description="Minimize non-essential animation."
                  icon={Activity}
                  accent={selectedAccent}
                />
              </div>

              <div className="mt-5 rounded-2xl border theme-muted p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold theme-text">
                      Interface Density
                    </p>
                    <p className="mt-1 text-xs theme-muted-text">
                      Balance comfort and information density.
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold theme-subtext">
                    Level {preferences.density}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={preferences.density}
                  onChange={(event) =>
                    updatePreference(
                      "density",
                      Number(event.target.value)
                    )
                  }
                  className="mt-5 h-2 w-full accent-[var(--accent)]"
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Activity Center"
              subtitle="Audit logs, device context, and recent workspace actions"
              icon={Activity}
              tone="blue"
              actions={
                <button
                  type="button"
                  onClick={onReplayOnboarding}
                  className="rounded-xl border px-3 py-2 text-xs font-bold theme-muted-text hover:bg-white/10"
                >
                  Replay Welcome
                </button>
              }
            >
              <ActivityLogViewer logs={activityLogs} />
            </SectionCard>

            <SectionCard
              title="Session Activity"
              subtitle="Recent login devices and active workspace sessions"
              icon={MonitorSmartphone}
              tone="green"
            >
              <div className="grid gap-3 md:grid-cols-2">
                {sessionActivity.slice(0, 8).map((session) => (
                  <div
                    key={session.id}
                    className="rounded-2xl border theme-muted p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold theme-text">
                          {session.actorName || "Workspace user"}
                        </p>
                        <p className="mt-1 text-xs theme-muted-text">
                          {session.device || "Device"} · {session.browser || "Browser"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          session.status === "active"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-500/15 text-slate-300"
                        }`}
                      >
                        {session.status || "active"}
                      </span>
                    </div>
                    <p className="mt-3 text-[11px] theme-muted-text">
                      Last seen: {formatDateTime(
                        session.lastSeenAt?.toDate
                          ? session.lastSeenAt.toDate().toISOString()
                          : session.lastSeenAt?.seconds
                            ? new Date(session.lastSeenAt.seconds * 1000).toISOString()
                            : session.lastSeenAt
                      )}
                    </p>
                  </div>
                ))}

                {!sessionActivity.length && (
                  <div className="rounded-2xl border theme-muted p-6 text-sm theme-muted-text md:col-span-2">
                    Session data appears here after users sign in.
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Theme Customization"
              subtitle="Preview modern workspace themes instantly and sync them across devices"
              icon={Palette}
              tone="fuchsia"
            >
              <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {THEME_OPTIONS.map((theme) => {
                  const active =
                    preferences.themeId === theme.id ||
                    (!preferences.themeId &&
                      themeId === theme.id);

                  return (
                    <button
                      type="button"
                      key={theme.id}
                      onClick={() => {
                        updatePreference("themeId", theme.id);
                        updatePreference("themeMode", theme.mode);
                        updatePreference("darkMode", theme.mode === "dark");
                        updatePreference("accentColor", theme.accent);
                        setTheme(theme.id);
                      }}
                      className={`group rounded-2xl border p-3 text-left transition theme-hover ${
                        active
                          ? "border-[var(--accent)] theme-card"
                          : "theme-muted hover:border-[var(--accent)]"
                      }`}
                    >
                      <span
                        className="mb-3 flex h-16 overflow-hidden rounded-xl border"
                        style={{
                          borderColor: "rgba(255,255,255,0.14)",
                        }}
                      >
                        {theme.preview.map((color) => (
                          <span
                            key={color}
                            className="flex-1"
                            style={{
                              background: color,
                            }}
                          />
                        ))}
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span>
                          <span className="block text-xs font-bold theme-text">
                            {theme.label}
                          </span>
                          <span className="mt-1 block text-[11px] uppercase tracking-wider theme-muted-text">
                            {theme.mode}
                          </span>
                        </span>
                        {active && (
                          <CheckCircle2
                            size={16}
                            className="theme-accent-text"
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border theme-muted p-4">
                <div>
                  <p className="text-sm font-semibold theme-text">
                    Accent Override
                  </p>
                  <p className="mt-1 text-xs theme-muted-text">
                    Fine tune buttons, focus rings, charts, and highlights.
                  </p>
                </div>
                <span
                  className="h-9 w-9 rounded-xl border shadow-lg"
                  style={{
                    background: selectedAccent,
                    borderColor: "var(--border-soft)",
                  }}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {ACCENT_COLORS.map((color) => (
                  <button
                    type="button"
                    key={color.value}
                    onClick={() => {
                      updatePreference(
                        "accentColor",
                        color.value
                      );
                      setAccentColor(
                        color.value
                      );
                    }}
                    className={`rounded-2xl border theme-muted p-3 text-left transition hover:bg-white/10 ${
                      selectedAccent === color.value
                        ? `ring-2 ${color.ring}`
                        : ""
                    }`}
                  >
                    <span
                      className="mb-3 block h-10 rounded-xl"
                      style={{
                        backgroundColor: color.value,
                      }}
                    />
                    <span className="text-xs font-semibold theme-text">
                      {color.label}
                    </span>
                  </button>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Notification Settings"
              subtitle="Control alerts, reminders, and summaries"
              icon={Bell}
              tone="pink"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <SmartSwitch
                  checked={preferences.notifications}
                  onChange={(value) =>
                    updatePreference("notifications", value)
                  }
                  title="System Alerts"
                  description="Receive important app notifications."
                  icon={Bell}
                  accent={selectedAccent}
                />
                <SmartSwitch
                  checked={preferences.mealReminders}
                  onChange={(value) =>
                    updatePreference("mealReminders", value)
                  }
                  title="Meal Reminders"
                  description="Remind members about meal entries."
                  icon={CheckCircle2}
                  accent={selectedAccent}
                />
                <SmartSwitch
                  checked={preferences.dueAlerts}
                  onChange={(value) =>
                    updatePreference("dueAlerts", value)
                  }
                  title="Due Alerts"
                  description="Notify when balances require attention."
                  icon={Database}
                  accent={selectedAccent}
                />
                <SmartSwitch
                  checked={preferences.weeklyDigest}
                  onChange={(value) =>
                    updatePreference("weeklyDigest", value)
                  }
                  title="Weekly Digest"
                  description="Send a weekly activity summary."
                  icon={Activity}
                  accent={selectedAccent}
                />
              </div>
            </SectionCard>

            {profile?.role === "admin" && (
              <SectionCard
                title="Shared Role Login"
                subtitle="Control the one workspace-wide member login and one manager login"
                icon={Shield}
                tone="indigo"
              >
                <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-semibold text-amber-700 dark:text-amber-300">
                  Changing a password rotates the shared Firebase Auth login.
                  Old credentials stop working as soon as this section is saved.
                </div>

                <div className="grid gap-4">
                  <RoleLoginSettings
                    title="Member Login"
                    subtitle="Shared view-only access for this workspace."
                    icon={UserRound}
                    login={sharedRoleLogins.member}
                    accent={selectedAccent}
                    onChange={(patch) =>
                      updateSharedRoleLogin(
                        ROLES.MEMBER,
                        patch
                      )
                    }
                  />

                  <RoleLoginSettings
                    title="Manager Login"
                    subtitle="Shared limited management access for this workspace."
                    icon={KeyRound}
                    login={sharedRoleLogins.manager}
                    accent={selectedAccent}
                    onChange={(patch) =>
                      updateSharedRoleLogin(
                        ROLES.MANAGER,
                        patch
                      )
                    }
                  />
                </div>
              </SectionCard>
            )}

            <SectionCard
              title="Security Settings"
              subtitle="Update your Firebase password after reauthentication"
              icon={Shield}
              tone="red"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Current password"
                  icon={Lock}
                  type="password"
                  value={currentPassword}
                  onChange={(event) =>
                    setCurrentPassword(event.target.value)
                  }
                  placeholder="Current password"
                />
                <Field
                  label="New password"
                  icon={KeyRound}
                  type="password"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  placeholder="New password"
                />
              </div>

              <div className="mt-4 rounded-2xl border theme-muted p-4">
                <div className="mb-3 flex items-center justify-between text-xs theme-muted-text">
                  <span>Password strength</span>
                  <span>{passwordStrength}/5</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div
                      key={item}
                      className={`h-2 rounded-full ${
                        passwordStrength >= item
                          ? "bg-emerald-400"
                          : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handlePasswordChange}
                disabled={passwordSaving}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              >
                {passwordSaving ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Shield size={18} />
                )}
                Change Password
              </button>
            </SectionCard>
          </div>

          <aside className="space-y-6">
            <SectionCard
              title="Firebase Sync"
              subtitle="Cloud persistence and backup behavior"
              icon={Cloud}
              tone="green"
              actions={
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={syncing || saving}
                  className="inline-flex items-center gap-2 rounded-xl border theme-muted px-3 py-2 text-xs font-semibold theme-text transition hover:bg-white/15 disabled:opacity-60"
                >
                  <RefreshCw
                    size={14}
                    className={syncing ? "animate-spin" : ""}
                  />
                  Sync
                </button>
              }
            >
              <div className="space-y-3">
                <SmartSwitch
                  checked={preferences.firebaseSync}
                  onChange={(value) =>
                    updatePreference("firebaseSync", value)
                  }
                  title="Firebase Sync"
                  description="Allow settings to sync to Firestore."
                  icon={Cloud}
                  accent={selectedAccent}
                />
                <SmartSwitch
                  checked={preferences.autoBackup}
                  onChange={(value) =>
                    updatePreference("autoBackup", value)
                  }
                  title="Auto Backup"
                  description="Keep account preferences backed up."
                  icon={UploadCloud}
                  accent={selectedAccent}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Export / Import"
              subtitle="Move preferences between devices"
              icon={HardDrive}
              tone="blue"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportSettings}
              />
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={handleExportSettings}
                  className="flex items-center justify-center gap-2 rounded-2xl border theme-muted px-4 py-3 text-sm font-semibold theme-text transition hover:bg-white/15"
                >
                  <Download size={18} />
                  Export Settings
                </button>
                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="flex items-center justify-center gap-2 rounded-2xl border theme-muted px-4 py-3 text-sm font-semibold theme-text transition hover:bg-white/10"
                >
                  <Import size={18} />
                  Import Settings
                </button>
              </div>
            </SectionCard>

            <SectionCard
              title="Activity / Session"
              subtitle="Current account and device details"
              icon={Activity}
              tone="indigo"
            >
              <div className="space-y-3">
                <div className="rounded-2xl theme-muted p-4">
                  <p className="text-xs uppercase tracking-wider theme-muted-text">
                    Last sign in
                  </p>
                  <p className="mt-1 text-sm font-semibold theme-text">
                    {formatDateTime(
                      currentUser?.metadata?.lastSignInTime
                    )}
                  </p>
                </div>
                <div className="rounded-2xl theme-muted p-4">
                  <p className="text-xs uppercase tracking-wider theme-muted-text">
                    Account created
                  </p>
                  <p className="mt-1 text-sm font-semibold theme-text">
                    {formatDateTime(
                      currentUser?.metadata?.creationTime
                    )}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Device Info"
              subtitle="Local browser environment"
              icon={
                deviceInfo.type === "Mobile"
                  ? Smartphone
                  : Laptop
              }
              tone="slate"
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <MiniStat
                  icon={MonitorSmartphone}
                  label="Device"
                  value={deviceInfo.type}
                />
                <MiniStat
                  icon={Laptop}
                  label="Browser"
                  value={deviceInfo.browser}
                />
                <MiniStat
                  icon={Wifi}
                  label="Network"
                  value={
                    deviceInfo.online
                      ? "Online"
                      : "Offline"
                  }
                />
                <MiniStat
                  icon={Globe}
                  label="Language"
                  value={deviceInfo.language}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Danger Zone"
              subtitle="Reset preferences after confirmation"
              icon={Trash2}
              tone="red"
            >
              <button
                type="button"
                onClick={() => setResetOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/20"
              >
                <RotateCcw size={18} />
                Reset Preferences
              </button>
            </SectionCard>

            <motion.div
              initial={{
                opacity: 0,
                y: 12,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="rounded-[1.75rem] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 p-5 shadow-2xl shadow-violet-950/40"
            >
              <h2 className="text-2xl font-black text-white">
                Save Changes
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/80">
                Apply profile, preference, security-adjacent, and sync settings to Firebase.
              </p>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={18} />
                )}
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </motion.div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {resetOpen && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{
                scale: 0.96,
                y: 16,
              }}
              animate={{
                scale: 1,
                y: 0,
              }}
              exit={{
                scale: 0.96,
                y: 16,
              }}
              className="w-full max-w-md rounded-[1.75rem] border theme-card p-6 shadow-2xl"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
                <Trash2 size={22} />
              </div>
              <h3 className="text-xl font-black theme-text">
                Reset preferences?
              </h3>
              <p className="mt-2 text-sm leading-6 theme-muted-text">
                This resets app preferences on this screen to defaults. Your Firebase account, members, meals, bazaar, deposits, and reports are not deleted.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  className="rounded-2xl border theme-muted px-4 py-3 text-sm font-semibold theme-text transition hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetPreferences}
                  className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-400"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
