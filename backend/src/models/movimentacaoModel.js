import supabase from '../config/supabase.js';

const TIPOS_VALIDOS = ['Entrada', 'Saída', 'Transferência'];

// ── SELECT completo reutilizável ──────────────────────────────────
const SELECT_MOVIMENTACAO = `
  id_movimentacao,
  tipo_movimentacao,
  data_hora,
  id_pacote,
  id_usuario,
  id_leitor,
  pacote (
    id_pacote,
    status,
    lote (
      id_lote,
      codigo_lote,
      id_produto,
      produto ( id_produto, nome )
    )
  ),
  usuario ( nome, email ),
  leitor_rfid ( codigo_equipamento, localizacao )
`;

/**
 * Lista movimentações com filtros opcionais.
 * @param {object} filtros - { tipo, data_inicio, data_fim, id_produto, id_pacote }
 */
export const listarMovimentacoes = async (filtros = {}) => {
  let query = supabase
    .from('movimentacao_estoque')
    .select(SELECT_MOVIMENTACAO)
    .order('data_hora', { ascending: false });

  if (filtros.tipo) {
    query = query.eq('tipo_movimentacao', filtros.tipo);
  }
  if (filtros.data_inicio) {
    query = query.gte('data_hora', `${filtros.data_inicio}T00:00:00`);
  }
  if (filtros.data_fim) {
    query = query.lte('data_hora', `${filtros.data_fim}T23:59:59`);
  }
  if (filtros.id_pacote) {
    query = query.eq('id_pacote', Number(filtros.id_pacote));
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar movimentações: ${error.message}`);

  // Filtro por id_produto é feito em memória pois o Supabase não suporta
  // filtros em colunas de tabelas relacionadas via query params diretamente
  if (filtros.id_produto) {
    const idProduto = Number(filtros.id_produto);
    return data.filter(m => m.pacote?.lote?.id_produto === idProduto);
  }

  return data;
};

/**
 * Lista todo o histórico de movimentações de um pacote específico.
 * @param {number} id_pacote
 */
export const listarMovimentacoesPorPacote = async (id_pacote) => {
  const { data, error } = await supabase
    .from('movimentacao_estoque')
    .select(SELECT_MOVIMENTACAO)
    .eq('id_pacote', Number(id_pacote))
    .order('data_hora', { ascending: false });

  if (error) throw new Error(`Erro ao buscar histórico do pacote: ${error.message}`);
  return data;
};

/**
 * Registra uma nova movimentação manual.
 * @param {object} dados - { tipo_movimentacao, id_pacote, observacao, id_usuario }
 */
export const registrarMovimentacao = async ({ tipo_movimentacao, id_pacote, observacao, id_usuario }) => {
  if (!TIPOS_VALIDOS.includes(tipo_movimentacao)) {
    throw new Error(`Tipo de movimentação inválido. Use: ${TIPOS_VALIDOS.join(', ')}`);
  }

  const payload = {
    tipo_movimentacao,
    id_pacote: Number(id_pacote),
    id_usuario: id_usuario ? Number(id_usuario) : null,
  };

  const { data, error } = await supabase
    .from('movimentacao_estoque')
    .insert([payload])
    .select(SELECT_MOVIMENTACAO)
    .single();

  if (error) throw new Error(`Erro ao registrar movimentação: ${error.message}`);
  return data;
};
