import supabase from '../config/supabase.js';

// ─────────────────────────────────────────────
// LEITOR RFID
// ─────────────────────────────────────────────

export const listarLeitores = async () => {
  const { data, error } = await supabase
    .from('leitor_rfid')
    .select('*')
    .order('id_leitor', { ascending: true });
  if (error) throw new Error(`Erro ao listar leitores: ${error.message}`);
  return data;
};

export const buscarLeitorPorId = async (id) => {
  const { data, error } = await supabase
    .from('leitor_rfid')
    .select('*')
    .eq('id_leitor', id)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(`Erro ao buscar leitor: ${error.message}`);
  return data;
};

export const criarLeitor = async (dados) => {
  const { data, error } = await supabase
    .from('leitor_rfid')
    .insert([dados])
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar leitor: ${error.message}`);
  return data;
};

export const atualizarLeitor = async (id, dados) => {
  const { data, error } = await supabase
    .from('leitor_rfid')
    .update(dados)
    .eq('id_leitor', id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar leitor: ${error.message}`);
  return data;
};

// ─────────────────────────────────────────────
// RFID ETIQUETA
// ─────────────────────────────────────────────

export const listarEtiquetas = async (filtros = {}) => {
  let query = supabase
    .from('rfid_etiqueta')
    .select('*, pacote ( id_pacote, lote ( codigo_lote, produto ( nome ) ) )')
    .order('data_associacao', { ascending: false });

  if (filtros.status) query = query.eq('status', filtros.status);
  if (filtros.epc) query = query.ilike('epc', `%${filtros.epc}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar etiquetas: ${error.message}`);
  return data;
};

export const buscarEtiquetaPorEpc = async (epc) => {
  const { data, error } = await supabase
    .from('rfid_etiqueta')
    .select('*, pacote ( id_pacote, lote ( id_lote, codigo_lote, data_validade, produto ( id_produto, nome, estoque_minimo ) ) )')
    .eq('epc', epc)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(`Erro ao buscar etiqueta por EPC: ${error.message}`);
  return data;
};

export const buscarEtiquetaPorPacote = async (id_pacote) => {
  const { data, error } = await supabase
    .from('rfid_etiqueta')
    .select('*')
    .eq('id_pacote', id_pacote)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(`Erro ao buscar etiqueta por pacote: ${error.message}`);
  return data;
};

export const associarEtiqueta = async (epc, id_pacote) => {
  // Verifica se o pacote já tem etiqueta ativa
  const etiquetaExistente = await buscarEtiquetaPorPacote(id_pacote);
  if (etiquetaExistente && etiquetaExistente.status === 'ATIVO') {
    throw new Error('Este pacote já possui uma etiqueta RFID ativa associada.');
  }

  const { data, error } = await supabase
    .from('rfid_etiqueta')
    .insert([{ epc, id_pacote, status: 'ATIVO' }])
    .select()
    .single();
  if (error) throw new Error(`Erro ao associar etiqueta: ${error.message}`);
  return data;
};

export const atualizarStatusEtiqueta = async (id, status) => {
  const statusValidos = ['ATIVO', 'INATIVO', 'EXTRAVIADO'];
  if (!statusValidos.includes(status)) {
    throw new Error(`Status inválido. Use: ${statusValidos.join(', ')}`);
  }
  const { data, error } = await supabase
    .from('rfid_etiqueta')
    .update({ status })
    .eq('id_rfid', id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar status da etiqueta: ${error.message}`);
  return data;
};

// ─────────────────────────────────────────────
// MOVIMENTAÇÃO DE ESTOQUE
// ─────────────────────────────────────────────

export const listarMovimentacoes = async (filtros = {}) => {
  let query = supabase
    .from('movimentacao_estoque')
    .select(`
      id_movimentacao,
      tipo_movimentacao,
      data_hora,
      id_leitor,
      id_pacote,
      id_usuario,
      leitor_rfid ( codigo_equipamento, localizacao ),
      pacote ( lote ( codigo_lote, produto ( nome ) ) ),
      usuario ( nome, email )
    `)
    .order('data_hora', { ascending: false });

  if (filtros.tipo_movimentacao) query = query.eq('tipo_movimentacao', filtros.tipo_movimentacao);
  if (filtros.id_leitor) query = query.eq('id_leitor', filtros.id_leitor);
  if (filtros.id_pacote) query = query.eq('id_pacote', filtros.id_pacote);
  if (filtros.dataInicio) query = query.gte('data_hora', filtros.dataInicio);
  if (filtros.dataFim) query = query.lte('data_hora', filtros.dataFim);
  if (filtros.limite) query = query.limit(filtros.limite);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar movimentações: ${error.message}`);
  return data;
};

export const registrarMovimentacao = async (tipo_movimentacao, id_pacote, id_leitor = null, id_usuario = null) => {
  const tiposValidos = ['ENTRADA', 'SAÍDA', 'TRANSFERÊNCIA'];
  if (!tiposValidos.includes(tipo_movimentacao)) {
    throw new Error(`Tipo de movimentação inválido. Use: ${tiposValidos.join(', ')}`);
  }

  const { data, error } = await supabase
    .from('movimentacao_estoque')
    .insert([{ tipo_movimentacao, id_pacote, id_leitor, id_usuario }])
    .select()
    .single();
  if (error) throw new Error(`Erro ao registrar movimentação: ${error.message}`);
  return data;
};

// ─────────────────────────────────────────────
// LEITURA RFID RAW
// ─────────────────────────────────────────────

export const listarLeiturasRaw = async (filtros = {}) => {
  let query = supabase
    .from('leitura_rfid_raw')
    .select('*, leitor_rfid ( codigo_equipamento, localizacao )')
    .order('data_hora', { ascending: false });

  if (filtros.epc) query = query.ilike('epc', `%${filtros.epc}%`);
  if (filtros.id_leitor) query = query.eq('id_leitor', filtros.id_leitor);
  if (filtros.dataInicio) query = query.gte('data_hora', filtros.dataInicio);
  if (filtros.dataFim) query = query.lte('data_hora', filtros.dataFim);
  if (filtros.limite) query = query.limit(Number(filtros.limite));
  else query = query.limit(100); // Limite padrão

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar leituras raw: ${error.message}`);
  return data;
};

export const inserirLeituraRaw = async (epc, id_leitor, rssi = null) => {
  const { data, error } = await supabase
    .from('leitura_rfid_raw')
    .insert([{ epc, id_leitor, rssi }])
    .select()
    .single();
  if (error) throw new Error(`Erro ao inserir leitura raw: ${error.message}`);
  return data;
};
