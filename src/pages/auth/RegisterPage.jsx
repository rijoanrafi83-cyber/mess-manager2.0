import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Password Strength
  const passwordChecks = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password),
  };

  const strengthScore =
    Object.values(passwordChecks).filter(Boolean).length;

  const getStrengthColor = () => {
    if (strengthScore <= 2) return "bg-red-500";
    if (strengthScore <= 4) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (strengthScore <= 2) return "Weak";
    if (strengthScore <= 4) return "Medium";
    return "Strong";
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    const { displayName, email, password, confirmPassword } =
      formData;

    if (!displayName || !email || !password || !confirmPassword) {
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

    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();

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
        setError(result.message || "Registration failed");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg mb-4">
              <User className="text-white" size={34} />
            </div>

            <h1 className="text-4xl font-black text-gray-900">
              Create Account
            </h1>

            <p className="text-gray-500 mt-2">
              Join the platform and start managing everything smarter.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl px-4 py-3">
              <AlertCircle size={20} className="mt-0.5" />
              <span className="text-sm font-medium">
                {error}
              </span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-5 flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 rounded-2xl px-4 py-3">
              <CheckCircle2 size={20} className="mt-0.5" />
              <span className="text-sm font-medium">
                {success}
              </span>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleRegister}
            className="space-y-5"
          >
            {/* Name */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Full Name
              </label>

              <div className="relative">
                <User
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  name="displayName"
                  placeholder="Enter your full name"
                  value={formData.displayName}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Email Address
              </label>

              <div className="relative">
                <Mail
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Password
              </label>

              <div className="relative">
                <Lock
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type={
                    showPassword ? "text" : "password"
                  }
                  name="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-14 py-3.5 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>

              {/* Password Strength */}
              {formData.password && (
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      Password Strength
                    </span>

                    <span
                      className={`text-xs font-bold ${
                        strengthScore <= 2
                          ? "text-red-500"
                          : strengthScore <= 4
                          ? "text-yellow-500"
                          : "text-green-600"
                      }`}
                    >
                      {getStrengthText()}
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full ${getStrengthColor()} transition-all duration-300`}
                      style={{
                        width: `${(strengthScore / 5) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div
                      className={
                        passwordChecks.length
                          ? "text-green-600"
                          : "text-gray-400"
                      }
                    >
                      ✓ 8+ Characters
                    </div>

                    <div
                      className={
                        passwordChecks.upper
                          ? "text-green-600"
                          : "text-gray-400"
                      }
                    >
                      ✓ Uppercase
                    </div>

                    <div
                      className={
                        passwordChecks.lower
                          ? "text-green-600"
                          : "text-gray-400"
                      }
                    >
                      ✓ Lowercase
                    </div>

                    <div
                      className={
                        passwordChecks.number
                          ? "text-green-600"
                          : "text-gray-400"
                      }
                    >
                      ✓ Number
                    </div>

                    <div
                      className={
                        passwordChecks.special
                          ? "text-green-600"
                          : "text-gray-400"
                      }
                    >
                      ✓ Special Character
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Confirm Password
              </label>

              <div className="relative">
                <Lock
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-12 pr-14 py-3.5 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-white transition-all duration-300 shadow-lg ${
                busy
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-[1.02] hover:shadow-2xl"
              }`}
            >
              {busy ? (
                <>
                  <Loader2
                    size={20}
                    className="animate-spin"
                  />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center mt-7 text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-bold text-indigo-600 hover:text-indigo-700"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}