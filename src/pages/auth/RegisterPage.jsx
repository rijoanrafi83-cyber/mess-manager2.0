import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [termsAccepted, setTermsAccepted] =
    useState(false);
  const [showPassword, setShowPassword] =
    useState(false);
  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState("");

  const passwordChecks = useMemo(
    () => ({
      length: formData.password.length >= 8,
      upper: /[A-Z]/.test(formData.password),
      lower: /[a-z]/.test(formData.password),
      number: /[0-9]/.test(formData.password),
      special: /[^A-Za-z0-9]/.test(
        formData.password
      ),
    }),
    [formData.password]
  );

  const strengthScore =
    Object.values(passwordChecks).filter(Boolean)
      .length;

  const strengthText =
    strengthScore <= 2
      ? "Weak"
      : strengthScore <= 4
        ? "Medium"
        : "Strong";

  const strengthColor =
    strengthScore <= 2
      ? "#ef4444"
      : strengthScore <= 4
        ? "#f59e0b"
        : "#22c55e";

  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.password ===
      formData.confirmPassword;

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]:
        event.target.value,
    });
    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    const {
      displayName,
      email,
      password,
      confirmPassword,
    } = formData;

    if (
      !displayName ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      return "Please fill all fields";
    }

    if (displayName.length < 3) {
      return "Display name must be at least 3 characters";
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return "Invalid email address";
    }

    if (strengthScore < 5) {
      return "Please create a stronger password";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match";
    }

    if (!termsAccepted) {
      return "Please accept the terms to continue";
    }

    return null;
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setBusy(true);

      const result = await register(
        formData.displayName.trim(),
        formData.email.trim(),
        formData.password
      );

      if (result.success) {
        setSuccess(
          result.message ||
            "Account created successfully"
        );

        setTimeout(() => {
          navigate("/login");
        }, 1800);
      } else {
        setError(
          result.message ||
            "Registration failed"
        );
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Start your workspace"
      title="Create account"
      subtitle="Set up your administrator profile and begin managing your mess operations."
      sideTitle="Onboard once. Operate every day."
      sideText="Your account creates an admin workspace with secure Firebase authentication and synced operational data."
    >
      <AnimatePresence mode="wait">
        {error && (
          <AuthStatus type="error">
            {error}
          </AuthStatus>
        )}
        {success && (
          <AuthStatus type="success">
            {success}
          </AuthStatus>
        )}
      </AnimatePresence>

      <form
        onSubmit={handleRegister}
        className="space-y-4"
      >
        <AuthField
          label="Full name"
          icon={User}
          type="text"
          name="displayName"
          placeholder="Your full name"
          value={formData.displayName}
          onChange={handleChange}
          autoComplete="name"
        />

        <AuthField
          label="Email address"
          icon={Mail}
          type="email"
          name="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
        />

        <AuthField
          label="Password"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="Create a strong password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="new-password"
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

        <AnimatePresence>
          {formData.password && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{
                opacity: 1,
                height: "auto",
              }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border theme-muted p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider theme-muted-text">
                    Password strength
                  </span>
                  <span
                    className="text-xs font-black"
                    style={{ color: strengthColor }}
                  >
                    {strengthText}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-field)]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(strengthScore / 5) * 100}%`,
                    }}
                    className="h-full rounded-full"
                    style={{
                      background: strengthColor,
                    }}
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
                  {[
                    ["8+ Characters", passwordChecks.length],
                    ["Uppercase", passwordChecks.upper],
                    ["Lowercase", passwordChecks.lower],
                    ["Number", passwordChecks.number],
                    ["Special Character", passwordChecks.special],
                  ].map(([label, pass]) => (
                    <span
                      key={label}
                      className={
                        pass
                          ? "text-green-500"
                          : "theme-muted-text"
                      }
                    >
                      {pass ? "✓" : "•"} {label}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AuthField
          label="Confirm password"
          icon={Lock}
          type={
            showConfirmPassword
              ? "text"
              : "password"
          }
          name="confirmPassword"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          action={
            <IconButton
              label={
                showConfirmPassword
                  ? "Hide password"
                  : "Show password"
              }
              onClick={() =>
                setShowConfirmPassword(
                  (value) => !value
                )
              }
            >
              {showConfirmPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </IconButton>
          }
        />

        <AnimatePresence>
          {formData.confirmPassword && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold ${
                passwordsMatch
                  ? "border-green-500/25 bg-green-500/10 text-green-500"
                  : "border-yellow-500/25 bg-yellow-500/10 text-yellow-500"
              }`}
            >
              <Check size={15} />
              {passwordsMatch
                ? "Passwords match"
                : "Confirm password must match"}
            </motion.div>
          )}
        </AnimatePresence>

        <label className="flex items-start gap-3 rounded-2xl border theme-muted p-4 text-sm theme-subtext">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(event) => {
              setTermsAccepted(event.target.checked);
              setError("");
            }}
            className="mt-0.5 h-4 w-4 rounded border theme-field accent-[var(--accent)]"
          />
          <span>
            I agree to create an admin workspace and keep account access secure.
          </span>
        </label>

        <AuthButton
          type="submit"
          loading={busy}
          loadingText="Creating account"
        >
          Create Account
        </AuthButton>
      </form>

      <p className="mt-7 text-center text-sm theme-subtext">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-black theme-accent-text hover:brightness-110"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
