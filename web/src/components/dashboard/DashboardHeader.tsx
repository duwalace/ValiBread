import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const DashboardHeader = () => {
  const navigate = useNavigate();

  // Lê dados do usuário salvo no localStorage durante o login
  const usuarioRaw = localStorage.getItem("usuario");
  const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null;
  const nomeUsuario = usuario?.nome ?? "Usuário";
  const iniciais = nomeUsuario
    .split(" ")
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase() ?? "")
    .join("");

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
        <div className="relative">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
            1
          </span>
        </div>

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
