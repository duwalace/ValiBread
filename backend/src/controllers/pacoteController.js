import { listarPacotes, criarPacote, atualizarPacoteStatus, deletarPacote } from '../models/estoqueModel.js';

export const listar = async (req, res) => {
  try {
    const { id_lote } = req.query;
    const data = await listarPacotes({ id_lote });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const criar = async (req, res) => {
  try {
    const { id_lote } = req.body;
    if (!id_lote) return res.status(400).json({ erro: 'id_lote é obrigatório.' });
    const data = await criarPacote({ id_lote: Number(id_lote) });
    return res.status(201).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};

export const atualizarStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ erro: 'Campo status é obrigatório.' });
    const data = await atualizarPacoteStatus(req.params.id, status);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};

export const deletar = async (req, res) => {
  try {
    await deletarPacote(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};
