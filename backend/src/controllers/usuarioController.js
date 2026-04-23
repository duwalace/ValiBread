import bcrypt from 'bcrypt';
import { listarUsuarios, buscarUsuarioPorId, atualizarUsuario, deletarUsuario, buscarUsuarioPorEmail, inserirUsuario } from '../models/usuarioModel.js';

export const listar = async (req, res) => {
  try {
    const data = await listarUsuarios();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const buscar = async (req, res) => {
  try {
    const data = await buscarUsuarioPorId(req.params.id);
    if (!data) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const criar = async (req, res) => {
  try {
    const { nome, email, senha, id_perfil } = req.body;
    if (!nome || !email || !senha || !id_perfil) {
      return res.status(400).json({ erro: 'nome, email, senha e id_perfil são obrigatórios.' });
    }
    const existente = await buscarUsuarioPorEmail(email);
    if (existente) return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });

    const senhaCriptografada = await bcrypt.hash(senha, 10);
    const data = await inserirUsuario({ nome, email, senha: senhaCriptografada, id_perfil: Number(id_perfil) });
    const { senha: _, ...usuarioSemSenha } = data;
    return res.status(201).json(usuarioSemSenha);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};

export const atualizar = async (req, res) => {
  try {
    const { nome, email, id_perfil, senha } = req.body;
    const dados = {};
    if (nome !== undefined) dados.nome = nome;
    if (email !== undefined) dados.email = email;
    if (id_perfil !== undefined) dados.id_perfil = Number(id_perfil);
    if (senha) dados.senha = await bcrypt.hash(senha, 10);

    const data = await atualizarUsuario(req.params.id, dados);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};

export const deletar = async (req, res) => {
  try {
    await deletarUsuario(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};
