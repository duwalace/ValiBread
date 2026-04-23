import { listarEtiquetas, associarEtiqueta, atualizarStatusEtiqueta } from '../models/rfidModel.js';

export const listar = async (req, res) => {
  try {
    const { status, epc } = req.query;
    const data = await listarEtiquetas({ status, epc });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const associar = async (req, res) => {
  try {
    const { epc, id_pacote } = req.body;
    if (!epc || !id_pacote) {
      return res.status(400).json({ erro: 'epc e id_pacote são obrigatórios.' });
    }
    if (typeof epc !== 'string' || epc.trim() === '') {
      return res.status(400).json({ erro: 'O campo epc deve ser uma string EPC RFID válida (ex: E2000017220101181390E9FB).' });
    }
    const data = await associarEtiqueta(epc.trim().toUpperCase(), Number(id_pacote));
    return res.status(201).json(data);
  } catch (error) {
    // Erro de UNIQUE constraint (epc ou id_pacote duplicado)
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return res.status(409).json({ erro: 'EPC já cadastrado ou pacote já possui etiqueta.' });
    }
    return res.status(400).json({ erro: error.message });
  }
};

export const atualizarStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ erro: 'Campo status é obrigatório.' });
    const data = await atualizarStatusEtiqueta(req.params.id, status);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};
