import supabase from '../config/supabase.js';

export const listarPerfis = async () => {
  const { data, error } = await supabase
    .from('perfil')
    .select('*')
    .order('nome', { ascending: true });
  if (error) throw new Error(`Erro ao listar perfis: ${error.message}`);
  return data;
};

export const buscarPerfilPorId = async (id) => {
  const { data, error } = await supabase
    .from('perfil')
    .select('*')
    .eq('id_perfil', id)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(`Erro ao buscar perfil: ${error.message}`);
  return data;
};

export const criarPerfil = async (dados) => {
  const { data, error } = await supabase
    .from('perfil')
    .insert([dados])
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar perfil: ${error.message}`);
  return data;
};

export const atualizarPerfil = async (id, dados) => {
  const { data, error } = await supabase
    .from('perfil')
    .update(dados)
    .eq('id_perfil', id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar perfil: ${error.message}`);
  return data;
};

export const deletarPerfil = async (id) => {
  // Verifica se há usuários usando este perfil
  const { count, error: erroContagem } = await supabase
    .from('usuario')
    .select('*', { count: 'exact', head: true })
    .eq('id_perfil', id);
  if (erroContagem) throw new Error(`Erro ao verificar usuários: ${erroContagem.message}`);
  if (count > 0) throw new Error(`Não é possível excluir o perfil: há ${count} usuário(s) vinculado(s).`);

  const { error } = await supabase.from('perfil').delete().eq('id_perfil', id);
  if (error) throw new Error(`Erro ao deletar perfil: ${error.message}`);
};
