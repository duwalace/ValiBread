import supabase from '../config/supabase.js';

// ─────────────────────────────────────────────
// PRODUTO
// ─────────────────────────────────────────────

export const listarProdutos = async () => {
  const { data, error } = await supabase
    .from('produto')
    .select('*')
    .order('nome', { ascending: true });
  if (error) throw new Error(`Erro ao listar produtos: ${error.message}`);
  return data;
};

export const buscarProdutoPorId = async (id) => {
  const { data, error } = await supabase
    .from('produto')
    .select('*')
    .eq('id_produto', id)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(`Erro ao buscar produto: ${error.message}`);
  return data;
};

export const criarProduto = async (dados) => {
  const { data, error } = await supabase
    .from('produto')
    .insert([dados])
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar produto: ${error.message}`);
  return data;
};

export const atualizarProduto = async (id, dados) => {
  const { data, error } = await supabase
    .from('produto')
    .update(dados)
    .eq('id_produto', id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar produto: ${error.message}`);
  return data;
};

export const deletarProduto = async (id) => {
  // Verifica se há lotes vinculados antes de excluir
  const { count, error: erroContagem } = await supabase
    .from('lote')
    .select('*', { count: 'exact', head: true })
    .eq('id_produto', id);
  if (erroContagem) throw new Error(`Erro ao verificar lotes: ${erroContagem.message}`);
  if (count > 0) throw new Error(`Não é possível excluir o produto: há ${count} lote(s) vinculado(s).`);

  const { error } = await supabase.from('produto').delete().eq('id_produto', id);
  if (error) throw new Error(`Erro ao deletar produto: ${error.message}`);
};

// ─────────────────────────────────────────────
// LOTE
// ─────────────────────────────────────────────

export const listarLotes = async (filtros = {}) => {
  let query = supabase
    .from('lote')
    .select('*, produto ( id_produto, nome, estoque_minimo )')
    .order('data_validade', { ascending: true });

  if (filtros.id_produto) query = query.eq('id_produto', filtros.id_produto);
  if (filtros.status) query = query.eq('status', filtros.status);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar lotes: ${error.message}`);
  return data;
};

export const buscarLotePorId = async (id) => {
  const { data, error } = await supabase
    .from('lote')
    .select('*, produto ( id_produto, nome, estoque_minimo )')
    .eq('id_lote', id)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(`Erro ao buscar lote: ${error.message}`);
  return data;
};

export const criarLote = async (dados) => {
  const { data, error } = await supabase
    .from('lote')
    .insert([dados])
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar lote: ${error.message}`);
  return data;
};

export const atualizarLote = async (id, dados) => {
  const { data, error } = await supabase
    .from('lote')
    .update(dados)
    .eq('id_lote', id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar lote: ${error.message}`);
  return data;
};

export const deletarLote = async (id) => {
  // Verifica se há pacotes vinculados
  const { count, error: erroContagem } = await supabase
    .from('pacote')
    .select('*', { count: 'exact', head: true })
    .eq('id_lote', id);
  if (erroContagem) throw new Error(`Erro ao verificar pacotes: ${erroContagem.message}`);
  if (count > 0) throw new Error(`Não é possível excluir o lote: há ${count} pacote(s) vinculado(s).`);

  const { error } = await supabase.from('lote').delete().eq('id_lote', id);
  if (error) throw new Error(`Erro ao deletar lote: ${error.message}`);
};

// ─────────────────────────────────────────────
// PACOTE
// ─────────────────────────────────────────────

export const listarPacotes = async (filtros = {}) => {
  let query = supabase
    .from('pacote')
    .select(`
      id_pacote,
      lote ( id_lote, codigo_lote, data_validade, status, produto ( nome ) ),
      rfid_etiqueta ( id_rfid, epc, status, data_associacao )
    `)
    .order('id_pacote', { ascending: false });

  if (filtros.id_lote) query = query.eq('id_lote', filtros.id_lote);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar pacotes: ${error.message}`);
  return data;
};

export const criarPacote = async (dados) => {
  const { data, error } = await supabase
    .from('pacote')
    .insert([dados])
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar pacote: ${error.message}`);
  return data;
};

// ─────────────────────────────────────────────
// ALERTA
// ─────────────────────────────────────────────

export const listarAlertas = async (filtros = {}) => {
  let query = supabase
    .from('alerta')
    .select('*, lote ( id_lote, codigo_lote, produto ( nome ) )')
    .order('data_hora', { ascending: false });

  if (filtros.tipo_alerta) query = query.eq('tipo_alerta', filtros.tipo_alerta);
  if (filtros.id_lote) query = query.eq('id_lote', filtros.id_lote);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar alertas: ${error.message}`);
  return data;
};

export const criarAlerta = async (tipo_alerta, mensagem, id_lote) => {
  const { data, error } = await supabase
    .from('alerta')
    .insert([{ tipo_alerta, mensagem, id_lote }])
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar alerta: ${error.message}`);
  return data;
};

export const deletarAlerta = async (id) => {
  const { error } = await supabase.from('alerta').delete().eq('id_alerta', id);
  if (error) throw new Error(`Erro ao deletar alerta: ${error.message}`);
};

// ─────────────────────────────────────────────
// SUGESTÃO DE REPOSIÇÃO
// ─────────────────────────────────────────────

export const listarSugestoes = async (filtros = {}) => {
  let query = supabase
    .from('sugestao_reposicao')
    .select('*, produto ( id_produto, nome, estoque_minimo )')
    .order('data_sugestao', { ascending: false });

  if (filtros.id_produto) query = query.eq('id_produto', filtros.id_produto);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar sugestões: ${error.message}`);
  return data;
};

export const criarSugestao = async (id_produto, quantidade_sugerida) => {
  const { data, error } = await supabase
    .from('sugestao_reposicao')
    .insert([{ id_produto, quantidade_sugerida }])
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar sugestão: ${error.message}`);
  return data;
};
