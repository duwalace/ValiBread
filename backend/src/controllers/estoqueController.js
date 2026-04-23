import {
  listarProdutos, buscarProdutoPorId, criarProduto, atualizarProduto, deletarProduto
} from '../models/estoqueModel.js';

export const listarEstoque = async (req, res) => {
  try {
    const data = await listarProdutos();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const buscarProdutoPorIdCtrl = async (req, res) => {
  try {
    const produto = await buscarProdutoPorId(req.params.id);
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
    return res.status(200).json(produto);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const cadastrarProduto = async (req, res) => {
  try {
    const { nome, descricao, estoque_minimo } = req.body;
    if (!nome || estoque_minimo === undefined) {
      return res.status(400).json({ erro: 'Nome e estoque_minimo são obrigatórios.' });
    }
    const produto = await criarProduto({ nome, descricao, estoque_minimo: Number(estoque_minimo) });
    return res.status(201).json(produto);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};

export const atualizarProdutoCtrl = async (req, res) => {
  try {
    const { nome, descricao, estoque_minimo } = req.body;
    const dados = {};
    if (nome !== undefined) dados.nome = nome;
    if (descricao !== undefined) dados.descricao = descricao;
    if (estoque_minimo !== undefined) dados.estoque_minimo = Number(estoque_minimo);

    const produto = await atualizarProduto(req.params.id, dados);
    return res.status(200).json(produto);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};

export const atualizarEstoqueParcial = async (req, res) => {
  return atualizarProdutoCtrl(req, res);
};

export const deletarProdutoCtrl = async (req, res) => {
  try {
    await deletarProduto(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};
