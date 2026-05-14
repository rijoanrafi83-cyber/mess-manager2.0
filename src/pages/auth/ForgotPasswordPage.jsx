import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validateEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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

      const result = await resetPassword(email.trim());

      if (result.success) {
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-cyan-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/30 shadow-2xl rounded-3xl overflow-hidden">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-indigo-600 to-cyan-500 px-8 py-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute w-40 h-40 bg-white rounded-full -top-16 -left-10"></div>
              <div className="absolute w-32 h-32 bg-white rounded-full -bottom-10 -right-10"></div>
            </div>

            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg mb-5">
                <ShieldCheck
                  size={38}
                  className="text-white"
                />
              </div>

              <h1 className="text-3xl font-black text-white">
                Forgot Password?
              </h1>

              <p className="text-indigo-100 mt-3 text-sm leading-relaxed">
                No worries. Enter your email address and
                we’ll send you a secure password reset link.
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Error */}
            {error && (
              <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl px-4 py-3">
                <AlertCircle
                  size={20}
                  className="mt-0.5"
                />

                <span className="text-sm font-medium">
                  {error}
                </span>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="mb-5 flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 rounded-2xl px-4 py-3">
                <CheckCircle2
                  size={20}
                  className="mt-0.5"
                />

                <span className="text-sm font-medium">
                  {success}
                </span>
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={busy}
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-white transition-all duration-300 shadow-lg ${
                  busy
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-600 to-cyan-500 hover:scale-[1.02] hover:shadow-2xl"
                }`}
              >
                {busy ? (
                  <>
                    <Loader2
                      size={20}
                      className="animate-spin"
                    />
                    Sending Reset Link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            {/* Security Info */}
            <div className="mt-6 bg-gray-50 border border-gray-100 rounded-2xl p-4">
              <div className="flex gap-3">
                <ShieldCheck
                  size={22}
                  className="text-indigo-600 mt-0.5"
                />

                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">
                    Secure Password Recovery
                  </h3>

                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                    For your security, password reset links
                    automatically expire after a limited
                    time.
                  </p>
                </div>
              </div>
            </div>

            {/* Back to Login */}
            <div className="mt-7 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition"
              >
                <ArrowLeft size={16} />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}