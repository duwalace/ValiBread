import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { buscarUsuarioPorEmail, inserirUsuario } from '../models/usuarioModel.js';

// C-01: Sem fallback inseguro — JWT_SECRET deve estar no .env
const JWT_SECRET = process.env.JWT_SECRET;

export const realizarLogin = async (email, senhaPlana) => {

  const usuario = await buscarUsuarioPorEmail(email);

  if (!usuario) {
    throw new Error('E-mail ou senha incorretos.');
  }

  const senhaValida = await bcrypt.compare(senhaPlana, usuario.senha);

  if (!senhaValida) {
    throw new Error('E-mail ou senha incorretos.');
  }

  // Gera o Token JWT com os dados que você vai precisar no frontend (React/React Native)
  const token = jwt.sign(
    { 
      id_usuario: usuario.id_usuario, 
      id_perfil: usuario.id_perfil,
      nome_perfil: usuario.perfil.nome
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  return {
    token,
    usuario: {
      id: usuario.id_usuario,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil.nome
    }
  };
};

export const cadastrarUsuario = async (nome, email, senhaPlana, id_perfil) => {

  const usuarioExistente = await buscarUsuarioPorEmail(email);
    if (usuarioExistente) {
      throw new Error('Este e-mail já está cadastrado no sistema.');
    }

  const salt = await bcrypt.genSalt(10);
  const senhaCriptografada = await bcrypt.hash(senhaPlana, salt);

  const novoUsuario = {
    nome,
    email,
    senha: senhaCriptografada,
    id_perfil
  };
  
    // Manda o Model salvar no banco
  const usuarioCriado = await inserirUsuario(novoUsuario);

  return {
    id: usuarioCriado.id_usuario,
    nome: usuarioCriado.nome,
    email: usuarioCriado.email
  };
};