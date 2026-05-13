import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../ui/primitives";

/**
 * Wraps routes that require authentication.
 *
 * - While Firebase resolves the session: shows spinner (no flash to /login)
 * - If unauthenticated: redirects to /login, preserving intended destination
 * - If role not allowed: redirects to /unauthorized
 */
export function ProtectedRoute({ children, allowedRoles }) {
  const { status, userProfile } = useAuth();
  const location = useLocation();

  // Firebase is still resolving the persisted session — show nothing yet.
  // This is the key fix for the "logout on refresh" symptom: we wait
  // for the auth state to resolve before making any routing decision.
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Spinner label="Restoring session…" />
      </div>
    );
  }

  if (status === "guest" || !userProfile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}