import express from 'express';
import { registrarLeituraEsp32, listarHistoricoLeituras } from '../controllers/rfidController.js';
import { listar as listarEtiquetas, associar, atualizarStatus } from '../controllers/etiquetaController.js';
import { listar as listarLeitores, buscar as buscarLeitor, criar as criarLeitor, atualizar as atualizarLeitor, atualizarStatusLeitor } from '../controllers/leitorController.js';
import { listar as listarMovimentacoes, registrar as registrarMovimentacao } from '../controllers/movimentacaoController.js';
import { autenticar } from '../middlewares/authMiddleware.js';
import { validarApiKeyRfid } from '../middlewares/rfidApiKeyMiddleware.js';

const rfidRoutes = express.Router();

// ── Leitura bruta (hardware — sem JWT) ──────────────────────────
// C-03: Endpoint do hardware protegido por API Key estática (header X-Api-Key)
// O ESP32 NÃO usa JWT — usa RFID_API_KEY definida no .env
rfidRoutes.post('/leitura', validarApiKeyRfid, registrarLeituraEsp32);
rfidRoutes.get('/historico', autenticar, listarHistoricoLeituras);

// ── Etiquetas ───────────────────────────────────────────────────
rfidRoutes.get('/etiqueta', autenticar, listarEtiquetas);
rfidRoutes.post('/etiqueta', autenticar, associar);
rfidRoutes.patch('/etiqueta/:id/status', autenticar, atualizarStatus);

// ── Leitores ────────────────────────────────────────────────────
rfidRoutes.get('/leitor', autenticar, listarLeitores);
rfidRoutes.get('/leitor/:id', autenticar, buscarLeitor);
rfidRoutes.post('/leitor', autenticar, criarLeitor);
rfidRoutes.put('/leitor/:id', autenticar, atualizarLeitor);
rfidRoutes.patch('/leitor/:id/status', autenticar, atualizarStatusLeitor);

// ── Movimentações ───────────────────────────────────────────────
rfidRoutes.get('/movimentacao', autenticar, listarMovimentacoes);
rfidRoutes.post('/movimentacao', autenticar, registrarMovimentacao);

export default rfidRoutes;