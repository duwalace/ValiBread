import express from 'express';
import { listar, criar } from '../controllers/pacoteController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', autenticar, listar);   // GET  /api/pacote?id_lote=X
router.post('/', autenticar, criar);   // POST /api/pacote

export default router;
