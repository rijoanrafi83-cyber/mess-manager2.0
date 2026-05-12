// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Spinner } from "./UI";

/**
 * Wraps a route that requires authentication.
 * allowedRoles: array of allowed roles e.g. ["admin"] or ["admin","member"]
 */
export default function ProtectedRoute({ children, allowedRoles = ["admin", "member"] }) {
  const { currentUser, userProfile, authLoading, profileLoading } = useAuth();

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Spinner label="Authenticating…" />
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;

  if (userProfile && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}