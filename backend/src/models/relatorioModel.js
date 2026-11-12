import pool from '../config/database.js';

export const listarRelatorios = async (filtros = {}) => {
  try {
    const conditions = [];
    const values = [];

    if (filtros.id_usuario) {
      values.push(filtros.id_usuario);
      conditions.push(`r.id_usuario = $${values.length}`);
    }

    if (filtros.tipo_relatorio) {
      values.push(filtros.tipo_relatorio);
      conditions.push(`r.tipo_relatorio = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT 
        r.id_relatorio, 
        r.tipo_relatorio, 
        r.data_geracao, 
        r.id_usuario, 
        u.nome AS usuario_nome, 
        u.email AS usuario_email
      FROM relatorio r
      LEFT JOIN usuario u ON r.id_usuario = u.id_usuario
      ${whereClause}
      ORDER BY r.data_geracao DESC
    `;

    const { rows } = await pool.query(query, values);
    return rows.map(r => ({
      id_relatorio: r.id_relatorio,
      tipo_relatorio: r.tipo_relatorio,
      data_geracao: r.data_geracao,
      id_usuario: r.id_usuario,
      usuario: r.usuario_nome ? {
        nome: r.usuario_nome,
        email: r.usuario_email
      } : null
    }));
  } catch (error) {
    throw new Error(`Erro ao listar relatórios: ${error.message}`);
  }
};

export const criarRelatorio = async (tipo_relatorio, id_usuario) => {
  try {
    const insertQuery = `
      INSERT INTO relatorio (tipo_relatorio, id_usuario)
      VALUES ($1, $2)
      RETURNING id_relatorio, tipo_relatorio, data_geracao, id_usuario
    `;
    const { rows } = await pool.query(insertQuery, [tipo_relatorio, id_usuario]);
    const novoRelatorio = rows[0];

    const { rows: usuarioRows } = await pool.query(
      'SELECT nome, email FROM usuario WHERE id_usuario = $1',
      [id_usuario]
    );
    const usuario = usuarioRows[0] || null;

    return {
      id_relatorio: novoRelatorio.id_relatorio,
      tipo_relatorio: novoRelatorio.tipo_relatorio,
      data_geracao: novoRelatorio.data_geracao,
      id_usuario: novoRelatorio.id_usuario,
      usuario: usuario ? { nome: usuario.nome, email: usuario.email } : null
    };
  } catch (error) {
    throw new Error(`Erro ao criar relatório: ${error.message}`);
  }
};
