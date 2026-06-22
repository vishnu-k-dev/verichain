import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { PageSpinner } from "./LoadingSpinner.jsx";

/**
 * Guards routes that require auth (and optionally a specific role set).
 * @param {{ children: React.ReactNode, roles?: string[] }} props
 */
export default function ProtectedRoute({ children, roles }) {
  const { status, isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (status === "loading") return <PageSpinner label="Restoring session…" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
