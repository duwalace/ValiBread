import {
  listarMovimentacoes,
  listarMovimentacoesPorPacote,
  registrarMovimentacao,
} from '../models/movimentacaoModel.js';

/**
 * GET /api/movimentacao
 * Query params opcionais: tipo, data_inicio, data_fim, id_produto, id_pacote
 */
export const listar = async (req, res) => {
  try {
    const { tipo, data_inicio, data_fim, id_produto, id_pacote } = req.query;
    const data = await listarMovimentacoes({ tipo, data_inicio, data_fim, id_produto, id_pacote });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

/**
 * GET /api/movimentacao/:id_pacote
 * Retorna o histórico completo de um pacote específico, ordenado do mais recente.
 */
export const listarPorPacote = async (req, res) => {
  try {
    const data = await listarMovimentacoesPorPacote(req.params.id_pacote);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

/**
 * POST /api/movimentacao
 * Body: { id_pacote, tipo_movimentacao, observacao?, id_usuario? }
 * O id_usuario pode ser extraído do token JWT (req.usuario.id_usuario).
 */
export const registrar = async (req, res) => {
  try {
    const { id_pacote, tipo_movimentacao, observacao } = req.body;

    if (!id_pacote || !tipo_movimentacao) {
      return res.status(400).json({ erro: 'id_pacote e tipo_movimentacao são obrigatórios.' });
    }

    // O id_usuario vem do middleware de autenticação, não do body
    const id_usuario = req.usuario?.id_usuario ?? null;

    const data = await registrarMovimentacao({
      tipo_movimentacao,
      id_pacote,
      observacao,
      id_usuario,
    });

    return res.status(201).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};
