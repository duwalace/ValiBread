import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Tipos ──────────────────────────────────────────────────────
export interface GrupoValidade {
  nome: string;
  quantidade: number;
  cor: string;
}

export interface AlertaValidade {
  totalCriticos: number;
  grupos: GrupoValidade[];
}

export interface MovimentacaoSemana {
  nome: string;
  entradas: number;
  saidas: number;
}

export interface ItemInventario {
  tagRfid: string;
  nome: string;
  lote: string;
  dataFabricacao: string;
  dataValidade: string;
  diasRestantes: number | null;
  status: string;
  critico: boolean;
  highlight: boolean;
}

export interface AlertaRecente {
  id_alerta: number;
  tipo_alerta: string;
  mensagem: string;
  data_hora: string;
}

export interface DashboardData {
  visaoGeral: {
    totalItens: number;
    marcadosEntrega: number;
  };
  alertaValidade: AlertaValidade;
  movimentacaoMes: MovimentacaoSemana[];
  inventarioAtivoFEFO: ItemInventario[];
  alertasRecentes: AlertaRecente[];
  totalAlertasAtivos: number;
}

export interface FiltrosDashboard {
  categoria?: string;
  lote?: string;
  dataFabricacaoInicio?: string;
  dataFabricacaoFim?: string;
  dataValidadeInicio?: string;
  dataValidadeFim?: string;
  tagRfid?: string;
}

// ── Hook ───────────────────────────────────────────────────────
export const useDashboard = (filtros: FiltrosDashboard = {}) => {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', filtros],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filtros).filter(([, v]) => v !== undefined && v !== '')
      );
      const { data } = await api.get('/api/dashboard', { params });
      return data;
    },
    staleTime: 30_000, // 30s antes de revalidar
    refetchInterval: 60_000, // atualiza a cada 1min
    retry: 2,
  });
};
