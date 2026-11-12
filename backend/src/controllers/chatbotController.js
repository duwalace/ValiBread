import pool from '../config/database.js';

export const listarExports = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id_export,
        c.nome_arquivo,
        c.url_arquivo,
        c.data_geracao,
        c.id_usuario,
        u.nome AS usuario_nome,
        u.email AS usuario_email
      FROM chatbot_export c
      LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
      ORDER BY c.data_geracao DESC
    `;

    const { rows } = await pool.query(query);

    const result = rows.map(item => ({
      id_export: item.id_export,
      nome_arquivo: item.nome_arquivo,
      url_arquivo: item.url_arquivo,
      data_geracao: item.data_geracao,
      usuario_nome: item.usuario_nome || 'Desconhecido',
      usuario_email: item.usuario_email || 'Desconhecido',
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro na listagem de exports:', error);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};
