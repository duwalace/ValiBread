import express from 'express';
import rfidRoutes from './rfidRoutes.js';
import estoqueRoutes from './estoqueRoutes.js';
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import perfilRoutes from './perfilRoutes.js';
import usuarioRoutes from './usuarioRoutes.js';
import loteRoutes from './loteRoutes.js';
import pacoteRoutes from './pacoteRoutes.js';
import alertaRoutes from './alertaRoutes.js';
import sugestaoRoutes from './sugestaoRoutes.js';
import relatorioRoutes from './relatorioRoutes.js';

const router = express.Router();

// Autenticação (pública)
router.use('/auth', authRoutes);

// Dashboard (protegido internamente)
router.use('/dashboard', dashboardRoutes);

// Entidades independentes
router.use('/perfil', perfilRoutes);

// Entidades Nível 1
router.use('/produto', estoqueRoutes);      // /api/produto → CRUD produto
router.use('/usuario', usuarioRoutes);

// Entidades Nível 2
router.use('/lote', loteRoutes);
router.use('/pacote', pacoteRoutes);
router.use('/alerta', alertaRoutes);
router.use('/sugestao', sugestaoRoutes);
router.use('/relatorio', relatorioRoutes);

// RFID (leitura, etiqueta, leitor, movimentação)
router.use('/rfid', rfidRoutes);

export default router;