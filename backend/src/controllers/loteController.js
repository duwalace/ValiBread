import { listarLotes, buscarLotePorId, criarLote, atualizarLote, deletarLote } from '../models/estoqueModel.js';

export const listar = async (req, res) => {
  try {
    const { id_produto, status } = req.query;
    const data = await listarLotes({ id_produto, status });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const buscar = async (req, res) => {
  try {
    const data = await buscarLotePorId(req.params.id);
    if (!data) return res.status(404).json({ erro: 'Lote não encontrado.' });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const criar = async (req, res) => {
  try {
    const { codigo_lote, data_fabricacao, data_validade, status, id_produto } = req.body;
    if (!codigo_lote || !id_produto) {
      return res.status(400).json({ erro: 'codigo_lote e id_produto são obrigatórios.' });
    }
    const data = await criarLote({ codigo_lote, data_fabricacao, data_validade, status, id_produto: Number(id_produto) });
    return res.status(201).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};

export const atualizar = async (req, res) => {
  try {
    const { codigo_lote, data_fabricacao, data_validade, status, id_produto } = req.body;
    const dados = {};
    if (codigo_lote !== undefined) dados.codigo_lote = codigo_lote;
    if (data_fabricacao !== undefined) dados.data_fabricacao = data_fabricacao;
    if (data_validade !== undefined) dados.data_validade = data_validade;
    if (status !== undefined) dados.status = status;
    if (id_produto !== undefined) dados.id_produto = Number(id_produto);
    const data = await atualizarLote(req.params.id, dados);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};

export const deletar = async (req, res) => {
  try {
    await deletarLote(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};
