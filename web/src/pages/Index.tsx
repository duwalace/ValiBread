import { useEffect, useState } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import FiltersSection from "@/components/dashboard/FiltersSection";
import StockOverviewCard from "@/components/dashboard/StockOverviewCard";
import ExpiryAlertCard from "@/components/dashboard/ExpiryAlertCard";
import MovementReportCard from "@/components/dashboard/MovementReportCard";
import InventoryTableCard from "@/components/dashboard/InventoryTableCard";
import CustomReportsCard from "@/components/dashboard/CustomReportsCard";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { MessageCircle } from "lucide-react";

import { ChatbotWindow } from "@/components/chat/ChatbotWindow";
import { ExpiryPopup } from "@/components/dashboard/ExpiryPopup";
import { useExpiryAlerts } from "@/hooks/useExpiryAlerts";

const Index = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { alertas, showPopup, closePopup } = useExpiryAlerts();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString("pt-BR");

  return (
    <DashboardProvider>
      <div className="min-h-screen bg-background text-foreground">
        <DashboardHeader 
          alertas={alertas} 
          isNotificationsOpen={isNotificationsOpen}
          setIsNotificationsOpen={setIsNotificationsOpen}
        />
        <FiltersSection />

        {/* Bento Grid Layout - Foco no FEFO e fluxo orgânico */}
        <div className="px-6 py-8 max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-min">
            
            {/* Bloco 1: Alertas de Validade (ASSINATURA VISUAL) - Maior destaque */}
            <div className="lg:col-span-8 lg:row-span-2 flex flex-col">
              <div className="h-full w-full">
                <ExpiryAlertCard />
              </div>
            </div>

            {/* Bloco 2: Visão Geral - Acesso rápido a números */}
            <div className="lg:col-span-4 lg:row-span-1 flex flex-col">
              <div className="h-full w-full">
                <StockOverviewCard />
              </div>
            </div>

            {/* Bloco 3: Movimentações - Fluxo */}
            <div className="lg:col-span-4 lg:row-span-1 flex flex-col">
              <div className="h-full w-full">
                <MovementReportCard />
              </div>
            </div>

            {/* Bloco 4: Inventário Ativo - Tabela detalhada larga */}
            <div className="lg:col-span-8 lg:row-span-2 flex flex-col">
              <div className="h-full w-full">
                <InventoryTableCard />
              </div>
            </div>

            {/* Bloco 5: Relatórios Personalizados - Utilitário vertical */}
            <div className="lg:col-span-4 lg:row-span-2 flex flex-col">
              <div className="h-full w-full">
                <CustomReportsCard />
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border">
          © 3IRMÃOS Sistema de gestão de estoque, Time: {formattedTime}
        </footer>
      </div>

      {/* Correção 2: Chat FAB — fixo no canto inferior direito */}
      <button
        id="btn-chat-fab"
        aria-label="Abrir assistente de chat"
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary shadow-xl flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all duration-150 cursor-pointer"
      >
        <MessageCircle className="w-7 h-7 text-primary-foreground" />
      </button>

      <ChatbotWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      <ExpiryPopup 
        isOpen={showPopup} 
        onClose={closePopup} 
        alertas={alertas} 
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />
    </DashboardProvider>


  );
};

export default Index;
