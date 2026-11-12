import pool from '../config/database.js';

const TIPOS_VALIDOS = ['Entrada', 'Saída', 'Transferência'];

const buildSelectQuery = (whereClause = '', limitClause = '') => `
  SELECT 
    m.id_movimentacao,
    m.tipo_movimentacao,
    m.data_hora,
    m.id_pacote,
    m.id_usuario,
    m.id_leitor,
    p.status AS pacote_status,
    l.id_lote,
    l.codigo_lote,
    l.id_produto,
    pr.nome AS produto_nome,
    u.nome AS usuario_nome,
    u.email AS usuario_email,
    le.codigo_equipamento AS leitor_codigo,
    le.localizacao AS leitor_localizacao
  FROM movimentacao_estoque m
  LEFT JOIN pacote p ON m.id_pacote = p.id_pacote
  LEFT JOIN lote l ON p.id_lote = l.id_lote
  LEFT JOIN produto pr ON l.id_produto = pr.id_produto
  LEFT JOIN usuario u ON m.id_usuario = u.id_usuario
  LEFT JOIN leitor_rfid le ON m.id_leitor = le.id_leitor
  ${whereClause}
  ORDER BY m.data_hora DESC
  ${limitClause}
`;

const mapRow = (r) => ({
  id_movimentacao: r.id_movimentacao,
  tipo_movimentacao: r.tipo_movimentacao,
  data_hora: r.data_hora,
  id_pacote: r.id_pacote,
  id_usuario: r.id_usuario,
  id_leitor: r.id_leitor,
  pacote: r.id_pacote ? {
    id_pacote: r.id_pacote,
    status: r.pacote_status,
    lote: r.id_lote ? {
      id_lote: r.id_lote,
      codigo_lote: r.codigo_lote,
      id_produto: r.id_produto,
      produto: r.id_produto ? {
        id_produto: r.id_produto,
        nome: r.produto_nome
      } : null
    } : null
  } : null,
  usuario: r.id_usuario ? {
    nome: r.usuario_nome,
    email: r.usuario_email
  } : null,
  leitor_rfid: r.id_leitor ? {
    codigo_equipamento: r.leitor_codigo,
    localizacao: r.leitor_localizacao
  } : null
});

export const listarMovimentacoes = async (filtros = {}) => {
  try {
    const conditions = [];
    const values = [];

    if (filtros.tipo) {
      values.push(filtros.tipo);
      conditions.push(`m.tipo_movimentacao = $${values.length}`);
    }
    if (filtros.data_inicio) {
      values.push(`${filtros.data_inicio}T00:00:00-03:00`);
      conditions.push(`m.data_hora >= $${values.length}`);
    }
    if (filtros.data_fim) {
      values.push(`${filtros.data_fim}T23:59:59-03:00`);
      conditions.push(`m.data_hora <= $${values.length}`);
    }
    if (filtros.id_pacote) {
      values.push(Number(filtros.id_pacote));
      conditions.push(`m.id_pacote = $${values.length}`);
    }
    if (filtros.id_produto) {
      values.push(Number(filtros.id_produto));
      conditions.push(`l.id_produto = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = buildSelectQuery(whereClause);

    const { rows } = await pool.query(query, values);
    return rows.map(mapRow);
  } catch (error) {
    throw new Error(`Erro ao listar movimentações: ${error.message}`);
  }
};

export const listarMovimentacoesPorPacote = async (id_pacote) => {
  try {
    const query = buildSelectQuery('WHERE m.id_pacote = $1');
    const { rows } = await pool.query(query, [Number(id_pacote)]);
    return rows.map(mapRow);
  } catch (error) {
    throw new Error(`Erro ao buscar histórico do pacote: ${error.message}`);
  }
};

export const registrarMovimentacao = async ({ tipo_movimentacao, id_pacote, observacao, id_usuario }) => {
  if (!TIPOS_VALIDOS.includes(tipo_movimentacao)) {
    throw new Error(`Tipo de movimentação inválido. Use: ${TIPOS_VALIDOS.join(', ')}`);
  }

  try {
    const insertQuery = `
      INSERT INTO movimentacao_estoque (tipo_movimentacao, id_pacote, id_usuario)
      VALUES ($1, $2, $3)
      RETURNING id_movimentacao
    `;
    const { rows: insertRows } = await pool.query(insertQuery, [
      tipo_movimentacao,
      Number(id_pacote),
      id_usuario ? Number(id_usuario) : null
    ]);

    const idMovimentacao = insertRows[0].id_movimentacao;
    const selectQuery = buildSelectQuery('WHERE m.id_movimentacao = $1', 'LIMIT 1');
    const { rows } = await pool.query(selectQuery, [idMovimentacao]);
    return mapRow(rows[0]);
  } catch (error) {
    throw new Error(`Erro ao registrar movimentação: ${error.message}`);
  }
};
