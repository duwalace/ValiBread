import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth, Role } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role } = useAuth();

  if (!user) {
    // If not logged in, redirect to login (in our mock, there's always a user, but good practice)
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    // Se o usuário não tiver permissão, redireciona para o dashboard global (única área acessível para todos)
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
