/**
 * dispositivoController.js
 * ========================
 * Endpoints dedicados ao leitor RFID físico (ESP32).
 * Autenticados por API Key estática (X-Api-Key), sem JWT.
 *
 * Rotas:
 *   POST   /api/rfid/dispositivo/cadastrar  — Cadastro atômico de nova etiqueta
 *   POST   /api/rfid/dispositivo/consultar  — Consulta dados de uma tag
 *   POST   /api/rfid/dispositivo/saida      — Registra saída de uma tag
 *   DELETE /api/rfid/dispositivo/excluir    — Exclui registro de uma tag
 */

import supabase from '../config/supabase.js';
import { buscarEtiquetaPorEpc } from '../models/rfidModel.js';

// ─────────────────────────────────────────────────────────────
// HELPER: busca etiqueta com join completo para o dispositivo
// ─────────────────────────────────────────────────────────────
const buscarEtiquetaCompleta = async (epc) => {
  const { data, error } = await supabase
    .from('rfid_etiqueta')
    .select(`
      epc,
      status,
      pacote (
        id_pacote,
        status,
        quantidade,
        setor,
        lote (
          id_lote,
          codigo_lote,
          produto ( id_produto, nome )
        )
      )
    `)
    .eq('epc', epc)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data;
};

// ─────────────────────────────────────────────────────────────
// POST /api/rfid/dispositivo/cadastrar
// Body: { epc, produto, quantidade, setor, lote }
//   produto   — nome do produto (string, armazenado localmente no ESP32)
//   quantidade — número inteiro
//   setor      — nome do setor (string, armazenado localmente no ESP32)
//   lote       — número de 2 dígitos (integer 00–99)
// ─────────────────────────────────────────────────────────────
export const cadastrar = async (req, res) => {
  try {
    const { epc, produto, quantidade, setor, lote } = req.body;

    if (!epc || produto === undefined || quantidade === undefined || setor === undefined || lote === undefined) {
      return res.status(400).json({ erro: 'Campos obrigatórios: epc, produto, quantidade, setor, lote.' });
    }

    const epcNorm = String(epc).trim().toUpperCase();

    // ── Validação: tag já cadastrada? ──
    const existente = await buscarEtiquetaPorEpc(epcNorm);
    if (existente) {
      return res.status(409).json({ erro: 'Esta fita já está cadastrada.' });
    }

    // ── Busca (ou cria) produto pelo nome ──
    // Usa .limit(1) em vez de .single() para tolerar nomes duplicados sem lançar erro
    const { data: produtosEncontrados } = await supabase
      .from('produto')
      .select('id_produto, nome')
      .ilike('nome', produto.trim())
      .limit(1);

    let produtoReg = produtosEncontrados?.[0] ?? null;

    if (!produtoReg) {
      const { data: novoProduto, error: errProd } = await supabase
        .from('produto')
        .insert([{ nome: produto.trim(), estoque_minimo: 0 }])
        .select()
        .single();
      if (errProd) throw new Error(`Erro ao criar produto: ${errProd.message}`);
      produtoReg = novoProduto;
    }

    // ── Busca (ou cria) lote pelo código e produto ──
    // Usa .limit(1) em vez de .single() para tolerar lotes duplicados sem lançar erro
    const codigoLote = String(lote).padStart(2, '0');
    const { data: lotesEncontrados } = await supabase
      .from('lote')
      .select('id_lote, codigo_lote')
      .eq('codigo_lote', codigoLote)
      .eq('id_produto', produtoReg.id_produto)
      .limit(1);

    let loteReg = lotesEncontrados?.[0] ?? null;

    if (!loteReg) {
      const { data: novoLote, error: errLote } = await supabase
        .from('lote')
        .insert([{ codigo_lote: codigoLote, id_produto: produtoReg.id_produto }])
        .select()
        .single();
      if (errLote) throw new Error(`Erro ao criar lote: ${errLote.message}`);
      loteReg = novoLote;
    }

    // ── Cria pacote (EM_ESTOQUE) com quantidade e setor ──
    const { data: pacote, error: errPacote } = await supabase
      .from('pacote')
      .insert([{
        id_lote: loteReg.id_lote,
        status: 'EM_ESTOQUE',
        quantidade: Number(quantidade),
        setor: String(setor).trim(),
      }])
      .select()
      .single();
    if (errPacote) throw new Error(`Erro ao criar pacote: ${errPacote.message}`);

    // ── Associa a etiqueta RFID ao pacote ──
    const { data: etiqueta, error: errEtiq } = await supabase
      .from('rfid_etiqueta')
      .insert([{ epc: epcNorm, id_pacote: pacote.id_pacote, status: 'ATIVO' }])
      .select()
      .single();
    if (errEtiq) {
      // I-6: Rollback — remove pacote órfão criado antes da falha na etiqueta
      await supabase.from('pacote').delete().eq('id_pacote', pacote.id_pacote);
      throw new Error(`Erro ao associar etiqueta: ${errEtiq.message}`);
    }

    // ── Registra movimentação de Entrada ──
    await supabase.from('movimentacao_estoque').insert([{
      tipo_movimentacao: 'Entrada',
      id_pacote: pacote.id_pacote,
      id_leitor: null,
      id_usuario: null,
    }]);

    return res.status(201).json({
      mensagem: 'Cadastro realizado com sucesso.',
      epc: epcNorm,
      produto: produtoReg.nome,
      quantidade: pacote.quantidade,
      setor: pacote.setor,
      lote: loteReg.codigo_lote,
    });
  } catch (error) {
    console.error('[dispositivoController.cadastrar]', error.message);
    return res.status(500).json({ erro: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/rfid/dispositivo/consultar
// Body: { epc }
// Retorna os dados do registro ou 404 se não cadastrado
// ─────────────────────────────────────────────────────────────
export const consultar = async (req, res) => {
  try {
    const { epc } = req.body;
    if (!epc) return res.status(400).json({ erro: 'Campo epc é obrigatório.' });

    const epcNorm = String(epc).trim().toUpperCase();
    const etiqueta = await buscarEtiquetaCompleta(epcNorm);

    if (!etiqueta) {
      return res.status(404).json({ erro: 'Registro não encontrado.' });
    }

    const pacote = etiqueta.pacote;
    const lote   = pacote?.lote;
    const prod   = lote?.produto;

    return res.status(200).json({
      epc: epcNorm,
      produto:    prod?.nome   ?? 'N/D',
      quantidade: pacote?.quantidade ?? 0,
      setor:      pacote?.setor      ?? 'N/D',
      lote:       lote?.codigo_lote  ?? 'N/D',
      situacao:   pacote?.status     ?? 'N/D',  // 'EM_ESTOQUE' | 'EXPEDIDO' | 'SEPARADO'
    });
  } catch (error) {
    console.error('[dispositivoController.consultar]', error.message);
    return res.status(500).json({ erro: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/rfid/dispositivo/saida
// Body: { epc }
// Validações:
//   - Tag deve existir
//   - Situação atual deve ser 'EM_ESTOQUE' (não 'EXPEDIDO')
// ─────────────────────────────────────────────────────────────
export const registrarSaida = async (req, res) => {
  try {
    const { epc } = req.body;
    if (!epc) return res.status(400).json({ erro: 'Campo epc é obrigatório.' });

    const epcNorm = String(epc).trim().toUpperCase();
    const etiqueta = await buscarEtiquetaCompleta(epcNorm);

    if (!etiqueta) {
      return res.status(404).json({ erro: 'Produto não cadastrado.' });
    }

    const pacote = etiqueta.pacote;
    if (pacote?.status === 'EXPEDIDO') {
      return res.status(409).json({ erro: 'Este produto já possui saída registrada.' });
    }

    // ── Atualiza status do pacote para EXPEDIDO ──
    const { error: errUpd } = await supabase
      .from('pacote')
      .update({ status: 'EXPEDIDO' })
      .eq('id_pacote', pacote.id_pacote);
    if (errUpd) throw new Error(`Erro ao atualizar pacote: ${errUpd.message}`);

    // ── Registra movimentação de Saída ──
    await supabase.from('movimentacao_estoque').insert([{
      tipo_movimentacao: 'Saída',
      id_pacote: pacote.id_pacote,
      id_leitor: null,
      id_usuario: null,
    }]);

    return res.status(200).json({ mensagem: 'Saída registrada com sucesso.', epc: epcNorm });
  } catch (error) {
    console.error('[dispositivoController.registrarSaida]', error.message);
    return res.status(500).json({ erro: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/rfid/dispositivo/excluir
// Body: { epc }
// Validações:
//   - Tag deve existir
//   - Exclui independente do status (EM_ESTOQUE ou EXPEDIDO)
//   - Libera o EPC para novo cadastro
// ─────────────────────────────────────────────────────────────
export const excluir = async (req, res) => {
  try {
    const { epc } = req.body;
    if (!epc) return res.status(400).json({ erro: 'Campo epc é obrigatório.' });

    const epcNorm = String(epc).trim().toUpperCase();
    const etiqueta = await buscarEtiquetaCompleta(epcNorm);

    if (!etiqueta) {
      return res.status(404).json({ erro: 'Registro não encontrado.' });
    }

    const id_pacote = etiqueta.pacote?.id_pacote;

    // ── Remove etiqueta RFID (libera o EPC) ──
    const { error: errEtiq } = await supabase
      .from('rfid_etiqueta')
      .delete()
      .eq('epc', epcNorm);
    if (errEtiq) throw new Error(`Erro ao excluir etiqueta: ${errEtiq.message}`);

    // ── Remove movimentações vinculadas ao pacote ──
    if (id_pacote) {
      await supabase
        .from('movimentacao_estoque')
        .delete()
        .eq('id_pacote', id_pacote);

      // ── Remove o pacote ──
      const { error: errPacote } = await supabase
        .from('pacote')
        .delete()
        .eq('id_pacote', id_pacote);
      if (errPacote) throw new Error(`Erro ao excluir pacote: ${errPacote.message}`);
    }

    return res.status(200).json({ mensagem: 'Registro excluído com sucesso.', epc: epcNorm });
  } catch (error) {
    console.error('[dispositivoController.excluir]', error.message);
    return res.status(500).json({ erro: error.message });
  }
};
