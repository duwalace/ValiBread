import express from 'express';
import { registrarLeituraEsp32, listarHistoricoLeituras, scanRfid, cadastrarEtiqueta } from '../controllers/rfidController.js';
import { listar as listarEtiquetas, associar, atualizarStatus } from '../controllers/etiquetaController.js';
import { listar as listarLeitores, buscar as buscarLeitor, criar as criarLeitor, atualizar as atualizarLeitor, atualizarStatusLeitor } from '../controllers/leitorController.js';
import { listar as listarMovimentacoes, registrar as registrarMovimentacao } from '../controllers/movimentacaoController.js';
import { autenticar } from '../middlewares/authMiddleware.js';
import { validarApiKeyRfid } from '../middlewares/rfidApiKeyMiddleware.js';

const rfidRoutes = express.Router();

// ── Leitura bruta de movimentação (hardware — sem JWT) ───────────
// Usado pelo ESP32 quando a tag JÁ ESTÁ CADASTRADA e se quer registrar entrada/saída
rfidRoutes.post('/leitura', validarApiKeyRfid, registrarLeituraEsp32);
rfidRoutes.get('/historico', autenticar, listarHistoricoLeituras);

// ── Scan para CADASTRO de nova etiqueta (hardware — sem JWT) ─────
// Usado pelo ESP32 no modo cadastro: apenas lê, grava raw e emite via WebSocket
rfidRoutes.post('/scan', validarApiKeyRfid, scanRfid);

// ── Cadastro atômico de etiqueta (frontend — com JWT) ────────────
// Chamado pelo frontend após o operador confirmar produto e lote
rfidRoutes.post('/cadastrar', autenticar, cadastrarEtiqueta);

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