import { inserirLeituraRaw, buscarEtiquetaPorEpc, registrarMovimentacao, buscarLeitorPorId, atualizarStatusEtiqueta } from '../models/rfidModel.js';
import { verificarEstoqueMinimo, verificarValidadeLote, verificarEtiquetaInativa } from './alertaService.js';

/**
 * Inferência do tipo de movimentação baseada na localização do leitor.
 * Assume palavras-chave no campo `localizacao`:
 *   - Contém "SAÍDA" ou "SAIDA" → SAÍDA
 *   - Contém "TRANSFER" → TRANSFERÊNCIA
 *   - Qualquer outro → ENTRADA
 */
const inferirTipoMovimentacao = (localizacao = '') => {
  const loc = localizacao.toUpperCase();
  if (loc.includes('SAÍDA') || loc.includes('SAIDA') || loc.includes('SAIDA')) return 'SAÍDA';
  if (loc.includes('TRANSFER')) return 'TRANSFERÊNCIA';
  return 'ENTRADA';
};

/**
 * Processa uma leitura RFID recebida do hardware:
 * 1. Grava em leitura_rfid_raw
 * 2. Busca rfid_etiqueta pelo epc
 * 3. Registra movimentacao_estoque (id_usuario = null — automático)
 * 4. Dispara verificações de alerta
 *
 * @param {string} epc - Código EPC da etiqueta RFID
 * @param {number} id_leitor - ID do leitor que captou a leitura
 * @param {number|null} rssi - Intensidade do sinal (opcional)
 * @returns {object} Resultado do processamento
 */
export const processarLeituraRaw = async (epc, id_leitor, rssi = null) => {
  const resultado = {
    leitura_raw: null,
    etiqueta: null,
    movimentacao: null,
    alertas: [],
    avisos: [],
  };

  // 1. Grava leitura bruta (sempre, independente de ter etiqueta cadastrada)
  resultado.leitura_raw = await inserirLeituraRaw(epc, id_leitor, rssi);

  // 2. Busca etiqueta pelo EPC
  const etiqueta = await buscarEtiquetaPorEpc(epc);
  if (!etiqueta) {
    resultado.avisos.push(`EPC ${epc} não encontrado no cadastro de etiquetas.`);
    return resultado;
  }
  resultado.etiqueta = etiqueta;

  // 3. Verifica se a etiqueta está ativa
  if (etiqueta.status !== 'ATIVO') {
    resultado.avisos.push(`Etiqueta EPC ${epc} está com status "${etiqueta.status}".`);
    // Ainda gera alerta mas não registra movimentação
    try {
      const alertaEtiqueta = await verificarEtiquetaInativa(etiqueta);
      if (alertaEtiqueta) resultado.alertas.push(alertaEtiqueta);
    } catch (e) {
      resultado.avisos.push(`Aviso ao gerar alerta de etiqueta: ${e.message}`);
    }
    return resultado;
  }

  // 4. Busca leitor para inferir tipo de movimentação
  const leitor = await buscarLeitorPorId(id_leitor);
  const tipoMovimentacao = leitor
    ? inferirTipoMovimentacao(leitor.localizacao)
    : 'ENTRADA';

  // 5. Registra movimentação (id_usuario = null → automático via RFID)
  resultado.movimentacao = await registrarMovimentacao(
    tipoMovimentacao,
    etiqueta.id_pacote,
    id_leitor,
    null // id_usuario nullable — movimentação automática
  );

  // 6. Verificações de alerta em paralelo (não bloqueiam o fluxo principal)
  const id_lote = etiqueta.pacote?.lote?.id_lote;
  const id_produto = etiqueta.pacote?.lote?.produto?.id_produto;
  const estoque_minimo = etiqueta.pacote?.lote?.produto?.estoque_minimo;

  if (id_lote) {
    try {
      const alertaValidade = await verificarValidadeLote(id_lote, etiqueta.pacote.lote);
      if (alertaValidade) resultado.alertas.push(alertaValidade);
    } catch (e) {
      resultado.avisos.push(`Aviso ao verificar validade: ${e.message}`);
    }
  }

  if (id_produto && estoque_minimo !== undefined) {
    try {
      const alertaEstoque = await verificarEstoqueMinimo(id_produto, estoque_minimo);
      if (alertaEstoque) resultado.alertas.push(alertaEstoque);
    } catch (e) {
      resultado.avisos.push(`Aviso ao verificar estoque: ${e.message}`);
    }
  }

  return resultado;
};
