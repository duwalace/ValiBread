import supabase from '../config/supabase.js';
import { criarAlerta, criarSugestao } from '../models/estoqueModel.js';

const DIAS_ALERTA_VALIDADE = 30; // Gera alerta de validade se o lote vence em até N dias

// ─────────────────────────────────────────────────────────────────────
// Helpers de deduplicação (C-05 + I-08)
// ─────────────────────────────────────────────────────────────────────

/**
 * Verifica se já existe um alerta do mesmo tipo para o mesmo lote
 * nas últimas 24h. Evita acúmulo infinito de alertas duplicados.
 */
const alertaJaExiste = async (tipo_alerta, id_lote) => {
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24h atrás
  const { count } = await supabase
    .from('alerta')
    .select('id_alerta', { count: 'exact', head: true })
    .eq('tipo_alerta', tipo_alerta)
    .eq('id_lote', id_lote)
    .gte('data_hora', limite);
  return (count || 0) > 0;
};

// ─────────────────────────────────────────────────────────────────────
// verificarValidadeLote
// ─────────────────────────────────────────────────────────────────────

/**
 * Verifica se um lote está próximo do vencimento e gera alerta se necessário.
 * C-05/I-08: Verifica duplicidade antes de inserir (janela de 24h).
 */
export const verificarValidadeLote = async (id_lote, dadosLote = null) => {
  let lote = dadosLote;

  if (!lote || !lote.data_validade) {
    const { data, error } = await supabase
      .from('lote')
      .select('id_lote, data_validade, codigo_lote')
      .eq('id_lote', id_lote)
      .single();
    if (error || !data) return null;
    lote = data;
  }

  if (!lote.data_validade) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(lote.data_validade);
  validade.setHours(0, 0, 0, 0);
  const diasRestantes = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));

  if (diasRestantes <= DIAS_ALERTA_VALIDADE && diasRestantes >= 0) {
    // C-05/I-08: Não gerar alerta se já existe um nas últimas 24h para este lote
    const jaExiste = await alertaJaExiste('VALIDADE', id_lote);
    if (jaExiste) return null;

    try {
      return await criarAlerta(
        'VALIDADE',
        `Lote ${lote.codigo_lote || id_lote} vence em ${diasRestantes} dia(s). Verificação necessária.`,
        id_lote
      );
    } catch (e) {
      return null;
    }
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────
// verificarEstoqueMinimo  (C-04 reescrito — sem subquery aninhada)
// ─────────────────────────────────────────────────────────────────────

/**
 * C-04: Reescrito com queries sequenciais.
 * O Supabase JS não suporta subqueries encadeadas via .in() — retorna objeto, não array de IDs.
 * Agora: busca IDs de lotes → busca IDs de pacotes → conta etiquetas ativas.
 *
 * C-05: Verifica duplicidade de alerta antes de inserir (janela 24h por produto).
 */
export const verificarEstoqueMinimo = async (id_produto, estoque_minimo) => {
  // Passo 1: buscar IDs de lotes do produto
  const { data: lotes, error: erroLotes } = await supabase
    .from('lote')
    .select('id_lote')
    .eq('id_produto', id_produto);

  if (erroLotes || !lotes || lotes.length === 0) return null;
  const idsLotes = lotes.map((l) => l.id_lote);

  // Passo 2: buscar IDs de pacotes desses lotes
  const { data: pacotes, error: erroPacotes } = await supabase
    .from('pacote')
    .select('id_pacote')
    .in('id_lote', idsLotes);

  if (erroPacotes || !pacotes || pacotes.length === 0) {
    // Sem pacotes = estoque zerado
    const estoqueAtual = 0;
    if (estoqueAtual < estoque_minimo) {
      return await _gerarAlertaEstoqueEsugestao(id_produto, estoqueAtual, estoque_minimo, idsLotes);
    }
    return null;
  }
  const idsPacotes = pacotes.map((p) => p.id_pacote);

  // Passo 3: contar etiquetas ATIVAS nesses pacotes
  const { count, error: erroContagem } = await supabase
    .from('rfid_etiqueta')
    .select('id_rfid', { count: 'exact', head: true })
    .eq('status', 'ATIVO')
    .in('id_pacote', idsPacotes);

  if (erroContagem) return null;

  const estoqueAtual = count || 0;
  if (estoqueAtual < estoque_minimo) {
    return await _gerarAlertaEstoqueEsugestao(id_produto, estoqueAtual, estoque_minimo, idsLotes);
  }

  return null;
};

/** Helper interno: gera o alerta + sugestão de reposição com deduplicação */
const _gerarAlertaEstoqueEsugestao = async (id_produto, estoqueAtual, estoque_minimo, idsLotes) => {
  // Pega o lote mais recente para associar ao alerta (schema exige id_lote NOT NULL)
  const { data: lotesOrdenados } = await supabase
    .from('lote')
    .select('id_lote')
    .in('id_lote', idsLotes)
    .order('data_validade', { ascending: false })
    .limit(1);

  if (!lotesOrdenados || lotesOrdenados.length === 0) return null;
  const id_lote = lotesOrdenados[0].id_lote;

  // C-05: Não gerar alerta se já existe um para este lote nas últimas 24h
  const jaExiste = await alertaJaExiste('ESTOQUE_BAIXO', id_lote);
  if (jaExiste) return null;

  const qtdSugerida = Math.ceil((estoque_minimo - estoqueAtual) * 1.2); // +20% de margem

  const [alerta] = await Promise.all([
    criarAlerta(
      'ESTOQUE_BAIXO',
      `Estoque abaixo do mínimo (${estoqueAtual}/${estoque_minimo}). Reposição sugerida: ${qtdSugerida} unidades.`,
      id_lote
    ).catch(() => null),
    criarSugestao(id_produto, qtdSugerida).catch(() => null),
  ]);

  return alerta;
};

// ─────────────────────────────────────────────────────────────────────
// verificarEtiquetaInativa
// ─────────────────────────────────────────────────────────────────────

/**
 * Verifica etiqueta RFID com status diferente de ATIVO e gera alerta.
 * C-05: Deduplicação por janela de 24h.
 */
export const verificarEtiquetaInativa = async (etiqueta) => {
  if (!etiqueta || etiqueta.status === 'ATIVO') return null;

  const { data: pacote } = await supabase
    .from('pacote')
    .select('id_pacote, lote ( id_lote, codigo_lote )')
    .eq('id_pacote', etiqueta.id_pacote)
    .single();

  if (!pacote?.lote?.id_lote) return null;

  // Deduplicação
  const jaExiste = await alertaJaExiste('ETIQUETA_INATIVA', pacote.lote.id_lote);
  if (jaExiste) return null;

  try {
    return await criarAlerta(
      'ETIQUETA_INATIVA',
      `Etiqueta EPC ${etiqueta.epc} lida com status "${etiqueta.status}". Verifique o pacote ${etiqueta.id_pacote}.`,
      pacote.lote.id_lote
    );
  } catch (e) {
    return null;
  }
};
