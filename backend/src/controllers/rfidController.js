import { processarLeituraRaw } from '../services/rfidService.js';
import { listarLeiturasRaw, buscarLeitorPorId } from '../models/rfidModel.js';

/**
 * POST /api/rfid/leitura
 * Endpoint chamado pelo hardware (ESP32/leitor RFID).
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

    // Auditoria Passo 1: validar que o id_leitor existe antes de gravar
    // Sem isso: FK violation do Postgres → HTTP 500 com mensagem crua
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
