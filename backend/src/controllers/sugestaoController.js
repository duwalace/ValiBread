import { listarSugestoes, criarSugestao } from '../models/estoqueModel.js';

export const listar = async (req, res) => {
  try {
    const { id_produto } = req.query;
    const data = await listarSugestoes({ id_produto });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const gerar = async (req, res) => {
  try {
    const { id_produto, quantidade_sugerida } = req.body;
    if (!id_produto || !quantidade_sugerida) {
      return res.status(400).json({ erro: 'id_produto e quantidade_sugerida são obrigatórios.' });
    }
    const data = await criarSugestao(Number(id_produto), Number(quantidade_sugerida));
    return res.status(201).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};
