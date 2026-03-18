import { Bell, LogOut, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const DashboardHeader = () => {
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
        {/* Chat bot icon */}
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-primary-foreground" />
        </div>

        {/* Avatar + nome */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-sm font-medium text-foreground">MS</span>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Bem-vinda,</p>
            <p className="font-medium text-foreground">Maria Silva</p>
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
        <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-secondary">
          <LogOut className="w-4 h-4 mr-1" />
          Sair
        </Button>
      </div>
    </header>
  );
};

export default DashboardHeader;
