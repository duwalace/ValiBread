import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Perfil {
  id_perfil: number;
  nome: string;
  descricao?: string;
}

/**
 * Busca a lista de perfis do backend para popular dropdowns.
 * Não requer autenticação JWT (rota pública).
 */
export const usePerfis = () => {
  return useQuery<Perfil[]>({
    queryKey: ['perfis'],
    queryFn: async () => {
      const { data } = await api.get('/api/perfil');
      return data;
    },
    staleTime: 5 * 60_000, // Perfis raramente mudam — cache de 5min
    retry: 2,
  });
};
