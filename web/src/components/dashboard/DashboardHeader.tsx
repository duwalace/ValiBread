import { LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationsPopover } from "./NotificationsPopover";
import type { Alerta } from "@/hooks/useExpiryAlerts";

interface DashboardHeaderProps {
  alertas?: Alerta[];
  isNotificationsOpen?: boolean;
  setIsNotificationsOpen?: (open: boolean) => void;
}

const DashboardHeader = ({ 
  alertas = [], 
  isNotificationsOpen = false, 
  setIsNotificationsOpen = () => {} 
}: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { user, role } = useAuth(); // Single source of truth para estado e permissão

  const nomeUsuario = user?.name ?? "Usuário";
  const iniciais = nomeUsuario
    .split(" ")
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase() ?? "")
    .join("");

  const isAdmin = role === "Admin";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border">
      {/* Logo e título */}
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-extrabold italic tracking-tight text-foreground">
          3IRMÃOS
        </h1>
        <span className="text-xl font-semibold text-foreground">
          Sistema de Gestão de Estoque
        </span>
      </div>

      {/* Lado direito */}
      <div className="flex items-center gap-4">
        
        {/* Botão para Dashboard Admin (Só aparece se for Admin) */}
        {isAdmin && (
          <Link to="/admin">
            <Button variant="outline" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 border-transparent mr-2">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Painel Admin
            </Button>
          </Link>
        )}

        {/* Avatar + nome */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-sm font-medium text-foreground">{iniciais}</span>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Bem-vindo(a),</p>
            <p className="font-medium text-foreground">{nomeUsuario}</p>
          </div>
        </div>

        {/* Notificação */}
        <NotificationsPopover 
          alertas={alertas} 
          isOpen={isNotificationsOpen} 
          onOpenChange={setIsNotificationsOpen} 
        />

        {/* Sair */}
        <Button
          id="btn-logout"
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="border-border text-foreground hover:bg-secondary"
        >
          <LogOut className="w-4 h-4 mr-1" />
          Sair
        </Button>
      </div>
    </header>
  );
};

export default DashboardHeader;
