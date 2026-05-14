/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase";

const THEME_STORAGE_KEY = "mm_theme_mode";
const LEGACY_THEME_STORAGE_KEY = "mm_theme";
const ACCENT_STORAGE_KEY = "mm_accent_color";

const DEFAULT_ACCENT = "#8b5cf6";

const ThemeContext = createContext(null);

const getSystemTheme = () => {
  if (
    typeof window === "undefined" ||
    !window.matchMedia
  ) {
    return "dark";
  }

  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
};

const getInitialThemeMode = () => {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored =
    localStorage.getItem(
      THEME_STORAGE_KEY
    );

  if (
    stored === "light" ||
    stored === "dark" ||
    stored === "system"
  ) {
    return stored;
  }

  const legacy =
    localStorage.getItem(
      LEGACY_THEME_STORAGE_KEY
    );

  if (legacy === "light" || legacy === "dark") {
    return legacy;
  }

  return "system";
};

const getInitialAccentColor = () => {
  if (typeof window === "undefined") {
    return DEFAULT_ACCENT;
  }

  return (
    localStorage.getItem(
      ACCENT_STORAGE_KEY
    ) || DEFAULT_ACCENT
  );
};

const normalizeThemeMode = (
  value
) => {
  if (
    value === "light" ||
    value === "dark" ||
    value === "system"
  ) {
    return value;
  }

  return "system";
};

export function ThemeProvider({
  children,
}) {
  const [
    themeMode,
    setThemeModeState,
  ] = useState(getInitialThemeMode);

  const [
    systemTheme,
    setSystemTheme,
  ] = useState(getSystemTheme);

  const [
    accentColor,
    setAccentColorState,
  ] = useState(getInitialAccentColor);

  const resolvedTheme =
    themeMode === "system"
      ? systemTheme
      : themeMode;

  const dark =
    resolvedTheme === "dark";

  const setThemeMode = useCallback(
    (nextMode) => {
      setThemeModeState(
        normalizeThemeMode(nextMode)
      );
    },
    []
  );

  const setDark = useCallback(
    (valueOrUpdater) => {
      setThemeModeState((currentMode) => {
        const currentResolved =
          currentMode === "system"
            ? getSystemTheme()
            : currentMode;

        const nextValue =
          typeof valueOrUpdater ===
          "function"
            ? valueOrUpdater(
                currentResolved === "dark"
              )
            : valueOrUpdater;

        return nextValue ? "dark" : "light";
      });
    },
    []
  );

  const toggle = useCallback(() => {
    setDark((current) => !current);
  }, [setDark]);

  const setAccentColor = useCallback(
    (nextColor) => {
      setAccentColorState(
        nextColor || DEFAULT_ACCENT
      );
    },
    []
  );

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.matchMedia
    ) {
      return undefined;
    }

    const mediaQuery =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    const handleChange = (
      event
    ) => {
      setSystemTheme(
        event.matches ? "dark" : "light"
      );
    };

    mediaQuery.addEventListener(
      "change",
      handleChange
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleChange
      );
    };
  }, []);

  useEffect(() => {
    const root =
      document.documentElement;

    root.classList.toggle(
      "dark",
      dark
    );

    root.classList.toggle(
      "light",
      !dark
    );

    root.dataset.theme =
      resolvedTheme;

    root.dataset.themeMode =
      themeMode;

    root.style.setProperty(
      "--accent",
      accentColor
    );

    const metaThemeColor =
      document.querySelector(
        'meta[name="theme-color"]'
      ) ||
      Object.assign(
        document.createElement("meta"),
        {
          name: "theme-color",
        }
      );

    metaThemeColor.setAttribute(
      "content",
      dark ? "#050816" : "#f8fafc"
    );

    if (!metaThemeColor.parentNode) {
      document.head.appendChild(
        metaThemeColor
      );
    }

    localStorage.setItem(
      THEME_STORAGE_KEY,
      themeMode
    );

    localStorage.setItem(
      LEGACY_THEME_STORAGE_KEY,
      dark ? "dark" : "light"
    );

    localStorage.setItem(
      ACCENT_STORAGE_KEY,
      accentColor
    );
  }, [
    accentColor,
    dark,
    resolvedTheme,
    themeMode,
  ]);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          if (!firebaseUser) {
            return;
          }

          try {
            const snap = await getDoc(
              doc(
                db,
                "users",
                firebaseUser.uid
              )
            );

            if (!snap.exists()) {
              return;
            }

            const data = snap.data();
            const preferences =
              data.preferences || {};

            const nextMode =
              preferences.themeMode ||
              data.themeMode ||
              (typeof data.darkMode ===
              "boolean"
                ? data.darkMode
                  ? "dark"
                  : "light"
                : null);

            if (nextMode) {
              setThemeMode(
                nextMode
              );
            }

            if (
              preferences.accentColor ||
              data.accentColor
            ) {
              setAccentColor(
                preferences.accentColor ||
                  data.accentColor
              );
            }
          } catch (error) {
            console.error(
              "Theme sync failed:",
              error
            );
          }
        }
      );

    return () => unsubscribe();
  }, [
    setAccentColor,
    setThemeMode,
  ]);

  const value = useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      systemTheme,
      dark,
      accentColor,
      setThemeMode,
      setAccentColor,
      setDark,
      toggle,
    }),
    [
      accentColor,
      dark,
      resolvedTheme,
      setAccentColor,
      setDark,
      setThemeMode,
      systemTheme,
      themeMode,
      toggle,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(
    ThemeContext
  );

  if (!ctx) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return ctx;
}
