import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import 'dotenv/config'; // carrega env da pasta chatbot (que aponta para backend via --path ou symlink se houver)
import { ChatbotSession } from './index.js';

// Caso JWT_SECRET não esteja carregado, busca no .env pai ou lança erro
const JWT_SECRET = process.env.JWT_SECRET || 'JdHhYEXZ5ipP/cwFokKPIVym0XxMWFeRaC1iIpOBBf1kFpXZ5PZERfNCj9iS4S+krA9gBLLUh4vpOcs7DryCqQ==';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());

// Serve a pasta de exports estaticamente para download das planilhas
app.use('/exports', express.static(resolve(__dirname, 'exports')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error: Token not provided'));
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.usuario = payload; // { id_usuario, ... }
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', async (socket) => {
  console.log(`Nova conexão no chatbot: ${socket.id} (User: ${socket.usuario?.id_usuario})`);
  
  const session = new ChatbotSession(socket, socket.usuario?.id_usuario);
  
  // Envia o menu inicial assim que conecta
  const initialMenu = await session.iniciar();
  socket.emit('bot_message', initialMenu);

  // Escuta entradas do usuário
  socket.on('user_input', async (entrada) => {
    console.log(`[${socket.id}] Input: ${entrada}`);
    const resposta = await session.processarEntrada(entrada);
    socket.emit('bot_message', resposta);
  });

  socket.on('disconnect', () => {
    console.log(`Desconectado: ${socket.id}`);
  });
});

const PORT = 3002;
httpServer.listen(PORT, () => {
  console.log(`🚀 Chatbot WebSocket Server rodando na porta ${PORT}`);
  console.log(`📂 Servindo exports em http://localhost:${PORT}/exports`);
});
