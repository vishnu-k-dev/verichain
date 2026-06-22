import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { PageSpinner } from "./LoadingSpinner.jsx";

/** Routes only for unauthenticated users (login/register). */
export default function GuestRoute({ children }) {
  const { status, isAuthenticated } = useAuth();
  if (status === "loading") return <PageSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}
