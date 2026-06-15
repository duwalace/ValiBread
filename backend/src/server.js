import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import routes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api', routes);

// Servidor HTTP compartilhado entre Express e Socket.IO
const httpServer = createServer(app);

// Socket.IO — usado exclusivamente para broadcast de leituras RFID ao frontend
export const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🟢 Backend rodando na porta ${PORT}`);
  console.log(`📡 Socket.IO ativo em ws://localhost:${PORT}`);
});