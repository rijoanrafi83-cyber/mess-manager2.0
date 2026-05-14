import { useState, useEffect } from "react";

import {
  Routes,
  Route,
  Navigate,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import { Toaster } from "react-hot-toast";

import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  BarChart3,
  ShoppingCart,
  Wallet,
  Settings,
  Bell,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  Moon,
  Sun,
  Monitor,
  Coffee,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useMessData } from "../hooks/useMessData";

import { DashboardPage } from "../pages/DashboardPage";
import { MembersPage } from "../pages/MembersPage";
import { MealsPage } from "../pages/MealsPage";
import { BazaarPage } from "../pages/BazaarPage";
import { DepositsPage } from "../pages/DepositsPage";
import ReportsPage from "../pages/ReportsPage";
import SettingsPage from "../pages/SettingsPage";

import { calculateMonthlyBill } from "../utils/billing";
import { ensureDailyPermanentMeals } from "../services/firestoreService";
import { getLocalDateKey } from "../utils/permanentMeals";

const NAV_ITEMS = [
  {
    to: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    roles: ["admin", "member"],
  },

  {
    to: "/members",
    icon: Users,
    label: "Members",
    roles: ["admin"],
  },

  {
    to: "/meals",
    icon: UtensilsCrossed,
    label: "Meals",
    roles: ["admin", "member"],
  },

  {
    to: "/bazaar",
    icon: ShoppingCart,
    label: "Bazaar",
    roles: ["admin"],
  },

  {
    to: "/deposits",
    icon: Wallet,
    label: "Deposits",
    roles: ["admin"],
  },

  {
    to: "/reports",
    icon: BarChart3,
    label: "Reports",
    roles: ["admin", "member"],
  },

  {
    to: "/settings",
    icon: Settings,
    label: "Settings",
    roles: ["admin"],
  },
];

export function AppShell() {
  const { userProfile, logout } =
    useAuth();

  const {
    dark,
    themeMode,
    themeId,
    themePreset,
    themeTokens,
    setThemeMode,
  } =
    useTheme();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [
    collapsed,
    setCollapsed,
  ] = useState(false);

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const [
    showNotif,
    setShowNotif,
  ] = useState(false);

  const [
    currentDay,
    setCurrentDay,
  ] = useState(
    getLocalDateKey()
  );

  /* =========================================================
     DATA
  ========================================================= */

  const {
    members,
    meals,
    guestMeals,
    mealSettings,
    bazaar,
    deposits,
    extraCosts,
    notifications,
    settings,
    loading,
  } = useMessData(
    userProfile?.ownerId
  );

  /* =========================================================
     BILL CALCULATION
  ========================================================= */

  const billData =
    calculateMonthlyBill(
      members,
      meals,
      guestMeals,
      mealSettings,
      bazaar,
      deposits,
      extraCosts
    );

  useEffect(() => {
    const timer = window.setInterval(
      () => {
        setCurrentDay(
          getLocalDateKey()
        );
      },
      60000
    );

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  useEffect(() => {
    if (
      loading ||
      !userProfile?.ownerId
    ) {
      return;
    }

    ensureDailyPermanentMeals({
      ownerId:
        userProfile.ownerId,
      members,
      meals,
      mealSettings,
      date: currentDay,
    }).catch((err) => {
      console.error(
        "ensureDailyPermanentMeals:",
        err
      );
    });
  }, [
    loading,
    userProfile?.ownerId,
    members,
    meals,
    mealSettings,
    currentDay,
  ]);

  /* =========================================================
     NAVIGATION FILTER
  ========================================================= */

  const allowedNav =
    NAV_ITEMS.filter((item) =>
      item.roles.includes(
        userProfile?.role ||
          "member"
      )
    );

  /* =========================================================
     INITIALS
  ========================================================= */

  const initials = (
    userProfile?.displayName ||
    "U"
  )
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  /* =========================================================
     CLOSE MOBILE DRAWER ON ROUTE CHANGE
  ========================================================= */

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout =
    async () => {
      try {
        await logout();
        navigate("/login");
      } catch (err) {
        console.error(err);
      }
    };

  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  const unreadCount =
    (notifications || []).filter(
      (n) => !n.read
    ).length;

  const cycleThemeMode = () => {
    const nextMode =
      themeMode === "system"
        ? "dark"
        : themeMode === "dark"
          ? "light"
          : "system";

    setThemeMode(nextMode);
  };

  /* =========================================================
     SIDEBAR
  ========================================================= */

  const SidebarContent = ({
    isMobile = false,
  }) => (
    <div className="flex flex-col h-full">

      {/* LOGO */}

      <div
        className={`flex items-center gap-3 px-4 py-5 ${
          collapsed &&
          !isMobile
            ? "justify-center"
            : ""
        }`}
      >
        <div className="w-10 h-10 rounded-2xl theme-accent-bg flex items-center justify-center shadow-2xl shadow-[color-mix(in_srgb,var(--accent)_24%,transparent)]">
          <Coffee
            size={18}
            className="text-white"
          />
        </div>

        <AnimatePresence>
          {(!collapsed ||
            isMobile) && (
            <motion.div
              initial={{
                opacity: 0,
                width: 0,
              }}
              animate={{
                opacity: 1,
                width: "auto",
              }}
              exit={{
                opacity: 0,
                width: 0,
              }}
              className="overflow-hidden"
            >
              <p className="font-bold text-sm theme-text whitespace-nowrap leading-none">
                {settings?.messName ||
                  "MessManager"}
              </p>

              <p className="text-[10px] theme-accent-text font-medium whitespace-nowrap mt-1">
                Premium Edition
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* USER */}

      <div
        className={`mx-3 mb-4 p-3 rounded-2xl theme-muted border backdrop-blur-xl ${
          collapsed &&
          !isMobile
            ? "flex justify-center"
            : "flex items-center gap-3"
        }`}
      >
        <div className="w-10 h-10 rounded-xl theme-accent-bg flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_24%,transparent)]">
          {initials}
        </div>

        <AnimatePresence>
          {(!collapsed ||
            isMobile) && (
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
              className="min-w-0 overflow-hidden"
            >
              <p className="text-sm font-semibold theme-text truncate">
                {
                  userProfile?.displayName
                }
              </p>

              <p className="text-xs theme-muted-text truncate">
                {userProfile?.role ===
                "admin"
                  ? "Administrator"
                  : "Member"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* NAVIGATION */}

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">

        {allowedNav.map(
          ({
            to,
            icon: Icon,
            label,
          }) => (

            <NavLink
              key={to}
              to={to}
              className={({
                isActive,
              }) =>
                `group flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-all duration-200 relative overflow-hidden ${
                  collapsed &&
                  !isMobile
                    ? "justify-center"
                    : ""
                } ${
                  isActive
                ? "theme-accent-bg text-white shadow-xl shadow-[color-mix(in_srgb,var(--accent)_24%,transparent)]"
                    : "theme-muted-text hover:bg-white/10 hover:text-[var(--text-primary)]"
                }`
              }
            >
              {({
                isActive,
              }) => (
                <>
                  <Icon
                    size={18}
                    className={
                      isActive
                        ? "text-white"
                        : "theme-muted-text group-hover:text-[var(--text-primary)]"
                    }
                  />

                  <AnimatePresence>
                    {(!collapsed ||
                      isMobile) && (
                      <motion.span
                        initial={{
                          opacity: 0,
                        }}
                        animate={{
                          opacity: 1,
                        }}
                        exit={{
                          opacity: 0,
                        }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          )
        )}
      </nav>

      {/* BOTTOM */}

      <div className="p-3 border-t space-y-2">

        <button
          onClick={cycleThemeMode}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium theme-muted-text hover:bg-white/10 hover:text-[var(--text-primary)] transition-all ${
            collapsed &&
            !isMobile
              ? "justify-center"
              : ""
          }`}
        >
          {themeMode === "system" ? (
            <Monitor size={18} />
          ) : dark ? (
            <Sun size={18} />
          ) : (
            <Moon size={18} />
          )}

          {(!collapsed ||
            isMobile) && (
            <span>
              {themeMode === "system"
                ? "System Theme"
                : dark
                ? "Light Mode"
                : "Dark Mode"}
            </span>
          )}
        </button>

        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all ${
            collapsed &&
            !isMobile
              ? "justify-center"
              : ""
          }`}
        >
          <LogOut size={18} />

          {(!collapsed ||
            isMobile) && (
            <span>
              Sign Out
            </span>
          )}
        </button>
      </div>
    </div>
  );

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center theme-app">
        <div className="flex flex-col items-center gap-4">

          <div className="w-14 h-14 rounded-3xl border-4 border-violet-500/30 border-t-violet-500 animate-spin" />

          <p className="text-sm theme-muted-text">
            Loading MessManager...
          </p>

        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen theme-app overflow-hidden">

      {/* TOASTER */}

      <Toaster
        key={themeId}
        position="top-right"
        toastOptions={{
          className:
            "theme-card border",
          style: {
            background:
              themeTokens["--bg-elevated"] ||
              themeTokens["--bg-card"],
            color:
              themeTokens["--text-primary"],
            border:
              `1px solid ${themeTokens["--border-soft"]}`,
            boxShadow:
              themeTokens["--shadow-soft"],
          },
          iconTheme: {
            primary: themePreset.accent,
            secondary:
              themeTokens["--bg-elevated"] ||
              themeTokens["--bg-card"],
          },
          duration: 3000,
        }}
      />

      {/* DESKTOP SIDEBAR */}

      <motion.aside
        animate={{
          width: collapsed
            ? 74
            : 250,
        }}
        transition={{
          duration: 0.2,
        }}
        className="hidden md:flex flex-col flex-shrink-0 theme-sidebar backdrop-blur-2xl border-r relative"
      >
        <SidebarContent />

        {/* COLLAPSE BUTTON */}

        <button
          onClick={() =>
            setCollapsed(
              !collapsed
            )
          }
          className="absolute -right-3 top-16 w-7 h-7 theme-card border rounded-full flex items-center justify-center shadow-xl"
        >
          <motion.div
            animate={{
              rotate:
                collapsed
                  ? 180
                  : 0,
            }}
          >
            <ChevronLeft
              size={14}
              className="theme-text"
            />
          </motion.div>
        </button>
      </motion.aside>

      {/* MAIN */}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* TOPBAR */}

        <header className="flex items-center gap-4 px-6 py-4 theme-topbar backdrop-blur-2xl border-b flex-shrink-0">

          {/* MOBILE MENU */}

          <button
            type="button"
            onClick={() =>
              setMobileOpen(true)
            }
            className="
              md:hidden
              relative
              z-[120]
              p-2.5
              rounded-xl
              border
              border
              bg-white/10
              hover:bg-white/15
              active:scale-95
              transition-all
              duration-200
            "
          >
            <Menu
              size={20}
              className="theme-subtext"
            />
          </button>

          <div className="flex-1" />

          {/* NOTIFICATION */}

          <div className="relative">

            <button
              onClick={() =>
                setShowNotif(
                  !showNotif
                )
              }
              className="relative p-2.5 rounded-xl hover:bg-white/10 transition-all"
            >
              <Bell
                size={20}
                className="theme-subtext"
              />

              {unreadCount >
                0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-violet-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount >
                  9
                    ? "9+"
                    : unreadCount}
                </span>
              )}
            </button>

            {/* NOTIFICATION DROPDOWN */}

            <AnimatePresence>

              {showNotif && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: 10,
                  }}
                  className="absolute right-0 mt-3 w-80 rounded-2xl border theme-card backdrop-blur-2xl shadow-2xl overflow-hidden z-[150]"
                >

                  <div className="p-4 border-b">

                    <h3 className="font-semibold theme-text">
                      Notifications
                    </h3>

                  </div>

                  <div className="max-h-80 overflow-y-auto">

                    {notifications
                      ?.length >
                    0 ? (
                      notifications
                        .slice(
                          0,
                          8
                        )
                        .map(
                          (
                            item
                          ) => (
                            <div
                              key={
                                item.id
                              }
                              className="p-4 border-b hover:bg-white/10 transition-all"
                            >
                              <p className="text-sm theme-text font-medium">
                                {
                                  item.title
                                }
                              </p>

                              <p className="text-xs theme-muted-text mt-1">
                                {
                                  item.message
                                }
                              </p>
                            </div>
                          )
                        )
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

          {/* PROFILE */}

          <div className="flex items-center gap-3 pl-4 border-l">

            <div className="w-10 h-10 rounded-2xl theme-accent-bg flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-[color-mix(in_srgb,var(--accent)_24%,transparent)]">
              {initials}
            </div>

            <div className="hidden sm:block">
              <p className="text-sm font-semibold theme-text leading-none">
                {
                  userProfile?.displayName
                }
              </p>

              <p className="text-xs theme-muted-text mt-1">
                {userProfile?.role ===
                "admin"
                  ? "Admin"
                  : "Member"}
              </p>
            </div>
          </div>
        </header>

        {/* MOBILE SIDEBAR */}

        <AnimatePresence>

          {mobileOpen && (
            <>
              {/* BACKDROP */}

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
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] md:hidden"
                onClick={() =>
                  setMobileOpen(
                    false
                  )
                }
              />

              {/* MOBILE DRAWER */}

              <motion.aside
                initial={{
                  x: -280,
                }}
                animate={{
                  x: 0,
                }}
                exit={{
                  x: -280,
                }}
                transition={{
                  type: "spring",
                  damping: 25,
                  stiffness: 200,
                }}
                className="fixed left-0 top-0 bottom-0 w-64 theme-sidebar backdrop-blur-2xl border-r z-[140] md:hidden flex flex-col shadow-2xl"
              >

                {/* CLOSE */}

                <button
                  onClick={() =>
                    setMobileOpen(
                      false
                    )
                  }
                  className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 transition-all"
                >
                  <X
                    size={18}
                    className="theme-subtext"
                  />
                </button>

                <SidebarContent isMobile />

              </motion.aside>
            </>
          )}

        </AnimatePresence>

        {/* ROUTES */}

        <main className="flex-1 overflow-y-auto">

          <Routes>

            <Route
              path="/"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />

            <Route
              path="/dashboard"
              element={
                <DashboardPage
                  members={members}
                  meals={meals}
                  guestMeals={
                    guestMeals
                  }
                  mealSettings={
                    mealSettings
                  }
                  bazaar={bazaar}
                  deposits={
                    deposits
                  }
                  billData={
                    billData
                  }
                  settings={
                    settings
                  }
                />
              }
            />

            <Route
              path="/members"
              element={
                <MembersPage
                  members={members}
                  ownerId={
                    userProfile?.ownerId
                  }
                  billData={
                    billData
                  }
                  userProfile={
                    userProfile
                  }
                />
              }
            />

            <Route
              path="/meals"
              element={
                <MealsPage
                  members={members}
                  meals={meals}
                  guestMeals={
                    guestMeals
                  }
                  mealSettings={
                    mealSettings
                  }
                  ownerId={
                    userProfile?.ownerId
                  }
                  userProfile={
                    userProfile
                  }
                />
              }
            />

            <Route
              path="/bazaar"
              element={
                <BazaarPage
                  bazaar={bazaar}
                  members={members}
                  ownerId={
                    userProfile?.ownerId
                  }
                />
              }
            />

            <Route
              path="/deposits"
              element={
                <DepositsPage
                  deposits={
                    deposits
                  }
                  members={members}
                  ownerId={
                    userProfile?.ownerId
                  }
                />
              }
            />

            <Route
              path="/reports"
              element={
                <ReportsPage
                  billData={
                    billData
                  }
                  members={members}
                  meals={meals}
                  guestMeals={
                    guestMeals
                  }
                  mealSettings={
                    mealSettings
                  }
                  bazaar={bazaar}
                  deposits={
                    deposits
                  }
                  settings={
                    settings
                  }
                />
              }
            />

            <Route
              path="/settings"
              element={
                <SettingsPage
                  ownerId={
                    userProfile?.ownerId
                  }
                  settings={
                    settings
                  }
                  userProfile={
                    userProfile
                  }
                />
              }
            />

            <Route
              path="*"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />

          </Routes>
        </main>
      </div>
    </div>
  );
}
