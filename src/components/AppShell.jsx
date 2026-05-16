import {
  memo,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  LogOut,
  ChevronLeft,
  ChevronDown,
  Menu,
  X,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useMessData } from "../hooks/useMessData";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { usePWAInstall } from "../hooks/usePWAInstall";
import {
  recordSessionLogout,
  useSessionTracking,
} from "../hooks/useSessionTracking";

import { DashboardPage } from "../pages/DashboardPage";
import { MembersPage } from "../pages/MembersPage";
import { MealsPage } from "../pages/MealsPage";
import { BazaarPage } from "../pages/BazaarPage";
import { DepositsPage } from "../pages/DepositsPage";
import ReportsPage from "../pages/ReportsPage";
import SettingsPage from "../pages/SettingsPage";
import AboutMessManagerPage from "../pages/AboutMessManagerPage";
import { SmartLogo } from "./brand/SmartLogo";
import { ProfilePanel } from "./profile/ProfilePanel";
import { ProfileAvatar } from "./profile/ProfileAvatar";
import {
  InstallCTA,
  MobileBottomNav,
  NotificationsCenter,
  OfflineBanner,
  OnboardingModal,
  SyncIndicator,
} from "./SaaSFeatures";

import { calculateMonthlyBill } from "../utils/billing";
import {
  addNotification,
  ensureDailyPermanentMeals,
} from "../services/firestoreService";
import { getLocalDateKey } from "../utils/permanentMeals";
import {
  PERMISSIONS,
  ROLE_LABELS,
  ROLES,
  hasPermission,
} from "../utils/roles";

const NAV_ITEMS = [
  {
    to: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    roles: ["admin", "manager", "member"],
  },

  {
    to: "/members",
    icon: Users,
    label: "Members",
    roles: ["admin", "manager"],
  },

  {
    to: "/meals",
    icon: UtensilsCrossed,
    label: "Meals",
    roles: ["admin", "manager", "member"],
  },

  {
    to: "/bazaar",
    icon: ShoppingCart,
    label: "Bazaar",
    roles: ["admin", "manager"],
  },

  {
    to: "/deposits",
    icon: Wallet,
    label: "Deposits",
    roles: ["admin", "manager", "member"],
  },

  {
    to: "/reports",
    icon: BarChart3,
    label: "Reports",
    roles: ["admin", "manager", "member"],
  },

  {
    to: "/settings",
    icon: Settings,
    label: "Settings",
    roles: ["admin"],
  },
];

const MobileDrawer = memo(function MobileDrawer({
  open,
  onClose,
  children,
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <>
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
            transition={{
              duration: 0.16,
            }}
            className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-md md:hidden"
            onClick={onClose}
          />

          <motion.aside
            initial={{
              x: -270,
            }}
            animate={{
              x: 0,
            }}
            exit={{
              x: -270,
            }}
            transition={{
              duration: 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mobile-perf-surface fixed bottom-0 left-0 top-0 z-[140] flex w-72 max-w-[86vw] flex-col border-r theme-sidebar shadow-xl md:hidden"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-xl p-2 transition-colors hover:bg-[var(--bg-card-muted)]"
            >
              <X
                size={18}
                className="theme-subtext"
              />
            </button>

            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
});

export function AppShell() {
  const {
    currentUser,
    userProfile,
    logout,
  } =
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

  const online =
    useNetworkStatus();

  const pwa =
    usePWAInstall();

  useSessionTracking(userProfile);

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
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const [
    onboardingOpen,
    setOnboardingOpen,
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
    activityLogs,
    sessionActivity,
    settings,
    loading,
  } = useMessData(
    userProfile?.ownerId,
    userProfile
  );

  const isPersonalMember =
    userProfile?.role === ROLES.MEMBER &&
    Boolean(userProfile?.memberId);

  const visibleData = useMemo(() => {
    if (!isPersonalMember) {
      return {
        members,
        meals,
        mealSettings,
        deposits,
        guestMeals,
        bazaar,
        extraCosts,
      };
    }

    return {
      members: members.filter(
        (member) =>
          member.id ===
            userProfile?.memberId ||
          member.authUid ===
            userProfile?.uid
      ),
      meals: meals.filter(
        (meal) =>
          meal.memberId ===
          userProfile?.memberId
      ),
      mealSettings: mealSettings.filter(
        (setting) =>
          setting.memberId ===
          userProfile?.memberId
      ),
      deposits: deposits.filter(
        (deposit) =>
          deposit.memberId ===
          userProfile?.memberId
      ),
      guestMeals: [],
      bazaar: [],
      extraCosts: [],
    };
  }, [
    bazaar,
    deposits,
    extraCosts,
    guestMeals,
    isPersonalMember,
    mealSettings,
    meals,
    members,
    userProfile?.memberId,
    userProfile?.uid,
  ]);

  const {
    members: visibleMembers,
    meals: visibleMeals,
    mealSettings: visibleMealSettings,
    deposits: visibleDeposits,
    guestMeals: visibleGuestMeals,
    bazaar: visibleBazaar,
    extraCosts: visibleExtraCosts,
  } = visibleData;

  /* =========================================================
     BILL CALCULATION
  ========================================================= */

  const billData =
    useMemo(() => calculateMonthlyBill(
      visibleMembers,
      visibleMeals,
      visibleGuestMeals,
      visibleMealSettings,
      visibleBazaar,
      visibleDeposits,
      visibleExtraCosts
    ), [
      visibleBazaar,
      visibleDeposits,
      visibleExtraCosts,
      visibleGuestMeals,
      visibleMealSettings,
      visibleMeals,
      visibleMembers,
    ]);

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
      !userProfile?.ownerId ||
      userProfile?.role === ROLES.MEMBER
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
    userProfile?.role,
  ]);

  /* =========================================================
     NAVIGATION FILTER
  ========================================================= */

  const allowedNav =
    useMemo(() => NAV_ITEMS.filter((item) =>
      item.roles.includes(
        userProfile?.role ||
          "member"
      )
    ), [userProfile?.role]);

  /* =========================================================
     CLOSE MOBILE DRAWER ON ROUTE CHANGE
  ========================================================= */

  useEffect(() => {
    queueMicrotask(() => {
      setMobileOpen(false);
    });
  }, [location.pathname]);

  useEffect(() => {
    if (!userProfile?.ownerId) return;

    const key = `mm_onboarding_done_${userProfile.ownerId}`;
    if (localStorage.getItem(key) !== "true") {
      queueMicrotask(() => {
        setOnboardingOpen(true);
      });
    }
  }, [userProfile?.ownerId]);

  const closeOnboarding = () => {
    if (userProfile?.ownerId) {
      localStorage.setItem(
        `mm_onboarding_done_${userProfile.ownerId}`,
        "true"
      );
    }
    setOnboardingOpen(false);
  };

  useEffect(() => {
    if (
      loading ||
      !userProfile?.ownerId ||
      userProfile?.role === ROLES.MEMBER ||
      !billData?.totalDue
    ) {
      return;
    }

    const todayKey = `mm_due_alert_${userProfile.ownerId}_${currentDay}`;
    if (localStorage.getItem(todayKey) === "true") {
      return;
    }

    const topDue =
      [...(billData.memberBills || [])]
        .filter((member) => Number(member.due || 0) > 0)
        .sort((a, b) => b.due - a.due)[0];

    if (!topDue || Number(topDue.due || 0) < 1) {
      return;
    }

    localStorage.setItem(todayKey, "true");

    addNotification(userProfile.ownerId, {
      title: "Smart due warning",
      message: `${topDue.name} has the highest due balance today.`,
      type: "due",
      category: "alerts",
      metadata: {
        memberId: topDue.memberId || topDue.id || null,
        due: topDue.due,
      },
    }).catch((error) => {
      console.error("due alert:", error);
    });
  }, [
    billData,
    currentDay,
    loading,
    userProfile?.ownerId,
    userProfile?.role,
  ]);

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout =
    async () => {
      if (loggingOut) {
        return;
      }

      setLoggingOut(true);
      setShowNotif(false);
      setProfileOpen(false);
      setMobileOpen(false);

      try {
        recordSessionLogout(userProfile).catch((err) => {
          console.error("record logout:", err);
        });

        const result = await logout();

        if (result?.success === false) {
          console.error(result.message);
          return;
        }

        navigate("/login", {
          replace: true,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoggingOut(false);
      }
    };

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

  const renderSidebarContent = (
    isMobile = false
  ) => (
    <div className="flex flex-col h-full">

      {/* LOGO */}

      <div className="px-4 py-5">
        <button
          type="button"
          onClick={() =>
            navigate("/about")
          }
          aria-label="Open About MessManager"
          title="About MessManager"
          className={`group w-full rounded-3xl p-1 text-left transition-all duration-200 hover:bg-[var(--bg-card-muted)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)] focus:ring-offset-2 focus:ring-offset-transparent active:scale-[0.98] ${
            collapsed &&
            !isMobile
              ? "flex justify-center"
              : ""
          }`}
        >
          <SmartLogo
            collapsed={collapsed && !isMobile}
            title="MessManager"
          />
        </button>
      </div>

      {/* USER */}

      <div
        className={`mx-3 mb-4 p-3 rounded-2xl theme-muted border ${
          collapsed &&
          !isMobile
            ? "flex justify-center"
            : "flex items-center gap-3"
        }`}
      >
        <ProfileAvatar
          name={userProfile?.displayName}
          photoURL={userProfile?.photoURL}
          size="md"
          className="rounded-xl"
        />

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
                {ROLE_LABELS[userProfile?.role] ||
                  "Member"}
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
                    : "theme-muted-text hover:bg-[var(--bg-card-muted)] hover:text-[var(--text-primary)]"
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
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium theme-muted-text hover:bg-[var(--bg-card-muted)] hover:text-[var(--text-primary)] transition-all ${
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
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all ${
            collapsed &&
            !isMobile
              ? "justify-center"
              : ""
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <LogOut size={18} />

          {(!collapsed ||
            isMobile) && (
            <span>
              {loggingOut
                ? "Signing Out"
                : "Sign Out"}
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
            "glass-popover",
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

      <OnboardingModal
        open={onboardingOpen}
        onClose={closeOnboarding}
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
        className="hidden md:flex flex-col flex-shrink-0 theme-sidebar border-r relative"
      >
        {renderSidebarContent()}

        {/* COLLAPSE BUTTON */}

        <button
          onClick={() =>
            setCollapsed(
              !collapsed
            )
          }
          className="absolute -right-3 top-16 w-7 h-7 glass-solid rounded-full flex items-center justify-center shadow-xl"
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

        <header className="flex items-center gap-3 px-4 py-3 theme-topbar border-b flex-shrink-0 sm:gap-4 sm:px-6 sm:py-4">

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
              theme-muted
              hover:bg-[var(--bg-card)]
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

          <InstallCTA pwa={pwa} />

          <SyncIndicator
            online={online}
            loading={loading}
          />

          {/* NOTIFICATION */}

          <NotificationsCenter
            ownerId={userProfile?.ownerId}
            notifications={notifications}
            open={showNotif}
            onToggle={() =>
              setShowNotif(
                (value) => !value
              )
            }
            onClose={() =>
              setShowNotif(false)
            }
          />

          {/* PROFILE */}

          <button
            type="button"
            onClick={() =>
              setProfileOpen(true)
            }
            className="group flex items-center gap-3 rounded-2xl border border-transparent px-2 py-1.5 transition-all hover:border-[var(--border-soft)] hover:bg-[var(--bg-card-muted)] active:scale-[0.99] sm:border-l sm:pl-4"
          >
            <ProfileAvatar
              name={userProfile?.displayName}
              photoURL={userProfile?.photoURL}
              size="md"
              className="transition-transform group-hover:scale-105"
            />

            <div className="hidden text-left sm:block">
              <p className="max-w-[150px] truncate text-sm font-bold theme-text leading-none">
                {
                  userProfile?.displayName
                }
              </p>

              <p className="mt-1 max-w-[150px] truncate text-xs theme-muted-text">
                {ROLE_LABELS[userProfile?.role] ||
                  "Member"}
              </p>
            </div>

            <ChevronDown
              size={16}
              className="hidden theme-muted-text transition-transform group-hover:translate-y-0.5 sm:block"
            />
          </button>
        </header>

        <OfflineBanner online={online} />

        <ProfilePanel
          open={profileOpen}
          onClose={() =>
            setProfileOpen(false)
          }
          userProfile={userProfile}
          currentUser={currentUser}
          settings={settings}
        />

        {/* MOBILE SIDEBAR */}

        <MobileDrawer
          open={mobileOpen}
          onClose={() =>
            setMobileOpen(false)
          }
        >
          {renderSidebarContent(true)}
        </MobileDrawer>

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
                  members={visibleMembers}
                  meals={visibleMeals}
                  guestMeals={
                    visibleGuestMeals
                  }
                  mealSettings={
                    visibleMealSettings
                  }
                  bazaar={visibleBazaar}
                  deposits={
                    visibleDeposits
                  }
                  billData={
                    billData
                  }
                  settings={
                    settings
                  }
                  online={
                    online
                  }
                />
              }
            />

            <Route
              path="/members"
              element={
                hasPermission(
                  userProfile?.role,
                  PERMISSIONS.VIEW_MEMBERS
                ) ? (
                  <MembersPage
                    members={visibleMembers}
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
                ) : (
                  <Navigate
                    to="/unauthorized"
                    replace
                  />
                )
              }
            />

            <Route
              path="/meals"
              element={
                <MealsPage
                  members={visibleMembers}
                  meals={visibleMeals}
                  guestMeals={
                    visibleGuestMeals
                  }
                  mealSettings={
                    visibleMealSettings
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
                hasPermission(
                  userProfile?.role,
                  PERMISSIONS.MANAGE_BAZAAR
                ) ? (
                  <BazaarPage
                    bazaar={visibleBazaar}
                    members={visibleMembers}
                    ownerId={
                      userProfile?.ownerId
                    }
                    userProfile={
                      userProfile
                    }
                  />
                ) : (
                  <Navigate
                    to="/unauthorized"
                    replace
                  />
                )
              }
            />

            <Route
              path="/deposits"
              element={
                <DepositsPage
                  deposits={
                    visibleDeposits
                  }
                  members={visibleMembers}
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
              path="/reports"
              element={
                <ReportsPage
                  billData={
                    billData
                  }
                  members={visibleMembers}
                  meals={visibleMeals}
                  guestMeals={
                    visibleGuestMeals
                  }
                  mealSettings={
                    visibleMealSettings
                  }
                  bazaar={visibleBazaar}
                  deposits={
                    visibleDeposits
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
              path="/settings"
              element={
                userProfile?.role ===
                "admin" ? (
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
                    activityLogs={
                      activityLogs
                    }
                    sessionActivity={
                      sessionActivity
                    }
                    onReplayOnboarding={() =>
                      setOnboardingOpen(true)
                    }
                  />
                ) : (
                  <Navigate
                    to="/unauthorized"
                    replace
                  />
                )
              }
            />

            <Route
              path="/about"
              element={
                <AboutMessManagerPage />
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

        <MobileBottomNav
          items={allowedNav}
        />
      </div>
    </div>
  );
}
