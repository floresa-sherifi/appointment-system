import { useAuth } from "../context/useAuth";
import { Navigate } from "react-router-dom";
import { getDefaultRouteForUser, getUserRole } from "../utils/roles";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" />;

  if (allowedRoles?.length && !allowedRoles.includes(getUserRole(user))) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  return children;
}
