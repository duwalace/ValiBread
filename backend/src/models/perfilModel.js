import pool from '../config/database.js';

export const listarPerfis = async () => {
  try {
    const { rows } = await pool.query(
      'SELECT id_perfil, nome, descricao FROM perfil ORDER BY nome ASC'
    );
    return rows;
  } catch (error) {
    throw new Error(`Erro ao listar perfis: ${error.message}`);
  }
};

export const buscarPerfilPorId = async (id) => {
  try {
    const { rows } = await pool.query(
      'SELECT id_perfil, nome, descricao FROM perfil WHERE id_perfil = $1 LIMIT 1',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Erro ao buscar perfil por ID: ${error.message}`);
  }
};

export const criarPerfil = async (dados) => {
  try {
    const { rows } = await pool.query(
      'INSERT INTO perfil (nome, descricao) VALUES ($1, $2) RETURNING id_perfil, nome, descricao',
      [dados.nome, dados.descricao ?? null]
    );
    return rows[0];
  } catch (error) {
    throw new Error(`Erro ao criar perfil: ${error.message}`);
  }
};

export const atualizarPerfil = async (id, dados) => {
  const atualizacao = {};
  if (dados.nome !== undefined) atualizacao.nome = dados.nome;
  if (dados.descricao !== undefined) atualizacao.descricao = dados.descricao;

  const campos = Object.keys(atualizacao);
  if (campos.length === 0) {
    throw new Error('Nenhum campo para atualizar.');
  }

  const sets = campos.map((c, i) => `${c} = $${i + 1}`);
  const values = campos.map(c => atualizacao[c]);
  values.push(id);

  try {
    const { rows } = await pool.query(
      `UPDATE perfil SET ${sets.join(', ')} WHERE id_perfil = $${values.length} RETURNING id_perfil, nome, descricao`,
      values
    );
    if (rows.length === 0) throw new Error('Perfil não encontrado.');
    return rows[0];
  } catch (error) {
    if (error.message === 'Perfil não encontrado.' || error.message === 'Nenhum campo para atualizar.') {
      throw error;
    }
    throw new Error(`Erro ao atualizar perfil: ${error.message}`);
  }
};

export const deletarPerfil = async (id) => {
  try {
    const { rows: usuarios } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM usuario WHERE id_perfil = $1',
      [id]
    );
    const count = usuarios[0]?.total || 0;
    if (count > 0) {
      throw new Error(`Não é possível excluir o perfil: há ${count} usuário(s) vinculado(s).`);
    }

    const { rowCount } = await pool.query(
      'DELETE FROM perfil WHERE id_perfil = $1',
      [id]
    );
    if (rowCount === 0) throw new Error('Perfil não encontrado.');
  } catch (error) {
    if (error.message.includes('Não é possível excluir o perfil') || error.message === 'Perfil não encontrado.') {
      throw error;
    }
    throw new Error(`Erro ao excluir perfil: ${error.message}`);
  }
};
