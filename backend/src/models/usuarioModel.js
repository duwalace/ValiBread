import pool from '../config/database.js';

export const buscarUsuarioPorEmail = async (email) => {
  try {
    const query = `
      SELECT 
        u.id_usuario, 
        u.nome, 
        u.email, 
        u.senha, 
        u.id_perfil, 
        p.nome AS perfil_nome, 
        p.descricao AS perfil_descricao
      FROM usuario u
      LEFT JOIN perfil p ON u.id_perfil = p.id_perfil
      WHERE u.email = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [email]);
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id_usuario: row.id_usuario,
      nome: row.nome,
      email: row.email,
      senha: row.senha,
      id_perfil: row.id_perfil,
      perfil: row.perfil_nome ? {
        nome: row.perfil_nome,
        descricao: row.perfil_descricao
      } : null
    };
  } catch (error) {
    throw new Error(`Erro ao buscar usuário por e-mail: ${error.message}`);
  }
};

export const inserirUsuario = async (dadosUsuario) => {
  try {
    const query = `
      INSERT INTO usuario (nome, email, senha, id_perfil)
      VALUES ($1, $2, $3, $4)
      RETURNING id_usuario, nome, email, senha, id_perfil
    `;
    const values = [
      dadosUsuario.nome,
      dadosUsuario.email,
      dadosUsuario.senha,
      dadosUsuario.id_perfil
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    throw new Error(`Erro ao cadastrar usuário: ${error.message}`);
  }
};

export const listarUsuarios = async () => {
  try {
    const query = `
      SELECT 
        u.id_usuario, 
        u.nome, 
        u.email, 
        u.id_perfil, 
        p.nome AS perfil_nome
      FROM usuario u
      LEFT JOIN perfil p ON u.id_perfil = p.id_perfil
      ORDER BY u.nome ASC
    `;
    const { rows } = await pool.query(query);
    return rows.map(row => ({
      id_usuario: row.id_usuario,
      nome: row.nome,
      email: row.email,
      id_perfil: row.id_perfil,
      perfil: row.perfil_nome ? { nome: row.perfil_nome } : null
    }));
  } catch (error) {
    throw new Error(`Erro ao listar usuários: ${error.message}`);
  }
};

export const buscarUsuarioPorId = async (id) => {
  try {
    const query = `
      SELECT 
        u.id_usuario, 
        u.nome, 
        u.email, 
        u.id_perfil, 
        p.nome AS perfil_nome, 
        p.descricao AS perfil_descricao
      FROM usuario u
      LEFT JOIN perfil p ON u.id_perfil = p.id_perfil
      WHERE u.id_usuario = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id_usuario: row.id_usuario,
      nome: row.nome,
      email: row.email,
      id_perfil: row.id_perfil,
      perfil: row.perfil_nome ? {
        nome: row.perfil_nome,
        descricao: row.perfil_descricao
      } : null
    };
  } catch (error) {
    throw new Error(`Erro ao buscar usuário por ID: ${error.message}`);
  }
};

export const buscarSenhaUsuarioPorId = async (id) => {
  try {
    const query = `
      SELECT senha
      FROM usuario
      WHERE id_usuario = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Erro ao buscar senha do usuário: ${error.message}`);
  }
};

export const atualizarUsuario = async (id, dados) => {
  const camposPermitidos = ['nome', 'email', 'senha', 'id_perfil'];
  const sets = [];
  const values = [];
  let index = 1;

  for (const campo of camposPermitidos) {
    if (dados[campo] !== undefined) {
      sets.push(`${campo} = $${index}`);
      values.push(dados[campo]);
      index++;
    }
  }

  if (sets.length === 0) {
    throw new Error('Nenhum campo para atualizar.');
  }

  values.push(id);
  const query = `
    UPDATE usuario
    SET ${sets.join(', ')}
    WHERE id_usuario = $${index}
    RETURNING id_usuario, nome, email, id_perfil
  `;

  try {
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) throw new Error('Usuário não encontrado.');
    return rows[0];
  } catch (error) {
    if (error.message === 'Usuário não encontrado.') throw error;
    throw new Error(`Erro ao atualizar usuário: ${error.message}`);
  }
};

export const deletarUsuario = async (id) => {
  try {
    const { rows: relatorios } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM relatorio WHERE id_usuario = $1',
      [id]
    );
    const count = relatorios[0]?.total || 0;
    if (count > 0) {
      throw new Error(`Não é possível excluir o usuário: há ${count} relatório(s) vinculado(s).`);
    }

    const { rowCount } = await pool.query(
      'DELETE FROM usuario WHERE id_usuario = $1',
      [id]
    );
    if (rowCount === 0) throw new Error('Usuário não encontrado.');
  } catch (error) {
    if (error.message.includes('Não é possível excluir o usuário') || error.message === 'Usuário não encontrado.') {
      throw error;
    }
    throw new Error(`Erro ao excluir usuário: ${error.message}`);
  }
};
