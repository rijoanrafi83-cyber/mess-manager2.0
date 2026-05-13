import { useState, useEffect } from "react";
import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";
import {
  LayoutDashboard, Users, UtensilsCrossed, BarChart3,
  ShoppingCart, Wallet, Settings, Bell, LogOut,
  ChevronLeft, Menu, X, TrendingUp, Moon, Sun,
  Coffee, ChevronRight
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

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["admin", "member"] },
  { to: "/members",   icon: Users,           label: "Members",   roles: ["admin"] },
  { to: "/meals",     icon: UtensilsCrossed, label: "Meals",     roles: ["admin", "member"] },
  { to: "/bazaar",    icon: ShoppingCart,    label: "Bazaar",    roles: ["admin"] },
  { to: "/deposits",  icon: Wallet,          label: "Deposits",  roles: ["admin"] },
  { to: "/reports",   icon: BarChart3,       label: "Reports",   roles: ["admin", "member"] },
  { to: "/settings",  icon: Settings,        label: "Settings",  roles: ["admin"] },
];

export function AppShell() {
  const { userProfile, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  const { members, meals, bazaar, deposits, extraCosts, notifications, settings } =
    useMessData(userProfile?.ownerId);

  const billData = calculateMonthlyBill(members, meals, bazaar, deposits, extraCosts);

  const allowedNav = NAV_ITEMS.filter(item =>
    item.roles.includes(userProfile?.role || "member")
  );

  const initials = (userProfile?.displayName || "U")
    .split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const unreadCount = (notifications || []).filter(n => !n.read).length;

  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 ${collapsed && !isMobile ? "justify-center" : ""}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
          <Coffee size={18} className="text-white" />
        </div>
        <AnimatePresence>
          {(!collapsed || isMobile) && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <p className="font-bold text-sm text-gray-900 dark:text-white whitespace-nowrap leading-none">
                {settings?.messName || "MessManager"}
              </p>
              <p className="text-[10px] text-violet-500 font-medium whitespace-nowrap mt-0.5">
                Premium Edition
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User */}
      <div className={`mx-3 mb-4 p-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/8 ${collapsed && !isMobile ? "flex justify-center" : "flex items-center gap-3"}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initials}
        </div>
        <AnimatePresence>
          {(!collapsed || isMobile) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-w-0 overflow-hidden"
            >
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                {userProfile?.displayName}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                {userProfile?.role === "admin" ? "Administrator" : "Member"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {allowedNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative
              ${collapsed && !isMobile ? "justify-center" : ""}
              ${isActive
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-gray-900 dark:hover:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? "text-white" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200"} />
                <AnimatePresence>
                  {(!collapsed || isMobile) && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {/* Tooltip when collapsed */}
                {collapsed && !isMobile && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                    {label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-gray-200 dark:border-white/8 space-y-1">
        <button
          onClick={toggle}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-gray-900 dark:hover:text-white transition-all ${collapsed && !isMobile ? "justify-center" : ""}`}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
          {(!collapsed || isMobile) && <span>{dark ? "Light Mode" : "Dark Mode"}</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all ${collapsed && !isMobile ? "justify-center" : ""}`}
        >
          <LogOut size={16} />
          {(!collapsed || isMobile) && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0a0f1e] overflow-hidden">
      <Toaster
        position="top-right"
        toastOptions={{
          className: "!bg-white dark:!bg-gray-900 !text-gray-900 dark:!text-white !border !border-gray-200 dark:!border-white/10 !shadow-xl",
          duration: 3000,
        }}
      />

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden md:flex flex-col flex-shrink-0 bg-white dark:bg-[#0d1526] border-r border-gray-200 dark:border-white/8 relative"
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all z-10"
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronLeft size={12} className="text-gray-500" />
          </motion.div>
        </button>
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-[#0d1526] border-r border-gray-200 dark:border-white/8 z-50 md:hidden flex flex-col"
            >
              <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8">
                <X size={16} className="text-gray-500" />
              </button>
              <SidebarContent isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-6 py-3 bg-white dark:bg-[#0d1526] border-b border-gray-200 dark:border-white/8 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
          >
            <Menu size={18} className="text-gray-600 dark:text-gray-400" />
          </button>

          <div className="flex-1" />

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
            >
              <Bell size={18} className="text-gray-600 dark:text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            
          </div>

          {/* Profile chip */}
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-white/8">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-gray-900 dark:text-white leading-none">
                {userProfile?.displayName}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                {userProfile?.role === "admin" ? "Admin" : "Member"}
              </p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage members={members} meals={meals} bazaar={bazaar} deposits={deposits} billData={billData} settings={settings} />} />
            <Route path="/members"   element={<MembersPage members={members} ownerId={userProfile?.ownerId} userProfile={userProfile} />} />
            <Route path="/meals"     element={<MealsPage members={members} meals={meals} ownerId={userProfile?.ownerId} userProfile={userProfile} />} />
            <Route path="/bazaar"    element={<BazaarPage bazaar={bazaar} members={members} ownerId={userProfile?.ownerId} />} />
            <Route path="/deposits"  element={<DepositsPage deposits={deposits} members={members} ownerId={userProfile?.ownerId} />} />
            <Route path="/reports"   element={<ReportsPage billData={billData} members={members} meals={meals} bazaar={bazaar} deposits={deposits} settings={settings} />} />
            <Route path="/settings"  element={<SettingsPage ownerId={userProfile?.ownerId} settings={settings} userProfile={userProfile} />} />
            <Route path="*"          element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}