import api from './api';

// --- Typings ---
export interface DashboardData {
  visaoGeral: {
    totalItens: number;
    marcadosEntrega: number;
  };
  alertaValidade: {
    totalCriticos: number;
    grupos: { nome: string; quantidade: number; cor: string }[];
  };
  movimentacaoMes: { nome: string; entradas: number; saidas: number }[];
  inventarioAtivoFEFO: any[];
  alertasRecentes: any[];
  totalAlertasAtivos: number;
}

export interface Produto {
  id_produto: number;
  nome: string;
  estoque_minimo: number;
}

export interface Lote {
  id_lote: number;
  codigo_lote: string;
  data_fabricacao?: string;
  data_validade?: string;
  status: string;
  id_produto: number;
  produto?: {
    nome: string;
    estoque_minimo: number;
  };
}

export type PacoteStatus = 'EM_ESTOQUE' | 'SEPARADO' | 'EXPEDIDO';

export interface Pacote {
  id_pacote: number;
  status: PacoteStatus;
  lote?: {
    id_lote: number;
    codigo_lote: string;
    data_validade?: string;
    status?: string;
    produto?: { nome: string };
  };
  rfid_etiqueta?: {
    id_rfid: number;
    epc: string;
    status: string;
    data_associacao: string;
  } | null;
}

export interface Usuario {
  id_usuario: number;
  nome: string;
  email: string;
  id_perfil: number;
}

// --- Dashboard Services ---
export const fetchDashboardData = async (): Promise<DashboardData> => {
  const response = await api.get('/api/dashboard');
  return response.data;
};

// --- Lote Services ---
export const fetchLotes = async (): Promise<Lote[]> => {
  const response = await api.get('/api/lote');
  return response.data;
};

export const createLote = async (dados: Partial<Lote>): Promise<Lote> => {
  const response = await api.post('/api/lote', dados);
  return response.data;
};

export const updateLote = async ({ id, dados }: { id: number; dados: Partial<Lote> }): Promise<Lote> => {
  const response = await api.put(`/api/lote/${id}`, dados);
  return response.data;
};

export const deleteLote = async (id: number): Promise<void> => {
  await api.delete(`/api/lote/${id}`);
};

// --- Pacote Services (Status real de estoque: EM_ESTOQUE | SEPARADO | EXPEDIDO) ---
export const fetchPacotes = async (): Promise<Pacote[]> => {
  const response = await api.get('/api/pacote');
  return response.data;
};

export const createPacote = async (dados: { id_lote: number }): Promise<Pacote> => {
  const response = await api.post('/api/pacote', dados);
  return response.data;
};

export const updatePacoteStatus = async ({ id, status }: { id: number; status: PacoteStatus }): Promise<Pacote> => {
  const response = await api.patch(`/api/pacote/${id}/status`, { status });
  return response.data;
};

export const deletePacote = async (id: number): Promise<void> => {
  await api.delete(`/api/pacote/${id}`);
};

// --- Produto Services (Para selects) ---
export const fetchProdutos = async (): Promise<Produto[]> => {
  const response = await api.get('/api/produto');
  return response.data;
};

// --- Usuario Services ---
export const fetchUsuarios = async (): Promise<Usuario[]> => {
  const response = await api.get('/api/usuario');
  return response.data;
};

export const createUsuario = async (dados: any): Promise<Usuario> => {
  const response = await api.post('/api/usuario', dados);
  return response.data;
};

export const updateUsuario = async ({ id, dados }: { id: number; dados: any }): Promise<Usuario> => {
  const response = await api.put(`/api/usuario/${id}`, dados);
  return response.data;
};

export const deleteUsuario = async (id: number): Promise<void> => {
  await api.delete(`/api/usuario/${id}`);
};
