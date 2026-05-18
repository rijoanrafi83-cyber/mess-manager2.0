import { Link } from "react-router-dom";
import { ArrowLeft, ShieldOff } from "lucide-react";
import { motion } from "framer-motion";

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen theme-app flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md text-center"
      >
        <div className="theme-card theme-gradient-border rounded-[2rem] border p-8 shadow-2xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
            <ShieldOff size={28} className="text-red-500" />
          </div>

          <h1 className="text-2xl font-black theme-text">
            Access Denied
          </h1>

          <p className="mt-3 text-sm leading-6 theme-muted-text">
            Your current role does not have permission to view this page.
            Contact your workspace administrator if you believe this is an error.
          </p>

          <div className="mt-8 grid gap-3">
            <Link
              to="/dashboard"
              className="flex items-center justify-center gap-2 rounded-2xl theme-accent-bg px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-[color-mix(in_srgb,var(--accent)_22%,transparent)] transition hover:brightness-110"
            >
              Go to Dashboard
            </Link>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 rounded-2xl border theme-muted px-4 py-3 text-sm font-bold theme-text transition hover:bg-[var(--bg-card)]"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
