import React from "react";
import { useAuth, Role } from "@/contexts/AuthContext";

interface RoleBasedRenderProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  fallback?: React.ReactNode;
}

export function RoleBasedRender({ children, allowedRoles, fallback = null }: RoleBasedRenderProps) {
  const { role } = useAuth();

  if (role && allowedRoles.includes(role)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
