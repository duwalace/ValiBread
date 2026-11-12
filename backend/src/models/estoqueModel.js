import pool from '../config/database.js';

// ─────────────────────────────────────────────
// PRODUTO
// ─────────────────────────────────────────────

export const listarProdutos = async () => {
  try {
    const { rows } = await pool.query('SELECT * FROM produto ORDER BY nome ASC');
    return rows;
  } catch (error) {
    throw new Error(`Erro ao listar produtos: ${error.message}`);
  }
};

export const buscarProdutoPorId = async (id) => {
  try {
    const { rows } = await pool.query('SELECT * FROM produto WHERE id_produto = $1 LIMIT 1', [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Erro ao buscar produto: ${error.message}`);
  }
};

export const criarProduto = async (dados) => {
  try {
    const { rows } = await pool.query(
      'INSERT INTO produto (nome, descricao, estoque_minimo) VALUES ($1, $2, $3) RETURNING *',
      [dados.nome, dados.descricao ?? null, dados.estoque_minimo]
    );
    return rows[0];
  } catch (error) {
    throw new Error(`Erro ao criar produto: ${error.message}`);
  }
};

export const atualizarProduto = async (id, dados) => {
  const campos = ['nome', 'descricao', 'estoque_minimo'];
  const sets = [];
  const values = [];

  for (const campo of campos) {
    if (dados[campo] !== undefined) {
      values.push(dados[campo]);
      sets.push(`${campo} = $${values.length}`);
    }
  }

  if (sets.length === 0) {
    return buscarProdutoPorId(id);
  }

  values.push(id);
  const query = `UPDATE produto SET ${sets.join(', ')} WHERE id_produto = $${values.length} RETURNING *`;

  try {
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) throw new Error('Produto não encontrado.');
    return rows[0];
  } catch (error) {
    throw new Error(`Erro ao atualizar produto: ${error.message}`);
  }
};

export const deletarProduto = async (id) => {
  try {
    const { rows: lotes } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM lote WHERE id_produto = $1',
      [id]
    );
    const count = lotes[0]?.total || 0;
    if (count > 0) {
      throw new Error(`Não é possível excluir o produto: há ${count} lote(s) vinculado(s).`);
    }

    const { rowCount } = await pool.query('DELETE FROM produto WHERE id_produto = $1', [id]);
    if (rowCount === 0) throw new Error('Produto não encontrado.');
  } catch (error) {
    if (error.message.includes('Não é possível excluir o produto') || error.message === 'Produto não encontrado.') {
      throw error;
    }
    throw new Error(`Erro ao deletar produto: ${error.message}`);
  }
};

// ─────────────────────────────────────────────
// LOTE
// ─────────────────────────────────────────────

export const listarLotes = async (filtros = {}) => {
  try {
    const conditions = [];
    const values = [];

    if (filtros.id_produto) {
      values.push(filtros.id_produto);
      conditions.push(`l.id_produto = $${values.length}`);
    }
    if (filtros.status) {
      values.push(filtros.status);
      conditions.push(`l.status = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT 
        l.id_lote,
        l.codigo_lote,
        l.data_fabricacao::text AS data_fabricacao,
        l.data_validade::text AS data_validade,
        l.status,
        l.id_produto,
        p.nome AS produto_nome,
        p.estoque_minimo AS produto_estoque_minimo
      FROM lote l
      LEFT JOIN produto p ON p.id_produto = l.id_produto
      ${whereClause}
      ORDER BY l.data_validade ASC
    `;

    const { rows } = await pool.query(query, values);
    return rows.map(r => ({
      id_lote: r.id_lote,
      codigo_lote: r.codigo_lote,
      data_fabricacao: r.data_fabricacao,
      data_validade: r.data_validade,
      status: r.status,
      id_produto: r.id_produto,
      produto: r.id_produto ? {
        id_produto: r.id_produto,
        nome: r.produto_nome,
        estoque_minimo: r.produto_estoque_minimo
      } : null
    }));
  } catch (error) {
    throw new Error(`Erro ao listar lotes: ${error.message}`);
  }
};

export const buscarLotePorId = async (id) => {
  try {
    const query = `
      SELECT 
        l.id_lote,
        l.codigo_lote,
        l.data_fabricacao::text AS data_fabricacao,
        l.data_validade::text AS data_validade,
        l.status,
        l.id_produto,
        p.nome AS produto_nome,
        p.estoque_minimo AS produto_estoque_minimo
      FROM lote l
      LEFT JOIN produto p ON p.id_produto = l.id_produto
      WHERE l.id_lote = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) return null;

    const r = rows[0];
    return {
      id_lote: r.id_lote,
      codigo_lote: r.codigo_lote,
      data_fabricacao: r.data_fabricacao,
      data_validade: r.data_validade,
      status: r.status,
      id_produto: r.id_produto,
      produto: r.id_produto ? {
        id_produto: r.id_produto,
        nome: r.produto_nome,
        estoque_minimo: r.produto_estoque_minimo
      } : null
    };
  } catch (error) {
    throw new Error(`Erro ao buscar lote: ${error.message}`);
  }
};

export const criarLote = async (dados) => {
  try {
    const query = `
      INSERT INTO lote (codigo_lote, data_fabricacao, data_validade, status, id_produto)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_lote, codigo_lote, data_fabricacao::text, data_validade::text, status, id_produto
    `;
    const values = [
      dados.codigo_lote,
      dados.data_fabricacao,
      dados.data_validade,
      dados.status ?? null,
      dados.id_produto
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    throw new Error(`Erro ao criar lote: ${error.message}`);
  }
};

export const atualizarLote = async (id, dados) => {
  const campos = ['codigo_lote', 'data_fabricacao', 'data_validade', 'status', 'id_produto'];
  const sets = [];
  const values = [];

  for (const campo of campos) {
    if (dados[campo] !== undefined) {
      values.push(dados[campo]);
      sets.push(`${campo} = $${values.length}`);
    }
  }

  if (sets.length === 0) {
    return buscarLotePorId(id);
  }

  values.push(Number(id));
  const query = `UPDATE lote SET ${sets.join(', ')} WHERE id_lote = $${values.length} RETURNING id_lote`;

  try {
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) throw new Error('Lote não encontrado.');
    return buscarLotePorId(id);
  } catch (error) {
    throw new Error(`Erro ao atualizar lote: ${error.message}`);
  }
};

export const deletarLote = async (id) => {
  try {
    const { rows: pacotes } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM pacote WHERE id_lote = $1',
      [id]
    );
    const count = pacotes[0]?.total || 0;
    if (count > 0) {
      throw new Error(`Não é possível excluir o lote: há ${count} pacote(s) vinculado(s).`);
    }

    const { rowCount } = await pool.query('DELETE FROM lote WHERE id_lote = $1', [id]);
    if (rowCount === 0) throw new Error('Lote não encontrado.');
  } catch (error) {
    if (error.message.includes('Não é possível excluir o lote') || error.message === 'Lote não encontrado.') {
      throw error;
    }
    throw new Error(`Erro ao deletar lote: ${error.message}`);
  }
};

// ─────────────────────────────────────────────
// PACOTE
// ─────────────────────────────────────────────

export const listarPacotes = async (filtros = {}) => {
  try {
    const conditions = [];
    const values = [];

    if (filtros.id_lote) {
      values.push(filtros.id_lote);
      conditions.push(`p.id_lote = $${values.length}`);
    }
    if (filtros.status) {
      values.push(filtros.status);
      conditions.push(`p.status = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT 
        p.id_pacote,
        p.status,
        l.id_lote,
        l.codigo_lote,
        l.data_validade::text AS data_validade,
        l.status AS lote_status,
        pr.nome AS produto_nome,
        r.id_rfid,
        r.epc AS rfid_epc,
        r.status AS rfid_status,
        r.data_associacao
      FROM pacote p
      LEFT JOIN lote l ON p.id_lote = l.id_lote
      LEFT JOIN produto pr ON l.id_produto = pr.id_produto
      LEFT JOIN rfid_etiqueta r ON p.id_pacote = r.id_pacote
      ${whereClause}
      ORDER BY p.id_pacote DESC
    `;

    const { rows } = await pool.query(query, values);
    return rows.map(row => ({
      id_pacote: row.id_pacote,
      status: row.status,
      lote: row.id_lote ? {
        id_lote: row.id_lote,
        codigo_lote: row.codigo_lote,
        data_validade: row.data_validade,
        status: row.lote_status,
        produto: row.produto_nome ? { nome: row.produto_nome } : null
      } : null,
      rfid_etiqueta: row.id_rfid ? {
        id_rfid: row.id_rfid,
        epc: row.rfid_epc,
        status: row.rfid_status,
        data_associacao: row.data_associacao
      } : null
    }));
  } catch (error) {
    throw new Error(`Erro ao listar pacotes: ${error.message}`);
  }
};

export const criarPacote = async (dados) => {
  try {
    const query = `
      INSERT INTO pacote (id_lote, status)
      VALUES ($1, $2)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [dados.id_lote, dados.status || 'EM_ESTOQUE']);
    return rows[0];
  } catch (error) {
    throw new Error(`Erro ao criar pacote: ${error.message}`);
  }
};

export const atualizarPacoteStatus = async (id, status) => {
  const statusValidos = ['EM_ESTOQUE', 'SEPARADO', 'EXPEDIDO'];
  if (!statusValidos.includes(status)) {
    throw new Error(`Status inválido. Valores aceitos: ${statusValidos.join(', ')}`);
  }

  try {
    const updateQuery = 'UPDATE pacote SET status = $1 WHERE id_pacote = $2 RETURNING id_pacote';
    const { rowCount } = await pool.query(updateQuery, [status, Number(id)]);
    if (rowCount === 0) throw new Error('Pacote não encontrado.');

    const query = `
      SELECT 
        p.id_pacote,
        p.status,
        l.id_lote,
        l.codigo_lote,
        l.data_validade::text AS data_validade,
        l.status AS lote_status,
        pr.nome AS produto_nome,
        r.id_rfid,
        r.epc AS rfid_epc,
        r.status AS rfid_status,
        r.data_associacao
      FROM pacote p
      LEFT JOIN lote l ON p.id_lote = l.id_lote
      LEFT JOIN produto pr ON l.id_produto = pr.id_produto
      LEFT JOIN rfid_etiqueta r ON p.id_pacote = r.id_pacote
      WHERE p.id_pacote = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [Number(id)]);
    const row = rows[0];
    return {
      id_pacote: row.id_pacote,
      status: row.status,
      lote: row.id_lote ? {
        id_lote: row.id_lote,
        codigo_lote: row.codigo_lote,
        data_validade: row.data_validade,
        status: row.lote_status,
        produto: row.produto_nome ? { nome: row.produto_nome } : null
      } : null,
      rfid_etiqueta: row.id_rfid ? {
        id_rfid: row.id_rfid,
        epc: row.rfid_epc,
        status: row.rfid_status,
        data_associacao: row.data_associacao
      } : null
    };
  } catch (error) {
    throw new Error(`Erro ao atualizar status do pacote: ${error.message}`);
  }
};

export const deletarPacote = async (id) => {
  const pacoteId = Number(id);

  try {
    await pool.query('DELETE FROM movimentacao_estoque WHERE id_pacote = $1', [pacoteId]);
    await pool.query('DELETE FROM rfid_etiqueta WHERE id_pacote = $1', [pacoteId]);
    const { rowCount } = await pool.query('DELETE FROM pacote WHERE id_pacote = $1', [pacoteId]);
    if (rowCount === 0) throw new Error('Pacote não encontrado.');
  } catch (error) {
    throw new Error(`Erro ao deletar pacote: ${error.message}`);
  }
};

// ─────────────────────────────────────────────
// ALERTA
// ─────────────────────────────────────────────

export const listarAlertas = async (filtros = {}) => {
  try {
    const conditions = [];
    const values = [];

    if (filtros.tipo_alerta) {
      values.push(filtros.tipo_alerta);
      conditions.push(`a.tipo_alerta = $${values.length}`);
    }
    if (filtros.id_lote) {
      values.push(filtros.id_lote);
      conditions.push(`a.id_lote = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT 
        a.id_alerta,
        a.tipo_alerta,
        a.mensagem,
        a.data_hora,
        a.id_lote,
        l.codigo_lote,
        p.nome AS produto_nome
      FROM alerta a
      LEFT JOIN lote l ON a.id_lote = l.id_lote
      LEFT JOIN produto p ON l.id_produto = p.id_produto
      ${whereClause}
      ORDER BY a.data_hora DESC
    `;

    const { rows } = await pool.query(query, values);
    return rows.map(r => ({
      id_alerta: r.id_alerta,
      tipo_alerta: r.tipo_alerta,
      mensagem: r.mensagem,
      data_hora: r.data_hora,
      id_lote: r.id_lote,
      lote: r.id_lote ? {
        id_lote: r.id_lote,
        codigo_lote: r.codigo_lote,
        produto: r.produto_nome ? { nome: r.produto_nome } : null
      } : null
    }));
  } catch (error) {
    throw new Error(`Erro ao listar alertas: ${error.message}`);
  }
};

export const criarAlerta = async (tipo_alerta, mensagem, id_lote) => {
  try {
    const { rows } = await pool.query(
      'INSERT INTO alerta (tipo_alerta, mensagem, id_lote) VALUES ($1, $2, $3) RETURNING *',
      [tipo_alerta, mensagem, id_lote]
    );
    return rows[0];
  } catch (error) {
    throw new Error(`Erro ao criar alerta: ${error.message}`);
  }
};

export const deletarAlerta = async (id) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM alerta WHERE id_alerta = $1', [id]);
    if (rowCount === 0) throw new Error('Alerta não encontrado.');
  } catch (error) {
    throw new Error(`Erro ao deletar alerta: ${error.message}`);
  }
};

// ─────────────────────────────────────────────
// SUGESTÃO DE REPOSIÇÃO
// ─────────────────────────────────────────────

export const listarSugestoes = async (filtros = {}) => {
  try {
    const conditions = [];
    const values = [];

    if (filtros.id_produto) {
      values.push(filtros.id_produto);
      conditions.push(`s.id_produto = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT 
        s.id_sugestao,
        s.data_sugestao,
        s.quantidade_sugerida,
        s.id_produto,
        p.nome AS produto_nome,
        p.estoque_minimo AS produto_estoque_minimo
      FROM sugestao_reposicao s
      LEFT JOIN produto p ON s.id_produto = p.id_produto
      ${whereClause}
      ORDER BY s.data_sugestao DESC
    `;

    const { rows } = await pool.query(query, values);
    return rows.map(r => ({
      id_sugestao: r.id_sugestao,
      data_sugestao: r.data_sugestao,
      quantidade_sugerida: r.quantidade_sugerida,
      id_produto: r.id_produto,
      produto: r.id_produto ? {
        id_produto: r.id_produto,
        nome: r.produto_nome,
        estoque_minimo: r.produto_estoque_minimo
      } : null
    }));
  } catch (error) {
    throw new Error(`Erro ao listar sugestões: ${error.message}`);
  }
};

export const criarSugestao = async (id_produto, quantidade_sugerida) => {
  try {
    const { rows } = await pool.query(
      'INSERT INTO sugestao_reposicao (id_produto, quantidade_sugerida) VALUES ($1, $2) RETURNING *',
      [id_produto, quantidade_sugerida]
    );
    return rows[0];
  } catch (error) {
    throw new Error(`Erro ao criar sugestão: ${error.message}`);
  }
};
