import supabase from '../config/supabase.js';

// ── Funções existentes ────────────────────────────────────────────
export const buscarUsuarioPorEmail = async (email) => {
  const { data, error } = await supabase
    .from('usuario')
    .select(`*, perfil ( nome, descricao )`)
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Erro no banco ao buscar usuário: ${error.message}`);
  }
  return data;
};

export const inserirUsuario = async (dadosUsuario) => {
  const { data, error } = await supabase
    .from('usuario')
    .insert([dadosUsuario])
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar usuário no banco: ${error.message}`);
  return data;
};

// ── Novas funções CRUD ────────────────────────────────────────────
export const listarUsuarios = async () => {
  const { data, error } = await supabase
    .from('usuario')
    .select('id_usuario, nome, email, id_perfil, perfil ( nome )')
    .order('nome', { ascending: true });
  if (error) throw new Error(`Erro ao listar usuários: ${error.message}`);
  return data;
};

export const buscarUsuarioPorId = async (id) => {
  const { data, error } = await supabase
    .from('usuario')
    .select('id_usuario, nome, email, id_perfil, perfil ( nome, descricao )')
    .eq('id_usuario', id)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(`Erro ao buscar usuário: ${error.message}`);
  return data;
};

export const atualizarUsuario = async (id, dados) => {
  // Nunca retornar a senha em atualizações de perfil
  const { data, error } = await supabase
    .from('usuario')
    .update(dados)
    .eq('id_usuario', id)
    .select('id_usuario, nome, email, id_perfil')
    .single();
  if (error) throw new Error(`Erro ao atualizar usuário: ${error.message}`);
  return data;
};

export const deletarUsuario = async (id) => {
  // I-04: Verificar relatórios vinculados antes de deletar
  const { count, error: erroContagem } = await supabase
    .from('relatorio')
    .select('*', { count: 'exact', head: true })
    .eq('id_usuario', id);
  if (erroContagem) throw new Error(`Erro ao verificar relatórios: ${erroContagem.message}`);
  if (count > 0) throw new Error(`Não é possível excluir o usuário: há ${count} relatório(s) vinculado(s).`);

  const { error } = await supabase.from('usuario').delete().eq('id_usuario', id);
  if (error) throw new Error(`Erro ao deletar usuário: ${error.message}`);
};