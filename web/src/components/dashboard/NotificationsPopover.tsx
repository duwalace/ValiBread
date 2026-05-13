import { Bell, AlertTriangle, Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Alerta } from "@/hooks/useExpiryAlerts";

interface NotificationsPopoverProps {
  alertas: Alerta[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsPopover({ alertas, isOpen, onOpenChange }: NotificationsPopoverProps) {
  const unreadCount = alertas.length;

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-secondary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center animate-in zoom-in">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-[380px] p-0 shadow-xl border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm">Notificações</h3>
          <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
            {unreadCount} nova(s)
          </span>
        </div>

        <ScrollArea className="h-[350px]">
          {alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Bell className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">Nenhuma notificação nova hoje.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {alertas.map((alerta) => {
                const diasMatch = alerta.mensagem.match(/vence em (\d+) dia/);
                const dias = diasMatch ? parseInt(diasMatch[1], 10) : 7;
                
                const isCritical = dias <= 3;
                
                return (
                  <div 
                    key={alerta.id_alerta} 
                    className="flex gap-3 p-4 border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCritical ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-500'}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm text-foreground leading-snug">
                        {alerta.mensagem}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <Clock className="w-3 h-3" />
                        <span className={isCritical ? "text-destructive font-bold" : "text-amber-500"}>
                          Restam {dias} dia(s)
                        </span>
                        <span>•</span>
                        <span>{new Date(alerta.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t border-border bg-muted/10 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            ValiBread Alertas Automáticos
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
