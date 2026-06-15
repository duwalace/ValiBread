import supabase from '../config/supabase.js';

/**
 * Conta pacotes ativos em estoque: EM_ESTOQUE + SEPARADO.
 * Exclui EXPEDIDO (já saíram fisicamente).
 */
export const contarTotalPacotes = async () => {
  const { count, error } = await supabase
    .from('pacote')
    .select('*', { count: 'exact', head: true })
    .in('status', ['EM_ESTOQUE', 'SEPARADO']);

  if (error) throw new Error(`Erro ao contar pacotes ativos: ${error.message}`);
  return count;
};

/**
 * Conta pacotes com status 'SEPARADO' — separados na expedição,
 * aguardando saída física. Fonte do card "Para Entrega" no dashboard.
 */
export const contarPacotesParaEntrega = async () => {
  const { count, error } = await supabase
    .from('pacote')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'SEPARADO');

  if (error) throw new Error(`Erro ao contar pacotes separados: ${error.message}`);
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

/**
 * Busca o inventário ativo FEFO, mas recebendo o cliente Supabase com 
 * o token do usuário injetado, garantindo Isolamento de Tenant via RLS.
 */
export const buscarInventarioFEFOSecure = async (filtros = {}, tenantSupabase) => {
  let query = tenantSupabase
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

  if (filtros.categoria) query = query.ilike('lote.produto.nome', `%${filtros.categoria}%`);
  if (filtros.lote) query = query.ilike('lote.codigo_lote', `%${filtros.lote}%`);
  if (filtros.dataFabricacaoInicio) query = query.gte('lote.data_fabricacao', filtros.dataFabricacaoInicio);
  if (filtros.dataFabricacaoFim) query = query.lte('lote.data_fabricacao', filtros.dataFabricacaoFim);
  if (filtros.dataValidadeInicio) query = query.gte('lote.data_validade', filtros.dataValidadeInicio);
  if (filtros.dataValidadeFim) query = query.lte('lote.data_validade', filtros.dataValidadeFim);
  if (filtros.tagRfid) query = query.ilike('rfid_etiqueta.epc', `%${filtros.tagRfid}%`);

  const { data, error } = await query;

  if (error) throw new Error(`Erro ao buscar inventário FEFO seguro: ${error.message}`);
  return data;
};

/**
 * Busca as movimentações de estoque para relatórios personalizados.
 * Mantida por compatibilidade com testes existentes.
 */
export const buscarRelatorioMovimentacaoSecure = async (filtros = {}, _tenantSupabase) => {
  let query = supabase
    .from('movimentacao_estoque')
    .select(`
      id_movimentacao,
      tipo_movimentacao,
      data_hora,
      pacote (
        lote (
          codigo_lote,
          produto ( nome )
        )
      )
    `)
    .order('data_hora', { ascending: false });

  if (filtros.tipo && filtros.tipo !== 'TODOS') {
    query = query.eq('tipo_movimentacao', filtros.tipo);
  }

  if (filtros.dataInicio) {
    query = query.gte('data_hora', `${filtros.dataInicio}T00:00:00`);
  }

  if (filtros.dataFim) {
    query = query.lte('data_hora', `${filtros.dataFim}T23:59:59`);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Erro ao buscar relatório de movimentações: ${error.message}`);
  return data;
};

/**
 * Busca o relatório completo de movimentações + perdas para o painel do dashboard.
 *
 * Fontes de dados:
 *   - movimentacao_estoque: tipos 'Entrada', 'Saída', 'Transferência'
 *   - Perdas: pacotes cujo lote tem data_validade dentro do período informado
 *             (mesma lógica de "Itens Vencidos" do dashboard principal)
 *
 * Regras de inclusão por filtros.tipo:
 *   - 'TODOS' ou undefined: inclui movimentações E perdas
 *   - 'Perda':              inclui apenas pacotes vencidos no período
 *   - outro valor:          inclui apenas movimentações do tipo especificado
 */
export const buscarRelatorioCompleto = async (filtros = {}) => {
  const inicioISO = filtros.dataInicio ? `${filtros.dataInicio}T00:00:00` : null;
  const fimISO    = filtros.dataFim    ? `${filtros.dataFim}T23:59:59`    : null;

  const tipoEhPerda = filtros.tipo === 'Perda';
  const tipoEhTodos = !filtros.tipo || filtros.tipo === 'TODOS';

  const incluirMovimentacoes = tipoEhTodos || !tipoEhPerda;
  const incluirPerdas        = tipoEhTodos || tipoEhPerda;

  // 1. Movimentações (Entrada / Saída / Transferência)
  let movimentacoes = [];
  if (incluirMovimentacoes) {
    try {
      let q = supabase
        .from('movimentacao_estoque')
        .select(`
          id_movimentacao,
          tipo_movimentacao,
          data_hora,
          pacote (
            id_pacote,
            rfid_etiqueta ( epc, status ),
            lote ( codigo_lote, produto ( nome ) )
          )
        `)
        .order('data_hora', { ascending: false });

      if (!tipoEhTodos) {
        q = q.eq('tipo_movimentacao', filtros.tipo);
      }
      if (inicioISO) q = q.gte('data_hora', inicioISO);
      if (fimISO)    q = q.lte('data_hora', fimISO);

      const { data, error } = await q;
      if (error) {
        console.error('[buscarRelatorioCompleto] Erro em movimentacao_estoque:', error.message);
      } else {
        movimentacoes = data || [];
      }
    } catch (e) {
      console.error('[buscarRelatorioCompleto] Excecao em movimentacoes:', e.message);
    }
  }

  // 2. Perdas = pacotes cujos lotes venceram dentro do período selecionado
  //    Fonte: mesma lógica do gráfico "Itens Vencidos" do dashboard principal.
  let perdas = [];
  if (incluirPerdas) {
    try {
      // Busca lotes vencidos (data_validade <= dataFim informado)
      // e cujo vencimento ocorreu após o início do período
      let q = supabase
        .from('lote')
        .select(`
          id_lote,
          codigo_lote,
          data_validade,
          produto ( nome ),
          pacote ( id_pacote )
        `);

      // Considera lotes vencidos dentro do período
      if (inicioISO) q = q.gte('data_validade', filtros.dataInicio);
      if (fimISO)    q = q.lte('data_validade', filtros.dataFim);

      const { data, error } = await q;
      if (error) {
        console.error('[buscarRelatorioCompleto] Erro em lote (perdas):', error.message);
      } else {
        // Normaliza cada pacote como uma "movimentação" do tipo Perda
        for (const lote of (data || [])) {
          const dataPerda = `${lote.data_validade}T00:00:00`;
          for (const pacote of (lote.pacote || [])) {
            perdas.push({
              id_movimentacao: `perda-${lote.id_lote}-${pacote.id_pacote}`,
              tipo_movimentacao: 'Perda',
              data_hora: dataPerda,
              pacote: {
                id_pacote: pacote.id_pacote,
                lote: {
                  codigo_lote: lote.codigo_lote,
                  produto: lote.produto ?? null,
                },
              },
            });
          }
        }
      }
    } catch (e) {
      console.error('[buscarRelatorioCompleto] Excecao em perdas:', e.message);
    }
  }

  // 3. Mescla e ordena desc por data_hora
  return [...movimentacoes, ...perdas].sort(
    (a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
  );
};
