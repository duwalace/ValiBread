import { 
  inserirLeituraRaw, 
  buscarEtiquetaPorEpc, 
  registrarMovimentacao, 
  buscarLeitorPorId, 
  atualizarStatusEtiqueta,
  buscarStatusPacote,
  atualizarStatusPacote
} from '../models/rfidModel.js';
import { verificarEstoqueMinimo, verificarValidadeLote, verificarEtiquetaInativa } from './alertaService.js';

/**
 * Resolve o tipo de movimentação a partir do campo `tipo_operacao` do leitor.
 * Fallback: se o campo não existir (leitor antigo), infere pela localização.
 *
 * tipos aceitos pela movimentacao_estoque:
 *   'Entrada' | 'Saída' | 'Transferência'
 *
 * Há também 'SEPARACAO' como estado intermediário do pacote (não é tipo de movimentacao).
 */
const resolverTipoMovimentacao = (leitor) => {
  if (!leitor) return 'Entrada';

  // Usa tipo_operacao se o campo existir na linha do banco
  if (leitor.tipo_operacao) {
    return leitor.tipo_operacao; // 'Entrada' | 'Saída' | 'Transferência'
  }

  // Fallback legado: inferência por localização (campo de texto livre)
  const loc = (leitor.localizacao || '').toUpperCase();
  if (loc.includes('SAÍDA') || loc.includes('SAIDA')) return 'Saída';
  if (loc.includes('TRANSFER')) return 'Transferência';
  return 'Entrada';
};

/**
 * Processa uma leitura RFID recebida do hardware:
 * 1. Grava em leitura_rfid_raw
 * 2. Busca rfid_etiqueta pelo epc
 * 3. Registra movimentacao_estoque com tipo definido pelo campo tipo_operacao do leitor
 * 4. Atualiza status do pacote conforme o tipo de movimentação
 * 5. Dispara verificações de alerta
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
    try {
      const alertaEtiqueta = await verificarEtiquetaInativa(etiqueta);
      if (alertaEtiqueta) resultado.alertas.push(alertaEtiqueta);
    } catch (e) {
      resultado.avisos.push(`Aviso ao gerar alerta de etiqueta: ${e.message}`);
    }
    return resultado;
  }

  // 4. Resolve tipo de movimentação pelo campo tipo_operacao do leitor
  const leitor = await buscarLeitorPorId(id_leitor);
  const tipoMovimentacao = resolverTipoMovimentacao(leitor);

  // 5. Mapeia tipo de movimentação para novo status do pacote
  const statusAtual = await buscarStatusPacote(etiqueta.id_pacote);
  let novoStatus = statusAtual;

  if (tipoMovimentacao === 'Saída') {
    if (statusAtual !== 'EM_ESTOQUE' && statusAtual !== 'SEPARADO') {
      resultado.avisos.push(`Pacote não pode sair. Status atual: ${statusAtual}`);
      return resultado;
    }
    novoStatus = 'EXPEDIDO';
  } else if (tipoMovimentacao === 'Entrada' || tipoMovimentacao === 'Transferência') {
    novoStatus = 'EM_ESTOQUE';
  }

  // Atualiza status do pacote se mudou
  if (novoStatus !== statusAtual) {
    await atualizarStatusPacote(etiqueta.id_pacote, novoStatus);
  }

  // 6. Registra movimentação (id_usuario = null → automático via RFID)
  resultado.movimentacao = await registrarMovimentacao(
    tipoMovimentacao,
    etiqueta.id_pacote,
    id_leitor,
    null // id_usuario nullable — movimentação automática
  );

  // 7. Verificações de alerta em paralelo (não bloqueiam o fluxo principal)
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
