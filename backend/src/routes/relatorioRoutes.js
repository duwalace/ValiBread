import express from 'express';
import { listar, gerar, previsualizar } from '../controllers/relatorioController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/preview', autenticar, previsualizar); // GET /api/relatorio/preview?tipo=ENTRADA&dataInicio=...&dataFim=...
router.get('/', autenticar, listar);               // GET /api/relatorio
router.post('/', autenticar, gerar);               // POST /api/relatorio

export default router;

