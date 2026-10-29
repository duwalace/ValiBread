import supabase from '../config/supabase.js';

const exigirSucesso = (error, operacao) => {
  if (error) throw new Error(`Erro ao ${operacao}: ${error.message}`);
};

export const listarRelatorios = async (filtros = {}) => {
  let consulta = supabase
    .from('relatorio')
    .select('id_relatorio, tipo_relatorio, data_geracao, id_usuario, usuario:usuario!fk_relatorio_usuario(nome, email)');

  if (filtros.id_usuario) consulta = consulta.eq('id_usuario', filtros.id_usuario);
  if (filtros.tipo_relatorio) consulta = consulta.eq('tipo_relatorio', filtros.tipo_relatorio);

  const { data, error } = await consulta.order('data_geracao', { ascending: false });
  exigirSucesso(error, 'listar relatórios');
  return data ?? [];
};

export const criarRelatorio = async (tipo_relatorio, id_usuario) => {
  const { data, error } = await supabase
    .from('relatorio')
    .insert({ tipo_relatorio, id_usuario })
    .select('id_relatorio, tipo_relatorio, data_geracao, id_usuario, usuario:usuario!fk_relatorio_usuario(nome, email)')
    .single();

  exigirSucesso(error, 'criar relatório');
  return data;
};
