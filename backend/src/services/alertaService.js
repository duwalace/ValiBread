import pool from '../config/database.js';
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
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS count FROM alerta WHERE tipo_alerta = $1 AND id_lote = $2 AND data_hora >= $3',
      [tipo_alerta, id_lote, limite]
    );
    return (rows[0]?.count || 0) > 0;
  } catch (e) {
    console.error('[alertaJaExiste] Erro ao verificar:', e.message);
    return false;
  }
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
    try {
      const { rows } = await pool.query(
        'SELECT id_lote, data_validade::text AS data_validade, codigo_lote FROM lote WHERE id_lote = $1 LIMIT 1',
        [id_lote]
      );
      if (rows.length === 0) return null;
      lote = rows[0];
    } catch (e) {
      return null;
    }
  }

  if (!lote.data_validade) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(lote.data_validade);
  validade.setHours(0, 0, 0, 0);
  const diasRestantes = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));

  if (diasRestantes <= DIAS_ALERTA_VALIDADE && diasRestantes >= 0) {
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
// verificarEstoqueMinimo
// ─────────────────────────────────────────────────────────────────────

export const verificarEstoqueMinimo = async (id_produto, estoque_minimo) => {
  try {
    // Passo 1: buscar IDs de lotes do produto
    const { rows: lotes } = await pool.query(
      'SELECT id_lote FROM lote WHERE id_produto = $1',
      [id_produto]
    );

    if (!lotes || lotes.length === 0) return null;
    const idsLotes = lotes.map((l) => l.id_lote);

    // Passo 2: buscar IDs de pacotes desses lotes
    const { rows: pacotes } = await pool.query(
      'SELECT id_pacote FROM pacote WHERE id_lote = ANY($1::int[])',
      [idsLotes]
    );

    if (!pacotes || pacotes.length === 0) {
      const estoqueAtual = 0;
      if (estoqueAtual < estoque_minimo) {
        return await _gerarAlertaEstoqueEsugestao(id_produto, estoqueAtual, estoque_minimo, idsLotes);
      }
      return null;
    }
    const idsPacotes = pacotes.map((p) => p.id_pacote);

    // Passo 3: contar etiquetas ATIVAS nesses pacotes
    const { rows: rfidCount } = await pool.query(
      "SELECT COUNT(*)::int AS count FROM rfid_etiqueta WHERE status = 'ATIVO' AND id_pacote = ANY($1::int[])",
      [idsPacotes]
    );

    const estoqueAtual = rfidCount[0]?.count || 0;
    if (estoqueAtual < estoque_minimo) {
      return await _gerarAlertaEstoqueEsugestao(id_produto, estoqueAtual, estoque_minimo, idsLotes);
    }

    return null;
  } catch (error) {
    console.error('[verificarEstoqueMinimo] Erro:', error.message);
    return null;
  }
};

/** Helper interno: gera o alerta + sugestão de reposição com deduplicação */
const _gerarAlertaEstoqueEsugestao = async (id_produto, estoqueAtual, estoque_minimo, idsLotes) => {
  try {
    const { rows: lotesOrdenados } = await pool.query(
      'SELECT id_lote FROM lote WHERE id_lote = ANY($1::int[]) ORDER BY data_validade DESC LIMIT 1',
      [idsLotes]
    );

    if (!lotesOrdenados || lotesOrdenados.length === 0) return null;
    const id_lote = lotesOrdenados[0].id_lote;

    const jaExiste = await alertaJaExiste('ESTOQUE_BAIXO', id_lote);
    if (jaExiste) return null;

    const qtdSugerida = Math.ceil((estoque_minimo - estoqueAtual) * 1.2);

    const [alerta] = await Promise.all([
      criarAlerta(
        'ESTOQUE_BAIXO',
        `Estoque abaixo do mínimo (${estoqueAtual}/${estoque_minimo}). Reposição sugerida: ${qtdSugerida} unidades.`,
        id_lote
      ).catch(() => null),
      criarSugestao(id_produto, qtdSugerida).catch(() => null),
    ]);

    return alerta;
  } catch (e) {
    console.error('[_gerarAlertaEstoqueEsugestao] Erro:', e.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────
// verificarEtiquetaInativa
// ─────────────────────────────────────────────────────────────────────

export const verificarEtiquetaInativa = async (etiqueta) => {
  if (!etiqueta || etiqueta.status === 'ATIVO') return null;

  try {
    const { rows } = await pool.query(`
      SELECT p.id_pacote, l.id_lote, l.codigo_lote 
      FROM pacote p 
      LEFT JOIN lote l ON p.id_lote = l.id_lote 
      WHERE p.id_pacote = $1 
      LIMIT 1
    `, [etiqueta.id_pacote]);

    const pacote = rows[0];
    if (!pacote?.id_lote) return null;

    const jaExiste = await alertaJaExiste('ETIQUETA_INATIVA', pacote.id_lote);
    if (jaExiste) return null;

    return await criarAlerta(
      'ETIQUETA_INATIVA',
      `Etiqueta EPC ${etiqueta.epc} lida com status "${etiqueta.status}". Verifique o pacote ${etiqueta.id_pacote}.`,
      pacote.id_lote
    );
  } catch (e) {
    return null;
  }
};
