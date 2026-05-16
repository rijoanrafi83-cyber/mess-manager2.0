/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { onAuthStateChanged } from "firebase/auth";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";

import {
  ACCENT_STORAGE_KEY,
  DEFAULT_THEME_ID,
  LEGACY_THEME_STORAGE_KEY,
  REDUCED_MOTION_STORAGE_KEY,
  THEME_NAME_STORAGE_KEY,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  getThemePreset,
  normalizeThemeId,
  normalizeThemeMode,
} from "../theme/themeConfig";

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
    localStorage.getItem(THEME_STORAGE_KEY);

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

const getInitialThemeId = () => {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_ID;
  }

  return normalizeThemeId(
    localStorage.getItem(
      THEME_NAME_STORAGE_KEY
    )
  );
};

const getInitialAccentColor = () => {
  if (typeof window === "undefined") {
    return getThemePreset(
      DEFAULT_THEME_ID
    ).accent;
  }

  return (
    localStorage.getItem(
      ACCENT_STORAGE_KEY
    ) ||
    getThemePreset(
      getInitialThemeId()
    ).accent
  );
};

const getInitialReducedMotion = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const stored = localStorage.getItem(
    REDUCED_MOTION_STORAGE_KEY
  );

  if (stored === "true") return true;
  if (stored === "false") return false;

  return window.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
  ).matches;
};

const setCssVars = (root, tokens) => {
  Object.entries(tokens).forEach(
    ([key, value]) => {
      root.style.setProperty(key, value);
    }
  );
};

const scopedStorageKey = (uid, key) =>
  uid ? `${key}_${uid}` : key;

const getStoredValue = (key, uid = null) => {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(
    scopedStorageKey(uid, key)
  );
};

const setStoredValue = (key, value, uid = null) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    scopedStorageKey(uid, key),
    value
  );
};

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] =
    useState(getInitialThemeMode);
  const [themeId, setThemeIdState] =
    useState(getInitialThemeId);
  const [systemTheme, setSystemTheme] =
    useState(getSystemTheme);
  const [accentColor, setAccentColorState] =
    useState(getInitialAccentColor);
  const [reducedMotion, setReducedMotionState] =
    useState(getInitialReducedMotion);
  const [currentThemeUserId, setCurrentThemeUserId] =
    useState(null);
  const userThemeReadyRef = useRef(false);
  const cloudSaveTimerRef = useRef(null);

  const themePreset = getThemePreset(themeId);
  const resolvedTheme =
    themeMode === "system"
      ? systemTheme
      : themeMode;
  const dark = resolvedTheme === "dark";
  const themeTokens = themePreset.tokens;
  const chartColors = themePreset.chart;

  const setThemeMode = useCallback(
    (nextMode) => {
      setThemeModeState(
        normalizeThemeMode(nextMode)
      );
    },
    []
  );

  const setTheme = useCallback(
    (nextThemeId) => {
      const normalized =
        normalizeThemeId(nextThemeId);
      const preset =
        getThemePreset(normalized);

      setThemeIdState(normalized);
      setAccentColorState(preset.accent);
      setThemeModeState(preset.mode);
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
          typeof valueOrUpdater === "function"
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
        nextColor ||
          getThemePreset(
            DEFAULT_THEME_ID
          ).accent
      );
    },
    []
  );

  const setReducedMotion = useCallback(
    (nextValue) => {
      setReducedMotionState(Boolean(nextValue));
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

    const handleChange = (event) => {
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

    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
    root.dataset.theme = themeId;
    root.dataset.palette = themeId;
    root.dataset.themeMode = themeMode;
    root.dataset.resolvedTheme =
      resolvedTheme;
    root.dataset.reduceMotion =
      reducedMotion ? "true" : "false";

    setCssVars(root, themeTokens);

    root.style.setProperty(
      "--accent",
      accentColor
    );

    root.style.setProperty(
      "--chart-1",
      chartColors[0]
    );

    chartColors
      .slice(0, 8)
      .forEach((color, index) => {
        root.style.setProperty(
          `--chart-${index + 1}`,
          color
        );
      });

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
      themePreset.meta
    );

    if (!metaThemeColor.parentNode) {
      document.head.appendChild(
        metaThemeColor
      );
    }

    setStoredValue(
      THEME_STORAGE_KEY,
      themeMode,
      currentThemeUserId
    );
    setStoredValue(
      LEGACY_THEME_STORAGE_KEY,
      dark ? "dark" : "light",
      currentThemeUserId
    );
    setStoredValue(
      THEME_NAME_STORAGE_KEY,
      themeId,
      currentThemeUserId
    );
    setStoredValue(
      ACCENT_STORAGE_KEY,
      accentColor,
      currentThemeUserId
    );
    setStoredValue(
      REDUCED_MOTION_STORAGE_KEY,
      String(reducedMotion),
      currentThemeUserId
    );

    if (currentThemeUserId && userThemeReadyRef.current) {
      if (cloudSaveTimerRef.current) {
        window.clearTimeout(cloudSaveTimerRef.current);
      }

      cloudSaveTimerRef.current = window.setTimeout(() => {
        setDoc(
          doc(db, "users", currentThemeUserId),
          {
            darkMode:
              themeMode === "system"
                ? dark
                : themeMode === "dark",
            themeMode,
            themeId,
            accentColor,
            reduceMotion: reducedMotion,
            "preferences.themeMode": themeMode,
            "preferences.themeId": themeId,
            "preferences.accentColor": accentColor,
            "preferences.reduceMotion": reducedMotion,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ).catch((error) => {
          console.error(
            "Theme preference save failed:",
            error
          );
        });
      }, 450);
    }

    if (!reducedMotion) {
      root.classList.remove(
        "theme-transitioning"
      );
      window.requestAnimationFrame(() => {
        root.classList.add(
          "theme-transitioning"
        );
      });
    }
  }, [
    accentColor,
    chartColors,
    currentThemeUserId,
    dark,
    reducedMotion,
    resolvedTheme,
    themeId,
    themeMode,
    themePreset.meta,
    themeTokens,
  ]);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          if (!firebaseUser) {
            setCurrentThemeUserId(null);
            userThemeReadyRef.current = false;
            return;
          }

          setCurrentThemeUserId(firebaseUser.uid);
          userThemeReadyRef.current = false;

          try {
            const snap = await getDoc(
              doc(
                db,
                "users",
                firebaseUser.uid
              )
            );

            const data = snap.exists()
              ? snap.data()
              : {};
            const preferences =
              data.preferences || {};

            const nextTheme =
              preferences.themeId ||
              data.themeId ||
              getStoredValue(
                THEME_NAME_STORAGE_KEY,
                firebaseUser.uid
              );
            const nextMode =
              preferences.themeMode ||
              data.themeMode ||
              (typeof data.darkMode ===
              "boolean"
                ? data.darkMode
                  ? "dark"
                  : "light"
                : null) ||
              getStoredValue(
                THEME_STORAGE_KEY,
                firebaseUser.uid
              );
            const nextAccent =
              preferences.accentColor ||
              data.accentColor ||
              getStoredValue(
                ACCENT_STORAGE_KEY,
                firebaseUser.uid
              );
            const nextReducedMotion =
              typeof preferences.reduceMotion ===
              "boolean"
                ? preferences.reduceMotion
                : getStoredValue(
                    REDUCED_MOTION_STORAGE_KEY,
                    firebaseUser.uid
                  );

            if (nextTheme) {
              setThemeIdState(
                normalizeThemeId(nextTheme)
              );
            }

            if (nextMode) {
              setThemeMode(nextMode);
            }

            if (nextAccent) {
              setAccentColorState(
                nextAccent
              );
            }

            if (
              typeof nextReducedMotion ===
              "boolean"
            ) {
              setReducedMotionState(
                nextReducedMotion
              );
            } else if (
              nextReducedMotion === "true" ||
              nextReducedMotion === "false"
            ) {
              setReducedMotionState(
                nextReducedMotion === "true"
              );
            }
          } catch (error) {
            console.error(
              "Theme sync failed:",
              error
            );
          } finally {
            userThemeReadyRef.current = true;
          }
        }
      );

    return () => {
      if (cloudSaveTimerRef.current) {
        window.clearTimeout(
          cloudSaveTimerRef.current
        );
      }

      unsubscribe();
    };
  }, [setThemeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      themeId,
      themePreset,
      themeOptions: THEME_OPTIONS,
      themeTokens,
      chartColors,
      resolvedTheme,
      systemTheme,
      dark,
      accentColor,
      reducedMotion,
      setThemeMode,
      setTheme,
      setAccentColor,
      setReducedMotion,
      setDark,
      toggle,
    }),
    [
      accentColor,
      chartColors,
      dark,
      reducedMotion,
      resolvedTheme,
      setAccentColor,
      setDark,
      setReducedMotion,
      setTheme,
      setThemeMode,
      systemTheme,
      themeId,
      themeMode,
      themePreset,
      themeTokens,
      toggle,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>
      <div
        aria-hidden="true"
        className="theme-transition-overlay"
      />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return ctx;
}
