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

const Index = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString("pt-BR");

  return (
    <DashboardProvider>
      <div className="min-h-screen bg-background text-foreground">
        <DashboardHeader />
        <FiltersSection />

        {/* Mudança 6: Grid dos cards */}
        <div className="px-6 py-4 space-y-4">

          {/* LINHA 1: 50% | 50% */}
          <div className="grid grid-cols-2 gap-4">
            <StockOverviewCard />
            <ExpiryAlertCard />
          </div>

          {/* LINHA 2: 35% | 40% | 25% */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "35fr 40fr 25fr" }}>
            <MovementReportCard />
            <InventoryTableCard />
            <CustomReportsCard />
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
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary shadow-xl flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all duration-150 cursor-pointer"
      >
        <MessageCircle className="w-7 h-7 text-primary-foreground" />
      </button>
    </DashboardProvider>


  );
};

export default Index;
