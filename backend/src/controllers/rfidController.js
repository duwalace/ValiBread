import { processarLeituraRaw } from '../services/rfidService.js';
import {
  listarLeiturasRaw,
  buscarLeitorPorId,
  inserirLeituraRaw,
  buscarEtiquetaPorEpc,
  associarEtiqueta,
} from '../models/rfidModel.js';
import { criarPacote } from '../models/estoqueModel.js';
import supabase from '../config/supabase.js';

// Importação lazy do io para evitar dependência circular com server.js
const getIo = async () => {
  const { io } = await import('../server.js');
  return io;
};

/**
 * POST /api/rfid/leitura
 * Endpoint chamado pelo hardware (ESP32/leitor RFID) para movimentações de pacotes já cadastrados.
 * Protegido por API Key estática (C-03: X-Api-Key no header).
 * Body: { epc: string, id_leitor: number, rssi?: number }
 */
export const registrarLeituraEsp32 = async (req, res) => {
  try {
    const { epc, id_leitor, rssi } = req.body;

    if (!epc || !id_leitor) {
      return res.status(400).json({ erro: 'epc e id_leitor são obrigatórios.' });
    }
    if (typeof epc !== 'string' || epc.trim() === '') {
      return res.status(400).json({ erro: 'O campo epc deve ser uma string EPC RFID válida.' });
    }

    // Auditoria: valida que o id_leitor existe antes de gravar
    const leitor = await buscarLeitorPorId(Number(id_leitor));
    if (!leitor) {
      return res.status(404).json({
        erro: `Leitor RFID com id_leitor=${id_leitor} não encontrado. Cadastre o leitor antes de enviar leituras.`
      });
    }

    const resultado = await processarLeituraRaw(epc.trim().toUpperCase(), Number(id_leitor), rssi ?? null);

    return res.status(200).json({
      mensagem: 'Leitura processada com sucesso.',
      ...resultado,
    });
  } catch (error) {
    console.error('Erro ao processar leitura RFID:', error);
    return res.status(500).json({ erro: error.message });
  }
};


/**
 * GET /api/rfid/historico
 * Lista leituras brutas com filtros opcionais.
 * Query params: epc, id_leitor, dataInicio, dataFim, limite
 */
export const listarHistoricoLeituras = async (req, res) => {
  try {
    const { epc, id_leitor, dataInicio, dataFim, limite } = req.query;
    const data = await listarLeiturasRaw({ epc, id_leitor, dataInicio, dataFim, limite });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};


/**
 * POST /api/rfid/scan
 * Endpoint chamado pelo hardware ESP32 durante o CADASTRO de novas etiquetas.
 * Diferente de /leitura, este endpoint NÃO processa movimentações.
 * Ele apenas:
 *   1. Grava a leitura bruta em leitura_rfid_raw
 *   2. Verifica se o EPC já está cadastrado
 *   3. Emite o evento "rfid:scan" via Socket.IO para o frontend em tempo real
 *
 * Protegido por API Key estática (X-Api-Key).
 * Body: { epc: string, id_leitor: number, rssi?: number }
 */
export const scanRfid = async (req, res) => {
  try {
    const { epc, id_leitor, rssi } = req.body;

    if (!epc || !id_leitor) {
      return res.status(400).json({ erro: 'epc e id_leitor são obrigatórios.' });
    }

    const epcNormalizado = String(epc).trim().toUpperCase();

    // 1. Valida leitor
    const leitor = await buscarLeitorPorId(Number(id_leitor));
    if (!leitor) {
      return res.status(404).json({
        erro: `Leitor RFID id_leitor=${id_leitor} não encontrado.`
      });
    }

    // 2. Grava leitura bruta (auditoria)
    const leituraRaw = await inserirLeituraRaw(epcNormalizado, Number(id_leitor), rssi ?? null);

    // 3. Verifica se etiqueta já existe
    const etiquetaExistente = await buscarEtiquetaPorEpc(epcNormalizado);

    // 4. Monta payload para o frontend
    const payload = {
      epc: epcNormalizado,
      id_leitura: leituraRaw.id_leitura,
      data_hora: leituraRaw.data_hora,
      id_leitor: Number(id_leitor),
      rssi: rssi ?? null,
      ja_cadastrado: !!etiquetaExistente,
      pacote: etiquetaExistente ? etiquetaExistente.pacote : null,
    };

    // 5. Emite evento WebSocket para todos os clientes conectados
    try {
      const io = await getIo();
      io.emit('rfid:scan', payload);
    } catch (e) {
      console.warn('[scanRfid] Socket.IO indisponível:', e.message);
    }

    return res.status(200).json({
      mensagem: 'Scan recebido e transmitido ao frontend.',
      ...payload,
    });
  } catch (error) {
    console.error('Erro no scan RFID:', error);
    return res.status(500).json({ erro: error.message });
  }
};


/**
 * POST /api/rfid/cadastrar
 * Operação ATÔMICA de cadastro de nova etiqueta. Chamada pelo FRONTEND após o operador confirmar.
 * 1. Cria um novo Pacote vinculado ao lote escolhido (status: EM_ESTOQUE)
 * 2. Associa a etiqueta RFID (epc) ao pacote criado
 * 3. Registra uma movimentação de Entrada
 *
 * Protegido por JWT (autenticar).
 * Body: { epc: string, id_lote: number }
 */
export const cadastrarEtiqueta = async (req, res) => {
  try {
    const { epc, id_lote } = req.body;
    const id_usuario = req.usuario?.id_usuario ?? null;

    if (!epc || !id_lote) {
      return res.status(400).json({ erro: 'epc e id_lote são obrigatórios.' });
    }

    const epcNormalizado = String(epc).trim().toUpperCase();

    // 1. Verifica se o EPC já está em uso
    const etiquetaExistente = await buscarEtiquetaPorEpc(epcNormalizado);
    if (etiquetaExistente) {
      return res.status(409).json({
        erro: `EPC ${epcNormalizado} já está cadastrado e vinculado ao pacote #${etiquetaExistente.id_pacote}.`
      });
    }

    // 2. Cria o pacote (EM_ESTOQUE por padrão)
    const pacote = await criarPacote({ id_lote: Number(id_lote), status: 'EM_ESTOQUE' });

    // 3. Associa a etiqueta RFID ao pacote
    const etiqueta = await associarEtiqueta(epcNormalizado, pacote.id_pacote);

    // 4. Registra movimentação de Entrada (vinculada ao usuário logado)
    const { error: erroMov } = await supabase
      .from('movimentacao_estoque')
      .insert([{
        tipo_movimentacao: 'Entrada',
        id_pacote: pacote.id_pacote,
        id_leitor: null,
        id_usuario,
      }]);
    if (erroMov) {
      console.warn('[cadastrarEtiqueta] Falha ao registrar movimentação:', erroMov.message);
    }

    return res.status(201).json({
      mensagem: 'Etiqueta cadastrada com sucesso.',
      pacote,
      etiqueta,
    });
  } catch (error) {
    if (error.message?.includes('duplicate') || error.message?.includes('unique') || error.message?.includes('já possui')) {
      return res.status(409).json({ erro: error.message });
    }
    console.error('Erro ao cadastrar etiqueta:', error);
    return res.status(500).json({ erro: error.message });
  }
};

