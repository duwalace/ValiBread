import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RoleBasedRender } from "@/components/RoleBasedRender";
import { LayoutDashboard, Package, Users, MessageSquare, FileText, Settings, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminLayout() {
  const { user, role, toggleMockUser } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-sans">
      {/* Sidebar - Same background as canvas, subtle right border */}
      <aside className="w-64 border-r border-border flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="text-lg font-bold tracking-tight text-primary">ValiBread</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <Link
            to="/admin"
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive("/admin")
                ? "bg-secondary text-secondary-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>

          <Link
            to="/admin/estoque"
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive("/admin/estoque")
                ? "bg-secondary text-secondary-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
          >
            <Package className="w-4 h-4" />
            Gestão de Estoque
          </Link>

          <RoleBasedRender allowedRoles={["Admin"]}>
            <Link
              to="/admin/usuarios"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive("/admin/usuarios")
                  ? "bg-secondary text-secondary-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" />
              Gestão de Usuários
            </Link>
          </RoleBasedRender>

          <Link
            to="/admin/documentos"
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive("/admin/documentos")
                ? "bg-secondary text-secondary-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            Documentos
          </Link>
        </nav>

        <div className="p-4 border-t border-border">
          <Link
            to="#"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configurações
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-background">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-medium text-muted-foreground">Admin Panel</h1>
          </div>

          <div className="flex items-center gap-6">


            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium leading-none">{user?.name}</span>
                <span className="text-xs text-muted-foreground mt-1">{role}</span>
              </div>
              <UserCircle className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
