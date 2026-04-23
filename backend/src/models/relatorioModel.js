import supabase from '../config/supabase.js';

export const listarRelatorios = async (filtros = {}) => {
  let query = supabase
    .from('relatorio')
    .select('*, usuario ( nome, email )')
    .order('data_geracao', { ascending: false });

  if (filtros.id_usuario) query = query.eq('id_usuario', filtros.id_usuario);
  if (filtros.tipo_relatorio) query = query.eq('tipo_relatorio', filtros.tipo_relatorio);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar relatórios: ${error.message}`);
  return data;
};

export const criarRelatorio = async (tipo_relatorio, id_usuario) => {
  const { data, error } = await supabase
    .from('relatorio')
    .insert([{ tipo_relatorio, id_usuario }])
    .select('*, usuario ( nome, email )')
    .single();
  if (error) throw new Error(`Erro ao criar relatório: ${error.message}`);
  return data;
};
