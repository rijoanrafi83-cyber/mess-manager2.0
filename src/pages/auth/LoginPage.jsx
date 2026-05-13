import { useState } from "react";
import { useNavigate, useLocation, Link, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export function LoginPage() {
  const { login, isAuthed } = useAuth();
  const { dark, setDark }   = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || "/";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [busy,     setBusy]     = useState(false);

  // Already logged in — redirect
  if (isAuthed) return <Navigate to={from} replace />;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await login(email, password);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.message);
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 0% 0%, #6366f120 0%, transparent 60%)," +
          "radial-gradient(ellipse at 100% 100%, #8b5cf620 0%, transparent 60%)," +
          "radial-gradient(ellipse at 50% 50%, #0f172a 0%, #1e1b4b 100%)",
      }}
    >
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="relative w-full max-w-md z-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-4xl shadow-2xl shadow-indigo-500/40 mx-auto mb-4">
              🍛
            </div>
            <h1 className="text-3xl font-black text-white">MessManager</h1>
            <p className="text-indigo-300 mt-1 text-sm font-medium">v5.0 — Premium Edition</p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-rose-500/20 border border-rose-400/30 text-rose-300 rounded-2xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
              />
            </div>
            <button
              onClick={handleLogin} disabled={busy}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold rounded-xl shadow-2xl shadow-indigo-500/40 transition-all active:scale-95 disabled:opacity-50 text-sm"
            >
              {busy ? "Signing in…" : "Sign In →"}
            </button>
          </div>

          <div className="mt-6 flex justify-center gap-5 text-sm">
            <Link to="/register" className="text-indigo-300 hover:text-white transition-colors font-medium">
              Create Account
            </Link>
            <span className="text-indigo-500">·</span>
            <Link to="/forgot-password" className="text-indigo-300 hover:text-white transition-colors font-medium">
              Forgot Password?
            </Link>
          </div>

          <button
            onClick={() => setDark((d) => !d)}
            className="w-full mt-4 text-center text-xs text-indigo-400 hover:text-indigo-200 transition-colors"
          >
            {dark ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
      </div>
    </div>
  );
}