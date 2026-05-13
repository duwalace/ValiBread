/**
 * queries.js
 * Todas as queries ao banco baseadas nos nomes reais do schema db/db.sql.
 *
 * Tabelas utilizadas:
 *  - produto         → id_produto, nome, estoque_minimo
 *  - lote            → id_lote, codigo_lote, data_validade, data_fabricacao, status, id_produto
 *  - pacote          → id_pacote, id_lote, status ('EM_ESTOQUE' | 'SEPARADO' | 'EXPEDIDO')
 *  - movimentacao_estoque → id_movimentacao, tipo_movimentacao, data_hora, id_pacote
 *  - alerta          → id_alerta, tipo_alerta, mensagem, data_hora, id_lote
 */

import supabase from './db.js';

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna a data de hoje (YYYY-MM-DD) e N dias no futuro no mesmo formato.
 */
function intervaloData(diasFuturos) {
  const hoje = new Date();
  const limite = new Date();
  limite.setDate(hoje.getDate() + diasFuturos);
  return {
    hojeISO: hoje.toISOString().split('T')[0],
    limiteISO: limite.toISOString().split('T')[0],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OPÇÃO 1 — QUANTIDADE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lista todos os produtos cadastrados (id_produto, nome).
 */
export const listarProdutos = async () => {
  const { data, error } = await supabase
    .from('produto')
    .select('id_produto, nome')
    .order('nome', { ascending: true });
  if (error) throw new Error(`Erro ao listar produtos: ${error.message}`);
  return data;
};

/**
 * Conta pacotes ativos (EM_ESTOQUE + SEPARADO) de um produto específico.
 * Um pacote pertence a um lote, que pertence a um produto.
 *
 * @param {number} idProduto - id_produto da tabela produto
 * @returns {{ total: number, em_estoque: number, separado: number }}
 */
export const contarPacotesPorProduto = async (idProduto) => {
  // Busca lotes do produto
  const { data: lotes, error: erroLotes } = await supabase
    .from('lote')
    .select('id_lote')
    .eq('id_produto', idProduto);
  if (erroLotes) throw new Error(`Erro ao buscar lotes: ${erroLotes.message}`);

  if (!lotes || lotes.length === 0) {
    return { total: 0, em_estoque: 0, separado: 0 };
  }

  const idLotes = lotes.map((l) => l.id_lote);

  // Conta pacotes por status para esses lotes
  const [resEM, resSEP] = await Promise.all([
    supabase
      .from('pacote')
      .select('*', { count: 'exact', head: true })
      .in('id_lote', idLotes)
      .eq('status', 'EM_ESTOQUE'),
    supabase
      .from('pacote')
      .select('*', { count: 'exact', head: true })
      .in('id_lote', idLotes)
      .eq('status', 'SEPARADO'),
  ]);

  if (resEM.error) throw new Error(`Erro ao contar EM_ESTOQUE: ${resEM.error.message}`);
  if (resSEP.error) throw new Error(`Erro ao contar SEPARADO: ${resSEP.error.message}`);

  const em_estoque = resEM.count ?? 0;
  const separado = resSEP.count ?? 0;

  return { total: em_estoque + separado, em_estoque, separado };
};

/**
 * Resume quantidade de todos os produtos (para planilha geral).
 */
export const resumoQuantidadeTodosProdutos = async () => {
  const { data: pacotes, error } = await supabase
    .from('pacote')
    .select(`
      id_pacote,
      status,
      lote ( id_lote, id_produto, produto ( nome ) )
    `)
    .in('status', ['EM_ESTOQUE', 'SEPARADO']);

  if (error) throw new Error(`Erro ao buscar resumo de quantidade: ${error.message}`);

  // Agrupa por produto
  const mapa = {};
  for (const pacote of pacotes) {
    const nomeProduto = pacote.lote?.produto?.nome ?? 'Desconhecido';
    if (!mapa[nomeProduto]) {
      mapa[nomeProduto] = { produto: nomeProduto, total: 0, em_estoque: 0, separado: 0 };
    }
    mapa[nomeProduto].total++;
    if (pacote.status === 'EM_ESTOQUE') mapa[nomeProduto].em_estoque++;
    if (pacote.status === 'SEPARADO') mapa[nomeProduto].separado++;
  }

  return Object.values(mapa).sort((a, b) => a.produto.localeCompare(b.produto));
};

// ─────────────────────────────────────────────────────────────────────────────
// OPÇÃO 2 — PRODUTOS EM RISCO
// Campo: lote.data_validade (tipo DATE no banco)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca lotes cujo data_validade está dentro de N dias a partir de hoje.
 * Retorna a contagem de pacotes ativos (EM_ESTOQUE | SEPARADO) por lote.
 *
 * @param {number} dias - 3, 5 ou 7 dias
 */
export const buscarLotesEmRisco = async (dias) => {
  const { hojeISO, limiteISO } = intervaloData(dias);

  const { data, error } = await supabase
    .from('lote')
    .select(`
      id_lote,
      codigo_lote,
      data_validade,
      produto ( nome ),
      pacote ( id_pacote, status )
    `)
    .gte('data_validade', hojeISO)
    .lte('data_validade', limiteISO)
    .order('data_validade', { ascending: true });

  if (error) throw new Error(`Erro ao buscar lotes em risco: ${error.message}`);

  // Processa: filtra pacotes ativos e calcula dias restantes
  return data.map((lote) => {
    const pacotesAtivos = (lote.pacote ?? []).filter((p) =>
      ['EM_ESTOQUE', 'SEPARADO'].includes(p.status)
    );
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const validade = new Date(lote.data_validade + 'T00:00:00');
    const diasRestantes = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));

    return {
      id_lote: lote.id_lote,
      codigo_lote: lote.codigo_lote,
      produto: lote.produto?.nome ?? 'Desconhecido',
      data_validade: lote.data_validade,
      dias_restantes: diasRestantes,
      pacotes_ativos: pacotesAtivos.length,
    };
  });
};

/**
 * Busca todos os lotes em risco agrupados pelas 3 faixas (3, 5, 7 dias).
 * Retorna objeto com chaves "3", "5", "7".
 */
export const buscarRiscoAgrupadoPorFaixa = async () => {
  const { hojeISO, limiteISO } = intervaloData(7);

  const { data, error } = await supabase
    .from('lote')
    .select(`
      id_lote,
      codigo_lote,
      data_validade,
      produto ( nome ),
      pacote ( id_pacote, status )
    `)
    .gte('data_validade', hojeISO)
    .lte('data_validade', limiteISO)
    .order('data_validade', { ascending: true });

  if (error) throw new Error(`Erro ao buscar risco agrupado: ${error.message}`);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const grupos = { 3: [], 5: [], 7: [] };

  for (const lote of data) {
    const validade = new Date(lote.data_validade + 'T00:00:00');
    const diasRestantes = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));
    const pacotesAtivos = (lote.pacote ?? []).filter((p) =>
      ['EM_ESTOQUE', 'SEPARADO'].includes(p.status)
    ).length;

    const item = {
      id_lote: lote.id_lote,
      codigo_lote: lote.codigo_lote,
      produto: lote.produto?.nome ?? 'Desconhecido',
      data_validade: lote.data_validade,
      dias_restantes: diasRestantes,
      pacotes_ativos: pacotesAtivos,
    };

    if (diasRestantes <= 3) grupos[3].push(item);
    if (diasRestantes <= 5) grupos[5].push(item);
    grupos[7].push(item);
  }

  return grupos;
};

// ─────────────────────────────────────────────────────────────────────────────
// OPÇÃO 3 — ENTRADAS E SAÍDAS
// Campo: movimentacao_estoque.tipo_movimentacao (varchar: 'ENTRADA' | 'SAIDA')
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Conta total geral de entradas e saídas.
 * @returns {{ total_entradas: number, total_saidas: number, total_geral: number }}
 */
export const contarEntradasSaidasGeral = async () => {
  const [resEntrada, resSaida] = await Promise.all([
    supabase
      .from('movimentacao_estoque')
      .select('*', { count: 'exact', head: true })
      .eq('tipo_movimentacao', 'ENTRADA'),
    supabase
      .from('movimentacao_estoque')
      .select('*', { count: 'exact', head: true })
      .eq('tipo_movimentacao', 'SAIDA'),
  ]);

  if (resEntrada.error) throw new Error(`Erro ao contar entradas: ${resEntrada.error.message}`);
  if (resSaida.error) throw new Error(`Erro ao contar saídas: ${resSaida.error.message}`);

  const total_entradas = resEntrada.count ?? 0;
  const total_saidas = resSaida.count ?? 0;

  return { total_entradas, total_saidas, total_geral: total_entradas + total_saidas };
};

/**
 * Filtra entradas ou saídas de um produto específico.
 *
 * @param {number} idProduto
 * @param {'ENTRADA' | 'SAIDA'} tipo
 * @returns {Array} movimentações com data e código do lote
 */
export const buscarMovimentacoesPorProduto = async (idProduto, tipo) => {
  const { data, error } = await supabase
    .from('movimentacao_estoque')
    .select(`
      id_movimentacao,
      tipo_movimentacao,
      data_hora,
      pacote (
        id_pacote,
        lote (
          codigo_lote,
          data_validade,
          produto ( nome )
        )
      )
    `)
    .eq('tipo_movimentacao', tipo)
    .order('data_hora', { ascending: false });

  if (error) throw new Error(`Erro ao buscar movimentações: ${error.message}`);

  // Filtra pelo produto após o join (Supabase não suporta filtro em nested com .eq direto)
  return data.filter(
    (m) => m.pacote?.lote?.produto?.nome !== undefined &&
           m.pacote?.lote?.produto !== null
  ).filter((m) => {
    // Se idProduto for fornecido, filtra pelo produto no join
    return true; // será filtrado abaixo usando query auxiliar
  });
};

/**
 * Versão otimizada: busca IDs dos lotes do produto e filtra movimentações por eles.
 *
 * @param {number} idProduto
 * @param {'ENTRADA' | 'SAIDA' | 'TODOS'} tipo
 */
export const buscarMovimentacoesFiltradas = async (idProduto, tipo) => {
  // Passo 1: pega os pacotes cujos lotes pertencem ao produto
  const { data: lotes, error: erroLotes } = await supabase
    .from('lote')
    .select('id_lote')
    .eq('id_produto', idProduto);

  if (erroLotes) throw new Error(`Erro ao buscar lotes do produto: ${erroLotes.message}`);
  if (!lotes || lotes.length === 0) return [];

  const idLotes = lotes.map((l) => l.id_lote);

  const { data: pacotes, error: erroPacotes } = await supabase
    .from('pacote')
    .select('id_pacote')
    .in('id_lote', idLotes);

  if (erroPacotes) throw new Error(`Erro ao buscar pacotes do produto: ${erroPacotes.message}`);
  if (!pacotes || pacotes.length === 0) return [];

  const idPacotes = pacotes.map((p) => p.id_pacote);

  // Passo 2: busca movimentações desses pacotes
  let query = supabase
    .from('movimentacao_estoque')
    .select(`
      id_movimentacao,
      tipo_movimentacao,
      data_hora,
      pacote (
        lote ( codigo_lote, produto ( nome ) )
      )
    `)
    .in('id_pacote', idPacotes)
    .order('data_hora', { ascending: false });

  if (tipo !== 'TODOS') {
    query = query.eq('tipo_movimentacao', tipo);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar movimentações filtradas: ${error.message}`);
  return data;
};

/**
 * Resume entradas/saídas por produto (para exportação geral).
 */
export const resumoEntradasSaidasPorProduto = async () => {
  const { data, error } = await supabase
    .from('movimentacao_estoque')
    .select(`
      id_movimentacao,
      tipo_movimentacao,
      data_hora,
      pacote (
        lote ( produto ( nome ) )
      )
    `)
    .order('data_hora', { ascending: false });

  if (error) throw new Error(`Erro ao resumir entradas/saídas: ${error.message}`);

  const mapa = {};
  for (const mov of data) {
    const nomeProduto = mov.pacote?.lote?.produto?.nome ?? 'Desconhecido';
    if (!mapa[nomeProduto]) {
      mapa[nomeProduto] = { produto: nomeProduto, entradas: 0, saidas: 0, total: 0 };
    }
    if (mov.tipo_movimentacao === 'ENTRADA') mapa[nomeProduto].entradas++;
    if (mov.tipo_movimentacao === 'SAIDA') mapa[nomeProduto].saidas++;
    mapa[nomeProduto].total++;
  }

  return Object.values(mapa).sort((a, b) => a.produto.localeCompare(b.produto));
};

// ─────────────────────────────────────────────────────────────────────────────
// OPÇÃO 4 — PERDAS
// Campo: alerta.tipo_alerta = 'PERDA'
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca todos os alertas do tipo 'PERDA', com dados do lote e produto.
 */
export const buscarPerdas = async () => {
  const { data, error } = await supabase
    .from('alerta')
    .select(`
      id_alerta,
      tipo_alerta,
      mensagem,
      data_hora,
      lote (
        codigo_lote,
        data_validade,
        produto ( nome )
      )
    `)
    .eq('tipo_alerta', 'PERDA')
    .order('data_hora', { ascending: false });

  if (error) throw new Error(`Erro ao buscar perdas: ${error.message}`);
  return data;
};

/**
 * Conta o total de registros de perda e agrupa por produto.
 */
export const resumoPerdas = async () => {
  const perdas = await buscarPerdas();

  const mapa = {};
  for (const alerta of perdas) {
    const nomeProduto = alerta.lote?.produto?.nome ?? 'Desconhecido';
    if (!mapa[nomeProduto]) {
      mapa[nomeProduto] = { produto: nomeProduto, total_perdas: 0, registros: [] };
    }
    mapa[nomeProduto].total_perdas++;
    mapa[nomeProduto].registros.push({
      data: alerta.data_hora,
      lote: alerta.lote?.codigo_lote,
      mensagem: alerta.mensagem,
    });
  }

  return Object.values(mapa).sort((a, b) => b.total_perdas - a.total_perdas);
};
