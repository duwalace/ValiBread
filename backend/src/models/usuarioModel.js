import supabase from '../config/supabase.js';

const exigirSucesso = (error, operacao) => {
  if (error) throw new Error(`Erro ao ${operacao}: ${error.message}`);
};

const USUARIO_COM_PERFIL = 'id_usuario, nome, email, senha, id_perfil, perfil:perfil!fk_usuario_perfil(nome, descricao)';

export const buscarUsuarioPorEmail = async (email) => {
  const { data, error } = await supabase
    .from('usuario')
    .select(USUARIO_COM_PERFIL)
    .eq('email', email)
    .maybeSingle();

  exigirSucesso(error, 'buscar usuário por e-mail');
  return data;
};

export const inserirUsuario = async (dadosUsuario) => {
  const { data, error } = await supabase
    .from('usuario')
    .insert({
      nome: dadosUsuario.nome,
      email: dadosUsuario.email,
      senha: dadosUsuario.senha,
      id_perfil: dadosUsuario.id_perfil,
    })
    .select('id_usuario, nome, email, senha, id_perfil')
    .single();

  exigirSucesso(error, 'cadastrar usuário');
  return data;
};

export const listarUsuarios = async () => {
  const { data, error } = await supabase
    .from('usuario')
    .select('id_usuario, nome, email, id_perfil, perfil:perfil!fk_usuario_perfil(nome)')
    .order('nome', { ascending: true });

  exigirSucesso(error, 'listar usuários');
  return data ?? [];
};

export const buscarUsuarioPorId = async (id) => {
  const { data, error } = await supabase
    .from('usuario')
    .select('id_usuario, nome, email, id_perfil, perfil:perfil!fk_usuario_perfil(nome, descricao)')
    .eq('id_usuario', id)
    .maybeSingle();

  exigirSucesso(error, 'buscar usuário por ID');
  return data;
};

export const buscarSenhaUsuarioPorId = async (id) => {
  const { data, error } = await supabase
    .from('usuario')
    .select('senha')
    .eq('id_usuario', id)
    .maybeSingle();

  exigirSucesso(error, 'buscar senha do usuário');
  return data;
};

export const atualizarUsuario = async (id, dados) => {
  const atualizacao = {};
  for (const campo of ['nome', 'email', 'senha', 'id_perfil']) {
    if (dados[campo] !== undefined) atualizacao[campo] = dados[campo];
  }
  if (Object.keys(atualizacao).length === 0) {
    throw new Error('Nenhum campo para atualizar.');
  }

  const { data, error } = await supabase
    .from('usuario')
    .update(atualizacao)
    .eq('id_usuario', id)
    .select('id_usuario, nome, email, id_perfil')
    .maybeSingle();

  exigirSucesso(error, 'atualizar usuário');
  if (!data) throw new Error('Usuário não encontrado.');
  return data;
};

export const deletarUsuario = async (id) => {
  const { count, error: countError } = await supabase
    .from('relatorio')
    .select('id_relatorio', { count: 'exact', head: true })
    .eq('id_usuario', id);

  exigirSucesso(countError, 'verificar relatórios vinculados');
  if (count > 0) {
    throw new Error(`Não é possível excluir o usuário: há ${count} relatório(s) vinculado(s).`);
  }

  const { data, error } = await supabase
    .from('usuario')
    .delete()
    .eq('id_usuario', id)
    .select('id_usuario');

  exigirSucesso(error, 'excluir usuário');
  if (!data?.length) throw new Error('Usuário não encontrado.');
};
