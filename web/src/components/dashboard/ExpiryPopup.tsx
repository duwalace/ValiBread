import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Alerta } from "@/hooks/useExpiryAlerts";

interface ExpiryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  alertas: Alerta[];
  onOpenNotifications: () => void;
}

export function ExpiryPopup({ isOpen, onClose, alertas, onOpenNotifications }: ExpiryPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-destructive/20 shadow-2xl shadow-destructive/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            ⚠️ Produtos próximos ao vencimento
          </DialogTitle>
          <DialogDescription className="text-foreground">
            Atenção! Identificamos {alertas.length} produto(s) com vencimento para os próximos 7 dias.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] w-full rounded-md border p-4 bg-muted/30">
          <div className="flex flex-col gap-3">
            {alertas.map((alerta) => {
              // Extrai dias restantes da mensagem: "O lote XYZ de Pao vence em 3 dia(s)."
              const diasMatch = alerta.mensagem.match(/vence em (\d+) dia/);
              const dias = diasMatch ? parseInt(diasMatch[1], 10) : 7;
              
              const colorClass = dias <= 3 ? 'text-destructive font-bold' : 'text-amber-500 font-semibold';
              const bgColor = dias <= 3 ? 'bg-destructive/10' : 'bg-amber-500/10';

              return (
                <div key={alerta.id_alerta} className={`flex items-start gap-3 p-3 rounded-lg border ${bgColor} border-border/50`}>
                  <Clock className={`w-5 h-5 mt-0.5 ${colorClass}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{alerta.mensagem}</p>
                    <p className={`text-xs mt-1 ${colorClass}`}>Faltam {dias} dia(s)</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="sm:justify-between mt-4">
          <Button variant="outline" onClick={onClose} className="hover:bg-secondary">
            Fechar
          </Button>
          <Button 
            variant="default" 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              onClose();
              onOpenNotifications();
            }}
          >
            Ir para Notificações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
