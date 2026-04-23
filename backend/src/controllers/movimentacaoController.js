import { listarMovimentacoes, registrarMovimentacao } from '../models/rfidModel.js';

export const listar = async (req, res) => {
  try {
    const { tipo_movimentacao, id_leitor, id_pacote, dataInicio, dataFim, limite } = req.query;
    const data = await listarMovimentacoes({ tipo_movimentacao, id_leitor, id_pacote, dataInicio, dataFim, limite });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const registrar = async (req, res) => {
  try {
    const { tipo_movimentacao, id_pacote, id_leitor, id_usuario } = req.body;
    if (!tipo_movimentacao || !id_pacote) {
      return res.status(400).json({ erro: 'tipo_movimentacao e id_pacote são obrigatórios.' });
    }
    // id_usuario e id_leitor são nullable — movimentação manual pode ter usuário mas sem leitor
    const data = await registrarMovimentacao(
      tipo_movimentacao,
      Number(id_pacote),
      id_leitor ? Number(id_leitor) : null,
      id_usuario ? Number(id_usuario) : null
    );
    return res.status(201).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};
