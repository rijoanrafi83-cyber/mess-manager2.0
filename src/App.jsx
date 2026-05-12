/**
 * MessManager — App.jsx  (v4.0 — Multi-Tenant Firebase Edition)
 *
 * Architecture:
 *  - Firebase Authentication for all users (admin + member)
 *  - Firestore multi-tenant isolation via ownerId on every document
 *  - AuthContext + ThemeContext providers
 *  - firestoreService helpers (all scoped to ownerId)
 *  - useMessData custom hook (realtime listeners)
 *  - ProtectedRoute with role enforcement
 *  - React Router v6
 *
 * Firestore structure (all docs include ownerId field):
 *   /members/{id}      — ownerId = admin's Firebase UID
 *   /meals/{id}        — ownerId = admin's Firebase UID
 *   /bazaar/{id}       — ownerId = admin's Firebase UID
 *   /deposits/{id}     — ownerId = admin's Firebase UID
 *   /extraCharges/{id} — ownerId = admin's Firebase UID
 *   /guestMeals/{id}   — ownerId = admin's Firebase UID
 *   /adminProfiles/{uid} — stores role/name for each Firebase user
 *   /memberAccess/{uid}  — maps Firebase member UID → ownerId (admin UID)
 *
 * Member login flow:
 *   Admin creates a Firebase Auth account for member (via Admin SDK / Cloud Function)
 *   OR: Admin sets member's Firebase UID in their memberAccess doc
 *   For simplicity here: admin creates member login via email/password in Firebase Auth,
 *   then stores a /memberAccess/{memberFirebaseUID} doc pointing to ownerId + memberId.
 */

import { useState, useEffect, useCallback, useContext, createContext, useRef } from "react";
import {
  BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation,
} from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, setDoc, query, where, orderBy, serverTimestamp, getDoc,
} from "firebase/firestore";
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential,
  sendPasswordResetEmail,
} from "firebase/auth";
import { db, auth } from "./firebase";

// ─── Constants ────────────────────────────────────────────────────────────────
const TODAY      = new Date().toISOString().split("T")[0];
const MONTHS     = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MEAL_TYPES = ["breakfast","lunch","dinner"];
const COLORS     = ["#6366f1","#22d3ee","#f59e0b","#10b981","#f43f5e","#a78bfa","#34d399","#fb923c"];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const fmtCurrency  = (n) => "৳" + (Number(n) || 0).toFixed(2);
const fmtDate      = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
const getCurrentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const daysInMonth  = (ym) => { const [y,m] = ym.split("-").map(Number); return new Date(y, m, 0).getDate(); };

// ─── ThemeContext ─────────────────────────────────────────────────────────────
const ThemeContext = createContext(null);
function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  useEffect(() => { localStorage.setItem("theme", dark ? "dark" : "light"); }, [dark]);
  return <ThemeContext.Provider value={{ dark, setDark }}>{children}</ThemeContext.Provider>;
}

// ─── AuthContext ──────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

/**
 * userProfile shape:
 *  { uid, email, displayName, role: "admin"|"member", ownerId, memberId? }
 *
 * For admins:  ownerId === uid (their own data silo)
 * For members: ownerId === admin's UID, memberId === Firestore member doc id
 */
function AuthProvider({ children }) {
  const [userProfile, setUserProfile] = useState(undefined); // undefined = loading

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { setUserProfile(null); return; }

      try {
        // 1. Check if admin profile exists
        const adminSnap = await getDoc(doc(db, "adminProfiles", firebaseUser.uid));
        if (adminSnap.exists()) {
          const data = adminSnap.data();
          setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: data.displayName || firebaseUser.email,
            role: "admin",
            ownerId: firebaseUser.uid,
          });
          return;
        }

        // 2. Check if member access exists
        const memberSnap = await getDoc(doc(db, "memberAccess", firebaseUser.uid));
        if (memberSnap.exists()) {
          const data = memberSnap.data();
          setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: data.displayName || firebaseUser.email,
            role: "member",
            ownerId: data.ownerId,
            memberId: data.memberId,
          });
          return;
        }

        // No profile found — sign out
        await signOut(auth);
        setUserProfile(null);
      } catch (err) {
        console.error("Auth profile lookup failed:", err);
        setUserProfile(null);
      }
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ userProfile, setUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── firestoreService ─────────────────────────────────────────────────────────
// All writes automatically stamp ownerId so data is isolated per admin.
const firestoreService = {
  // Members
  addMember: (ownerId, data) =>
    addDoc(collection(db, "members"), { ...data, ownerId, createdAt: serverTimestamp() }),
  updateMember: (id, data) =>
    updateDoc(doc(db, "members", id), { ...data, updatedAt: serverTimestamp() }),
  deleteMember: (id) => deleteDoc(doc(db, "members", id)),

  // Meals — doc id = `${date}_${memberId}_${ownerId}`
  setMeal: (ownerId, date, memberId, data) =>
    setDoc(doc(db, "meals", `${date}_${memberId}_${ownerId}`), { ...data, date, memberId, ownerId }, { merge: true }),

  // Bazaar
  addBazaar: (ownerId, data) =>
    addDoc(collection(db, "bazaar"), { ...data, ownerId, createdAt: serverTimestamp() }),
  updateBazaar: (id, data) =>
    updateDoc(doc(db, "bazaar", id), { ...data, updatedAt: serverTimestamp() }),
  deleteBazaar: (id) => deleteDoc(doc(db, "bazaar", id)),

  // Deposits
  addDeposit: (ownerId, data) =>
    addDoc(collection(db, "deposits"), { ...data, ownerId, createdAt: serverTimestamp() }),
  deleteDeposit: (id) => deleteDoc(doc(db, "deposits", id)),

  // Extra Charges
  addExtraCharge: (ownerId, data) =>
    addDoc(collection(db, "extraCharges"), { ...data, ownerId, createdAt: serverTimestamp() }),
  deleteExtraCharge: (id) => deleteDoc(doc(db, "extraCharges", id)),

  // Guest Meals
  addGuestMeal: (ownerId, data) =>
    addDoc(collection(db, "guestMeals"), { ...data, ownerId, createdAt: serverTimestamp() }),
  deleteGuestMeal: (id) => deleteDoc(doc(db, "guestMeals", id)),

  // Admin profile
  createAdminProfile: (uid, data) =>
    setDoc(doc(db, "adminProfiles", uid), { ...data, role: "admin", createdAt: serverTimestamp() }),
  updateAdminProfile: (uid, data) =>
    updateDoc(doc(db, "adminProfiles", uid), { ...data, updatedAt: serverTimestamp() }),

  // Member access
  setMemberAccess: (memberUid, data) =>
    setDoc(doc(db, "memberAccess", memberUid), { ...data, updatedAt: serverTimestamp() }),
  deleteMemberAccess: (memberUid) => deleteDoc(doc(db, "memberAccess", memberUid)),
};

// ─── useMessData hook ─────────────────────────────────────────────────────────
// Subscribes to all collections filtered by ownerId. Returns live data + loading.
function useMessData(ownerId) {
  const [members, setMembers]         = useState([]);
  const [meals, setMeals]             = useState({});
  const [bazaar, setBazaar]           = useState([]);
  const [deposits, setDeposits]       = useState([]);
  const [extraCharges, setExtraCharges] = useState([]);
  const [guestMeals, setGuestMeals]   = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!ownerId) return;
    setLoading(true);
    const unsubs = [];

    // Members
    unsubs.push(onSnapshot(
      query(collection(db, "members"), where("ownerId", "==", ownerId), orderBy("createdAt", "asc")),
      snap => { setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      err  => { console.error("members:", err); setLoading(false); }
    ));

    // Meals (keyed by doc id for O(1) lookup)
    unsubs.push(onSnapshot(
      query(collection(db, "meals"), where("ownerId", "==", ownerId)),
      snap => {
        const map = {};
        snap.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data() }; });
        setMeals(map);
      },
      err => console.error("meals:", err)
    ));

    // Bazaar
    unsubs.push(onSnapshot(
      query(collection(db, "bazaar"), where("ownerId", "==", ownerId), orderBy("date", "desc")),
      snap => setBazaar(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error("bazaar:", err)
    ));

    // Deposits
    unsubs.push(onSnapshot(
      query(collection(db, "deposits"), where("ownerId", "==", ownerId), orderBy("date", "desc")),
      snap => setDeposits(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error("deposits:", err)
    ));

    // Extra Charges
    unsubs.push(onSnapshot(
      query(collection(db, "extraCharges"), where("ownerId", "==", ownerId), orderBy("date", "desc")),
      snap => setExtraCharges(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error("extraCharges:", err)
    ));

    // Guest Meals
    unsubs.push(onSnapshot(
      query(collection(db, "guestMeals"), where("ownerId", "==", ownerId), orderBy("date", "desc")),
      snap => setGuestMeals(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error("guestMeals:", err)
    ));

    return () => unsubs.forEach(u => u());
  }, [ownerId]);

  return { members, meals, bazaar, deposits, extraCharges, guestMeals, loading };
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = "success") => {
    const id = uid();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, push };
}
function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  const cl = { success:"bg-emerald-500", error:"bg-red-500", info:"bg-indigo-500", warning:"bg-amber-500" };
  return (
    <div className="fixed top-4 right-4 z-[999] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`${cl[t.type]||cl.info} text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl`}>
          {t.type==="success"?"✓ ":t.type==="error"?"✗ ":"ℹ "}{t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 animate-spin"/>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
function EmptyState({ icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <span className="text-5xl">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{desc}</p>
    </div>
  );
}
function ConfirmDialog({ open, title, desc, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{desc}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium">Cancel</button>
          <button onClick={onConfirm} className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium">Confirm</button>
        </div>
      </div>
    </div>
  );
}
const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

function Avatar({ name = "?", size = 8 }) {
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
function Card({ title, sub, children, action }) {
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
function PageHeader({ title, sub, badge }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        {sub && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {badge && <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-full text-sm font-medium flex-shrink-0">{badge}</span>}
    </div>
  );
}
function StatusBadge({ value }) {
  const ok = value >= 0;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap
      ${ok ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
           : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
      {ok ? `Advance ৳${value.toFixed(2)}` : `Due ৳${Math.abs(value).toFixed(2)}`}
    </span>
  );
}
function BtnPrimary({ onClick, disabled, children, className = "" }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
      {children}
    </button>
  );
}
function BtnSecondary({ onClick, children }) {
  return (
    <button onClick={onClick}
      className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors">
      {children}
    </button>
  );
}

// ─── Billing computation ──────────────────────────────────────────────────────
function calcMonth(ym, members, meals, bazaar, deposits, extraCharges = [], guestMeals = []) {
  const activeMembers = members.filter(m => m.status !== "inactive");
  const monthBazaar   = bazaar.filter(b => (b.date || "").startsWith(ym));
  const monthGuests   = guestMeals.filter(g => (g.date || "").startsWith(ym));
  const totalBazaarRaw = monthBazaar.reduce((s, b) => s + Number(b.amount || 0), 0);

  let totalMeals = 0;
  const memberMeals = {};
  activeMembers.forEach(m => { memberMeals[m.id] = 0; });

  Object.values(meals).forEach(entry => {
    if (!(entry.date || "").startsWith(ym)) return;
    const mid = entry.memberId;
    if (!memberMeals.hasOwnProperty(mid)) return;
    const cnt = (entry.breakfast ? 1 : 0) + (entry.lunch ? 1 : 0) + (entry.dinner ? 1 : 0);
    memberMeals[mid] = (memberMeals[mid] || 0) + cnt;
    totalMeals += cnt;
  });

  const totalGuestMeals = monthGuests.reduce((s, g) => s + Number(g.mealCount || 0), 0);
  const grandTotalMeals = totalMeals + totalGuestMeals;
  const mealRate = grandTotalMeals > 0 ? totalBazaarRaw / grandTotalMeals : 0;

  const memberSummary = activeMembers.map(m => {
    const mealCount = memberMeals[m.id] || 0;
    const mealCost  = mealCount * mealRate;
    const extras    = extraCharges
      .filter(e => e.memberId === m.id && (e.date || "").startsWith(ym))
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalCost = mealCost + extras;
    const deposited = deposits
      .filter(d => d.memberId === m.id && (d.date || "").startsWith(ym))
      .reduce((s, d) => s + Number(d.amount || 0), 0);
    const balance   = deposited - totalCost;
    return { ...m, meals: mealCount, mealCost, extras, cost: totalCost, deposited, balance };
  });

  return { totalBazaar: totalBazaarRaw, totalMeals, mealRate, memberSummary, monthBazaar, totalGuestMeals };
}

// ─── PDF Generator ────────────────────────────────────────────────────────────
function generateBillHTML(member, ym, mealRate, bazaarEntries, depositEntries, extraEntries, guestEntries, totalBazaar, totalMeals) {
  const [y, m] = ym.split("-").map(Number);
  const monthName  = `${MONTHS[m - 1]} ${y}`;
  const extras     = extraEntries.filter(e => e.memberId === member.id);
  const extrasTotal = extras.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalCost  = member.mealCost + extrasTotal;
  const balance    = member.deposited - totalCost;

  const rows = depositEntries
    .filter(d => d.memberId === member.id && (d.date || "").startsWith(ym))
    .map(d => `<tr><td>${fmtDate(d.date)}</td><td>Deposit</td><td style="color:#16a34a">+${fmtCurrency(d.amount)}</td></tr>`)
    .join("");

  const extraRows = extras
    .map(e => `<tr><td>${fmtDate(e.date)}</td><td>${e.note || "Extra charge"}</td><td style="color:#dc2626">-${fmtCurrency(e.amount)}</td></tr>`)
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Bill — ${member.name} — ${monthName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',sans-serif;color:#1f2937;background:#f9fafb;padding:32px}
    .card{background:#fff;border-radius:16px;padding:32px;max-width:680px;margin:0 auto;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    .header{display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:20px;border-bottom:2px solid #e5e7eb}
    .logo{font-size:40px}
    .header h1{font-size:24px;font-weight:700}
    .header p{color:#6b7280;font-size:13px;margin-top:2px}
    .section{margin-top:24px}
    .section h2{font-size:14px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .meta-item{background:#f3f4f6;border-radius:10px;padding:12px 16px}
    .meta-item .label{font-size:11px;color:#9ca3af;margin-bottom:2px}
    .meta-item .value{font-size:18px;font-weight:700;color:#1f2937}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{background:#f3f4f6;font-size:12px;font-weight:600;color:#6b7280;padding:10px 12px;text-align:left;text-transform:uppercase}
    td{padding:10px 12px;font-size:13px;border-bottom:1px solid #f3f4f6}
    .total-row{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-radius:12px;margin-top:6px}
    .balance-ok{background:#ecfdf5;color:#16a34a}
    .balance-due{background:#fef2f2;color:#dc2626}
    .footer{margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
    @media print{body{padding:0;background:#fff}.card{box-shadow:none}}
  </style></head><body>
  <div class="card">
    <div class="header">
      <span class="logo">🍛</span>
      <div><h1>MessManager</h1><p>Monthly Bill — ${monthName}</p></div>
    </div>
    <div style="display:flex;align-items:center;gap:14px;padding:16px;background:#f3f4f6;border-radius:12px">
      <div style="width:48px;height:48px;border-radius:50%;background:#6366f1;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700">${member.name[0].toUpperCase()}</div>
      <div>
        <p style="font-size:18px;font-weight:700">${member.name}</p>
        <p style="color:#6b7280;font-size:13px">${member.email || ""} ${member.room ? "| Room " + member.room : ""}</p>
      </div>
    </div>
    <div class="section">
      <h2>Summary</h2>
      <div class="meta-grid">
        <div class="meta-item"><div class="label">Total Meals</div><div class="value">${member.meals}</div></div>
        <div class="meta-item"><div class="label">Meal Rate</div><div class="value">${fmtCurrency(mealRate)}</div></div>
        <div class="meta-item"><div class="label">Meal Cost</div><div class="value">${fmtCurrency(member.mealCost)}</div></div>
        <div class="meta-item"><div class="label">Extra Charges</div><div class="value" style="color:#dc2626">${fmtCurrency(extrasTotal)}</div></div>
        <div class="meta-item"><div class="label">Total Cost</div><div class="value">${fmtCurrency(totalCost)}</div></div>
        <div class="meta-item"><div class="label">Total Deposited</div><div class="value" style="color:#16a34a">${fmtCurrency(member.deposited)}</div></div>
      </div>
    </div>
    ${rows ? `<div class="section"><h2>Deposits</h2><table><tr><th>Date</th><th>Description</th><th>Amount</th></tr>${rows}</table></div>` : ""}
    ${extraRows ? `<div class="section"><h2>Extra Charges</h2><table><tr><th>Date</th><th>Description</th><th>Amount</th></tr>${extraRows}</table></div>` : ""}
    <div class="total-row ${balance >= 0 ? "balance-ok" : "balance-due"}" style="margin-top:20px">
      <span style="font-weight:600;font-size:15px">${balance >= 0 ? "Advance Balance" : "Amount Due"}</span>
      <span style="font-size:20px;font-weight:700">${balance >= 0 ? "+" : "-"}${fmtCurrency(Math.abs(balance))}</span>
    </div>
    <div style="margin-top:16px;padding:12px 16px;background:#eff6ff;border-radius:10px;font-size:12px;color:#3b82f6">
      📊 Mess Stats: Total bazaar ৳${totalBazaar.toFixed(2)} | ${totalMeals} total meals | Rate ৳${mealRate.toFixed(2)}/meal
    </div>
    <div class="footer">Generated by MessManager • ${new Date().toLocaleString()}</div>
  </div>
  </body></html>`;
}

function printBill(html) {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 600);
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
function ProtectedRoute({ allowedRoles, children }) {
  const { userProfile } = useContext(AuthContext);
  const location = useLocation();

  if (userProfile === undefined) return <Spinner label="Authenticating…"/>;
  if (!userProfile) return <Navigate to="/login" state={{ from: location }} replace/>;
  if (allowedRoles && !allowedRoles.includes(userProfile.role))
    return <Navigate to="/unauthorized" replace/>;

  return children;
}

// ─── Auth Pages ───────────────────────────────────────────────────────────────
function LoginPage() {
  const { dark, setDark } = useContext(ThemeContext);
  const { userProfile }   = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy]   = useState(false);
  const navigate          = useNavigate();
  const location          = useLocation();
  const from              = location.state?.from?.pathname || "/";

  if (userProfile) return <Navigate to={from} replace/>;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError("Email and password required."); return; }
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-gray-800">
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">🍛</div>
            <h1 className="text-3xl font-bold">MessManager</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">v4.0 — Firebase Multi-Tenant</p>
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">{error}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls}
                onKeyDown={e => e.key === "Enter" && handleLogin()} autoComplete="email"/>
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls}
                onKeyDown={e => e.key === "Enter" && handleLogin()} autoComplete="current-password"/>
            </div>
            <button onClick={handleLogin} disabled={busy}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900 transition-all disabled:opacity-50">
              {busy ? "Signing in…" : "Sign In"}
            </button>
          </div>
          <div className="mt-5 flex justify-center gap-4 text-xs text-gray-400">
            <button onClick={() => navigate("/register")} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Register</button>
            <span>·</span>
            <button onClick={() => navigate("/forgot-password")} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Forgot password?</button>
          </div>
          <button onClick={() => setDark(d => !d)} className="w-full mt-3 text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            {dark ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RegisterPage() {
  const { dark, setDark } = useContext(ThemeContext);
  const { userProfile }   = useContext(AuthContext);
  const navigate          = useNavigate();
  const [form, setForm]   = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy]   = useState(false);

  if (userProfile) return <Navigate to="/" replace/>;

  const handleRegister = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) { setError("All fields required."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      // Create admin profile — ownerId = this user's UID
      await firestoreService.createAdminProfile(cred.user.uid, {
        displayName: form.name.trim(),
        email: form.email.trim(),
        role: "admin",
        ownerId: cred.user.uid,
      });
      setSuccess("Account created! You are now signed in as admin.");
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setError("An account with this email already exists.");
      else setError("Registration failed: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-gray-800">
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">🍛</div>
            <h1 className="text-3xl font-bold">Create Account</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">MessManager v4.0</p>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm">{success}</div>}
          <div className="space-y-4">
            {[["Full Name","name","text"],["Email","email","email"],["Password","password","password"],["Confirm Password","confirm","password"]].map(([lbl,key,type]) => (
              <div key={key}>
                <label className={labelCls}>{lbl}</label>
                <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className={inputCls} onKeyDown={e => e.key === "Enter" && handleRegister()}/>
              </div>
            ))}
            <button onClick={handleRegister} disabled={busy}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900 transition-all disabled:opacity-50">
              {busy ? "Creating account…" : "Register"}
            </button>
          </div>
          <div className="mt-5 text-center">
            <button onClick={() => navigate("/login")} className="text-xs text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">← Back to Sign In</button>
          </div>
          <button onClick={() => setDark(d => !d)} className="w-full mt-3 text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            {dark ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordPage() {
  const { dark, setDark } = useContext(ThemeContext);
  const { userProfile }   = useContext(AuthContext);
  const navigate          = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy]   = useState(false);

  if (userProfile) return <Navigate to="/" replace/>;

  const handleReset = async () => {
    if (!email.trim()) { setError("Enter your email address."); return; }
    setBusy(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess("Password reset email sent! Check your inbox.");
    } catch (err) {
      if (err.code === "auth/user-not-found") setError("No account found with that email.");
      else setError("Error: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-gray-800">
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">🔑</div>
            <h1 className="text-3xl font-bold">Reset Password</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">We'll email you a reset link</p>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">{error}</div>}
          {success
            ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm">{success}</div>
                <button onClick={() => navigate("/login")} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all">Back to Sign In</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls}
                    onKeyDown={e => e.key === "Enter" && handleReset()}/>
                </div>
                <button onClick={handleReset} disabled={busy}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50">
                  {busy ? "Sending…" : "Send Reset Link"}
                </button>
              </div>
            )
          }
          <div className="mt-5 text-center">
            <button onClick={() => navigate("/login")} className="text-xs text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">← Back to Sign In</button>
          </div>
          <button onClick={() => setDark(d => !d)} className="w-full mt-3 text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            {dark ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UnauthorizedPage() {
  const navigate = useNavigate();
  const handleLogout = async () => { await signOut(auth); navigate("/login"); };
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-red-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-10 border border-gray-100 dark:border-gray-800">
          <div className="text-7xl mb-4">🚫</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">You don't have permission to view this page.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate("/")} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all">Go to Dashboard</button>
            <button onClick={handleLogout} className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all">Sign In with Different Account</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────
function AppShell() {
  const { userProfile }       = useContext(AuthContext);
  const { dark, setDark }     = useContext(ThemeContext);
  const [page, setPage]       = useState("dashboard");
  const { toasts, push: notify } = useToast();
  const navigate              = useNavigate();

  // All data is scoped to userProfile.ownerId — admins get their own silo, members get their admin's silo
  const { members, meals, bazaar, deposits, extraCharges, guestMeals, loading } =
    useMessData(userProfile?.ownerId);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login", { replace: true });
  };

  if (!userProfile) return null;
  const isAdmin = userProfile.role === "admin";
  const ownerId = userProfile.ownerId;

  const adminNavItems = [
    { key:"dashboard", icon:"📊", label:"Dashboard" },
    { key:"members",   icon:"👥", label:"Members" },
    { key:"meals",     icon:"🍽️",  label:"Meals" },
    { key:"bazaar",    icon:"🛒", label:"Bazaar" },
    { key:"deposits",  icon:"💰", label:"Deposits" },
    { key:"extras",    icon:"➕", label:"Extras" },
    { key:"guests",    icon:"🧑‍🤝‍🧑", label:"Guests" },
    { key:"reports",   icon:"📈", label:"Reports" },
    { key:"settings",  icon:"⚙️",  label:"Settings" },
  ];
  const memberNavItems = [
    { key:"dashboard", icon:"📊", label:"My Bill" },
    { key:"meals",     icon:"🍽️",  label:"My Meals" },
    { key:"settings",  icon:"⚙️",  label:"Settings" },
  ];
  const navItems = isAdmin ? adminNavItems : memberNavItems;

  // For member: filter to own data only
  const memberDeposits     = isAdmin ? deposits     : deposits.filter(d => d.memberId === userProfile.memberId);
  const memberExtraCharges = isAdmin ? extraCharges : extraCharges.filter(e => e.memberId === userProfile.memberId);

  const shared = {
    members, meals, bazaar,
    deposits: memberDeposits,
    extraCharges: memberExtraCharges,
    guestMeals,
    notify, userProfile, isAdmin, ownerId,
  };

  const pages = {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed h-full z-20">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
          <span className="text-3xl">🍛</span>
          <div>
            <h1 className="font-bold text-lg leading-tight">MessManager</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">v4.0 — {isAdmin ? "Admin Panel" : "Member Portal"}</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(n => (
            <button key={n.key} onClick={() => setPage(n.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                ${page === n.key
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={userProfile.displayName} size={9}/>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userProfile.displayName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{userProfile.role}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDark(d => !d)}
              className="flex-1 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700">
              {dark ? "☀️ Light" : "🌙 Dark"}
            </button>
            <button onClick={handleLogout}
              className="flex-1 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100">
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-20 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2"><span className="text-2xl">🍛</span><span className="font-bold text-base">MessManager</span></div>
        <div className="flex items-center gap-1">
          <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">{dark ? "☀️" : "🌙"}</button>
          <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg text-red-500 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20">Logout</button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-30 flex">
        {navItems.slice(0, 5).map(n => (
          <button key={n.key} onClick={() => setPage(n.key)}
            className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${page === n.key ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}>
            <span className="text-lg leading-none">{n.icon}</span>
            <span className="text-[10px] mt-0.5">{n.label}</span>
          </button>
        ))}
      </nav>

      <main className="flex-1 md:ml-64 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {loading ? <Spinner label="Syncing with Firebase…"/> : (pages[page] || <Navigate to="/"/>)}
        </div>
      </main>
      <ToastContainer toasts={toasts}/>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppWithTheme/>
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
          <Route path="/login"            element={<LoginPage/>}/>
          <Route path="/register"         element={<RegisterPage/>}/>
          <Route path="/forgot-password"  element={<ForgotPasswordPage/>}/>
          <Route path="/unauthorized"     element={<UnauthorizedPage/>}/>
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

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ members, meals, bazaar, deposits, extraCharges, guestMeals, userProfile, isAdmin }) {
  const ym = getCurrentMonth();
  const [, mNum] = ym.split("-").map(Number);
  const yNum = Number(ym.split("-")[0]);
  const { totalBazaar, totalMeals, mealRate, memberSummary, totalGuestMeals } =
    calcMonth(ym, members, meals, bazaar, deposits, extraCharges, guestMeals);

  if (!isAdmin) {
    const me = memberSummary.find(m => m.id === userProfile.memberId);
    if (!me) return <EmptyState icon="👤" title="Account not linked" desc="Ask your admin to link your member account."/>;
    return (
      <div className="space-y-6">
        <PageHeader title={`Hi, ${me.name.split(" ")[0]}! 👋`} sub={`${MONTHS[mNum-1]} ${yNum} — Your Bill`}/>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label:"Your Meals",    value:me.meals,                                                icon:"🍽️" },
            { label:"Meal Cost",     value:fmtCurrency(me.mealCost),                               icon:"💸" },
            { label:"Extra Charges", value:fmtCurrency(me.extras),                                 icon:"➕" },
            { label:"Total Cost",    value:fmtCurrency(me.cost),                                    icon:"🧾" },
            { label:"Deposited",     value:fmtCurrency(me.deposited),                              icon:"💰" },
            { label:"Balance",       value:me.balance >= 0 ? `+${fmtCurrency(me.balance)}` : `-${fmtCurrency(Math.abs(me.balance))}`, icon:me.balance >= 0 ? "✅" : "⚠️" },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`text-xl font-bold ${s.label==="Balance" ? (me.balance >= 0 ? "text-emerald-600" : "text-red-500") : ""}`}>{s.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        <Card title="Meal Rate Info">
          <p className="text-sm text-gray-600 dark:text-gray-400">Meal rate this month: <strong>{fmtCurrency(mealRate)}</strong> per meal</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Based on ৳{totalBazaar.toFixed(2)} bazaar ÷ {totalMeals + totalGuestMeals} total meals</p>
        </Card>
      </div>
    );
  }

  const bazaarTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(yNum, mNum - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const amt = bazaar.filter(b => (b.date || "").startsWith(key)).reduce((s, b) => s + Number(b.amount || 0), 0);
    return { month: MONTHS[d.getMonth()], amount: amt };
  }).reverse();

  let bT = 0, lT = 0, dT = 0;
  Object.values(meals).forEach(entry => {
    if (!(entry.date || "").startsWith(ym)) return;
    bT += entry.breakfast ? 1 : 0;
    lT += entry.lunch ? 1 : 0;
    dT += entry.dinner ? 1 : 0;
  });
  const pieData = [{ name:"Breakfast", value:bT }, { name:"Lunch", value:lT }, { name:"Dinner", value:dT }].filter(p => p.value > 0);

  const stats = [
    { label:"Active Members",   value:members.filter(m => m.status !== "inactive").length, icon:"👥" },
    { label:"Total Meals",      value:totalMeals,                                           icon:"🍽️" },
    { label:"Bazaar Cost",      value:fmtCurrency(totalBazaar),                             icon:"🛒" },
    { label:"Meal Rate",        value:fmtCurrency(mealRate),                                icon:"💸" },
    { label:"Guest Meals",      value:totalGuestMeals,                                      icon:"🧑‍🤝‍🧑" },
    { label:"Inactive Members", value:members.filter(m => m.status === "inactive").length,  icon:"😴" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" sub={`${MONTHS[mNum-1]} ${yNum} Overview`}/>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Bazaar Trend (6 months)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bazaarTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
              <XAxis dataKey="month" tick={{ fontSize:11 }}/>
              <YAxis tick={{ fontSize:11 }}/>
              <Tooltip formatter={v => fmtCurrency(v)}/>
              <Bar dataKey="amount" fill="#6366f1" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Meal Distribution">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]}/>)}
                </Pie>
                <Tooltip/><Legend/>
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState icon="🍽️" title="No meal data" desc="Add meal entries first."/>}
        </Card>
      </div>
      <Card title={`Member Summary — ${MONTHS[mNum-1]} ${yNum}`}>
        {memberSummary.length === 0
          ? <EmptyState icon="👥" title="No members" desc="Add members to see summary."/>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{["Member","Meals","Meal Cost","Extras","Total Cost","Deposited","Balance","Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {memberSummary.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar name={m.name} size={7}/><span className="font-medium">{m.name}</span></div></td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{m.meals}</td>
                      <td className="px-4 py-3">{fmtCurrency(m.mealCost)}</td>
                      <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{fmtCurrency(m.extras)}</td>
                      <td className="px-4 py-3 font-medium">{fmtCurrency(m.cost)}</td>
                      <td className="px-4 py-3">{fmtCurrency(m.deposited)}</td>
                      <td className={`px-4 py-3 font-semibold ${m.balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        {m.balance >= 0 ? "+" : "−"}{fmtCurrency(Math.abs(m.balance))}
                      </td>
                      <td className="px-4 py-3"><StatusBadge value={m.balance}/></td>
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

// ─── Members ──────────────────────────────────────────────────────────────────
function MembersPage({ members, notify, ownerId }) {
  const [form, setForm]   = useState({ name:"", email:"", phone:"", room:"", status:"active" });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy]   = useState(false);
  const [confirm, setConfirm] = useState(null);

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (m.room || "").toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => { setForm({ name:"", email:"", phone:"", room:"", status:"active" }); setEditId(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { notify("Name is required", "error"); return; }
    setBusy(true);
    try {
      if (editId) {
        await firestoreService.updateMember(editId, { ...form });
        notify("Member updated");
      } else {
        await firestoreService.addMember(ownerId, { ...form });
        notify("Member added");
      }
      resetForm();
    } catch (err) { notify("Error: " + err.message, "error"); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    setBusy(true);
    try { await firestoreService.deleteMember(id); notify("Member deleted"); }
    catch (err) { notify("Delete failed: " + err.message, "error"); }
    finally { setBusy(false); setConfirm(null); }
  };

  const toggleStatus = async (m) => {
    const newStatus = m.status === "inactive" ? "active" : "inactive";
    try {
      await firestoreService.updateMember(m.id, { status: newStatus });
      notify(`${m.name} set to ${newStatus}`);
    } catch { notify("Update failed", "error"); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Members" badge={`${members.length} total`}/>
      <Card title={editId ? "Edit Member" : "Add New Member"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[["Name *","name","text"],["Email","email","email"],["Phone","phone","tel"],["Room No","room","text"]].map(([lbl,key,type]) => (
            <div key={key}>
              <label className={labelCls}>{lbl}</label>
              <input type={type} value={form[key]} placeholder={lbl.replace(" *","")}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className={inputCls}
                onKeyDown={e => e.key === "Enter" && handleSave()}/>
            </div>
          ))}
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <BtnPrimary onClick={handleSave} disabled={busy}>{editId ? "Update Member" : "Add Member"}</BtnPrimary>
          {editId && <BtnSecondary onClick={resetForm}>Cancel</BtnSecondary>}
        </div>
      </Card>
      <Card>
        <div className="mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search members…" className={inputCls}/>
        </div>
        {filtered.length === 0
          ? <EmptyState icon="👤" title="No members found" desc="Add your first member above."/>
          : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{["#","Name","Email","Phone","Room","Status","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filtered.map((m, i) => (
                    <tr key={m.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${m.status === "inactive" ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3 text-gray-400 text-xs">{i+1}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar name={m.name} size={8}/><span className="font-medium">{m.name}</span></div></td>
                      <td className="px-4 py-3 text-gray-500">{m.email || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{m.phone || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{m.room || "—"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleStatus(m)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                            ${m.status === "inactive"
                              ? "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700"
                              : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-red-100 hover:text-red-600"}`}>
                          {m.status === "inactive" ? "Inactive" : "Active"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setForm({ name:m.name, email:m.email||"", phone:m.phone||"", room:m.room||"", status:m.status||"active" }); setEditId(m.id); }}
                            className="px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-medium hover:bg-amber-100">Edit</button>
                          <button onClick={() => setConfirm({ id:m.id, name:m.name })}
                            className="px-3 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100">Delete</button>
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

// ─── Meals ────────────────────────────────────────────────────────────────────
function MealsPage({ members, meals, notify, userProfile, isAdmin, ownerId }) {
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [viewMode, setViewMode]         = useState("table");
  const [busyKey, setBusyKey]           = useState(null);
  const [calMonth, setCalMonth]         = useState(getCurrentMonth());

  const visibleMembers = isAdmin
    ? members.filter(m => m.status !== "inactive")
    : members.filter(m => m.id === userProfile.memberId);

  const getMealDoc = memberId => meals[`${selectedDate}_${memberId}_${ownerId}`] || { breakfast:false, lunch:false, dinner:false };
  const getMeal    = (memberId, type) => !!getMealDoc(memberId)[type];

  const toggleMeal = async (memberId, type) => {
    if (!isAdmin && memberId !== userProfile.memberId) return;
    const current = getMealDoc(memberId);
    const newVal  = !current[type];
    const busyId  = `${selectedDate}_${memberId}_${type}`;
    setBusyKey(busyId);
    try {
      await firestoreService.setMeal(ownerId, selectedDate, memberId, {
        breakfast: type === "breakfast" ? newVal : !!current.breakfast,
        lunch:     type === "lunch"     ? newVal : !!current.lunch,
        dinner:    type === "dinner"    ? newVal : !!current.dinner,
      });
    } catch (err) { notify("Failed: " + err.message, "error"); }
    finally { setBusyKey(null); }
  };

  const setAllMeals = async (type, val) => {
    if (!isAdmin || visibleMembers.length === 0) return;
    try {
      await Promise.all(visibleMembers.map(m => {
        const cur = getMealDoc(m.id);
        return firestoreService.setMeal(ownerId, selectedDate, m.id, {
          breakfast: type === "breakfast" ? val : !!cur.breakfast,
          lunch:     type === "lunch"     ? val : !!cur.lunch,
          dinner:    type === "dinner"    ? val : !!cur.dinner,
        });
      }));
      notify(`All ${type} ${val ? "ON" : "OFF"}`);
    } catch (err) { notify("Bulk update failed", "error"); }
  };

  const dayTotal = visibleMembers.reduce((s, m) => {
    const e = getMealDoc(m.id);
    return s + (e.breakfast ? 1 : 0) + (e.lunch ? 1 : 0) + (e.dinner ? 1 : 0);
  }, 0);

  const renderCalendar = () => {
    const [cy, cm] = calMonth.split("-").map(Number);
    const days     = daysInMonth(calMonth);
    const firstDay = new Date(cy, cm - 1, 1).getDay();
    const cells    = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`}/>);
    for (let d = 1; d <= days; d++) {
      const ds  = `${calMonth}-${String(d).padStart(2,"0")}`;
      const cnt = visibleMembers.reduce((s, m) => {
        const e = meals[`${ds}_${m.id}_${ownerId}`] || {};
        return s + (e.breakfast ? 1 : 0) + (e.lunch ? 1 : 0) + (e.dinner ? 1 : 0);
      }, 0);
      const max = visibleMembers.length * 3 || 1;
      const pct = cnt / max;
      const bg  = pct === 0 ? "bg-gray-100 dark:bg-gray-800"
                : pct < 0.4 ? "bg-indigo-100 dark:bg-indigo-900/40"
                : pct < 0.7 ? "bg-indigo-300 dark:bg-indigo-700"
                              : "bg-indigo-500 dark:bg-indigo-500";
      cells.push(
        <button key={d} onClick={() => { setSelectedDate(ds); setViewMode("table"); }}
          title={`${ds}: ${cnt} meals`}
          className={`aspect-square rounded-lg ${bg} flex items-center justify-center text-xs font-medium
            ${ds === selectedDate ? "ring-2 ring-indigo-500" : ""}
            hover:ring-2 hover:ring-indigo-400 transition-all`}>
          {d}
        </button>
      );
    }
    return cells;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title={isAdmin ? "Daily Meal Entry" : "My Meals"} sub={fmtDate(selectedDate)}/>
        <div className="flex gap-2">
          <button onClick={() => setViewMode("table")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === "table" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>
            📋 Table
          </button>
          <button onClick={() => setViewMode("calendar")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === "calendar" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>
            📅 Calendar
          </button>
        </div>
      </div>

      {viewMode === "calendar" && (
        <Card title="Meal Heatmap Calendar"
          action={
            <input type="month" value={calMonth} onChange={e => setCalMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          }>
          <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
              <div key={d} className="text-xs text-gray-400 font-medium py-1">{d}</div>
            ))}
            {renderCalendar()}
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span>Less</span>
            {["bg-gray-100 dark:bg-gray-800","bg-indigo-100 dark:bg-indigo-900/40","bg-indigo-300 dark:bg-indigo-700","bg-indigo-500"].map((c,i) => (
              <span key={i} className={`w-4 h-4 rounded ${c} inline-block`}/>
            ))}
            <span>More</span>
            <span className="ml-2">Click a day to edit meals</span>
          </div>
        </Card>
      )}

      {viewMode === "table" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input type="date" value={selectedDate} max={TODAY}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            <span className="text-sm text-gray-500 dark:text-gray-400">Total: <strong>{dayTotal}</strong> meals</span>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map(t => (
                <div key={t} className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize mr-1">{t}:</span>
                  <button onClick={() => setAllMeals(t, true)}  className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-100">All ON</button>
                  <button onClick={() => setAllMeals(t, false)} className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100">All OFF</button>
                </div>
              ))}
            </div>
          )}
          <Card>
            {visibleMembers.length === 0
              ? <EmptyState icon="👥" title="No members" desc="Add members first."/>
              : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Member</th>
                        {MEAL_TYPES.map(t => <th key={t} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t}</th>)}
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {visibleMembers.map(m => {
                        const entry = getMealDoc(m.id);
                        const total = (entry.breakfast ? 1 : 0) + (entry.lunch ? 1 : 0) + (entry.dinner ? 1 : 0);
                        return (
                          <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Avatar name={m.name} size={8}/>
                                <div><p className="font-medium text-sm">{m.name}</p>{m.room && <p className="text-xs text-gray-400">Room {m.room}</p>}</div>
                              </div>
                            </td>
                            {MEAL_TYPES.map(type => {
                              const isOn   = getMeal(m.id, type);
                              const busyId = `${selectedDate}_${m.id}_${type}`;
                              const isBusy = busyKey === busyId;
                              return (
                                <td key={type} className="px-4 py-3 text-center">
                                  <button onClick={() => toggleMeal(m.id, type)} disabled={isBusy}
                                    className={`w-12 h-10 rounded-xl text-sm font-bold transition-all
                                      ${isOn
                                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 shadow-sm scale-105"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200"}
                                      ${isBusy ? "opacity-50 cursor-wait" : "cursor-pointer active:scale-95"}`}>
                                    {isBusy ? "…" : isOn ? "✓" : "✗"}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold
                                ${total === 3 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                : total > 0   ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                              : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
                                {total} / 3
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

// ─── Bazaar ───────────────────────────────────────────────────────────────────
function BazaarPage({ bazaar, notify, userProfile, ownerId }) {
  const [ym, setYm]       = useState(getCurrentMonth());
  const [form, setForm]   = useState({ date:TODAY, amount:"", note:"" });
  const [editId, setEditId] = useState(null);
  const [busy, setBusy]   = useState(false);
  const [confirm, setConfirm] = useState(null);

  const monthEntries = bazaar.filter(b => (b.date || "").startsWith(ym));
  const total        = monthEntries.reduce((s, b) => s + Number(b.amount || 0), 0);
  const resetForm    = () => { setForm({ date:TODAY, amount:"", note:"" }); setEditId(null); };

  const handleSave = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { notify("Enter a valid amount", "error"); return; }
    setBusy(true);
    try {
      if (editId) {
        await firestoreService.updateBazaar(editId, { date:form.date, amount:amt, note:form.note });
        notify("Entry updated");
      } else {
        await firestoreService.addBazaar(ownerId, { date:form.date, amount:amt, note:form.note, addedBy:userProfile.displayName });
        notify("Bazaar entry added");
      }
      resetForm();
    } catch (err) { notify("Error: " + err.message, "error"); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    setBusy(true);
    try { await firestoreService.deleteBazaar(id); notify("Entry deleted"); }
    catch (err) { notify("Delete failed: " + err.message, "error"); }
    finally { setBusy(false); setConfirm(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Bazaar Cost"/>
        <div className="flex items-center gap-3">
          <input type="month" value={ym} onChange={e => setYm(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-xl text-sm font-bold">
            Total: {fmtCurrency(total)}
          </div>
        </div>
      </div>
      <Card title={editId ? "Edit Entry" : "Add Bazaar Entry"}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className={labelCls}>Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date:e.target.value }))} className={inputCls}/></div>
          <div><label className={labelCls}>Amount (৳) *</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount:e.target.value }))} className={inputCls} placeholder="0.00" min="0" step="0.01"/></div>
          <div><label className={labelCls}>Note</label><input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note:e.target.value }))} className={inputCls} placeholder="Optional"/></div>
        </div>
        <div className="flex gap-3 mt-4">
          <BtnPrimary onClick={handleSave} disabled={busy}>{editId ? "Update" : "Add Entry"}</BtnPrimary>
          {editId && <BtnSecondary onClick={resetForm}>Cancel</BtnSecondary>}
        </div>
      </Card>
      <Card>
        {monthEntries.length === 0
          ? <EmptyState icon="🛒" title="No bazaar entries" desc="No entries for this month yet."/>
          : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{["Date","Amount","Note","Added By","Actions"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {[...monthEntries].sort((a,b) => b.date.localeCompare(a.date)).map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 whitespace-nowrap">{fmtDate(b.date)}</td>
                      <td className="px-4 py-3 font-semibold text-amber-600 dark:text-amber-400">{fmtCurrency(b.amount)}</td>
                      <td className="px-4 py-3 text-gray-500">{b.note || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{b.addedBy || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => { setEditId(b.id); setForm({ date:b.date, amount:String(b.amount), note:b.note||"" }); }}
                            className="px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-medium hover:bg-amber-100">Edit</button>
                          <button onClick={() => setConfirm({ id:b.id })}
                            className="px-3 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{fmtCurrency(total)}</td>
                    <td colSpan={3}/>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
      </Card>
      <ConfirmDialog open={!!confirm} title="Delete Entry" desc="Delete this bazaar entry permanently?"
        onConfirm={() => handleDelete(confirm.id)} onCancel={() => setConfirm(null)}/>
    </div>
  );
}

// ─── Deposits ─────────────────────────────────────────────────────────────────
function DepositsPage({ members, deposits, notify, ownerId }) {
  const [form, setForm]   = useState({ memberId:"", date:TODAY, amount:"", note:"" });
  const [busy, setBusy]   = useState(false);
  const [filter, setFilter] = useState("");
  const [confirm, setConfirm] = useState(null);

  const enriched = deposits.map(d => ({ ...d, memberName: members.find(m => m.id === d.memberId)?.name || "Unknown" }));
  const filtered = filter ? enriched.filter(d => d.memberId === filter) : enriched;
  const totalFiltered = filtered.reduce((s, d) => s + Number(d.amount || 0), 0);

  const handleSave = async () => {
    if (!form.memberId) { notify("Select a member", "error"); return; }
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { notify("Enter a valid amount", "error"); return; }
    setBusy(true);
    try {
      await firestoreService.addDeposit(ownerId, { memberId:form.memberId, date:form.date, amount:amt, note:form.note });
      setForm(f => ({ ...f, amount:"", note:"" }));
      notify("Deposit recorded");
    } catch (err) { notify("Error: " + err.message, "error"); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    setBusy(true);
    try { await firestoreService.deleteDeposit(id); notify("Deposit deleted"); }
    catch (err) { notify("Delete failed", "error"); }
    finally { setBusy(false); setConfirm(null); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Deposits" badge={`${filtered.length} entries`}/>
      <Card title="Add Deposit">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Member *</label>
            <select value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId:e.target.value }))} className={inputCls}>
              <option value="">Select member</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date:e.target.value }))} className={inputCls}/></div>
          <div><label className={labelCls}>Amount (৳) *</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount:e.target.value }))} className={inputCls} placeholder="0" min="0"/></div>
          <div><label className={labelCls}>Note</label><input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note:e.target.value }))} className={inputCls} placeholder="Optional"/></div>
        </div>
        <BtnPrimary onClick={handleSave} disabled={busy} className="mt-4">Add Deposit</BtnPrimary>
      </Card>
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        {filter && <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Total: {fmtCurrency(totalFiltered)}</div>}
      </div>
      <Card>
        {filtered.length === 0
          ? <EmptyState icon="💰" title="No deposits" desc="No deposit records found."/>
          : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{["Member","Date","Amount","Note","Action"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filtered.map(dep => (
                    <tr key={dep.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium">{dep.memberName}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(dep.date)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{fmtCurrency(dep.amount)}</td>
                      <td className="px-4 py-3 text-gray-500">{dep.note || "—"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setConfirm({ id:dep.id })}
                          className="px-3 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
      <ConfirmDialog open={!!confirm} title="Delete Deposit" desc="Delete this deposit record permanently?"
        onConfirm={() => handleDelete(confirm.id)} onCancel={() => setConfirm(null)}/>
    </div>
  );
}

// ─── Extra Charges ────────────────────────────────────────────────────────────
function ExtrasPage({ members, extraCharges, notify, ownerId }) {
  const [form, setForm]   = useState({ memberId:"", date:TODAY, amount:"", note:"" });
  const [busy, setBusy]   = useState(false);
  const [filter, setFilter] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [ym, setYm]       = useState(getCurrentMonth());

  const monthEntries = extraCharges.filter(e => (e.date || "").startsWith(ym));
  const enriched     = monthEntries.map(e => ({ ...e, memberName: members.find(m => m.id === e.memberId)?.name || "Unknown" }));
  const filtered     = filter ? enriched.filter(e => e.memberId === filter) : enriched;
  const total        = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

  const handleSave = async () => {
    if (!form.memberId) { notify("Select a member", "error"); return; }
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { notify("Enter a valid amount", "error"); return; }
    setBusy(true);
    try {
      await firestoreService.addExtraCharge(ownerId, { memberId:form.memberId, date:form.date, amount:amt, note:form.note });
      setForm(f => ({ ...f, amount:"", note:"" }));
      notify("Extra charge recorded");
    } catch (err) { notify("Error: " + err.message, "error"); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    setBusy(true);
    try { await firestoreService.deleteExtraCharge(id); notify("Deleted"); }
    catch (err) { notify("Delete failed", "error"); }
    finally { setBusy(false); setConfirm(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Extra Charges" sub="Utility bills, service fees, fines, etc."/>
        <input type="month" value={ym} onChange={e => setYm(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
      </div>
      <Card title="Add Extra Charge">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Member *</label>
            <select value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId:e.target.value }))} className={inputCls}>
              <option value="">Select member</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date:e.target.value }))} className={inputCls}/></div>
          <div><label className={labelCls}>Amount (৳) *</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount:e.target.value }))} className={inputCls} placeholder="0" min="0"/></div>
          <div><label className={labelCls}>Reason *</label><input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note:e.target.value }))} className={inputCls} placeholder="e.g. Utility bill"/></div>
        </div>
        <BtnPrimary onClick={handleSave} disabled={busy} className="mt-4">Add Charge</BtnPrimary>
      </Card>
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <span className="text-sm font-medium text-rose-600 dark:text-rose-400">Total charges: {fmtCurrency(total)}</span>
      </div>
      <Card>
        {filtered.length === 0
          ? <EmptyState icon="➕" title="No extra charges" desc="No charges recorded for this month."/>
          : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{["Member","Date","Amount","Reason","Action"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filtered.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium">{e.memberName}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                      <td className="px-4 py-3 font-semibold text-rose-600 dark:text-rose-400">{fmtCurrency(e.amount)}</td>
                      <td className="px-4 py-3 text-gray-500">{e.note || "—"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setConfirm({ id:e.id })}
                          className="px-3 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
      <ConfirmDialog open={!!confirm} title="Delete Charge" desc="Delete this extra charge permanently?"
        onConfirm={() => handleDelete(confirm.id)} onCancel={() => setConfirm(null)}/>
    </div>
  );
}

// ─── Guest Meals ──────────────────────────────────────────────────────────────
function GuestsPage({ guestMeals, notify, ownerId }) {
  const [form, setForm]   = useState({ date:TODAY, guestName:"", mealCount:1, note:"" });
  const [busy, setBusy]   = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [ym, setYm]       = useState(getCurrentMonth());

  const monthEntries  = guestMeals.filter(g => (g.date || "").startsWith(ym));
  const totalGuestMeals = monthEntries.reduce((s, g) => s + Number(g.mealCount || 0), 0);

  const handleSave = async () => {
    if (!form.guestName.trim()) { notify("Guest name required", "error"); return; }
    if (Number(form.mealCount) < 1) { notify("At least 1 meal", "error"); return; }
    setBusy(true);
    try {
      await firestoreService.addGuestMeal(ownerId, { ...form, mealCount:Number(form.mealCount) });
      setForm(f => ({ ...f, guestName:"", mealCount:1, note:"" }));
      notify("Guest meal recorded");
    } catch (err) { notify("Error: " + err.message, "error"); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    setBusy(true);
    try { await firestoreService.deleteGuestMeal(id); notify("Deleted"); }
    catch (err) { notify("Delete failed", "error"); }
    finally { setBusy(false); setConfirm(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Guest Meals" sub="Guest meals share the meal rate pool"/>
        <div className="flex items-center gap-3">
          <input type="month" value={ym} onChange={e => setYm(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          <div className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 px-4 py-2 rounded-xl text-sm font-bold">
            {totalGuestMeals} guest meals
          </div>
        </div>
      </div>
      <Card title="Add Guest Meal">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div><label className={labelCls}>Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date:e.target.value }))} className={inputCls}/></div>
          <div><label className={labelCls}>Guest Name *</label><input type="text" value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName:e.target.value }))} className={inputCls} placeholder="Visitor name"/></div>
          <div><label className={labelCls}>Meal Count *</label><input type="number" value={form.mealCount} onChange={e => setForm(f => ({ ...f, mealCount:e.target.value }))} className={inputCls} min="1" max="9"/></div>
          <div><label className={labelCls}>Note</label><input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note:e.target.value }))} className={inputCls} placeholder="Optional"/></div>
        </div>
        <div className="mt-3 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl text-xs text-cyan-700 dark:text-cyan-400">
          ℹ️ Guest meals are added to the total meal count, which lowers the per-meal rate for all members.
        </div>
        <BtnPrimary onClick={handleSave} disabled={busy} className="mt-4">Add Guest Meal</BtnPrimary>
      </Card>
      <Card>
        {monthEntries.length === 0
          ? <EmptyState icon="🧑‍🤝‍🧑" title="No guest meals" desc="No guest meals recorded this month."/>
          : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{["Date","Guest","Meals","Note","Action"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {[...monthEntries].sort((a,b) => b.date.localeCompare(a.date)).map(g => (
                    <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 whitespace-nowrap">{fmtDate(g.date)}</td>
                      <td className="px-4 py-3 font-medium">{g.guestName}</td>
                      <td className="px-4 py-3"><span className="px-2.5 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-full text-xs font-bold">{g.mealCount}</span></td>
                      <td className="px-4 py-3 text-gray-500">{g.note || "—"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setConfirm({ id:g.id })}
                          className="px-3 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
      <ConfirmDialog open={!!confirm} title="Delete Guest Meal" desc="Delete this guest meal entry?"
        onConfirm={() => handleDelete(confirm.id)} onCancel={() => setConfirm(null)}/>
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function ReportsPage({ members, meals, bazaar, deposits, extraCharges, guestMeals }) {
  const [ym, setYm] = useState(getCurrentMonth());
  const [ymY, ymM]  = ym.split("-").map(Number);
  const monthName   = `${MONTHS[ymM-1]} ${ymY}`;
  const { totalBazaar, totalMeals, mealRate, memberSummary, totalGuestMeals } =
    calcMonth(ym, members, meals, bazaar, deposits, extraCharges, guestMeals);

  const prevD   = new Date(ymY, ymM - 2, 1);
  const prevYm  = `${prevD.getFullYear()}-${String(prevD.getMonth()+1).padStart(2,"0")}`;
  const { totalBazaar:prevBazaar, totalMeals:prevMeals, mealRate:prevRate } =
    calcMonth(prevYm, members, meals, bazaar, deposits, extraCharges, guestMeals);

  const compData = [
    { label:"Bazaar Cost", prev:prevBazaar, curr:totalBazaar },
    { label:"Total Meals", prev:prevMeals,  curr:totalMeals },
    { label:"Meal Rate",   prev:prevRate,   curr:mealRate },
  ];

  const days      = daysInMonth(ym);
  const dailyData = Array.from({ length:days }, (_,i) => {
    const day  = String(i+1).padStart(2,"0");
    const date = `${ym}-${day}`;
    const cnt  = members.filter(m => m.status !== "inactive").reduce((s, m) => {
      const e = Object.values(meals).find(me => me.date === date && me.memberId === m.id) || {};
      return s + (e.breakfast ? 1 : 0) + (e.lunch ? 1 : 0) + (e.dinner ? 1 : 0);
    }, 0);
    return { day: i+1, meals: cnt };
  });

  const memberChartData = memberSummary.map(m => ({
    name: m.name.split(" ")[0],
    meals: m.meals,
    cost: Number(m.cost.toFixed(2)),
  }));

  const handlePrintAll = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Report — ${monthName}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',sans-serif;padding:32px;color:#1f2937}
      h1{font-size:22px;font-weight:700;margin-bottom:4px}
      p{color:#6b7280;font-size:13px;margin-bottom:24px}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      th{background:#f3f4f6;font-size:11px;font-weight:600;padding:10px 12px;text-align:left;text-transform:uppercase;color:#6b7280}
      td{padding:10px 12px;font-size:13px;border-bottom:1px solid #f3f4f6}
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
      .stat{background:#f3f4f6;border-radius:10px;padding:14px}
      .stat-label{font-size:11px;color:#9ca3af;margin-bottom:2px}
      .stat-value{font-size:20px;font-weight:700}
      @media print{body{padding:20px}}
    </style></head><body>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <span style="font-size:36px">🍛</span>
      <div><h1>MessManager — ${monthName}</h1><p>Full Monthly Report</p></div>
    </div>
    <div class="stats">
      <div class="stat"><div class="stat-label">Total Bazaar</div><div class="stat-value">৳${totalBazaar.toFixed(2)}</div></div>
      <div class="stat"><div class="stat-label">Total Meals</div><div class="stat-value">${totalMeals}</div></div>
      <div class="stat"><div class="stat-label">Guest Meals</div><div class="stat-value">${totalGuestMeals}</div></div>
      <div class="stat"><div class="stat-label">Meal Rate</div><div class="stat-value">৳${mealRate.toFixed(2)}</div></div>
    </div>
    <table>
      <tr><th>#</th><th>Member</th><th>Meals</th><th>Meal Cost</th><th>Extras</th><th>Total Cost</th><th>Deposited</th><th>Balance</th><th>Status</th></tr>
      ${memberSummary.map((m,i) => `<tr>
        <td>${i+1}</td><td><strong>${m.name}</strong></td><td>${m.meals}</td>
        <td>৳${m.mealCost.toFixed(2)}</td><td>৳${m.extras.toFixed(2)}</td>
        <td>৳${m.cost.toFixed(2)}</td><td>৳${m.deposited.toFixed(2)}</td>
        <td style="color:${m.balance >= 0 ? "#16a34a" : "#dc2626"};font-weight:600">${m.balance >= 0 ? "+" : "-"}৳${Math.abs(m.balance).toFixed(2)}</td>
        <td>${m.balance >= 0 ? "Advance" : "Due"}</td>
      </tr>`).join("")}
      <tr style="background:#f3f4f6;font-weight:700">
        <td colspan="2">Totals</td><td>${totalMeals}</td>
        <td>৳${totalBazaar.toFixed(2)}</td><td>৳${memberSummary.reduce((s,m)=>s+m.extras,0).toFixed(2)}</td>
        <td>৳${memberSummary.reduce((s,m)=>s+m.cost,0).toFixed(2)}</td>
        <td>৳${memberSummary.reduce((s,m)=>s+m.deposited,0).toFixed(2)}</td>
        <td colspan="2"></td>
      </tr>
    </table>
    <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:24px">Generated by MessManager • ${new Date().toLocaleString()}</p>
    </body></html>`;
    const win = window.open("","_blank","width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  const handlePrintMemberBill = (m) => {
    const html = generateBillHTML(
      m, ym, mealRate,
      bazaar.filter(b => (b.date || "").startsWith(ym)),
      deposits.filter(d => (d.date || "").startsWith(ym)),
      extraCharges.filter(e => (e.date || "").startsWith(ym)),
      guestMeals.filter(g => (g.date || "").startsWith(ym)),
      totalBazaar, totalMeals + totalGuestMeals
    );
    printBill(html);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Reports" sub={monthName}/>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="month" value={ym} onChange={e => setYm(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          <button onClick={handlePrintAll}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium flex items-center gap-2">
            🖨️ Full Report PDF
          </button>
        </div>
      </div>

      <Card title="Month-over-Month Comparison" sub={`${MONTHS[prevD.getMonth()]} vs ${monthName}`}>
        <div className="grid grid-cols-3 gap-4">
          {compData.map((c, i) => {
            const diff = c.curr - c.prev;
            const pct  = c.prev > 0 ? ((diff / c.prev) * 100).toFixed(1) : 0;
            const up   = diff >= 0;
            return (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{c.label}</p>
                <p className="text-lg font-bold">{i === 0 || i === 2 ? fmtCurrency(c.curr) : c.curr}</p>
                <p className={`text-xs font-medium mt-1 ${up ? "text-emerald-600" : "text-red-500"}`}>
                  {up ? "▲" : "▼"} {Math.abs(pct)}% vs prev month
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:"Total Bazaar",  value:fmtCurrency(totalBazaar), icon:"🛒" },
          { label:"Total Meals",   value:totalMeals,                icon:"🍽️" },
          { label:"Guest Meals",   value:totalGuestMeals,           icon:"🧑‍🤝‍🧑" },
          { label:"Per Meal Cost", value:fmtCurrency(mealRate),     icon:"💸" },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title={`Daily Meal Count — ${monthName}`}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
              <XAxis dataKey="day" tick={{ fontSize:10 }}/>
              <YAxis tick={{ fontSize:10 }}/>
              <Tooltip/>
              <Line type="monotone" dataKey="meals" stroke="#6366f1" strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
        {memberChartData.length > 0 && (
          <Card title="Member Meals vs Cost">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={memberChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis dataKey="name" tick={{ fontSize:11 }}/>
                <YAxis yAxisId="left" tick={{ fontSize:11 }}/>
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize:11 }}/>
                <Tooltip formatter={(v, n) => (n === "cost" ? fmtCurrency(v) : v)}/>
                <Legend/>
                <Bar yAxisId="left"  dataKey="meals" fill="#6366f1" radius={[4,4,0,0]} name="Meals"/>
                <Bar yAxisId="right" dataKey="cost"  fill="#22d3ee" radius={[4,4,0,0]} name="Cost (৳)"/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      <Card title={`Monthly Statement — ${monthName}`} sub={`Meal rate: ${fmtCurrency(mealRate)} per meal`}>
        {memberSummary.length === 0
          ? <EmptyState icon="📊" title="No data" desc="No members or meal data for this month."/>
          : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{["#","Member","Meals","Meal Cost","Extras","Total Cost","Deposited","Balance","Status","Bill"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {memberSummary.map((m, i) => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-gray-400 text-xs">{i+1}</td>
                      <td className="px-4 py-3 font-medium">{m.name}</td>
                      <td className="px-4 py-3">{m.meals}</td>
                      <td className="px-4 py-3">{fmtCurrency(m.mealCost)}</td>
                      <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{fmtCurrency(m.extras)}</td>
                      <td className="px-4 py-3 font-medium">{fmtCurrency(m.cost)}</td>
                      <td className="px-4 py-3">{fmtCurrency(m.deposited)}</td>
                      <td className={`px-4 py-3 font-semibold ${m.balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        {m.balance >= 0 ? "+" : "−"}{fmtCurrency(Math.abs(m.balance))}
                      </td>
                      <td className="px-4 py-3"><StatusBadge value={m.balance}/></td>
                      <td className="px-4 py-3">
                        <button onClick={() => handlePrintMemberBill(m)}
                          className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:bg-indigo-100 whitespace-nowrap">
                          🖨️ PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 dark:bg-gray-800 font-bold text-sm">
                    <td colSpan={2} className="px-4 py-3">Totals</td>
                    <td className="px-4 py-3">{totalMeals}</td>
                    <td className="px-4 py-3">{fmtCurrency(totalBazaar)}</td>
                    <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{fmtCurrency(memberSummary.reduce((s,m) => s+m.extras, 0))}</td>
                    <td className="px-4 py-3">{fmtCurrency(memberSummary.reduce((s,m) => s+m.cost, 0))}</td>
                    <td className="px-4 py-3">{fmtCurrency(memberSummary.reduce((s,m) => s+m.deposited, 0))}</td>
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

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsPage({ dark, setDark, onLogout, notify, userProfile, isAdmin, members, ownerId }) {
  const [profForm, setProfForm] = useState({ displayName: userProfile.displayName, email: userProfile.email });
  const [pwForm, setPwForm]     = useState({ current:"", new1:"", new2:"" });
  const [busy, setBusy]         = useState(false);

  // Member login setup
  const [memberLoginForm, setMemberLoginForm] = useState({ memberId:"", email:"", password:"" });
  const [memberLoginBusy, setMemberLoginBusy] = useState(false);
  const [memberAccessList, setMemberAccessList] = useState([]);

  // Load member access list for this admin
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(
      query(collection(db, "memberAccess"), where("ownerId", "==", ownerId)),
      snap => setMemberAccessList(snap.docs.map(d => ({ uid: d.id, ...d.data() }))),
      err  => console.error(err)
    );
    return unsub;
  }, [isAdmin, ownerId]);

  const saveProfile = async () => {
    if (!profForm.displayName.trim()) { notify("Name required", "error"); return; }
    setBusy(true);
    try {
      await firestoreService.updateAdminProfile(userProfile.uid, { displayName: profForm.displayName });
      notify("Profile updated — reload to reflect changes");
    } catch (err) { notify("Error: " + err.message, "error"); }
    finally { setBusy(false); }
  };

  const savePassword = async () => {
    if (pwForm.new1.length < 6) { notify("Min 6 characters", "error"); return; }
    if (pwForm.new1 !== pwForm.new2) { notify("Passwords don't match", "error"); return; }
    setBusy(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, pwForm.current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, pwForm.new1);
      setPwForm({ current:"", new1:"", new2:"" });
      notify("Password changed successfully");
    } catch (err) {
      if (err.code === "auth/wrong-password") notify("Current password is incorrect", "error");
      else notify("Error: " + err.message, "error");
    } finally { setBusy(false); }
  };

  const saveMemberLogin = async () => {
    if (!memberLoginForm.memberId) { notify("Select a member", "error"); return; }
    if (!memberLoginForm.email.trim()) { notify("Email required", "error"); return; }
    if (!memberLoginForm.password || memberLoginForm.password.length < 6) { notify("Password must be 6+ characters", "error"); return; }
    const member = members.find(m => m.id === memberLoginForm.memberId);
    if (!member) { notify("Member not found", "error"); return; }
    setMemberLoginBusy(true);
    try {
      // Create Firebase Auth account for member
      const cred = await createUserWithEmailAndPassword(auth, memberLoginForm.email.trim(), memberLoginForm.password);
      // Re-sign-in as admin immediately (createUserWithEmailAndPassword switches current user)
      // Store member access record
      await firestoreService.setMemberAccess(cred.user.uid, {
        ownerId,
        memberId: memberLoginForm.memberId,
        displayName: member.name,
        email: memberLoginForm.email.trim(),
        role: "member",
      });
      // Sign admin back in
      await signInWithEmailAndPassword(auth, auth.currentUser?.email || userProfile.email, "");
      notify(`Login created for ${member.name}. Note: admin must re-login.`, "warning");
      setMemberLoginForm({ memberId:"", email:"", password:"" });
    } catch (err) {
      if (err.code === "auth/email-already-in-use") notify("Email already has a Firebase account", "error");
      else notify("Error creating member login: " + err.message, "error");
    } finally { setMemberLoginBusy(false); }
  };

  const deleteMemberLogin = async (memberUid, name) => {
    try {
      await firestoreService.deleteMemberAccess(memberUid);
      notify(`Removed login access for ${name}`);
    } catch (err) { notify("Error: " + err.message, "error"); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Settings"/>

      <Card title="Appearance">
        <div className="flex items-center justify-between">
          <div><p className="font-medium text-sm">Dark Mode</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Toggle light/dark theme</p></div>
          <button onClick={() => setDark(d => !d)}
            className={`w-14 h-7 rounded-full transition-colors duration-300 relative ${dark ? "bg-indigo-600" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${dark ? "translate-x-7" : "translate-x-0.5"}`}/>
          </button>
        </div>
      </Card>

      <Card title="My Profile">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Display Name</label>
            <input value={profForm.displayName} onChange={e => setProfForm(f => ({ ...f, displayName:e.target.value }))} className={inputCls}/>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input value={profForm.email} disabled className={inputCls + " opacity-60 cursor-not-allowed"} title="Email cannot be changed here"/>
          </div>
        </div>
        <BtnPrimary onClick={saveProfile} disabled={busy} className="mt-4">Save Profile</BtnPrimary>
      </Card>

      <Card title="Change Password">
        <div className="space-y-3">
          {[["Current Password","current"],["New Password","new1"],["Confirm New Password","new2"]].map(([lbl,key]) => (
            <div key={key}>
              <label className={labelCls}>{lbl}</label>
              <input type="password" value={pwForm[key]} onChange={e => setPwForm(f => ({ ...f, [key]:e.target.value }))} className={inputCls}/>
            </div>
          ))}
          <BtnPrimary onClick={savePassword} disabled={busy}>Change Password</BtnPrimary>
        </div>
      </Card>

      {isAdmin && (
        <Card title="Member Login Setup" sub="Create Firebase accounts for members to view their own bill">
          <div className="p-3 mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-400">
            ℹ️ This creates a real Firebase Auth account for the member. They can log in with their email/password to see their own bill and meals. Each member's data is scoped to your mess — they cannot see other admins' data.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>Member</label>
              <select value={memberLoginForm.memberId} onChange={e => setMemberLoginForm(f => ({ ...f, memberId:e.target.value }))} className={inputCls}>
                <option value="">Select member</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Login Email</label>
              <input type="email" value={memberLoginForm.email} onChange={e => setMemberLoginForm(f => ({ ...f, email:e.target.value }))} className={inputCls} placeholder="member@email.com"/>
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input type="password" value={memberLoginForm.password} onChange={e => setMemberLoginForm(f => ({ ...f, password:e.target.value }))} className={inputCls} placeholder="Min 6 chars"/>
            </div>
          </div>
          <BtnPrimary onClick={saveMemberLogin} disabled={memberLoginBusy}>
            {memberLoginBusy ? "Creating…" : "Create Member Login"}
          </BtnPrimary>
          {memberAccessList.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Members with login access:</p>
              {memberAccessList.map(l => (
                <div key={l.uid} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                  <div>
                    <span className="font-medium">{l.displayName}</span>
                    <span className="text-xs text-gray-400 ml-2">{l.email}</span>
                  </div>
                  <button onClick={() => deleteMemberLogin(l.uid, l.displayName)}
                    className="px-3 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100">
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card title="Account Info">
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p><span className="font-medium text-gray-900 dark:text-white">Role:</span> {userProfile.role}</p>
          <p><span className="font-medium text-gray-900 dark:text-white">Firebase UID:</span> <span className="font-mono text-xs">{userProfile.uid}</span></p>
          {isAdmin && <p><span className="font-medium text-gray-900 dark:text-white">Your data silo (ownerId):</span> <span className="font-mono text-xs">{userProfile.ownerId}</span></p>}
        </div>
      </Card>

      <Card title="About">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <strong className="text-gray-900 dark:text-white">MessManager v4.0</strong> — Multi-tenant Firebase edition with complete data isolation per admin, Firebase Authentication, Firestore realtime listeners, and full PDF billing.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["React 18","React Router v6","Tailwind CSS","Firebase Auth","Firestore","Multi-tenant","PDF Export","Recharts"].map(t => (
            <span key={t} className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-medium">{t}</span>
          ))}
        </div>
        <button onClick={onLogout} className="mt-4 px-5 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100">
          Sign Out
        </button>
      </Card>
    </div>
  );
}