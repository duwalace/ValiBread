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

export interface ItensVencidos {
  totalVencidos: number;
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
  itensVencidos: ItensVencidos;
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
    staleTime: 0,             // dado nunca é considerado "fresco" — sempre refetch ao navegar
    refetchOnMount: 'always', // força refetch toda vez que o componente monta (volta ao Dashboard)
    refetchInterval: 60_000,  // polling de segurança a cada 1min (ex: outro usuário faz mudanças)
    retry: 2,
  });
};
