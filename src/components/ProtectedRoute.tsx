import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { session, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Carregando...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
};
