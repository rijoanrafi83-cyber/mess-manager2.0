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
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

import { useAuth } from "../../context/useAuth";
import {
  AuthButton,
  AuthShell,
  AuthStatus,
} from "../../components/auth/AuthShell";
import {
  AuthField,
  IconButton,
} from "../../components/auth/AuthField";
import { ROLE_LABELS, ROLES } from "../../utils/roles";

const ROLE_CONFIG = {
  [ROLES.MEMBER]: {
    icon: UserRound,
    title: "Member login",
    eyebrow: "View-only workspace access",
    subtitle:
      "Sign in with the shared member email and password configured by your administrator.",
    sideTitle: "Your meals, deposits, reports, and balance in one quiet view.",
    sideText:
      "Member access is scoped to your admin workspace and limited to view-only data.",
  },
  [ROLES.MANAGER]: {
    icon: BriefcaseBusiness,
    title: "Manager login",
    eyebrow: "Limited management access",
    subtitle:
      "Sign in with the shared manager email and password configured by your administrator.",
    sideTitle: "Operational controls without critical admin settings.",
    sideText:
      "Managers can handle meals, bazaar, deposits, reports, and member visibility inside one workspace.",
  },
};

export function RoleLoginPage({ role }) {
  const { login, isAuthed } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    location.state?.from?.pathname || "/";
  const config =
    ROLE_CONFIG[role] || ROLE_CONFIG[ROLES.MEMBER];
  const RoleIcon = config.icon;

  const [identifier, setIdentifier] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthed) {
    return <Navigate to={from} replace />;
  }

  const handleLogin = async (event) => {
    event.preventDefault();

    if (
      !identifier.trim() ||
      !password.trim()
    ) {
      setError("Please fill in all fields.");
      return;
    }

    setBusy(true);
    setError("");

    const result = await login(
      identifier.trim(),
      password,
      { expectedRole: role }
    );

    if (result.success) {
      navigate(from, { replace: true });
      return;
    }

    setError(result.message);
    setBusy(false);
  };

  return (
    <AuthShell
      eyebrow={config.eyebrow}
      title={config.title}
      subtitle={config.subtitle}
      sideTitle={config.sideTitle}
      sideText={config.sideText}
    >
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border theme-muted px-3 py-2 text-xs font-black theme-text">
        <RoleIcon size={15} />
        {ROLE_LABELS[role]}
      </div>

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
          label="Shared login email"
          icon={Mail}
          type="text"
          value={identifier}
          onChange={(event) => {
            setIdentifier(event.target.value);
            setError("");
          }}
          placeholder="configured by admin"
          autoComplete="username"
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

        <AuthButton
          type="submit"
          loading={busy}
          loadingText="Signing in"
        >
          <ShieldCheck size={17} />
          Sign in as {ROLE_LABELS[role]}
        </AuthButton>
      </form>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link
          to="/login"
          className="theme-focus rounded-2xl border theme-muted px-3 py-3 text-center text-xs font-black theme-text hover:bg-[var(--bg-card-muted)]"
        >
          Admin Login
        </Link>
        <Link
          to={role === ROLES.MEMBER ? "/manager-login" : "/member-login"}
          className="theme-focus rounded-2xl border theme-muted px-3 py-3 text-center text-xs font-black theme-text hover:bg-[var(--bg-card-muted)]"
        >
          {role === ROLES.MEMBER
            ? "Manager Login"
            : "Member Login"}
        </Link>
      </div>
    </AuthShell>
  );
}
