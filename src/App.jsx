/**
 * MessManager — App.jsx (v5.0 — Premium SaaS Edition)
 *
 * UPGRADES:
 * - Premium glassmorphism UI with gradients & animated effects
 * - Advanced analytics dashboard with smart KPIs
 * - Half-breakfast support (0, 0.5, 1) with decimal meal calculations
 * - GitHub-style meal heatmap calendar
 * - Framer Motion page transitions & micro-interactions
 * - Smart notification system
 * - Skeleton loaders & premium empty states
 * - Enhanced PDF reports & print-ready bills
 * - PWA manifest injection
 * - Performance: memoization, lazy loading, reduced re-renders
 * - Mobile-first responsive design
 *
 * Firebase rules preserved:
 * - No orderBy() + where() combos (composite index issue avoided)
 * - All sorting done in JavaScript
 * - All realtime onSnapshot listeners preserved
 */

import {
  useState, useEffect, useCallback, useContext, createContext,
  useMemo, useRef, lazy, Suspense,
} from "react";
import {
  BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation,
} from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, setDoc, query, where, serverTimestamp, getDoc,
} from "firebase/firestore";
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential,
  sendPasswordResetEmail,
} from "firebase/auth";
import { db, auth } from "./firebase";

// ─── Framer Motion (graceful degradation if not installed) ───────────────────
let motion, AnimatePresence;
try {
  const fm = await import("framer-motion");
  motion = fm.motion;
  AnimatePresence = fm.AnimatePresence;
} catch {
  // Polyfill if framer-motion is not installed
  const Passthrough = ({ children, ...rest }) => {
    const tag = rest.as || "div";
    return <div style={rest.style} className={rest.className}>{children}</div>;
  };
  motion = new Proxy({}, {
    get: (_, tag) => ({ children, className, style, onClick, ...rest }) =>
      <div className={className} style={style} onClick={onClick}>{children}</div>
  });
  AnimatePresence = ({ children }) => <>{children}</>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TODAY       = new Date().toISOString().split("T")[0];
const MONTHS      = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MEAL_TYPES  = ["breakfast","lunch","dinner"];
const COLORS      = ["#6366f1","#22d3ee","#f59e0b","#10b981","#f43f5e","#a78bfa","#34d399","#fb923c"];

// Gradient palette for premium UI
const GRADIENTS = {
  primary:  "from-violet-600 to-indigo-600",
  success:  "from-emerald-500 to-teal-500",
  warning:  "from-amber-500 to-orange-500",
  danger:   "from-rose-500 to-red-600",
  info:     "from-cyan-500 to-blue-500",
  purple:   "from-purple-500 to-violet-600",
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const fmtCurrency  = (n) => "৳" + (Number(n) || 0).toFixed(2);
const fmtDate      = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
const getCurrentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const daysInMonth  = (ym) => { const [y,m] = ym.split("-").map(Number); return new Date(y, m, 0).getDate(); };
const fmtMeals     = (n) => Number(n) % 1 === 0 ? String(n) : Number(n).toFixed(1);

// ─── ThemeContext ─────────────────────────────────────────────────────────────
const ThemeContext = createContext(null);
function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  useEffect(() => {
    localStorage.setItem("theme", dark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return <ThemeContext.Provider value={{ dark, setDark }}>{children}</ThemeContext.Provider>;
}

// ─── AuthContext ──────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
function AuthProvider({ children }) {
  const [userProfile, setUserProfile] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { setUserProfile(null); return; }
      try {
        const adminSnap = await getDoc(doc(db, "adminProfiles", firebaseUser.uid));
        if (adminSnap.exists()) {
          const data = adminSnap.data();
          setUserProfile({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: data.displayName || firebaseUser.email, role: "admin", ownerId: firebaseUser.uid });
          return;
        }
        const memberSnap = await getDoc(doc(db, "memberAccess", firebaseUser.uid));
        if (memberSnap.exists()) {
          const data = memberSnap.data();
          setUserProfile({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: data.displayName || firebaseUser.email, role: "member", ownerId: data.ownerId, memberId: data.memberId });
          return;
        }
        await signOut(auth);
        setUserProfile(null);
      } catch (err) { console.error("Auth lookup failed:", err); setUserProfile(null); }
    });
    return unsub;
  }, []);

  return <AuthContext.Provider value={{ userProfile, setUserProfile }}>{children}</AuthContext.Provider>;
}

// ─── NotificationContext ──────────────────────────────────────────────────────
const NotifContext = createContext(null);
function NotifProvider({ children }) {
  const [notifs, setNotifs] = useState([]);
  const add = useCallback((msg, type = "info", icon = "🔔") => {
    const id = uid();
    setNotifs(p => [{ id, msg, type, icon, ts: new Date() }, ...p.slice(0, 19)]);
  }, []);
  const dismiss = useCallback((id) => setNotifs(p => p.filter(n => n.id !== id)), []);
  const clear = useCallback(() => setNotifs([]), []);
  return <NotifContext.Provider value={{ notifs, add, dismiss, clear }}>{children}</NotifContext.Provider>;
}

// ─── firestoreService ─────────────────────────────────────────────────────────
const firestoreService = {
  addMember:       (ownerId, data) => addDoc(collection(db, "members"), { ...data, ownerId, createdAt: serverTimestamp() }),
  updateMember:    (id, data) => updateDoc(doc(db, "members", id), { ...data, updatedAt: serverTimestamp() }),
  deleteMember:    (id) => deleteDoc(doc(db, "members", id)),

  // Breakfast stored as number: 0 | 0.5 | 1
  setMeal: (ownerId, date, memberId, data) =>
    setDoc(doc(db, "meals", `${date}_${memberId}_${ownerId}`), { ...data, date, memberId, ownerId }, { merge: true }),

  addBazaar:       (ownerId, data) => addDoc(collection(db, "bazaar"), { ...data, ownerId, createdAt: serverTimestamp() }),
  updateBazaar:    (id, data) => updateDoc(doc(db, "bazaar", id), { ...data, updatedAt: serverTimestamp() }),
  deleteBazaar:    (id) => deleteDoc(doc(db, "bazaar", id)),

  addDeposit:      (ownerId, data) => addDoc(collection(db, "deposits"), { ...data, ownerId, createdAt: serverTimestamp() }),
  deleteDeposit:   (id) => deleteDoc(doc(db, "deposits", id)),

  addExtraCharge:  (ownerId, data) => addDoc(collection(db, "extraCharges"), { ...data, ownerId, createdAt: serverTimestamp() }),
  deleteExtraCharge: (id) => deleteDoc(doc(db, "extraCharges", id)),

  addGuestMeal:    (ownerId, data) => addDoc(collection(db, "guestMeals"), { ...data, ownerId, createdAt: serverTimestamp() }),
  deleteGuestMeal: (id) => deleteDoc(doc(db, "guestMeals", id)),

  createAdminProfile: (uid, data) => setDoc(doc(db, "adminProfiles", uid), { ...data, role: "admin", createdAt: serverTimestamp() }),
  updateAdminProfile: (uid, data) => updateDoc(doc(db, "adminProfiles", uid), { ...data, updatedAt: serverTimestamp() }),

  setMemberAccess:    (memberUid, data) => setDoc(doc(db, "memberAccess", memberUid), { ...data, updatedAt: serverTimestamp() }),
  deleteMemberAccess: (memberUid) => deleteDoc(doc(db, "memberAccess", memberUid)),
};

// ─── useMessData hook ─────────────────────────────────────────────────────────
// All orderBy() removed — sorting done in JS to avoid composite index issues.
function useMessData(ownerId) {
  const [members, setMembers]           = useState([]);
  const [meals, setMeals]               = useState({});
  const [bazaar, setBazaar]             = useState([]);
  const [deposits, setDeposits]         = useState([]);
  const [extraCharges, setExtraCharges] = useState([]);
  const [guestMeals, setGuestMeals]     = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (!ownerId) { setLoading(false); return; }
    setLoading(true);
    const unsubs = [];

    const attach = (q, onData, name) =>
      unsubs.push(onSnapshot(q, snap => onData(snap), err => console.error(`${name}:`, err)));

    attach(query(collection(db, "members"), where("ownerId","==",ownerId)), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));
      setMembers(data);
    }, "members");

    attach(query(collection(db, "meals"), where("ownerId","==",ownerId)), snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data() }; });
      setMeals(map);
    }, "meals");

    attach(query(collection(db, "bazaar"), where("ownerId","==",ownerId)), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a,b) => (b.date||"").localeCompare(a.date||""));
      setBazaar(data);
    }, "bazaar");

    attach(query(collection(db, "deposits"), where("ownerId","==",ownerId)), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a,b) => (b.date||"").localeCompare(a.date||""));
      setDeposits(data);
    }, "deposits");

    attach(query(collection(db, "extraCharges"), where("ownerId","==",ownerId)), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a,b) => (b.date||"").localeCompare(a.date||""));
      setExtraCharges(data);
    }, "extraCharges");

    attach(query(collection(db, "guestMeals"), where("ownerId","==",ownerId)), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a,b) => (b.date||"").localeCompare(a.date||""));
      setGuestMeals(data);
    }, "guestMeals");

    const timer = setTimeout(() => setLoading(false), 800);
    return () => { clearTimeout(timer); unsubs.forEach(u => typeof u === "function" && u()); };
  }, [ownerId]);

  return { members, meals, bazaar, deposits, extraCharges, guestMeals, loading };
}

// ─── Billing computation (supports decimal breakfast: 0 | 0.5 | 1) ───────────
function calcMonth(ym, members, meals, bazaar, deposits, extraCharges = [], guestMeals = []) {
  const activeMembers = members.filter(m => m.status !== "inactive");
  const monthBazaar   = bazaar.filter(b => (b.date||"").startsWith(ym));
  const monthGuests   = guestMeals.filter(g => (g.date||"").startsWith(ym));
  const totalBazaarRaw = monthBazaar.reduce((s,b) => s + Number(b.amount||0), 0);

  let totalMeals = 0;
  const memberMeals = {};
  activeMembers.forEach(m => { memberMeals[m.id] = 0; });

  Object.values(meals).forEach(entry => {
    if (!(entry.date||"").startsWith(ym)) return;
    const mid = entry.memberId;
    if (!memberMeals.hasOwnProperty(mid)) return;
    // breakfast: 0 | 0.5 | 1 (half breakfast support)
    const bfast = Number(entry.breakfast) || 0;
    const cnt = bfast + (entry.lunch ? 1 : 0) + (entry.dinner ? 1 : 0);
    memberMeals[mid] = (memberMeals[mid] || 0) + cnt;
    totalMeals += cnt;
  });

  const totalGuestMeals = monthGuests.reduce((s,g) => s + Number(g.mealCount||0), 0);
  const grandTotalMeals = totalMeals + totalGuestMeals;
  const mealRate = grandTotalMeals > 0 ? totalBazaarRaw / grandTotalMeals : 0;

  const memberSummary = activeMembers.map(m => {
    const mealCount = memberMeals[m.id] || 0;
    const mealCost  = mealCount * mealRate;
    const extras    = extraCharges
      .filter(e => e.memberId === m.id && (e.date||"").startsWith(ym))
      .reduce((s,e) => s + Number(e.amount||0), 0);
    const totalCost = mealCost + extras;
    const deposited = deposits
      .filter(d => d.memberId === m.id && (d.date||"").startsWith(ym))
      .reduce((s,d) => s + Number(d.amount||0), 0);
    const balance = deposited - totalCost;
    return { ...m, meals: mealCount, mealCost, extras, cost: totalCost, deposited, balance };
  });

  return { totalBazaar: totalBazaarRaw, totalMeals, mealRate, memberSummary, monthBazaar, totalGuestMeals };
}

// ─── Toast notifications ───────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = "success") => {
    const id = uid();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3800);
  }, []);
  return { toasts, push };
}

function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  const cfg = {
    success: { bg: "from-emerald-500 to-teal-500", icon: "✓" },
    error:   { bg: "from-rose-500 to-red-600",     icon: "✗" },
    info:    { bg: "from-violet-500 to-indigo-600", icon: "ℹ" },
    warning: { bg: "from-amber-500 to-orange-500",  icon: "⚠" },
  };
  return (
    <div className="fixed top-4 right-4 z-[999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const c = cfg[t.type] || cfg.info;
        return (
          <div key={t.id}
            className={`bg-gradient-to-r ${c.bg} text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 pointer-events-auto backdrop-blur-sm`}
            style={{ animation: "slideInRight 0.35s cubic-bezier(.175,.885,.32,1.275)" }}>
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">{c.icon}</span>
            {t.msg}
          </div>
        );
      })}
    </div>
  );
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

// Skeleton loader
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`}/>;
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
      <Skeleton className="h-4 w-1/3"/>
      <Skeleton className="h-8 w-1/2"/>
      <Skeleton className="h-3 w-2/3"/>
    </div>
  );
}

function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900"/>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 animate-spin"/>
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-violet-400 dark:border-t-violet-500 animate-spin" style={{ animationDirection:"reverse", animationDuration:"0.7s" }}/>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
    </div>
  );
}

function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center text-4xl shadow-inner">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">{title}</h3>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs">{desc}</p>
      </div>
      {action}
    </div>
  );
}

function ConfirmDialog({ open, title, desc, onConfirm, onCancel, danger = true }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-7 w-full max-w-sm border border-gray-100 dark:border-gray-800"
        style={{ animation: "scaleIn 0.2s ease-out" }}>
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-2xl mb-4">⚠️</div>
        <h3 className="text-lg font-bold mb-1.5">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{desc}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`flex-1 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-95 ${danger ? "bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700" : "bg-gradient-to-r from-indigo-500 to-violet-600"}`}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-sm";
const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5";

function Avatar({ name = "?", size = 8, gradient }) {
  const gradients = [
    "from-violet-500 to-indigo-500",
    "from-cyan-400 to-teal-500",
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-500",
    "from-rose-400 to-pink-500",
    "from-blue-400 to-indigo-500",
  ];
  const g = gradient || gradients[name.charCodeAt(0) % gradients.length];
  const sizeMap = { 7:"w-7 h-7 text-xs", 8:"w-8 h-8 text-xs", 9:"w-9 h-9 text-sm", 10:"w-10 h-10 text-sm", 12:"w-12 h-12 text-base", 14:"w-14 h-14 text-lg" };
  return (
    <div className={`${sizeMap[size]||"w-8 h-8 text-xs"} rounded-full bg-gradient-to-br ${g} flex items-center justify-center font-bold text-white flex-shrink-0 shadow-lg`}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

// Premium glassmorphism card
function GlassCard({ children, className = "", gradient, onClick }) {
  return (
    <div onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/5 shadow-xl backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 ${onClick ? "cursor-pointer hover:scale-[1.02] transition-transform" : ""} ${className}`}>
      {gradient && <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 dark:opacity-10`}/>}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Card({ title, sub, children, action, className = "", noPad }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <div>
            {title && <h3 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h3>}
            {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPad ? "" : "p-4 sm:p-5"}>{children}</div>
    </div>
  );
}

function PageHeader({ title, sub, badge, action }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{title}</h2>
        {sub && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {badge && <span className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900">{badge}</span>}
        {action}
      </div>
    </div>
  );
}

function StatusBadge({ value }) {
  const ok = value >= 0;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${ok ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"}`}>
      {ok ? `+৳${value.toFixed(2)}` : `-৳${Math.abs(value).toFixed(2)}`}
    </span>
  );
}

function BtnPrimary({ onClick, disabled, children, className = "", gradient = "from-indigo-600 to-violet-600", size = "md" }) {
  const sz = size === "sm" ? "px-4 py-2 text-xs" : "px-6 py-2.5 text-sm";
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${sz} bg-gradient-to-r ${gradient} hover:opacity-90 active:scale-95 text-white rounded-xl font-semibold transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${className}`}>
      {children}
    </button>
  );
}

function BtnSecondary({ onClick, children, size = "md" }) {
  const sz = size === "sm" ? "px-4 py-2 text-xs" : "px-6 py-2.5 text-sm";
  return (
    <button onClick={onClick}
      className={`${sz} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors`}>
      {children}
    </button>
  );
}

// ─── KPI Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, gradient = "from-indigo-500 to-violet-600", trend, trendUp }) {
  return (
    <GlassCard className="p-5" gradient={gradient}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl shadow-lg`}>{icon}</div>
        {trend !== undefined && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendUp ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-rose-100 dark:bg-rose-900/30 text-rose-600"}`}>
            {trendUp ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{value}</p>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </GlassCard>
  );
}

// ─── Breakfast Selector (None / Half / Full) ───────────────────────────────────
function BreakfastSelector({ value, onChange, disabled }) {
  // value: 0 | 0.5 | 1
  const opts = [
    { label: "None", val: 0,   color: "bg-gray-100 dark:bg-gray-800 text-gray-500", active: "bg-gray-600 text-white" },
    { label: "½",    val: 0.5, color: "bg-amber-50 dark:bg-amber-900/20 text-amber-600", active: "bg-gradient-to-r from-amber-400 to-orange-400 text-white" },
    { label: "Full", val: 1,   color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600", active: "bg-gradient-to-r from-emerald-400 to-teal-500 text-white" },
  ];
  return (
    <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      {opts.map(o => (
        <button key={o.val} disabled={disabled} onClick={() => onChange(o.val)}
          className={`flex-1 py-2 text-xs font-bold transition-all ${Number(value) === o.val ? o.active + " shadow-md" : o.color + " hover:opacity-80"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── PDF Generator ─────────────────────────────────────────────────────────────
function generateBillHTML(member, ym, mealRate, bazaarEntries, depositEntries, extraEntries, totalBazaar, totalMeals) {
  const [y,m] = ym.split("-").map(Number);
  const monthName   = `${MONTHS[m-1]} ${y}`;
  const extras      = extraEntries.filter(e => e.memberId === member.id);
  const extrasTotal = extras.reduce((s,e) => s + Number(e.amount||0), 0);
  const totalCost   = member.mealCost + extrasTotal;
  const balance     = member.deposited - totalCost;

  const depositRows = depositEntries
    .filter(d => d.memberId === member.id && (d.date||"").startsWith(ym))
    .map(d => `<tr><td>${fmtDate(d.date)}</td><td>Deposit</td><td class="green">+${fmtCurrency(d.amount)}</td></tr>`).join("");

  const extraRows = extras
    .map(e => `<tr><td>${fmtDate(e.date)}</td><td>${e.note||"Extra charge"}</td><td class="red">-${fmtCurrency(e.amount)}</td></tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Bill — ${member.name} — ${monthName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;color:#1e293b;background:#f8fafc;padding:32px}
    .card{background:#fff;border-radius:20px;padding:36px;max-width:700px;margin:0 auto;box-shadow:0 8px 40px rgba(0,0,0,.12)}
    .header{display:flex;align-items:center;gap:16px;margin-bottom:28px;padding-bottom:24px;border-bottom:2px solid #e2e8f0}
    .logo{width:56px;height:56px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;color:#fff;box-shadow:0 4px 16px rgba(99,102,241,.3)}
    .header h1{font-size:26px;font-weight:800;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .header p{color:#64748b;font-size:13px;margin-top:3px}
    .member-bar{display:flex;align-items:center;gap:14px;padding:18px;background:linear-gradient(135deg,#f1f5f9,#f8fafc);border-radius:14px;margin-bottom:24px;border:1px solid #e2e8f0}
    .avatar{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff}
    .section{margin-top:24px}
    .section h2{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
    .meta-item{background:#f8fafc;border-radius:12px;padding:14px 16px;border:1px solid #e2e8f0}
    .meta-item .lbl{font-size:11px;color:#94a3b8;margin-bottom:3px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
    .meta-item .val{font-size:18px;font-weight:800;color:#1e293b}
    table{width:100%;border-collapse:collapse;margin-top:8px;border-radius:10px;overflow:hidden}
    th{background:#f1f5f9;font-size:11px;font-weight:700;color:#64748b;padding:11px 14px;text-align:left;text-transform:uppercase;letter-spacing:.05em}
    td{padding:10px 14px;font-size:13px;border-bottom:1px solid #f1f5f9}
    td.green{color:#16a34a;font-weight:600}
    td.red{color:#dc2626;font-weight:600}
    .balance-box{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-radius:14px;margin-top:20px}
    .ok{background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:2px solid #86efac}
    .due{background:linear-gradient(135deg,#fff1f2,#ffe4e6);border:2px solid #fca5a5}
    .stats-bar{margin-top:14px;padding:13px 16px;background:linear-gradient(135deg,#eff6ff,#e0e7ff);border-radius:12px;font-size:12px;color:#4338ca;font-weight:500}
    .footer{margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
    @media print{body{padding:0;background:#fff}.card{box-shadow:none;border-radius:0}}
  </style></head><body>
  <div class="card">
    <div class="header">
      <div class="logo">🍛</div>
      <div><h1>MessManager</h1><p>Monthly Bill — ${monthName}</p></div>
    </div>
    <div class="member-bar">
      <div class="avatar">${member.name[0].toUpperCase()}</div>
      <div>
        <p style="font-size:18px;font-weight:800;color:#1e293b">${member.name}</p>
        <p style="color:#64748b;font-size:13px;margin-top:2px">${member.email||""} ${member.room ? "· Room "+member.room : ""}</p>
      </div>
    </div>
    <div class="section">
      <h2>Summary</h2>
      <div class="meta-grid">
        <div class="meta-item"><div class="lbl">Total Meals</div><div class="val">${fmtMeals(member.meals)}</div></div>
        <div class="meta-item"><div class="lbl">Meal Rate</div><div class="val">${fmtCurrency(mealRate)}</div></div>
        <div class="meta-item"><div class="lbl">Meal Cost</div><div class="val">${fmtCurrency(member.mealCost)}</div></div>
        <div class="meta-item"><div class="lbl">Extra Charges</div><div class="val" style="color:#dc2626">${fmtCurrency(extrasTotal)}</div></div>
        <div class="meta-item"><div class="lbl">Total Cost</div><div class="val">${fmtCurrency(totalCost)}</div></div>
        <div class="meta-item"><div class="lbl">Deposited</div><div class="val" style="color:#16a34a">${fmtCurrency(member.deposited)}</div></div>
      </div>
    </div>
    ${depositRows ? `<div class="section"><h2>Deposits</h2><table><tr><th>Date</th><th>Description</th><th>Amount</th></tr>${depositRows}</table></div>` : ""}
    ${extraRows ? `<div class="section"><h2>Extra Charges</h2><table><tr><th>Date</th><th>Description</th><th>Amount</th></tr>${extraRows}</table></div>` : ""}
    <div class="balance-box ${balance >= 0 ? "ok" : "due"}">
      <div>
        <div style="font-size:12px;font-weight:600;color:${balance>=0?"#15803d":"#b91c1c"}">${balance >= 0 ? "ADVANCE BALANCE" : "AMOUNT DUE"}</div>
        <div style="font-size:24px;font-weight:900;color:${balance>=0?"#15803d":"#b91c1c"}">${balance >= 0 ? "+" : "-"}${fmtCurrency(Math.abs(balance))}</div>
      </div>
      <div style="font-size:36px">${balance >= 0 ? "✅" : "⚠️"}</div>
    </div>
    <div class="stats-bar">📊 Mess Stats: Total Bazaar ৳${totalBazaar.toFixed(2)} · ${fmtMeals(totalMeals)} total meals · Rate ৳${mealRate.toFixed(2)}/meal</div>
    <div class="footer">Generated by MessManager v5.0 · ${new Date().toLocaleString()}</div>
  </div></body></html>`;
}

function printBill(html) {
  const win = window.open("","_blank","width=820,height=960");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 700);
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
function ProtectedRoute({ allowedRoles, children }) {
  const { userProfile } = useContext(AuthContext);
  const location = useLocation();
  if (userProfile === undefined) return <Spinner label="Authenticating…"/>;
  if (!userProfile) return <Navigate to="/login" state={{ from: location }} replace/>;
  if (allowedRoles && !allowedRoles.includes(userProfile.role)) return <Navigate to="/unauthorized" replace/>;
  return children;
}

// ─── Auth Pages ───────────────────────────────────────────────────────────────
function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 0% 0%, #6366f120 0%, transparent 60%), radial-gradient(ellipse at 100% 100%, #8b5cf620 0%, transparent 60%), radial-gradient(ellipse at 50% 50%, #0f172a 0%, #1e1b4b 100%)" }}>
      {/* Animated blobs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl animate-pulse"/>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl animate-pulse" style={{ animationDelay:"1s" }}/>
      <div className="relative w-full max-w-md z-10">{children}</div>
    </div>
  );
}

function LoginPage() {
  const { dark, setDark } = useContext(ThemeContext);
  const { userProfile }   = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy]   = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from     = location.state?.from?.pathname || "/";

  if (userProfile) return <Navigate to={from} replace/>;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError("Email and password required."); return; }
    setBusy(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate(from, { replace: true });
    } catch { setError("Invalid credentials. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <AuthLayout>
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-4xl shadow-2xl shadow-indigo-500/40 mx-auto mb-4">🍛</div>
          <h1 className="text-3xl font-black text-white">MessManager</h1>
          <p className="text-indigo-300 mt-1 text-sm font-medium">v5.0 — Premium Edition</p>
        </div>
        {error && <div className="mb-4 p-3.5 bg-rose-500/20 border border-rose-400/30 text-rose-300 rounded-2xl text-sm font-medium">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all text-sm backdrop-blur-sm"
              placeholder="you@example.com" onKeyDown={e => e.key === "Enter" && handleLogin()}/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
              placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()}/>
          </div>
          <button onClick={handleLogin} disabled={busy}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold rounded-xl shadow-2xl shadow-indigo-500/40 transition-all active:scale-95 disabled:opacity-50 text-sm">
            {busy ? "Signing in…" : "Sign In →"}
          </button>
        </div>
        <div className="mt-6 flex justify-center gap-5 text-sm">
          <button onClick={() => navigate("/register")} className="text-indigo-300 hover:text-white transition-colors font-medium">Create Account</button>
          <span className="text-indigo-500">·</span>
          <button onClick={() => navigate("/forgot-password")} className="text-indigo-300 hover:text-white transition-colors font-medium">Forgot Password?</button>
        </div>
        <button onClick={() => setDark(d => !d)} className="w-full mt-4 text-center text-xs text-indigo-400 hover:text-indigo-200 transition-colors">
          {dark ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>
    </AuthLayout>
  );
}

function RegisterPage() {
  const { userProfile } = useContext(AuthContext);
  const navigate        = useNavigate();
  const [form, setForm] = useState({ name:"", email:"", password:"", confirm:"" });
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy]       = useState(false);

  if (userProfile) return <Navigate to="/" replace/>;

  const handleRegister = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) { setError("All fields required."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    setBusy(true); setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      await firestoreService.createAdminProfile(cred.user.uid, { displayName: form.name.trim(), email: form.email.trim() });
      setSuccess("Account created! Redirecting…");
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setError(err.code === "auth/email-already-in-use" ? "Email already in use." : "Error: " + err.message);
    } finally { setBusy(false); }
  };

  return (
    <AuthLayout>
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8">
        <div className="text-center mb-7">
          <div className="text-5xl mb-3">✨</div>
          <h1 className="text-2xl font-black text-white">Create Account</h1>
          <p className="text-indigo-300 mt-1 text-sm">MessManager v5.0</p>
        </div>
        {error && <div className="mb-4 p-3 bg-rose-500/20 border border-rose-400/30 text-rose-300 rounded-xl text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-xl text-sm">{success}</div>}
        <div className="space-y-3">
          {[["Full Name","name","text"],["Email","email","email"],["Password","password","password"],["Confirm Password","confirm","password"]].map(([lbl,key,type]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-1">{lbl}</label>
              <input type={type} value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} onKeyDown={e => e.key === "Enter" && handleRegister()}
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"/>
            </div>
          ))}
          <button onClick={handleRegister} disabled={busy}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50">
            {busy ? "Creating…" : "Create Account"}
          </button>
        </div>
        <div className="mt-5 text-center">
          <button onClick={() => navigate("/login")} className="text-xs text-indigo-300 hover:text-white transition-colors">← Back to Sign In</button>
        </div>
      </div>
    </AuthLayout>
  );
}

function ForgotPasswordPage() {
  const { userProfile } = useContext(AuthContext);
  const navigate        = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy]       = useState(false);

  if (userProfile) return <Navigate to="/" replace/>;

  const handleReset = async () => {
    if (!email.trim()) { setError("Enter your email."); return; }
    setBusy(true); setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess("Reset email sent! Check your inbox.");
    } catch (err) {
      setError(err.code === "auth/user-not-found" ? "No account with that email." : err.message);
    } finally { setBusy(false); }
  };

  return (
    <AuthLayout>
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8">
        <div className="text-center mb-7">
          <div className="text-5xl mb-3">🔑</div>
          <h1 className="text-2xl font-black text-white">Reset Password</h1>
          <p className="text-indigo-300 mt-1 text-sm">We'll email you a reset link</p>
        </div>
        {error && <div className="mb-4 p-3 bg-rose-500/20 border border-rose-400/30 text-rose-300 rounded-xl text-sm">{error}</div>}
        {success ? (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-xl text-sm">{success}</div>
            <button onClick={() => navigate("/login")} className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold rounded-xl">Back to Sign In</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==="Enter"&&handleReset()}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"/>
            </div>
            <button onClick={handleReset} disabled={busy} className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold rounded-xl disabled:opacity-50">
              {busy ? "Sending…" : "Send Reset Link"}
            </button>
          </div>
        )}
        <div className="mt-5 text-center">
          <button onClick={() => navigate("/login")} className="text-xs text-indigo-300 hover:text-white">← Back to Sign In</button>
        </div>
      </div>
    </AuthLayout>
  );
}

function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <AuthLayout>
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-10 text-center">
        <div className="text-7xl mb-4">🚫</div>
        <h1 className="text-3xl font-black text-white mb-2">Access Denied</h1>
        <p className="text-indigo-300 text-sm mb-8">You don't have permission to view this page.</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate("/")} className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold rounded-xl">Go to Dashboard</button>
          <button onClick={() => signOut(auth).then(() => navigate("/login"))} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl">Sign in with Different Account</button>
        </div>
      </div>
    </AuthLayout>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────
function AppShell() {
  const { userProfile }       = useContext(AuthContext);
  const { dark, setDark }     = useContext(ThemeContext);
  const [page, setPage]       = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toasts, push: notify } = useToast();
  const navigate              = useNavigate();

  const { members, meals, bazaar, deposits, extraCharges, guestMeals, loading } =
    useMessData(userProfile?.ownerId);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login", { replace: true });
  };

  if (!userProfile) return null;
  const isAdmin = userProfile.role === "admin";
  const ownerId = userProfile.ownerId;

  const adminNav = [
    { key:"dashboard", icon:"⚡", label:"Dashboard" },
    { key:"members",   icon:"👥", label:"Members" },
    { key:"meals",     icon:"🍽️",  label:"Meals" },
    { key:"bazaar",    icon:"🛒", label:"Bazaar" },
    { key:"deposits",  icon:"💰", label:"Deposits" },
    { key:"extras",    icon:"➕", label:"Extras" },
    { key:"guests",    icon:"🤝", label:"Guests" },
    { key:"reports",   icon:"📊", label:"Reports" },
    { key:"settings",  icon:"⚙️",  label:"Settings" },
  ];
  const memberNav = [
    { key:"dashboard", icon:"⚡", label:"My Bill" },
    { key:"meals",     icon:"🍽️",  label:"My Meals" },
    { key:"settings",  icon:"⚙️",  label:"Settings" },
  ];
  const navItems = isAdmin ? adminNav : memberNav;

  const shared = {
    members, meals, bazaar,
    deposits:     isAdmin ? deposits     : deposits.filter(d => d.memberId === userProfile.memberId),
    extraCharges: isAdmin ? extraCharges : extraCharges.filter(e => e.memberId === userProfile.memberId),
    guestMeals, notify, userProfile, isAdmin, ownerId,
  };

  const pageComponents = {
    dashboard: <Dashboard {...shared}/>,
    members:   isAdmin ? <MembersPage {...shared}/> : null,
    meals:     <MealsPage {...shared}/>,
    bazaar:    isAdmin ? <BazaarPage {...shared}/> : null,
    deposits:  isAdmin ? <DepositsPage {...shared}/> : null,
    extras:    isAdmin ? <ExtrasPage {...shared}/> : null,
    guests:    isAdmin ? <GuestsPage {...shared}/> : null,
    reports:   isAdmin ? <ReportsPage {...shared}/> : null,
    settings:  <SettingsPage {...shared} dark={dark} setDark={setDark} onLogout={handleLogout}/>,
  };

  // Sidebar nav item component
  const NavItem = ({ n }) => (
    <button onClick={() => { setPage(n.key); setSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group
        ${page === n.key
          ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40"
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"}`}>
      <span className={`text-base transition-transform group-hover:scale-110 ${page === n.key ? "opacity-100" : "opacity-70"}`}>{n.icon}</span>
      {n.label}
      {page === n.key && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60"/>}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex">

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)}/>}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed h-full z-20 shadow-xl">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40">🍛</div>
            <div>
              <h1 className="font-black text-base text-gray-900 dark:text-white">MessManager</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500">{isAdmin ? "Admin Panel" : "Member Portal"}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(n => <NavItem key={n.key} n={n}/>)}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800">
            <Avatar name={userProfile.displayName} size={9}/>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-gray-900 dark:text-white">{userProfile.displayName}</p>
              <p className="text-xs text-gray-400 capitalize">{userProfile.role}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDark(d => !d)}
              className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              {dark ? "☀️ Light" : "🌙 Dark"}
            </button>
            <button onClick={handleLogout}
              className="flex-1 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar (slide-in) */}
      <aside className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-900 z-40 shadow-2xl transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-lg">🍛</div>
            <span className="font-black text-base">MessManager</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>
        <nav className="p-3 space-y-0.5 overflow-y-auto flex-1">
          {navItems.map(n => <NavItem key={n.key} n={n}/>)}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex gap-2">
            <button onClick={() => { setDark(d => !d); }} className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-semibold">{dark ? "☀️ Light" : "🌙 Dark"}</button>
            <button onClick={handleLogout} className="flex-1 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-xs font-semibold">Logout</button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 z-20 flex items-center justify-between px-4 h-14">
        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
          <div className="w-5 h-4 flex flex-col justify-between"><span className="block h-0.5 bg-gray-700 dark:bg-gray-300 rounded"/><span className="block h-0.5 bg-gray-700 dark:bg-gray-300 rounded"/><span className="block h-0.5 bg-gray-700 dark:bg-gray-300 rounded"/></div>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm">🍛</div>
          <span className="font-black text-sm">MessManager</span>
        </div>
        <button onClick={() => setDark(d => !d)} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 text-base">{dark ? "☀️" : "🌙"}</button>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 z-30 flex shadow-2xl">
        {navItems.slice(0,5).map(n => (
          <button key={n.key} onClick={() => setPage(n.key)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${page===n.key ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`}>
            <span className="text-lg leading-none">{n.icon}</span>
            <span className="text-[9px] font-bold tracking-wide">{n.label.slice(0,7)}</span>
            {page===n.key && <div className="w-1 h-1 rounded-full bg-indigo-500 mt-0.5"/>}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen">
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          {loading
            ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><SkeletonCard/><SkeletonCard/><SkeletonCard/><SkeletonCard/></div>
            : (pageComponents[page] || <Navigate to="/"/>)}
        </div>
      </main>

      <ToastContainer toasts={toasts}/>
      <GlobalStyles/>
    </div>
  );
}

// ─── Global CSS Animations ─────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @keyframes slideInRight { from { opacity:0; transform:translateX(40px) scale(.95); } to { opacity:1; transform:translateX(0) scale(1); } }
      @keyframes scaleIn { from { opacity:0; transform:scale(.92); } to { opacity:1; transform:scale(1); } }
      @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      .fade-in-up { animation: fadeInUp 0.4s ease-out; }
      .fade-in-up-delay-1 { animation: fadeInUp 0.4s ease-out 0.1s both; }
      .fade-in-up-delay-2 { animation: fadeInUp 0.4s ease-out 0.2s both; }
      .fade-in-up-delay-3 { animation: fadeInUp 0.4s ease-out 0.3s both; }
      * { scroll-behavior: smooth; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #6366f140; border-radius: 99px; }
      ::-webkit-scrollbar-thumb:hover { background: #6366f180; }
    `}</style>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  // Inject PWA manifest dynamically
  useEffect(() => {
    const existing = document.querySelector('link[rel="manifest"]');
    if (!existing) {
      const manifest = {
        name: "MessManager",
        short_name: "MessManager",
        description: "Premium mess management system",
        start_url: "/",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#6366f1",
        icons: [{ src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><text y='52' font-size='52'>🍛</text></svg>", sizes: "64x64", type: "image/svg+xml" }],
      };
      const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("link");
      link.rel = "manifest"; link.href = url;
      document.head.appendChild(link);
    }
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <NotifProvider>
          <AppWithTheme/>
        </NotifProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppWithTheme() {
  const { dark } = useContext(ThemeContext);
  return (
    <div className={dark ? "dark" : ""}>
      <BrowserRouter>
        <Routes>
          <Route path="/login"           element={<LoginPage/>}/>
          <Route path="/register"        element={<RegisterPage/>}/>
          <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
          <Route path="/unauthorized"    element={<UnauthorizedPage/>}/>
          <Route path="/" element={
            <ProtectedRoute allowedRoles={["admin","member"]}>
              <AppShell/>
            </ProtectedRoute>
          }/>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ members, meals, bazaar, deposits, extraCharges, guestMeals, userProfile, isAdmin }) {
  const ym    = getCurrentMonth();
  const [y,m] = ym.split("-").map(Number);
  const { totalBazaar, totalMeals, mealRate, memberSummary, totalGuestMeals } =
    calcMonth(ym, members, meals, bazaar, deposits, extraCharges, guestMeals);

  // ── Member view ──
  if (!isAdmin) {
    const me = memberSummary.find(m => m.id === userProfile.memberId);
    if (!me) return <EmptyState icon="👤" title="Account not linked" desc="Ask your admin to link your member account."/>;
    return (
      <div className="space-y-6 fade-in-up">
        <PageHeader title={`Hi, ${me.name.split(" ")[0]}! 👋`} sub={`${MONTHS[m-1]} ${y} — Your Bill`}/>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard icon="🍽️" label="Your Meals"    value={fmtMeals(me.meals)}                                                    gradient="from-indigo-500 to-violet-600"/>
          <StatCard icon="💸" label="Meal Cost"      value={fmtCurrency(me.mealCost)}                                               gradient="from-cyan-500 to-blue-500"/>
          <StatCard icon="➕" label="Extra Charges"  value={fmtCurrency(me.extras)}                                                gradient="from-amber-500 to-orange-500"/>
          <StatCard icon="🧾" label="Total Cost"     value={fmtCurrency(me.cost)}                                                   gradient="from-rose-500 to-pink-600"/>
          <StatCard icon="💰" label="Deposited"      value={fmtCurrency(me.deposited)}                                             gradient="from-emerald-500 to-teal-500"/>
          <StatCard icon={me.balance>=0?"✅":"⚠️"} label="Balance"
            value={`${me.balance>=0?"+":""}${fmtCurrency(me.balance)}`}
            gradient={me.balance>=0 ? "from-emerald-500 to-green-600" : "from-rose-500 to-red-600"}/>
        </div>
        <Card title="📊 Mess Rate Info" sub={`${MONTHS[m-1]} ${y}`}>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
              <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">Meal Rate</p>
              <p className="text-xl font-black text-indigo-700 dark:text-indigo-300 mt-1">{fmtCurrency(mealRate)}</p>
              <p className="text-xs text-indigo-400 mt-0.5">per meal</p>
            </div>
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4">
              <p className="text-xs text-violet-500 font-semibold uppercase tracking-wide">Total Meals</p>
              <p className="text-xl font-black text-violet-700 dark:text-violet-300 mt-1">{fmtMeals(totalMeals + totalGuestMeals)}</p>
              <p className="text-xs text-violet-400 mt-0.5">incl. {totalGuestMeals} guest</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ── Admin dashboard ──
  const prevD  = new Date(y, m-2, 1);
  const prevYm = `${prevD.getFullYear()}-${String(prevD.getMonth()+1).padStart(2,"0")}`;
  const prev   = calcMonth(prevYm, members, meals, bazaar, deposits, extraCharges, guestMeals);

  const bazaarTrend = Array.from({ length:6 }, (_,i) => {
    const d   = new Date(y, m-1-i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    return {
      month: MONTHS[d.getMonth()],
      bazaar: bazaar.filter(b => (b.date||"").startsWith(key)).reduce((s,b) => s+Number(b.amount||0),0),
      meals:  Object.values(meals).filter(e => (e.date||"").startsWith(key))
        .reduce((s,e) => s+(Number(e.breakfast)||0)+(e.lunch?1:0)+(e.dinner?1:0), 0),
    };
  }).reverse();

  // Meal type breakdown
  let bfFull=0, bfHalf=0, bfNone=0, lunchOn=0, dinnerOn=0;
  Object.values(meals).forEach(e => {
    if (!(e.date||"").startsWith(ym)) return;
    const b = Number(e.breakfast)||0;
    if (b===1) bfFull++; else if (b===0.5) bfHalf++; else bfNone++;
    if (e.lunch) lunchOn++;
    if (e.dinner) dinnerOn++;
  });
  const pieData = [
    { name:"Full Breakfast", value:bfFull },
    { name:"Half Breakfast", value:bfHalf },
    { name:"Lunch", value:lunchOn },
    { name:"Dinner", value:dinnerOn },
  ].filter(p => p.value>0);

  const totalDue     = memberSummary.filter(m => m.balance < 0).reduce((s,m) => s+Math.abs(m.balance),0);
  const totalAdvance = memberSummary.filter(m => m.balance >= 0).reduce((s,m) => s+m.balance,0);
  const topEater     = [...memberSummary].sort((a,b) => b.meals-a.meals)[0];
  const highestDue   = [...memberSummary].sort((a,b) => a.balance-b.balance)[0];

  // Today's meals
  const todayMeals = Object.values(meals).filter(e => e.date === TODAY)
    .reduce((s,e) => s+(Number(e.breakfast)||0)+(e.lunch?1:0)+(e.dinner?1:0), 0);

  const rateTrend = prev.mealRate > 0 ? ((mealRate - prev.mealRate)/prev.mealRate)*100 : 0;
  const bazaarTrendPct = prev.totalBazaar > 0 ? ((totalBazaar - prev.totalBazaar)/prev.totalBazaar)*100 : 0;

  return (
    <div className="space-y-6 fade-in-up">
      <PageHeader title="Dashboard" sub={`${MONTHS[m-1]} ${y} — Live Overview`}
        badge={`${members.filter(m=>m.status!=="inactive").length} Active Members`}/>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 fade-in-up-delay-1">
        <StatCard icon="🛒" label="Bazaar Cost"   value={fmtCurrency(totalBazaar)} gradient="from-amber-500 to-orange-500" trend={bazaarTrendPct} trendUp={bazaarTrendPct>=0}/>
        <StatCard icon="🍽️" label="Total Meals"   value={fmtMeals(totalMeals)}     gradient="from-indigo-500 to-violet-600"/>
        <StatCard icon="💸" label="Meal Rate"      value={fmtCurrency(mealRate)}    gradient="from-cyan-500 to-blue-500" trend={rateTrend} trendUp={rateTrend<=0} sub="Lower is better"/>
        <StatCard icon="📅" label="Today's Meals"  value={fmtMeals(todayMeals)}     gradient="from-violet-500 to-purple-600"/>
        <StatCard icon="⚠️" label="Total Due"      value={fmtCurrency(totalDue)}    gradient="from-rose-500 to-red-600" sub={`${memberSummary.filter(m=>m.balance<0).length} members`}/>
        <StatCard icon="✅" label="Total Advance"  value={fmtCurrency(totalAdvance)} gradient="from-emerald-500 to-teal-500" sub={`${memberSummary.filter(m=>m.balance>=0).length} members`}/>
        {topEater && <StatCard icon="🏆" label="Top Eater" value={topEater.name.split(" ")[0]} gradient="from-amber-400 to-yellow-500" sub={`${fmtMeals(topEater.meals)} meals`}/>}
        {highestDue && highestDue.balance < 0 && <StatCard icon="❗" label="Highest Due" value={highestDue.name.split(" ")[0]} gradient="from-rose-400 to-pink-500" sub={fmtCurrency(Math.abs(highestDue.balance))}/>}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4 fade-in-up-delay-2">
        <Card title="📈 6-Month Bazaar Trend" sub="Spending over time">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={bazaarTrend}>
              <defs>
                <linearGradient id="bazGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700"/>
              <XAxis dataKey="month" tick={{ fontSize:11, fill:"#94a3b8" }}/>
              <YAxis tick={{ fontSize:11, fill:"#94a3b8" }}/>
              <Tooltip formatter={v => fmtCurrency(v)} contentStyle={{ borderRadius:12, border:"none", boxShadow:"0 4px 24px rgba(0,0,0,.12)" }}/>
              <Area type="monotone" dataKey="bazaar" stroke="#6366f1" strokeWidth={2.5} fill="url(#bazGrad)" name="Bazaar (৳)"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="🥧 Meal Distribution" sub={`${MONTHS[m-1]} ${y}`}>
          {pieData.length>0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pieData.map((_,i) => <Cell key={i} fill={COLORS[i]} strokeWidth={0}/>)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius:12, border:"none", boxShadow:"0 4px 24px rgba(0,0,0,.12)" }}/>
                <Legend wrapperStyle={{ fontSize:12, paddingTop:8 }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState icon="🍽️" title="No meal data" desc="Start adding meals to see distribution."/>}
        </Card>
      </div>

      {/* Member Summary Table */}
      <Card title={`📋 Member Summary — ${MONTHS[m-1]} ${y}`}
        sub={`Meal rate: ${fmtCurrency(mealRate)} per meal`} className="fade-in-up-delay-3">
        {memberSummary.length === 0
          ? <EmptyState icon="👥" title="No members" desc="Add members to see summary."/>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {["Member","Meals","Meal Cost","Extras","Total","Deposited","Balance","Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap first:rounded-l-xl last:rounded-r-xl">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {memberSummary.map((m,i) => (
                    <tr key={m.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={m.name} size={8}/>
                          <div>
                            <p className="font-bold text-xs">{m.name}</p>
                            {m.room && <p className="text-xs text-gray-400">Room {m.room}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold">{fmtMeals(m.meals)}</td>
                      <td className="px-4 py-3.5">{fmtCurrency(m.mealCost)}</td>
                      <td className="px-4 py-3.5 text-amber-600 dark:text-amber-400">{fmtCurrency(m.extras)}</td>
                      <td className="px-4 py-3.5 font-bold">{fmtCurrency(m.cost)}</td>
                      <td className="px-4 py-3.5 text-emerald-600 dark:text-emerald-400">{fmtCurrency(m.deposited)}</td>
                      <td className={`px-4 py-3.5 font-black ${m.balance>=0?"text-emerald-600 dark:text-emerald-400":"text-rose-500"}`}>
                        {m.balance>=0?"+":"−"}{fmtCurrency(Math.abs(m.balance))}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge value={m.balance}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
    </div>
  );
}

// ─── MEMBERS ──────────────────────────────────────────────────────────────────
function MembersPage({ members, notify, ownerId }) {
  const [form, setForm]     = useState({ name:"", email:"", phone:"", room:"", status:"active" });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy]     = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() =>
    members.filter(m => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.email||"").toLowerCase().includes(search.toLowerCase()) ||
        (m.room||"").toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter==="all" || m.status===filter;
      return matchSearch && matchFilter;
    }), [members, search, filter]);

  const resetForm = () => { setForm({ name:"", email:"", phone:"", room:"", status:"active" }); setEditId(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { notify("Name is required","error"); return; }
    setBusy(true);
    try {
      if (editId) { await firestoreService.updateMember(editId, form); notify("Member updated ✓"); }
      else         { await firestoreService.addMember(ownerId, form); notify("Member added ✓"); }
      resetForm();
    } catch (err) { notify("Error: "+err.message,"error"); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    setBusy(true);
    try { await firestoreService.deleteMember(id); notify("Member deleted"); }
    catch (err) { notify("Delete failed","error"); }
    finally { setBusy(false); setConfirm(null); }
  };

  const toggleStatus = async (m) => {
    const ns = m.status==="inactive" ? "active" : "inactive";
    try { await firestoreService.updateMember(m.id,{status:ns}); notify(`${m.name} → ${ns}`); }
    catch { notify("Update failed","error"); }
  };

  const active   = members.filter(m=>m.status!=="inactive").length;
  const inactive = members.length - active;

  return (
    <div className="space-y-6 fade-in-up">
      <PageHeader title="Members" badge={`${members.length} total`}/>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="👥" label="Total"    value={members.length} gradient="from-indigo-500 to-violet-600"/>
        <StatCard icon="✅" label="Active"   value={active}         gradient="from-emerald-500 to-teal-500"/>
        <StatCard icon="😴" label="Inactive" value={inactive}       gradient="from-gray-500 to-slate-600"/>
      </div>

      {/* Add/Edit Form */}
      <Card title={editId ? "✏️ Edit Member" : "➕ Add New Member"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[["Full Name *","name","text"],["Email","email","email"],["Phone","phone","tel"],["Room No","room","text"]].map(([lbl,key,type]) => (
            <div key={key}>
              <label className={labelCls}>{lbl}</label>
              <input type={type} value={form[key]} placeholder={lbl.replace(" *","")}
                onChange={e => setForm(f => ({...f,[key]:e.target.value}))} className={inputCls}
                onKeyDown={e => e.key==="Enter" && handleSave()}/>
            </div>
          ))}
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({...f,status:e.target.value}))} className={inputCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <BtnPrimary onClick={handleSave} disabled={busy}>{editId ? "Update Member" : "Add Member"}</BtnPrimary>
          {editId && <BtnSecondary onClick={resetForm}>Cancel</BtnSecondary>}
        </div>
      </Card>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search members…" className={inputCls + " flex-1"}/>
        <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
          {["all","active","inactive"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2.5 text-xs font-bold capitalize transition-colors ${filter===f ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {filtered.length === 0
          ? <EmptyState icon="👤" title="No members found" desc="Add your first member above."/>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {["#","Name","Email","Phone","Room","Status","Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m,i) => (
                    <tr key={m.id} className={`border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${m.status==="inactive"?"opacity-50":""}`}>
                      <td className="px-4 py-3.5 text-gray-400 text-xs font-bold">{i+1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5"><Avatar name={m.name} size={8}/><span className="font-bold">{m.name}</span></div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500">{m.email||"—"}</td>
                      <td className="px-4 py-3.5 text-gray-500">{m.phone||"—"}</td>
                      <td className="px-4 py-3.5 text-gray-500">{m.room||"—"}</td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => toggleStatus(m)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${m.status==="inactive"
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700"
                            : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-red-100 hover:text-red-600"}`}>
                          {m.status==="inactive" ? "Inactive" : "Active"}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-2">
                          <button onClick={() => { setForm({name:m.name,email:m.email||"",phone:m.phone||"",room:m.room||"",status:m.status||"active"}); setEditId(m.id); }}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 transition-colors">Edit</button>
                          <button onClick={() => setConfirm({id:m.id,name:m.name})}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 transition-colors">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
      <ConfirmDialog open={!!confirm} title="Delete Member"
        desc={`Delete "${confirm?.name}"? This cannot be undone.`}
        onConfirm={() => handleDelete(confirm.id)} onCancel={() => setConfirm(null)}/>
    </div>
  );
}

// ─── MEALS ────────────────────────────────────────────────────────────────────
function MealsPage({ members, meals, notify, userProfile, isAdmin, ownerId }) {
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [viewMode, setViewMode]         = useState("table");
  const [busyKey, setBusyKey]           = useState(null);
  const [calMonth, setCalMonth]         = useState(getCurrentMonth());

  const visibleMembers = isAdmin
    ? members.filter(m => m.status !== "inactive")
    : members.filter(m => m.id === userProfile.memberId);

  const getMealDoc = (memberId) => meals[`${selectedDate}_${memberId}_${ownerId}`] || { breakfast:0, lunch:false, dinner:false };

  // Breakfast is now 0 | 0.5 | 1
  const toggleMeal = async (memberId, type, bfValue) => {
    if (!isAdmin && memberId !== userProfile.memberId) return;
    const cur    = getMealDoc(memberId);
    const busyId = `${selectedDate}_${memberId}_${type}`;
    setBusyKey(busyId);
    try {
      const update = {
        breakfast: type==="breakfast" ? bfValue : (Number(cur.breakfast)||0),
        lunch:     type==="lunch"     ? !cur.lunch     : !!cur.lunch,
        dinner:    type==="dinner"    ? !cur.dinner    : !!cur.dinner,
      };
      if (type !== "breakfast") update.breakfast = Number(cur.breakfast)||0;
      await firestoreService.setMeal(ownerId, selectedDate, memberId, update);
    } catch (err) { notify("Failed: "+err.message,"error"); }
    finally { setBusyKey(null); }
  };

  const setBreakfast = async (memberId, val) => {
    if (!isAdmin && memberId !== userProfile.memberId) return;
    const cur    = getMealDoc(memberId);
    const busyId = `${selectedDate}_${memberId}_breakfast`;
    setBusyKey(busyId);
    try {
      await firestoreService.setMeal(ownerId, selectedDate, memberId, {
        breakfast: val,
        lunch:     !!cur.lunch,
        dinner:    !!cur.dinner,
      });
    } catch (err) { notify("Failed: "+err.message,"error"); }
    finally { setBusyKey(null); }
  };

  const setAllMeals = async (type, val) => {
    if (!isAdmin || !visibleMembers.length) return;
    try {
      await Promise.all(visibleMembers.map(m => {
        const cur = getMealDoc(m.id);
        return firestoreService.setMeal(ownerId, selectedDate, m.id, {
          breakfast: type==="breakfast" ? val : (Number(cur.breakfast)||0),
          lunch:     type==="lunch"     ? val : !!cur.lunch,
          dinner:    type==="dinner"    ? val : !!cur.dinner,
        });
      }));
      notify(`All ${type} updated ✓`);
    } catch { notify("Bulk update failed","error"); }
  };

  const dayTotal = visibleMembers.reduce((s,m) => {
    const e = getMealDoc(m.id);
    return s + (Number(e.breakfast)||0) + (e.lunch?1:0) + (e.dinner?1:0);
  }, 0);

  // ── Heatmap Calendar ──
  const renderHeatmap = () => {
    const [cy,cm] = calMonth.split("-").map(Number);
    const days    = daysInMonth(calMonth);
    const firstDay = new Date(cy,cm-1,1).getDay();
    const cells   = [];
    for (let i=0; i<firstDay; i++) cells.push(<div key={`e${i}`}/>);
    for (let d=1; d<=days; d++) {
      const ds  = `${calMonth}-${String(d).padStart(2,"0")}`;
      const cnt = visibleMembers.reduce((s,m) => {
        const e = meals[`${ds}_${m.id}_${ownerId}`]||{};
        return s+(Number(e.breakfast)||0)+(e.lunch?1:0)+(e.dinner?1:0);
      },0);
      const max = visibleMembers.length*3||1;
      const pct = cnt/max;
      const bg  = pct===0 ? "bg-gray-100 dark:bg-gray-800"
                : pct<0.33 ? "bg-emerald-100 dark:bg-emerald-900/40"
                : pct<0.66 ? "bg-emerald-300 dark:bg-emerald-700"
                           : "bg-emerald-500 dark:bg-emerald-500";
      const isToday = ds === TODAY;
      cells.push(
        <button key={d} onClick={() => { setSelectedDate(ds); setViewMode("table"); }}
          title={`${ds}: ${fmtMeals(cnt)} meals`}
          className={`aspect-square rounded-lg ${bg} flex flex-col items-center justify-center text-xs font-bold transition-all hover:scale-110 hover:shadow-lg
            ${ds===selectedDate ? "ring-2 ring-indigo-500 dark:ring-indigo-400 scale-105" : ""}
            ${isToday ? "ring-2 ring-amber-400" : ""}`}>
          <span className={`${cnt>0?"text-white dark:text-white":"text-gray-500 dark:text-gray-500"} text-[10px]`}>{d}</span>
          {cnt>0 && <span className="text-[8px] text-white/80">{fmtMeals(cnt)}</span>}
        </button>
      );
    }
    return cells;
  };

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title={isAdmin ? "Daily Meals" : "My Meals"} sub={fmtDate(selectedDate)}/>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {[["table","📋","Table"],["calendar","📅","Heatmap"]].map(([key,ico,lbl]) => (
            <button key={key} onClick={() => setViewMode(key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode===key ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700"}`}>
              {ico} {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* GitHub-style Heatmap */}
      {viewMode==="calendar" && (
        <Card title="🗓️ Meal Activity Heatmap" sub="Click any day to edit"
          action={<input type="month" value={calMonth} onChange={e=>setCalMonth(e.target.value)} className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>}>
          <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} className="text-xs text-gray-400 font-bold py-1">{d}</div>)}
            {renderHeatmap()}
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
            <span>Less</span>
            {["bg-gray-100 dark:bg-gray-800","bg-emerald-100 dark:bg-emerald-900/40","bg-emerald-300 dark:bg-emerald-700","bg-emerald-500"].map((c,i) =>
              <span key={i} className={`w-4 h-4 rounded ${c} inline-block`}/>)}
            <span>More</span>
            <span className="ml-2 text-amber-500 font-medium">■ Today</span>
          </div>
        </Card>
      )}

      {/* Table View */}
      {viewMode==="table" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input type="date" value={selectedDate} max={TODAY} onChange={e=>setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"/>
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl">
              <span className="text-lg">🍽️</span>
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{fmtMeals(dayTotal)} meals today</span>
            </div>
          </div>

          {/* Bulk controls */}
          {isAdmin && (
            <Card title="⚡ Bulk Actions" sub="Apply to all members">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Breakfast</p>
                  <div className="flex gap-1.5">
                    <button onClick={()=>setAllMeals("breakfast",0)} className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold hover:bg-gray-200 transition-colors">None</button>
                    <button onClick={()=>setAllMeals("breakfast",0.5)} className="flex-1 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-xs font-bold hover:bg-amber-100 transition-colors">½ All</button>
                    <button onClick={()=>setAllMeals("breakfast",1)} className="flex-1 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-xs font-bold hover:bg-emerald-100 transition-colors">Full</button>
                  </div>
                </div>
                {["lunch","dinner"].map(t => (
                  <div key={t}>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">{t}</p>
                    <div className="flex gap-1.5">
                      <button onClick={()=>setAllMeals(t,true)} className="flex-1 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-xs font-bold hover:bg-emerald-100">All ON</button>
                      <button onClick={()=>setAllMeals(t,false)} className="flex-1 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-xs font-bold hover:bg-rose-100">All OFF</button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            {visibleMembers.length===0
              ? <EmptyState icon="👥" title="No members" desc="Add members first."/>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Member</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Breakfast<br/><span className="text-indigo-400 normal-case text-[10px]">None / ½ / Full</span></th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Lunch</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Dinner</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleMembers.map(m => {
                        const entry = getMealDoc(m.id);
                        const bf    = Number(entry.breakfast)||0;
                        const total = bf + (entry.lunch?1:0) + (entry.dinner?1:0);
                        return (
                          <tr key={m.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={m.name} size={8}/>
                                <div>
                                  <p className="font-bold text-xs">{m.name}</p>
                                  {m.room && <p className="text-xs text-gray-400">Room {m.room}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <BreakfastSelector value={bf} onChange={val => setBreakfast(m.id, val)} disabled={busyKey?.includes(`${selectedDate}_${m.id}_breakfast`)}/>
                            </td>
                            {["lunch","dinner"].map(type => {
                              const isOn   = !!entry[type];
                              const busyId = `${selectedDate}_${m.id}_${type}`;
                              return (
                                <td key={type} className="px-4 py-4 text-center">
                                  <button onClick={() => toggleMeal(m.id, type)} disabled={busyKey===busyId}
                                    className={`w-16 h-10 rounded-xl text-xs font-black transition-all shadow-sm
                                      ${isOn ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white scale-105 shadow-emerald-200 dark:shadow-emerald-900" : "bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200"}
                                      ${busyKey===busyId ? "opacity-50 cursor-wait" : "cursor-pointer active:scale-95"}`}>
                                    {busyKey===busyId ? "…" : isOn ? "✓ On" : "✗ Off"}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="px-4 py-4 text-center">
                              <span className={`px-3 py-1.5 rounded-full text-xs font-black
                                ${total>=3 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                : total>0  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                           : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
                                {fmtMeals(total)}/3
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </Card>
        </>
      )}
    </div>
  );
}

// ─── BAZAAR ───────────────────────────────────────────────────────────────────
function BazaarPage({ bazaar, notify, userProfile, ownerId }) {
  const [ym, setYm]       = useState(getCurrentMonth());
  const [form, setForm]   = useState({ date:TODAY, amount:"", note:"" });
  const [editId, setEditId] = useState(null);
  const [busy, setBusy]   = useState(false);
  const [confirm, setConfirm] = useState(null);

  const monthEntries = useMemo(() => bazaar.filter(b => (b.date||"").startsWith(ym)), [bazaar, ym]);
  const total        = useMemo(() => monthEntries.reduce((s,b) => s+Number(b.amount||0),0), [monthEntries]);
  const resetForm    = () => { setForm({ date:TODAY, amount:"", note:"" }); setEditId(null); };

  const handleSave = async () => {
    const amt = Number(form.amount);
    if (!amt||amt<=0) { notify("Enter a valid amount","error"); return; }
    setBusy(true);
    try {
      if (editId) { await firestoreService.updateBazaar(editId,{date:form.date,amount:amt,note:form.note}); notify("Entry updated ✓"); }
      else         { await firestoreService.addBazaar(ownerId,{date:form.date,amount:amt,note:form.note,addedBy:userProfile.displayName}); notify("Bazaar entry added ✓"); }
      resetForm();
    } catch (err) { notify("Error: "+err.message,"error"); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    setBusy(true);
    try { await firestoreService.deleteBazaar(id); notify("Entry deleted"); }
    catch { notify("Delete failed","error"); }
    finally { setBusy(false); setConfirm(null); }
  };

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Bazaar Cost"/>
        <div className="flex items-center gap-3">
          <input type="month" value={ym} onChange={e=>setYm(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"/>
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-amber-200 dark:shadow-amber-900/30">
            {fmtCurrency(total)}
          </div>
        </div>
      </div>

      <Card title={editId ? "✏️ Edit Entry" : "➕ Add Bazaar Entry"}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className={labelCls}>Date</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className={inputCls}/></div>
          <div><label className={labelCls}>Amount (৳) *</label><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} className={inputCls} placeholder="0.00" min="0" step="0.01"/></div>
          <div><label className={labelCls}>Note</label><input type="text" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} className={inputCls} placeholder="Optional"/></div>
        </div>
        <div className="flex gap-3 mt-4">
          <BtnPrimary onClick={handleSave} disabled={busy}>{editId?"Update":"Add Entry"}</BtnPrimary>
          {editId && <BtnSecondary onClick={resetForm}>Cancel</BtnSecondary>}
        </div>
      </Card>

      <Card>
        {monthEntries.length===0
          ? <EmptyState icon="🛒" title="No bazaar entries" desc="No entries for this month yet."/>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {["Date","Amount","Note","Added By","Actions"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...monthEntries].sort((a,b)=>b.date.localeCompare(a.date)).map(b => (
                    <tr key={b.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap font-medium">{fmtDate(b.date)}</td>
                      <td className="px-4 py-3.5"><span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-black">{fmtCurrency(b.amount)}</span></td>
                      <td className="px-4 py-3.5 text-gray-500">{b.note||"—"}</td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs">{b.addedBy||"—"}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-2">
                          <button onClick={()=>{setEditId(b.id);setForm({date:b.date,amount:String(b.amount),note:b.note||""});}} className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold hover:bg-amber-100">Edit</button>
                          <button onClick={()=>setConfirm({id:b.id})} className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-xs font-bold hover:bg-rose-100">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 dark:bg-gray-800/50 font-black">
                    <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300">Monthly Total</td>
                    <td className="px-4 py-3.5"><span className="bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-black">{fmtCurrency(total)}</span></td>
                    <td colSpan={3}/>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
      </Card>
      <ConfirmDialog open={!!confirm} title="Delete Entry" desc="Delete this bazaar entry permanently?" onConfirm={()=>handleDelete(confirm.id)} onCancel={()=>setConfirm(null)}/>
    </div>
  );
}

// ─── DEPOSITS ─────────────────────────────────────────────────────────────────
function DepositsPage({ members, deposits, notify, ownerId }) {
  const [form, setForm]   = useState({ memberId:"", date:TODAY, amount:"", note:"" });
  const [busy, setBusy]   = useState(false);
  const [filter, setFilter] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [ym, setYm]       = useState("");

  const enriched = useMemo(() => deposits.map(d => ({...d, memberName: members.find(m=>m.id===d.memberId)?.name||"Unknown"})), [deposits,members]);
  const filtered = useMemo(() => {
    let data = enriched;
    if (filter) data = data.filter(d => d.memberId===filter);
    if (ym)     data = data.filter(d => (d.date||"").startsWith(ym));
    return data;
  }, [enriched, filter, ym]);
  const totalFiltered = useMemo(() => filtered.reduce((s,d) => s+Number(d.amount||0),0), [filtered]);

  const handleSave = async () => {
    if (!form.memberId) { notify("Select a member","error"); return; }
    const amt = Number(form.amount);
    if (!amt||amt<=0) { notify("Enter a valid amount","error"); return; }
    setBusy(true);
    try {
      await firestoreService.addDeposit(ownerId,{memberId:form.memberId,date:form.date,amount:amt,note:form.note});
      setForm(f=>({...f,amount:"",note:""}));
      notify("Deposit recorded ✓");
    } catch (err) { notify("Error: "+err.message,"error"); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    setBusy(true);
    try { await firestoreService.deleteDeposit(id); notify("Deposit deleted"); }
    catch { notify("Delete failed","error"); }
    finally { setBusy(false); setConfirm(null); }
  };

  return (
    <div className="space-y-6 fade-in-up">
      <PageHeader title="Deposits" badge={`${filtered.length} records`}/>

      <Card title="💰 Add Deposit">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Member *</label>
            <select value={form.memberId} onChange={e=>setForm(f=>({...f,memberId:e.target.value}))} className={inputCls}>
              <option value="">Select member</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Date</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className={inputCls}/></div>
          <div><label className={labelCls}>Amount (৳) *</label><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} className={inputCls} placeholder="0" min="0"/></div>
          <div><label className={labelCls}>Note</label><input type="text" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} className={inputCls} placeholder="Optional"/></div>
        </div>
        <BtnPrimary onClick={handleSave} disabled={busy} className="mt-4" gradient="from-emerald-500 to-teal-500">Add Deposit</BtnPrimary>
      </Card>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={filter} onChange={e=>setFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
          <option value="">All Members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input type="month" value={ym} onChange={e=>setYm(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"/>
        {ym && <button onClick={()=>setYm("")} className="text-xs text-gray-400 hover:text-gray-600">✕ Clear month</button>}
        {(filter||ym) && <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-xl text-sm font-black">Total: {fmtCurrency(totalFiltered)}</div>}
      </div>

      <Card>
        {filtered.length===0
          ? <EmptyState icon="💰" title="No deposits" desc="No deposit records found."/>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {["Member","Date","Amount","Note","Action"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(dep => (
                    <tr key={dep.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2"><Avatar name={dep.memberName} size={7}/><span className="font-bold">{dep.memberName}</span></div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{fmtDate(dep.date)}</td>
                      <td className="px-4 py-3.5"><span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-black">{fmtCurrency(dep.amount)}</span></td>
                      <td className="px-4 py-3.5 text-gray-500">{dep.note||"—"}</td>
                      <td className="px-4 py-3.5">
                        <button onClick={()=>setConfirm({id:dep.id})} className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-xs font-bold hover:bg-rose-100">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
      <ConfirmDialog open={!!confirm} title="Delete Deposit" desc="Delete this deposit record permanently?" onConfirm={()=>handleDelete(confirm.id)} onCancel={()=>setConfirm(null)}/>
    </div>
  );
}

// ─── EXTRAS ───────────────────────────────────────────────────────────────────
function ExtrasPage({ members, extraCharges, notify, ownerId }) {
  const [form, setForm]   = useState({ memberId:"", date:TODAY, amount:"", note:"" });
  const [busy, setBusy]   = useState(false);
  const [filter, setFilter] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [ym, setYm]       = useState(getCurrentMonth());

  const monthEntries = useMemo(() => extraCharges.filter(e => (e.date||"").startsWith(ym)), [extraCharges,ym]);
  const enriched     = useMemo(() => monthEntries.map(e => ({...e, memberName: members.find(m=>m.id===e.memberId)?.name||"Unknown"})), [monthEntries,members]);
  const filtered     = filter ? enriched.filter(e=>e.memberId===filter) : enriched;
  const total        = filtered.reduce((s,e)=>s+Number(e.amount||0),0);

  const handleSave = async () => {
    if (!form.memberId) { notify("Select a member","error"); return; }
    const amt = Number(form.amount);
    if (!amt||amt<=0) { notify("Enter a valid amount","error"); return; }
    setBusy(true);
    try {
      await firestoreService.addExtraCharge(ownerId,{memberId:form.memberId,date:form.date,amount:amt,note:form.note});
      setForm(f=>({...f,amount:"",note:""}));
      notify("Extra charge recorded ✓");
    } catch (err) { notify("Error: "+err.message,"error"); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    setBusy(true);
    try { await firestoreService.deleteExtraCharge(id); notify("Deleted"); }
    catch { notify("Delete failed","error"); }
    finally { setBusy(false); setConfirm(null); }
  };

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Extra Charges" sub="Utility bills, service fees, fines"/>
        <input type="month" value={ym} onChange={e=>setYm(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"/>
      </div>

      <Card title="➕ Add Extra Charge">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Member *</label>
            <select value={form.memberId} onChange={e=>setForm(f=>({...f,memberId:e.target.value}))} className={inputCls}>
              <option value="">Select member</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Date</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className={inputCls}/></div>
          <div><label className={labelCls}>Amount (৳) *</label><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} className={inputCls} placeholder="0" min="0"/></div>
          <div><label className={labelCls}>Reason *</label><input type="text" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} className={inputCls} placeholder="e.g. Utility bill"/></div>
        </div>
        <BtnPrimary onClick={handleSave} disabled={busy} className="mt-4" gradient="from-rose-500 to-pink-600">Add Charge</BtnPrimary>
      </Card>

      <div className="flex items-center gap-3 flex-wrap">
        <select value={filter} onChange={e=>setFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
          <option value="">All Members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        {total>0 && <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-4 py-2 rounded-xl text-sm font-black">Total: {fmtCurrency(total)}</span>}
      </div>

      <Card>
        {filtered.length===0
          ? <EmptyState icon="➕" title="No extra charges" desc="No charges recorded for this month."/>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {["Member","Date","Amount","Reason","Action"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3.5"><div className="flex items-center gap-2"><Avatar name={e.memberName} size={7}/><span className="font-bold">{e.memberName}</span></div></td>
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                      <td className="px-4 py-3.5"><span className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-3 py-1 rounded-full text-xs font-black">{fmtCurrency(e.amount)}</span></td>
                      <td className="px-4 py-3.5 text-gray-500">{e.note||"—"}</td>
                      <td className="px-4 py-3.5">
                        <button onClick={()=>setConfirm({id:e.id})} className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-xs font-bold hover:bg-rose-100">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
      <ConfirmDialog open={!!confirm} title="Delete Charge" desc="Delete this extra charge permanently?" onConfirm={()=>handleDelete(confirm.id)} onCancel={()=>setConfirm(null)}/>
    </div>
  );
}

// ─── GUESTS ───────────────────────────────────────────────────────────────────
function GuestsPage({ guestMeals, notify, ownerId }) {
  const [form, setForm]   = useState({ date:TODAY, guestName:"", mealCount:1, note:"" });
  const [busy, setBusy]   = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [ym, setYm]       = useState(getCurrentMonth());

  const monthEntries    = useMemo(() => guestMeals.filter(g=>(g.date||"").startsWith(ym)),[guestMeals,ym]);
  const totalGuestMeals = monthEntries.reduce((s,g)=>s+Number(g.mealCount||0),0);

  const handleSave = async () => {
    if (!form.guestName.trim()) { notify("Guest name required","error"); return; }
    if (Number(form.mealCount)<1) { notify("At least 1 meal","error"); return; }
    setBusy(true);
    try {
      await firestoreService.addGuestMeal(ownerId,{...form,mealCount:Number(form.mealCount)});
      setForm(f=>({...f,guestName:"",mealCount:1,note:""}));
      notify("Guest meal recorded ✓");
    } catch (err) { notify("Error: "+err.message,"error"); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    setBusy(true);
    try { await firestoreService.deleteGuestMeal(id); notify("Deleted"); }
    catch { notify("Delete failed","error"); }
    finally { setBusy(false); setConfirm(null); }
  };

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Guest Meals" sub="Guest meals share the meal rate pool"/>
        <div className="flex items-center gap-3">
          <input type="month" value={ym} onChange={e=>setYm(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"/>
          <div className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-cyan-200 dark:shadow-cyan-900/30">
            {totalGuestMeals} guest meals
          </div>
        </div>
      </div>

      <Card title="🤝 Add Guest Meal">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div><label className={labelCls}>Date</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className={inputCls}/></div>
          <div><label className={labelCls}>Guest Name *</label><input type="text" value={form.guestName} onChange={e=>setForm(f=>({...f,guestName:e.target.value}))} className={inputCls} placeholder="Visitor name"/></div>
          <div><label className={labelCls}>Meal Count *</label><input type="number" value={form.mealCount} onChange={e=>setForm(f=>({...f,mealCount:e.target.value}))} className={inputCls} min="1" max="20"/></div>
          <div><label className={labelCls}>Note</label><input type="text" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} className={inputCls} placeholder="Optional"/></div>
        </div>
        <div className="mt-3 p-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl text-xs text-cyan-700 dark:text-cyan-400">
          ℹ️ Guest meals are added to the total meal count, which lowers the per-meal rate for all members.
        </div>
        <BtnPrimary onClick={handleSave} disabled={busy} className="mt-4" gradient="from-cyan-500 to-teal-500">Add Guest Meal</BtnPrimary>
      </Card>

      <Card>
        {monthEntries.length===0
          ? <EmptyState icon="🤝" title="No guest meals" desc="No guest meals recorded this month."/>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {["Date","Guest","Meals","Note","Action"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...monthEntries].sort((a,b)=>b.date.localeCompare(a.date)).map(g => (
                    <tr key={g.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap font-medium">{fmtDate(g.date)}</td>
                      <td className="px-4 py-3.5 font-bold">{g.guestName}</td>
                      <td className="px-4 py-3.5"><span className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 px-3 py-1 rounded-full text-xs font-black">{g.mealCount}</span></td>
                      <td className="px-4 py-3.5 text-gray-500">{g.note||"—"}</td>
                      <td className="px-4 py-3.5">
                        <button onClick={()=>setConfirm({id:g.id})} className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-xs font-bold hover:bg-rose-100">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
      <ConfirmDialog open={!!confirm} title="Delete Guest Meal" desc="Delete this guest meal entry?" onConfirm={()=>handleDelete(confirm.id)} onCancel={()=>setConfirm(null)}/>
    </div>
  );
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
function ReportsPage({ members, meals, bazaar, deposits, extraCharges, guestMeals }) {
  const [ym, setYm] = useState(getCurrentMonth());
  const [y,m]       = ym.split("-").map(Number);
  const monthName   = `${MONTHS[m-1]} ${y}`;

  const { totalBazaar, totalMeals, mealRate, memberSummary, totalGuestMeals } =
    useMemo(() => calcMonth(ym, members, meals, bazaar, deposits, extraCharges, guestMeals), [ym, members, meals, bazaar, deposits, extraCharges, guestMeals]);

  const prevD   = new Date(y, m-2, 1);
  const prevYm  = `${prevD.getFullYear()}-${String(prevD.getMonth()+1).padStart(2,"0")}`;
  const { totalBazaar:prevBazaar, totalMeals:prevMeals, mealRate:prevRate } =
    useMemo(() => calcMonth(prevYm, members, meals, bazaar, deposits, extraCharges, guestMeals), [prevYm, members, meals, bazaar, deposits, extraCharges, guestMeals]);

  const days     = daysInMonth(ym);
  const dailyData = useMemo(() => Array.from({length:days},(_,i) => {
    const day  = String(i+1).padStart(2,"0");
    const date = `${ym}-${day}`;
    const cnt  = members.filter(m=>m.status!=="inactive").reduce((s,me) => {
      const e = meals[`${date}_${me.id}_${me.ownerId||""}`]||{};
      return s+(Number(e.breakfast)||0)+(e.lunch?1:0)+(e.dinner?1:0);
    },0);
    return { day:i+1, meals:cnt };
  }), [ym, members, meals, days]);

  const handlePrintAll = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Report — ${monthName}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',system-ui,sans-serif;padding:32px;color:#1e293b;background:#f8fafc}
      .card{background:#fff;border-radius:20px;padding:32px;max-width:900px;margin:0 auto;box-shadow:0 8px 40px rgba(0,0,0,.1)}
      h1{font-size:24px;font-weight:800}
      .header{display:flex;align-items:center;gap:14px;margin-bottom:24px;padding-bottom:20px;border-bottom:2px solid #e2e8f0}
      .logo{width:50px;height:50px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px}
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
      .stat{background:#f1f5f9;border-radius:12px;padding:14px}
      .stat-label{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:3px}
      .stat-value{font-size:20px;font-weight:900}
      table{width:100%;border-collapse:collapse}
      th{background:#f1f5f9;font-size:10px;font-weight:700;padding:10px 12px;text-align:left;text-transform:uppercase;letter-spacing:.08em;color:#64748b}
      td{padding:10px 12px;font-size:12px;border-bottom:1px solid #f1f5f9}
      tr:hover td{background:#f8fafc}
      .footer{margin-top:20px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}
      @media print{body{padding:20px;background:#fff}.card{box-shadow:none}}
    </style></head><body>
    <div class="card">
      <div class="header">
        <div class="logo">🍛</div>
        <div><h1>MessManager — ${monthName}</h1><p style="color:#64748b;font-size:13px;margin-top:2px">Full Monthly Report · Generated ${new Date().toLocaleString()}</p></div>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-label">Total Bazaar</div><div class="stat-value">৳${totalBazaar.toFixed(2)}</div></div>
        <div class="stat"><div class="stat-label">Total Meals</div><div class="stat-value">${fmtMeals(totalMeals)}</div></div>
        <div class="stat"><div class="stat-label">Guest Meals</div><div class="stat-value">${totalGuestMeals}</div></div>
        <div class="stat"><div class="stat-label">Meal Rate</div><div class="stat-value">৳${mealRate.toFixed(2)}</div></div>
      </div>
      <table>
        <tr><th>#</th><th>Member</th><th>Meals</th><th>Meal Cost</th><th>Extras</th><th>Total Cost</th><th>Deposited</th><th>Balance</th><th>Status</th></tr>
        ${memberSummary.map((me,i)=>`<tr>
          <td>${i+1}</td><td><strong>${me.name}</strong></td><td>${fmtMeals(me.meals)}</td>
          <td>৳${me.mealCost.toFixed(2)}</td><td>৳${me.extras.toFixed(2)}</td>
          <td><strong>৳${me.cost.toFixed(2)}</strong></td><td>৳${me.deposited.toFixed(2)}</td>
          <td style="color:${me.balance>=0?"#16a34a":"#dc2626"};font-weight:700">${me.balance>=0?"+":"-"}৳${Math.abs(me.balance).toFixed(2)}</td>
          <td style="color:${me.balance>=0?"#16a34a":"#dc2626"}">${me.balance>=0?"Advance":"Due"}</td>
        </tr>`).join("")}
        <tr style="background:#f1f5f9;font-weight:900">
          <td colspan="2">TOTALS</td><td>${fmtMeals(totalMeals)}</td>
          <td>৳${totalBazaar.toFixed(2)}</td>
          <td>৳${memberSummary.reduce((s,m)=>s+m.extras,0).toFixed(2)}</td>
          <td>৳${memberSummary.reduce((s,m)=>s+m.cost,0).toFixed(2)}</td>
          <td>৳${memberSummary.reduce((s,m)=>s+m.deposited,0).toFixed(2)}</td>
          <td colspan="2"></td>
        </tr>
      </table>
      <div class="footer">MessManager v5.0 · Premium Edition</div>
    </div></body></html>`;
    const win = window.open("","_blank","width=960,height=750");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(()=>win.print(),700);
  };

  const handlePrintMemberBill = (me) => {
    const html = generateBillHTML(
      me, ym, mealRate,
      bazaar.filter(b=>(b.date||"").startsWith(ym)),
      deposits.filter(d=>(d.date||"").startsWith(ym)),
      extraCharges.filter(e=>(e.date||"").startsWith(ym)),
      totalBazaar, totalMeals+totalGuestMeals
    );
    printBill(html);
  };

  const compData = [
    { label:"Bazaar Cost", prev:prevBazaar, curr:totalBazaar },
    { label:"Total Meals", prev:prevMeals,  curr:totalMeals },
    { label:"Meal Rate",   prev:prevRate,   curr:mealRate },
  ];

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Reports & Analytics" sub={monthName}/>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="month" value={ym} onChange={e=>setYm(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"/>
          <BtnPrimary onClick={handlePrintAll} gradient="from-indigo-500 to-violet-600">🖨️ Full Report PDF</BtnPrimary>
        </div>
      </div>

      {/* Month comparison */}
      <Card title="📊 Month-over-Month Comparison" sub={`${MONTHS[prevD.getMonth()]} vs ${monthName}`}>
        <div className="grid grid-cols-3 gap-4">
          {compData.map((c,i) => {
            const diff = c.curr - c.prev;
            const pct  = c.prev>0 ? ((diff/c.prev)*100).toFixed(1) : 0;
            const up   = diff>=0;
            const isBad = (i===0||i===2) && up; // bazaar and rate going up is bad
            return (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{c.label}</p>
                <p className="text-xl font-black">{i===0||i===2 ? fmtCurrency(c.curr) : fmtMeals(c.curr)}</p>
                <div className={`text-xs font-bold mt-2 flex items-center gap-1 ${isBad ? "text-rose-500" : up ? "text-emerald-600" : "text-rose-500"}`}>
                  <span>{up ? "▲" : "▼"}</span> {Math.abs(pct)}% vs prev
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Prev: {i===0||i===2 ? fmtCurrency(c.prev) : fmtMeals(c.prev)}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🛒" label="Total Bazaar"  value={fmtCurrency(totalBazaar)} gradient="from-amber-500 to-orange-500"/>
        <StatCard icon="🍽️" label="Total Meals"   value={fmtMeals(totalMeals)}    gradient="from-indigo-500 to-violet-600"/>
        <StatCard icon="🤝" label="Guest Meals"   value={totalGuestMeals}          gradient="from-cyan-500 to-teal-500"/>
        <StatCard icon="💸" label="Per Meal Cost" value={fmtCurrency(mealRate)}    gradient="from-violet-500 to-purple-600"/>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card title={`📈 Daily Meal Count — ${monthName}`}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="mealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700"/>
              <XAxis dataKey="day" tick={{ fontSize:10, fill:"#94a3b8" }}/>
              <YAxis tick={{ fontSize:10, fill:"#94a3b8" }}/>
              <Tooltip contentStyle={{ borderRadius:12, border:"none", boxShadow:"0 4px 24px rgba(0,0,0,.12)" }}/>
              <Area type="monotone" dataKey="meals" stroke="#6366f1" strokeWidth={2.5} fill="url(#mealGrad)" name="Meals"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        {memberSummary.length > 0 && (
          <Card title="👥 Member Meal Comparison">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={memberSummary.map(m=>({name:m.name.split(" ")[0],meals:Number(fmtMeals(m.meals)),cost:Number(m.cost.toFixed(2))}))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700"/>
                <XAxis dataKey="name" tick={{ fontSize:11, fill:"#94a3b8" }}/>
                <YAxis yAxisId="l" tick={{ fontSize:10, fill:"#94a3b8" }}/>
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize:10, fill:"#94a3b8" }}/>
                <Tooltip formatter={(v,n) => n==="cost" ? fmtCurrency(v) : v} contentStyle={{ borderRadius:12, border:"none" }}/>
                <Legend wrapperStyle={{ fontSize:12 }}/>
                <Bar yAxisId="l" dataKey="meals" fill="#6366f1" radius={[6,6,0,0]} name="Meals"/>
                <Bar yAxisId="r" dataKey="cost"  fill="#22d3ee" radius={[6,6,0,0]} name="Cost (৳)"/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Statement Table */}
      <Card title={`📋 Monthly Statement — ${monthName}`} sub={`Rate: ${fmtCurrency(mealRate)}/meal`}>
        {memberSummary.length===0
          ? <EmptyState icon="📊" title="No data" desc="No members or meal data for this month."/>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {["#","Member","Meals","Meal Cost","Extras","Total","Deposited","Balance","Status","Bill"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {memberSummary.map((me,i) => (
                    <tr key={me.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3.5 text-gray-400 text-xs font-bold">{i+1}</td>
                      <td className="px-4 py-3.5"><div className="flex items-center gap-2"><Avatar name={me.name} size={8}/><span className="font-bold">{me.name}</span></div></td>
                      <td className="px-4 py-3.5 font-semibold">{fmtMeals(me.meals)}</td>
                      <td className="px-4 py-3.5">{fmtCurrency(me.mealCost)}</td>
                      <td className="px-4 py-3.5 text-amber-600 dark:text-amber-400">{fmtCurrency(me.extras)}</td>
                      <td className="px-4 py-3.5 font-bold">{fmtCurrency(me.cost)}</td>
                      <td className="px-4 py-3.5">{fmtCurrency(me.deposited)}</td>
                      <td className={`px-4 py-3.5 font-black ${me.balance>=0?"text-emerald-600 dark:text-emerald-400":"text-rose-500"}`}>
                        {me.balance>=0?"+":"−"}{fmtCurrency(Math.abs(me.balance))}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge value={me.balance}/></td>
                      <td className="px-4 py-3.5">
                        <button onClick={()=>handlePrintMemberBill(me)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 whitespace-nowrap transition-colors">
                          🖨️ PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 dark:bg-gray-800/50 font-black">
                    <td colSpan={2} className="px-4 py-3.5 text-gray-700 dark:text-gray-300">Totals</td>
                    <td className="px-4 py-3.5">{fmtMeals(totalMeals)}</td>
                    <td className="px-4 py-3.5">{fmtCurrency(totalBazaar)}</td>
                    <td className="px-4 py-3.5 text-amber-600">{fmtCurrency(memberSummary.reduce((s,m)=>s+m.extras,0))}</td>
                    <td className="px-4 py-3.5">{fmtCurrency(memberSummary.reduce((s,m)=>s+m.cost,0))}</td>
                    <td className="px-4 py-3.5">{fmtCurrency(memberSummary.reduce((s,m)=>s+m.deposited,0))}</td>
                    <td colSpan={3}/>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
      </Card>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function SettingsPage({ dark, setDark, onLogout, notify, userProfile, isAdmin, members, ownerId }) {
  const [profForm, setProfForm] = useState({ displayName: userProfile.displayName, email: userProfile.email });
  const [pwForm, setPwForm]     = useState({ current:"", new1:"", new2:"" });
  const [busy, setBusy]         = useState(false);
  const [memberLoginForm, setMemberLoginForm] = useState({ memberId:"", email:"", password:"" });
  const [memberLoginBusy, setMemberLoginBusy] = useState(false);
  const [memberAccessList, setMemberAccessList] = useState([]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(
      query(collection(db, "memberAccess"), where("ownerId","==",ownerId)),
      snap => setMemberAccessList(snap.docs.map(d=>({uid:d.id,...d.data()}))),
      err => console.error(err)
    );
    return unsub;
  }, [isAdmin, ownerId]);

  const saveProfile = async () => {
    if (!profForm.displayName.trim()) { notify("Name required","error"); return; }
    setBusy(true);
    try {
      await firestoreService.updateAdminProfile(userProfile.uid, { displayName: profForm.displayName });
      notify("Profile updated ✓ (reload to reflect)");
    } catch (err) { notify("Error: "+err.message,"error"); }
    finally { setBusy(false); }
  };

  const savePassword = async () => {
    if (pwForm.new1.length<6) { notify("Min 6 characters","error"); return; }
    if (pwForm.new1!==pwForm.new2) { notify("Passwords don't match","error"); return; }
    setBusy(true);
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, pwForm.current);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, pwForm.new1);
      setPwForm({ current:"", new1:"", new2:"" });
      notify("Password changed ✓");
    } catch (err) {
      if (err.code==="auth/wrong-password") notify("Current password incorrect","error");
      else notify("Error: "+err.message,"error");
    } finally { setBusy(false); }
  };

  const saveMemberLogin = async () => {
    if (!memberLoginForm.memberId) { notify("Select a member","error"); return; }
    if (!memberLoginForm.email.trim()) { notify("Email required","error"); return; }
    if (!memberLoginForm.password||memberLoginForm.password.length<6) { notify("Password must be 6+ chars","error"); return; }
    const member = members.find(m=>m.id===memberLoginForm.memberId);
    if (!member) { notify("Member not found","error"); return; }
    setMemberLoginBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, memberLoginForm.email.trim(), memberLoginForm.password);
      await firestoreService.setMemberAccess(cred.user.uid, { ownerId, memberId:memberLoginForm.memberId, displayName:member.name, email:memberLoginForm.email.trim(), role:"member" });
      await signInWithEmailAndPassword(auth, userProfile.email, memberLoginForm.password);
      notify(`Login created for ${member.name} ✓`, "warning");
      setMemberLoginForm({ memberId:"", email:"", password:"" });
    } catch (err) {
      if (err.code==="auth/email-already-in-use") notify("Email already in use","error");
      else notify("Error: "+err.message,"error");
    } finally { setMemberLoginBusy(false); }
  };

  const deleteMemberLogin = async (memberUid, name) => {
    try { await firestoreService.deleteMemberAccess(memberUid); notify(`Removed login for ${name}`); }
    catch (err) { notify("Error: "+err.message,"error"); }
  };

  const techBadges = ["React 18","Firebase Auth","Firestore","Tailwind CSS","Recharts","PWA","Multi-tenant","PDF Export"];

  return (
    <div className="space-y-6 fade-in-up max-w-2xl">
      <PageHeader title="Settings"/>

      {/* Appearance */}
      <Card title="🎨 Appearance">
        <div className="flex items-center justify-between p-1">
          <div>
            <p className="font-bold text-sm">Dark Mode</p>
            <p className="text-xs text-gray-400 mt-0.5">Toggle between light and dark theme</p>
          </div>
          <button onClick={()=>setDark(d=>!d)}
            className={`relative w-14 h-7 rounded-full transition-all duration-300 ${dark ? "bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-300 dark:shadow-indigo-900" : "bg-gray-200 dark:bg-gray-700"}`}>
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center text-xs ${dark?"translate-x-7":"translate-x-0.5"}`}>
              {dark?"🌙":"☀️"}
            </span>
          </button>
        </div>
      </Card>

      {/* Profile */}
      <Card title="👤 My Profile">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Display Name</label>
            <input value={profForm.displayName} onChange={e=>setProfForm(f=>({...f,displayName:e.target.value}))} className={inputCls}/>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input value={profForm.email} disabled className={inputCls+" opacity-60 cursor-not-allowed"} title="Email cannot be changed here"/>
          </div>
        </div>
        <BtnPrimary onClick={saveProfile} disabled={busy} className="mt-4">Save Profile</BtnPrimary>
      </Card>

      {/* Password */}
      <Card title="🔑 Change Password">
        <div className="space-y-3">
          {[["Current Password","current"],["New Password","new1"],["Confirm New Password","new2"]].map(([lbl,key])=>(
            <div key={key}>
              <label className={labelCls}>{lbl}</label>
              <input type="password" value={pwForm[key]} onChange={e=>setPwForm(f=>({...f,[key]:e.target.value}))} className={inputCls}/>
            </div>
          ))}
          <BtnPrimary onClick={savePassword} disabled={busy} gradient="from-amber-500 to-orange-500">Change Password</BtnPrimary>
        </div>
      </Card>

      {/* Member Login Setup (Admin only) */}
      {isAdmin && (
        <Card title="🔐 Member Login Setup" sub="Create Firebase accounts for members to view their own bill">
          <div className="p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
            ℹ️ This creates a real Firebase Auth account for the member. They can log in with their email/password to see only their own bill and meals — fully isolated from other mess admins.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>Member</label>
              <select value={memberLoginForm.memberId} onChange={e=>setMemberLoginForm(f=>({...f,memberId:e.target.value}))} className={inputCls}>
                <option value="">Select member</option>
                {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Login Email</label>
              <input type="email" value={memberLoginForm.email} onChange={e=>setMemberLoginForm(f=>({...f,email:e.target.value}))} className={inputCls} placeholder="member@email.com"/>
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input type="password" value={memberLoginForm.password} onChange={e=>setMemberLoginForm(f=>({...f,password:e.target.value}))} className={inputCls} placeholder="Min 6 chars"/>
            </div>
          </div>
          <BtnPrimary onClick={saveMemberLogin} disabled={memberLoginBusy} gradient="from-violet-500 to-purple-600">
            {memberLoginBusy ? "Creating…" : "Create Member Login"}
          </BtnPrimary>
          {memberAccessList.length>0 && (
            <div className="mt-5 space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Members with login access:</p>
              {memberAccessList.map(l=>(
                <div key={l.uid} className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={l.displayName} size={8}/>
                    <div>
                      <p className="font-bold text-sm">{l.displayName}</p>
                      <p className="text-xs text-gray-400">{l.email}</p>
                    </div>
                  </div>
                  <button onClick={()=>deleteMemberLogin(l.uid,l.displayName)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-xs font-bold hover:bg-rose-100">Revoke</button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Account Info */}
      <Card title="ℹ️ Account Info">
        <div className="space-y-2.5 text-sm">
          {[
            ["Role", userProfile.role],
            ["Firebase UID", userProfile.uid],
            ...(isAdmin ? [["Owner ID (data silo)", userProfile.ownerId]] : []),
          ].map(([key, val])=>(
            <div key={key} className="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide w-36 flex-shrink-0 mt-0.5">{key}</span>
              <span className={`text-gray-700 dark:text-gray-300 font-mono text-xs break-all ${key==="Role"?"capitalize font-semibold font-sans":""}`}>{val}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* About */}
      <Card title="🚀 About MessManager v5.0">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <strong className="text-gray-900 dark:text-white">MessManager v5.0</strong> — Premium SaaS edition with multi-tenant Firebase, half-breakfast support, GitHub-style heatmap, advanced analytics, and full PDF billing.
        </p>
        <div className="flex flex-wrap gap-2 mb-5">
          {techBadges.map(t=>(
            <span key={t} className="px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-full text-xs font-bold">{t}</span>
          ))}
        </div>
        <button onClick={onLogout}
          className="px-6 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-bold hover:bg-rose-100 transition-colors">
          🚪 Sign Out
        </button>
      </Card>
    </div>
  );
}