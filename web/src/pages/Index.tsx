import { useEffect, useState } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import FiltersSection from "@/components/dashboard/FiltersSection";
import StockOverviewCard from "@/components/dashboard/StockOverviewCard";
import ExpiryAlertCard from "@/components/dashboard/ExpiryAlertCard";
import MovementReportCard from "@/components/dashboard/MovementReportCard";
import InventoryTableCard from "@/components/dashboard/InventoryTableCard";
import CustomReportsCard from "@/components/dashboard/CustomReportsCard";

const Index = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString("pt-BR");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader />
      <FiltersSection />

      {/* Dashboard Grid */}
      <div className="px-6 py-4 space-y-4">
        {/* Linha 1: 2 cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StockOverviewCard />
          <ExpiryAlertCard />
        </div>

        {/* Linha 2: 3 cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
  );
};

export default Index;
