import pool from '../config/database.js';

// ─────────────────────────────────────────────
// LEITOR RFID
// ─────────────────────────────────────────────

export const listarLeitores = async () => {
  try {
    const { rows } = await pool.query('SELECT * FROM leitor_rfid ORDER BY id_leitor ASC');
    return rows;
  } catch (error) {
    throw new Error(`Erro ao listar leitores: ${error.message}`);
  }
};

export const buscarLeitorPorId = async (id) => {
  try {
    const { rows } = await pool.query('SELECT * FROM leitor_rfid WHERE id_leitor = $1 LIMIT 1', [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Erro ao buscar leitor: ${error.message}`);
  }
};

export const criarLeitor = async (dados) => {
  try {
    const query = `
      INSERT INTO leitor_rfid (codigo_equipamento, localizacao, status, tipo_operacao)
      VALUES ($1, $2, COALESCE($3, 'ATIVO'), COALESCE($4, 'Entrada'))
      RETURNING *
    `;
    const values = [
      dados.codigo_equipamento,
      dados.localizacao,
      dados.status ?? null,
      dados.tipo_operacao ?? null
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    throw new Error(`Erro ao criar leitor: ${error.message}`);
  }
};

export const atualizarLeitor = async (id, dados) => {
  const campos = ['codigo_equipamento', 'localizacao', 'status', 'tipo_operacao'];
  const sets = [];
  const values = [];

  for (const campo of campos) {
    if (dados[campo] !== undefined) {
      values.push(dados[campo]);
      sets.push(`${campo} = $${values.length}`);
    }
  }

  if (sets.length === 0) {
    return buscarLeitorPorId(id);
  }

  values.push(id);
  const query = `UPDATE leitor_rfid SET ${sets.join(', ')} WHERE id_leitor = $${values.length} RETURNING *`;

  try {
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) throw new Error('Leitor não encontrado.');
    return rows[0];
  } catch (error) {
    throw new Error(`Erro ao atualizar leitor: ${error.message}`);
  }
};

// ─────────────────────────────────────────────
// RFID ETIQUETA
// ─────────────────────────────────────────────

export const listarEtiquetas = async (filtros = {}) => {
  try {
    const conditions = [];
    const values = [];

    if (filtros.status) {
      values.push(filtros.status);
      conditions.push(`r.status = $${values.length}`);
    }
    if (filtros.epc) {
      values.push(`%${filtros.epc}%`);
      conditions.push(`r.epc ILIKE $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT 
        r.id_rfid,
        r.epc,
        r.id_pacote,
        r.status,
        r.data_associacao,
        p.id_pacote AS pacote_id,
        l.codigo_lote,
        pr.nome AS produto_nome
      FROM rfid_etiqueta r
      LEFT JOIN pacote p ON r.id_pacote = p.id_pacote
      LEFT JOIN lote l ON p.id_lote = l.id_lote
      LEFT JOIN produto pr ON l.id_produto = pr.id_produto
      ${whereClause}
      ORDER BY r.data_associacao DESC
    `;

    const { rows } = await pool.query(query, values);
    return rows.map(row => ({
      id_rfid: row.id_rfid,
      epc: row.epc,
      id_pacote: row.id_pacote,
      status: row.status,
      data_associacao: row.data_associacao,
      pacote: row.pacote_id ? {
        id_pacote: row.pacote_id,
        lote: row.codigo_lote ? {
          codigo_lote: row.codigo_lote,
          produto: row.produto_nome ? { nome: row.produto_nome } : null
        } : null
      } : null
    }));
  } catch (error) {
    throw new Error(`Erro ao listar etiquetas: ${error.message}`);
  }
};

export const buscarEtiquetaPorEpc = async (epc) => {
  try {
    const query = `
      SELECT 
        r.id_rfid,
        r.epc,
        r.id_pacote,
        r.status,
        r.data_associacao,
        p.id_pacote AS pacote_id,
        l.id_lote,
        l.codigo_lote,
        l.data_validade::text AS data_validade,
        pr.id_produto,
        pr.nome AS produto_nome,
        pr.estoque_minimo
      FROM rfid_etiqueta r
      LEFT JOIN pacote p ON r.id_pacote = p.id_pacote
      LEFT JOIN lote l ON p.id_lote = l.id_lote
      LEFT JOIN produto pr ON l.id_produto = pr.id_produto
      WHERE r.epc = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [epc]);
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id_rfid: row.id_rfid,
      epc: row.epc,
      id_pacote: row.id_pacote,
      status: row.status,
      data_associacao: row.data_associacao,
      pacote: row.pacote_id ? {
        id_pacote: row.pacote_id,
        lote: row.id_lote ? {
          id_lote: row.id_lote,
          codigo_lote: row.codigo_lote,
          data_validade: row.data_validade,
          produto: row.id_produto ? {
            id_produto: row.id_produto,
            nome: row.produto_nome,
            estoque_minimo: row.estoque_minimo
          } : null
        } : null
      } : null
    };
  } catch (error) {
    throw new Error(`Erro ao buscar etiqueta por EPC: ${error.message}`);
  }
};

export const buscarEtiquetaPorPacote = async (id_pacote) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM rfid_etiqueta WHERE id_pacote = $1 LIMIT 1',
      [id_pacote]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Erro ao buscar etiqueta por pacote: ${error.message}`);
  }
};

export const associarEtiqueta = async (epc, id_pacote) => {
  const etiquetaExistente = await buscarEtiquetaPorPacote(id_pacote);
  if (etiquetaExistente && etiquetaExistente.status === 'ATIVO') {
    throw new Error('Este pacote já possui uma etiqueta RFID ativa associada.');
  }

  try {
    const query = `
      INSERT INTO rfid_etiqueta (epc, id_pacote, status)
      VALUES ($1, $2, 'ATIVO')
      RETURNING *
    `;
    const { rows } = await pool.query(query, [epc, id_pacote]);
    return rows[0];
  } catch (error) {
    throw new Error(`Erro ao associar etiqueta: ${error.message}`);
  }
};

export const atualizarStatusEtiqueta = async (id, status) => {
  const statusValidos = ['ATIVO', 'INATIVO', 'EXTRAVIADO'];
  if (!statusValidos.includes(status)) {
    throw new Error(`Status inválido. Use: ${statusValidos.join(', ')}`);
  }

  try {
    const { rows } = await pool.query(
      'UPDATE rfid_etiqueta SET status = $1 WHERE id_rfid = $2 RETURNING *',
      [status, id]
    );
    if (rows.length === 0) throw new Error('Etiqueta não encontrada.');
    return rows[0];
  } catch (error) {
    throw new Error(`Erro ao atualizar status da etiqueta: ${error.message}`);
  }
};

// ─────────────────────────────────────────────
// MOVIMENTAÇÃO DE ESTOQUE
// ─────────────────────────────────────────────

export const listarMovimentacoes = async (filtros = {}) => {
  try {
    const conditions = [];
    const values = [];

    if (filtros.tipo_movimentacao) {
      values.push(filtros.tipo_movimentacao);
      conditions.push(`m.tipo_movimentacao = $${values.length}`);
    }
    if (filtros.id_leitor) {
      values.push(filtros.id_leitor);
      conditions.push(`m.id_leitor = $${values.length}`);
    }
    if (filtros.id_pacote) {
      values.push(filtros.id_pacote);
      conditions.push(`m.id_pacote = $${values.length}`);
    }
    if (filtros.dataInicio) {
      values.push(filtros.dataInicio);
      conditions.push(`m.data_hora >= $${values.length}`);
    }
    if (filtros.dataFim) {
      values.push(filtros.dataFim);
      conditions.push(`m.data_hora <= $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    let limitClause = '';
    if (filtros.limite) {
      values.push(Number(filtros.limite));
      limitClause = `LIMIT $${values.length}`;
    }

    const query = `
      SELECT 
        m.id_movimentacao,
        m.tipo_movimentacao,
        m.data_hora,
        m.id_leitor,
        m.id_pacote,
        m.id_usuario,
        le.codigo_equipamento AS leitor_codigo,
        le.localizacao AS leitor_localizacao,
        l.codigo_lote,
        pr.nome AS produto_nome,
        u.nome AS usuario_nome,
        u.email AS usuario_email
      FROM movimentacao_estoque m
      LEFT JOIN leitor_rfid le ON m.id_leitor = le.id_leitor
      LEFT JOIN pacote p ON m.id_pacote = p.id_pacote
      LEFT JOIN lote l ON p.id_lote = l.id_lote
      LEFT JOIN produto pr ON l.id_produto = pr.id_produto
      LEFT JOIN usuario u ON m.id_usuario = u.id_usuario
      ${whereClause}
      ORDER BY m.data_hora DESC
      ${limitClause}
    `;

    const { rows } = await pool.query(query, values);
    return rows.map(r => ({
      id_movimentacao: r.id_movimentacao,
      tipo_movimentacao: r.tipo_movimentacao,
      data_hora: r.data_hora,
      id_leitor: r.id_leitor,
      id_pacote: r.id_pacote,
      id_usuario: r.id_usuario,
      leitor_rfid: r.id_leitor ? {
        codigo_equipamento: r.leitor_codigo,
        localizacao: r.leitor_localizacao
      } : null,
      pacote: r.id_pacote ? {
        lote: r.codigo_lote ? {
          codigo_lote: r.codigo_lote,
          produto: r.produto_nome ? { nome: r.produto_nome } : null
        } : null
      } : null,
      usuario: r.id_usuario ? {
        nome: r.usuario_nome,
        email: r.usuario_email
      } : null
    }));
  } catch (error) {
    throw new Error(`Erro ao listar movimentações: ${error.message}`);
  }
};

export const registrarMovimentacao = async (tipo_movimentacao, id_pacote, id_leitor = null, id_usuario = null) => {
  const tiposValidos = ['ENTRADA', 'SAÍDA', 'TRANSFERÊNCIA', 'SEPARACAO', 'Entrada', 'Saída', 'Transferência'];
  const match = tiposValidos.some(t => t.toLowerCase() === (tipo_movimentacao || '').toLowerCase());
  if (!match) {
    throw new Error(`Tipo de movimentação inválido. Use: ENTRADA, SAÍDA, TRANSFERÊNCIA, SEPARACAO`);
  }

  try {
    const query = `
      INSERT INTO movimentacao_estoque (tipo_movimentacao, id_pacote, id_leitor, id_usuario)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [tipo_movimentacao, id_pacote, id_leitor, id_usuario]);
    return rows[0];
  } catch (error) {
    throw new Error(`Erro ao registrar movimentação: ${error.message}`);
  }
};

export const buscarStatusPacote = async (id_pacote) => {
  try {
    const { rows } = await pool.query('SELECT id_pacote, status FROM pacote WHERE id_pacote = $1 LIMIT 1', [id_pacote]);
    return rows[0]?.status ?? null;
  } catch (error) {
    throw new Error(`Erro ao buscar status do pacote: ${error.message}`);
  }
};

export const atualizarStatusPacote = async (id_pacote, novoStatus) => {
  const statusValidos = ['EM_ESTOQUE', 'SEPARADO', 'EXPEDIDO'];
  if (!statusValidos.includes(novoStatus)) {
    throw new Error(`Status de pacote inválido: ${novoStatus}. Use: ${statusValidos.join(', ')}`);
  }
  try {
    const { rowCount } = await pool.query('UPDATE pacote SET status = $1 WHERE id_pacote = $2', [novoStatus, id_pacote]);
    if (rowCount === 0) throw new Error('Pacote não encontrado.');
  } catch (error) {
    throw new Error(`Erro ao atualizar status do pacote: ${error.message}`);
  }
};

// ─────────────────────────────────────────────
// LEITURA RFID RAW
// ─────────────────────────────────────────────

export const listarLeiturasRaw = async (filtros = {}) => {
  try {
    const conditions = [];
    const values = [];

    if (filtros.epc) {
      values.push(`%${filtros.epc}%`);
      conditions.push(`lr.epc ILIKE $${values.length}`);
    }
    if (filtros.id_leitor) {
      values.push(filtros.id_leitor);
      conditions.push(`lr.id_leitor = $${values.length}`);
    }
    if (filtros.dataInicio) {
      values.push(filtros.dataInicio);
      conditions.push(`lr.data_hora >= $${values.length}`);
    }
    if (filtros.dataFim) {
      values.push(filtros.dataFim);
      conditions.push(`lr.data_hora <= $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Number(filtros.limite) || 100;
    values.push(limit);
    const limitClause = `LIMIT $${values.length}`;

    const query = `
      SELECT 
        lr.id_leitura,
        lr.epc,
        lr.id_leitor,
        lr.data_hora,
        lr.rssi,
        le.codigo_equipamento,
        le.localizacao
      FROM leitura_rfid_raw lr
      LEFT JOIN leitor_rfid le ON lr.id_leitor = le.id_leitor
      ${whereClause}
      ORDER BY lr.data_hora DESC
      ${limitClause}
    `;

    const { rows } = await pool.query(query, values);
    return rows.map(r => ({
      id_leitura: r.id_leitura,
      epc: r.epc,
      id_leitor: r.id_leitor,
      data_hora: r.data_hora,
      rssi: r.rssi,
      leitor_rfid: r.id_leitor ? {
        codigo_equipamento: r.codigo_equipamento,
        localizacao: r.localizacao
      } : null
    }));
  } catch (error) {
    throw new Error(`Erro ao listar leituras raw: ${error.message}`);
  }
};

export const inserirLeituraRaw = async (epc, id_leitor, rssi = null) => {
  try {
    const query = `
      INSERT INTO leitura_rfid_raw (epc, id_leitor, rssi)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [epc, id_leitor, rssi]);
    return rows[0];
  } catch (error) {
    throw new Error(`Erro ao inserir leitura raw: ${error.message}`);
  }
};
