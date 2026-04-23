import { createContext, useContext, useState, type ReactNode } from "react";
import type { FiltrosDashboard } from "@/hooks/useDashboard";

interface DashboardContextValue {
  filtros: FiltrosDashboard;
  setFiltros: (f: FiltrosDashboard) => void;
}

const DashboardContext = createContext<DashboardContextValue>({
  filtros: {},
  setFiltros: () => {},
});

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [filtros, setFiltros] = useState<FiltrosDashboard>({});
  return (
    <DashboardContext.Provider value={{ filtros, setFiltros }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboardContext = () => useContext(DashboardContext);
