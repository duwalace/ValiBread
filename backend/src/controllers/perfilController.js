import { listarPerfis, buscarPerfilPorId, criarPerfil, atualizarPerfil, deletarPerfil } from '../models/perfilModel.js';

export const listar = async (req, res) => {
  try {
    const data = await listarPerfis();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const buscar = async (req, res) => {
  try {
    const data = await buscarPerfilPorId(req.params.id);
    if (!data) return res.status(404).json({ erro: 'Perfil não encontrado.' });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const criar = async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    if (!nome) return res.status(400).json({ erro: 'O campo nome é obrigatório.' });
    const data = await criarPerfil({ nome, descricao });
    return res.status(201).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};

export const atualizar = async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    // I-06: Padrão defensivo — só atualiza campos enviados explicitamente no body
    const dados = {};
    if (nome !== undefined) dados.nome = nome;
    if (descricao !== undefined) dados.descricao = descricao;
    if (Object.keys(dados).length === 0) {
      return res.status(400).json({ erro: 'Nenhum campo enviado para atualizar.' });
    }
    const data = await atualizarPerfil(req.params.id, dados);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};

export const deletar = async (req, res) => {
  try {
    await deletarPerfil(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};
