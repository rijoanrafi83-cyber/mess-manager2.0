import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "../../context/useAuth";
import {
  AuthButton,
  AuthShell,
  AuthStatus,
} from "../../components/auth/AuthShell";
import { AuthField } from "../../components/auth/AuthField";

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState("");
  const [sentTo, setSentTo] = useState("");

  const validateEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value
    );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setBusy(true);

      const trimmedEmail = email.trim();
      const result =
        await resetPassword(trimmedEmail);

      if (result.success) {
        setSentTo(trimmedEmail);
        setSuccess(
          result.message ||
            "Password reset email sent successfully"
        );
        setEmail("");
      } else {
        setError(
          result.message ||
            "Failed to send reset email"
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
      eyebrow="Account recovery"
      title="Reset password"
      subtitle="Enter your email and Firebase will send a secure reset link to your inbox."
      sideTitle="Recovery that stays simple."
      sideText="Reset links are sent through Firebase Authentication, so your credentials stay protected while you regain access."
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

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="rounded-3xl border theme-muted p-6 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-500">
              <CheckCircle2 size={30} />
            </div>
            <h3 className="mt-4 text-lg font-black theme-text">
              Check your inbox
            </h3>
            <p className="mt-2 text-sm leading-6 theme-subtext">
              We sent a reset link to{" "}
              <span className="font-bold theme-text">
                {sentTo}
              </span>
              . Follow the link to choose a new password.
            </p>
            <button
              type="button"
              onClick={() => {
                setSuccess("");
                setSentTo("");
              }}
              className="theme-focus mt-5 rounded-2xl border theme-muted px-4 py-3 text-sm font-bold theme-text hover:bg-[var(--bg-card)]"
            >
              Send another link
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <AuthField
              label="Email address"
              icon={Mail}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              autoComplete="email"
            />

            <AuthButton
              type="submit"
              loading={busy}
              loadingText="Sending reset link"
            >
              Send Reset Link
            </AuthButton>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="mt-6 rounded-2xl border theme-muted p-4">
        <div className="flex gap-3">
          <ShieldCheck
            size={21}
            className="mt-0.5 shrink-0 theme-accent-text"
          />
          <div>
            <h3 className="text-sm font-black theme-text">
              Secure password recovery
            </h3>
            <p className="mt-1 text-xs leading-5 theme-muted-text">
              Reset links are time-sensitive and delivered only to the account email.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-7 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-black theme-accent-text hover:brightness-110"
        >
          <ArrowLeft size={16} />
          Back to login
        </Link>
      </div>
    </AuthShell>
  );
}
