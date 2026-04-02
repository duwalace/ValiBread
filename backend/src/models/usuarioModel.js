import supabase from '../config/supabase.js';

export const buscarUsuarioPorEmail = async (email) => {
  // select trazendo o usuário e fazendo um "join" com a tabela perfil
  const { data, error } = await supabase
    .from('usuario')
    .select(`*, perfil ( nome, descricao )`)
    .eq('email', email)
    .single(); // Garante que traga apenas 1 registro ou erro se não achar
  
  if (error && error.code !== 'PGRST116') { // PGRST116 é o erro de "nenhuma linha encontrada"
    throw new Error(`Erro no banco ao buscar usuário: ${error.message}`);
  }
  return data;
};

export const inserirUsuario = async (dadosUsuario) => {
  const { data, error } = await supabase
    .from('usuario')
    .insert([dadosUsuario])
    .select(); // O .select() faz o Supabase devolver os dados do usuário recém-criado
  
  if (error) {
    throw new Error(`Erro ao criar usuário no banco: ${error.message}`);
  }
  
  return data[0]; // Retorna o objeto do usuário criado
};