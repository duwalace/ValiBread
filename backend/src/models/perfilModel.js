import supabase from '../config/supabase.js';

const exigirSucesso = (error, operacao) => {
  if (error) throw new Error(`Erro ao ${operacao}: ${error.message}`);
};

export const listarPerfis = async () => {
  const { data, error } = await supabase
    .from('perfil')
    .select('id_perfil, nome, descricao')
    .order('nome', { ascending: true });

  exigirSucesso(error, 'listar perfis');
  return data ?? [];
};

export const buscarPerfilPorId = async (id) => {
  const { data, error } = await supabase
    .from('perfil')
    .select('id_perfil, nome, descricao')
    .eq('id_perfil', id)
    .maybeSingle();

  exigirSucesso(error, 'buscar perfil por ID');
  return data;
};

export const criarPerfil = async (dados) => {
  const { data, error } = await supabase
    .from('perfil')
    .insert({ nome: dados.nome, descricao: dados.descricao ?? null })
    .select('id_perfil, nome, descricao')
    .single();

  exigirSucesso(error, 'criar perfil');
  return data;
};

export const atualizarPerfil = async (id, dados) => {
  const atualizacao = {};
  if (dados.nome !== undefined) atualizacao.nome = dados.nome;
  if (dados.descricao !== undefined) atualizacao.descricao = dados.descricao;
  if (Object.keys(atualizacao).length === 0) {
    throw new Error('Nenhum campo para atualizar.');
  }

  const { data, error } = await supabase
    .from('perfil')
    .update(atualizacao)
    .eq('id_perfil', id)
    .select('id_perfil, nome, descricao')
    .maybeSingle();

  exigirSucesso(error, 'atualizar perfil');
  if (!data) throw new Error('Perfil não encontrado.');
  return data;
};

export const deletarPerfil = async (id) => {
  const { count, error: countError } = await supabase
    .from('usuario')
    .select('id_usuario', { count: 'exact', head: true })
    .eq('id_perfil', id);

  exigirSucesso(countError, 'verificar usuários vinculados');
  if (count > 0) {
    throw new Error(`Não é possível excluir o perfil: há ${count} usuário(s) vinculado(s).`);
  }

  const { data, error } = await supabase
    .from('perfil')
    .delete()
    .eq('id_perfil', id)
    .select('id_perfil');

  exigirSucesso(error, 'excluir perfil');
  if (!data?.length) throw new Error('Perfil não encontrado.');
};
