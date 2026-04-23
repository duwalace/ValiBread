import supabase from '../config/supabase.js';

/**
 * Conta o total de pacotes no estoque (cada pacote = 1 item rastreável).
 */
export const contarTotalPacotes = async () => {
  const { count, error } = await supabase
    .from('pacote')
    .select('*', { count: 'exact', head: true });

  if (error) throw new Error(`Erro ao contar pacotes: ${error.message}`);
  return count;
};

/**
 * Conta pacotes cujo lote tem status = 'entrega'.
 */
export const contarPacotesParaEntrega = async () => {
  const { count, error } = await supabase
    .from('pacote')
    .select('*, lote!inner(status)', { count: 'exact', head: true })
    .eq('lote.status', 'entrega');

  if (error) throw new Error(`Erro ao contar pacotes para entrega: ${error.message}`);
  return count;
};

/**
 * Busca lotes com data_validade dentro dos próximos N dias a partir de hoje.
 * Retorna cada lote com a contagem de pacotes vinculados.
 */
export const buscarLotesProximosVencimento = async (dias = 7) => {
  const hoje = new Date();
  const limite = new Date();
  limite.setDate(hoje.getDate() + dias);

  const hojeISO = hoje.toISOString().split('T')[0];
  const limiteISO = limite.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('lote')
    .select('id_lote, codigo_lote, data_validade, produto ( nome ), pacote ( id_pacote )')
    .gte('data_validade', hojeISO)
    .lte('data_validade', limiteISO);

  if (error) throw new Error(`Erro ao buscar lotes próximos ao vencimento: ${error.message}`);
  return data;
};

/**
 * Busca todas as movimentações do mês atual.
 */
export const buscarMovimentacoesMesAtual = async () => {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioMesISO = inicioMes.toISOString();

  const { data, error } = await supabase
    .from('movimentacao_estoque')
    .select('id_movimentacao, tipo_movimentacao, data_hora')
    .gte('data_hora', inicioMesISO)
    .order('data_hora', { ascending: true });

  if (error) throw new Error(`Erro ao buscar movimentações: ${error.message}`);
  return data;
};

/**
 * Busca o inventário ativo (pacotes com lote válido), ordenado por
 * data_validade ASC (FEFO). Suporta filtros opcionais.
 */
export const buscarInventarioFEFO = async (filtros = {}) => {
  let query = supabase
    .from('pacote')
    .select(`
      id_pacote,
      lote!inner (
        id_lote,
        codigo_lote,
        data_fabricacao,
        data_validade,
        status,
        produto!inner ( id_produto, nome )
      ),
      rfid_etiqueta ( epc, status )
    `)
    .order('data_validade', { referencedTable: 'lote', ascending: true });

  // Filtros opcionais
  if (filtros.categoria) {
    query = query.ilike('lote.produto.nome', `%${filtros.categoria}%`);
  }

  if (filtros.lote) {
    query = query.ilike('lote.codigo_lote', `%${filtros.lote}%`);
  }

  if (filtros.dataFabricacaoInicio) {
    query = query.gte('lote.data_fabricacao', filtros.dataFabricacaoInicio);
  }

  if (filtros.dataFabricacaoFim) {
    query = query.lte('lote.data_fabricacao', filtros.dataFabricacaoFim);
  }

  if (filtros.dataValidadeInicio) {
    query = query.gte('lote.data_validade', filtros.dataValidadeInicio);
  }

  if (filtros.dataValidadeFim) {
    query = query.lte('lote.data_validade', filtros.dataValidadeFim);
  }

  if (filtros.tagRfid) {
    query = query.ilike('rfid_etiqueta.epc', `%${filtros.tagRfid}%`);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Erro ao buscar inventário FEFO: ${error.message}`);
  return data;
};
