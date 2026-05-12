// src/pages/AuthPages.jsx
// Login, Register, ForgotPassword, Unauthorized pages

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./ThemeContext";
import { inputCls, labelCls } from "./components/UI";

function AuthCard({ children, title, sub }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-gray-800">
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">🍛</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">MessManager</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{sub}</p>
          </div>
          {title && (
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">{title}</h2>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Login ──────────────────────────────────────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      const msgs = {
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-email": "Invalid email address.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "auth/invalid-credential": "Invalid email or password.",
      };
      setError(msgs[err.code] || "Login failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <AuthCard sub="v3.0 — Firebase Meal Management">
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className={inputCls} placeholder="admin@example.com" autoComplete="email" />
        </div>
        <div>
          <label className={labelCls}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className={inputCls} placeholder="••••••••" autoComplete="current-password" />
        </div>
        <button onClick={handleLogin} disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900 transition-all disabled:opacity-60">
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </div>
      <div className="mt-5 flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/forgot-password" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          Forgot password?
        </Link>
        <span>Don't have an account?{" "}
          <Link to="/register" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            Create Admin Account
          </Link>
        </span>
      </div>
      <button onClick={toggle} className="w-full mt-4 text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
        {dark ? "☀️ Light Mode" : "🌙 Dark Mode"}
      </button>
    </AuthCard>
  );
}

// ── Register ───────────────────────────────────────────────────────────────────
export function RegisterPage() {
  const { registerAdmin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      await registerAdmin(form.name.trim(), form.email.trim(), form.password);
      navigate("/dashboard");
    } catch (err) {
      const msgs = {
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/invalid-email": "Invalid email address.",
        "auth/weak-password": "Password is too weak.",
      };
      setError(msgs[err.code] || "Registration failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <AuthCard sub="Create your admin account" title="Create Admin Account">
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}
      <div className="space-y-4">
        {[
          ["Full Name", "name", "text", "Your name"],
          ["Email", "email", "email", "admin@example.com"],
          ["Password", "password", "password", "Min 6 characters"],
          ["Confirm Password", "confirm", "password", "Re-enter password"],
        ].map(([label, key, type, placeholder]) => (
          <div key={key}>
            <label className={labelCls}>{label}</label>
            <input type={type} value={form[key]} placeholder={placeholder}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              className={inputCls} />
          </div>
        ))}
        <button onClick={handleRegister} disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900 transition-all disabled:opacity-60">
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </div>
      <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{" "}
        <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Sign in</Link>
      </p>
    </AuthCard>
  );
}

// ── Forgot Password ────────────────────────────────────────────────────────────
export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) { setError("Please enter your email."); return; }
    setLoading(true);
    setError("");
    setMsg("");
    try {
      await resetPassword(email.trim());
      setMsg("Password reset email sent! Check your inbox.");
    } catch (err) {
      setError(err.code === "auth/user-not-found"
        ? "No account found with this email."
        : "Failed to send reset email.");
    }
    setLoading(false);
  };

  return (
    <AuthCard sub="Reset your password" title="Forgot Password">
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}
      {msg && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm">
          {msg}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Email Address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReset()}
            className={inputCls} placeholder="Enter your registered email" />
        </div>
        <button onClick={handleReset} disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900 transition-all disabled:opacity-60">
          {loading ? "Sending…" : "Send Reset Email"}
        </button>
      </div>
      <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
        <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">← Back to Login</Link>
      </p>
    </AuthCard>
  );
}

// ── Unauthorized ───────────────────────────────────────────────────────────────
export function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">You don't have permission to view this page.</p>
        <button onClick={() => navigate("/dashboard")}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm">
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}