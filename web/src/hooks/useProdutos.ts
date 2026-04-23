import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Produto {
  id_produto: number;
  nome: string;
  descricao?: string;
  estoque_minimo: number;
}

/**
 * Hook React Query para listar produtos do banco.
 * Usado no dropdown de Categoria no FiltersSection.
 */
export const useProdutos = () => {
  return useQuery<Produto[]>({
    queryKey: ['produtos'],
    queryFn: async () => {
      const { data } = await api.get('/api/produto');
      return data;
    },
    staleTime: 5 * 60_000, // 5min de cache
    retry: 2,
  });
};
