import { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  BriefcaseBusiness,
  Eye,
  EyeOff,
  Lock,
  Mail,
  UserRound,
  ShieldCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "../../context/AuthContext";
import {
  AuthButton,
  AuthShell,
  AuthStatus,
} from "../../components/auth/AuthShell";
import {
  AuthField,
  IconButton,
} from "../../components/auth/AuthField";

const REMEMBER_EMAIL_KEY = "mm_auth_email";

export function LoginPage() {
  const { login, isAuthed } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    location.state?.from?.pathname || "/";

  const rememberedEmail =
    typeof window !== "undefined"
      ? localStorage.getItem(
          REMEMBER_EMAIL_KEY
        ) || ""
      : "";

  const [email, setEmail] = useState(
    rememberedEmail
  );
  const [password, setPassword] =
    useState("");
  const [remember, setRemember] =
    useState(Boolean(rememberedEmail));
  const [showPassword, setShowPassword] =
    useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthed) {
    return <Navigate to={from} replace />;
  }

  const handleLogin = async (event) => {
    event?.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setBusy(true);
    setError("");

    const result = await login(
      email.trim(),
      password,
      { expectedRole: "admin" }
    );

    if (result.success) {
      if (remember) {
        localStorage.setItem(
          REMEMBER_EMAIL_KEY,
          email.trim()
        );
      } else {
        localStorage.removeItem(
          REMEMBER_EMAIL_KEY
        );
      }

      navigate(from, { replace: true });
      return;
    }

    setError(result.message);
    setBusy(false);
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue managing meals, deposits, reports, and daily operations."
      sideTitle="A calmer control room for mess management."
      sideText="Everything from meal counts to monthly bills stays organized, synced, and ready for your team."
    >
      <AnimatePresence mode="wait">
        {error && (
          <AuthStatus type="error">
            {error}
          </AuthStatus>
        )}
      </AnimatePresence>

      <form
        onSubmit={handleLogin}
        className="space-y-4"
      >
        <AuthField
          label="Email address"
          icon={Mail}
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
          }}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <AuthField
          label="Password"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError("");
          }}
          placeholder="Enter your password"
          autoComplete="current-password"
          action={
            <IconButton
              label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
              onClick={() =>
                setShowPassword(
                  (value) => !value
                )
              }
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </IconButton>
          }
        />

        <div className="flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-sm font-semibold theme-subtext">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) =>
                setRemember(event.target.checked)
              }
              className="h-4 w-4 rounded border theme-field accent-[var(--accent)]"
            />
            Remember me
          </label>

          <Link
            to="/forgot-password"
            className="text-sm font-bold theme-accent-text hover:brightness-110"
          >
            Forgot password?
          </Link>
        </div>

        <AuthButton
          type="submit"
          loading={busy}
          loadingText="Signing in"
        >
          Sign In
        </AuthButton>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--border-soft)]" />
        <span className="text-xs font-bold uppercase tracking-wider theme-muted-text">
          Secure access
        </span>
        <span className="h-px flex-1 bg-[var(--border-soft)]" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {["Google", "Microsoft"].map((label) => (
          <motion.button
            key={label}
            type="button"
            disabled
            className="flex items-center justify-center gap-2 rounded-2xl border theme-muted px-3 py-3 text-xs font-bold theme-muted-text opacity-70"
          >
            <ShieldCheck size={15} />
            {label}
          </motion.button>
        ))}
      </div>

      <p className="mt-7 text-center text-sm theme-subtext">
        New to MessManager?{" "}
        <Link
          to="/register"
          className="font-black theme-accent-text hover:brightness-110"
        >
          Create an account
        </Link>
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          to="/member-login"
          className="theme-focus flex items-center justify-center gap-2 rounded-2xl border theme-muted px-3 py-3 text-xs font-black theme-text hover:bg-[var(--bg-card-muted)]"
        >
          <UserRound size={15} />
          Member Login
        </Link>

        <Link
          to="/manager-login"
          className="theme-focus flex items-center justify-center gap-2 rounded-2xl border theme-muted px-3 py-3 text-xs font-black theme-text hover:bg-[var(--bg-card-muted)]"
        >
          <BriefcaseBusiness size={15} />
          Manager Login
        </Link>
      </div>
    </AuthShell>
  );
}
