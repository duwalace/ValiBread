import express from 'express';
import { listar, criar, atualizarStatus, deletar } from '../controllers/pacoteController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', autenticar, listar);                          // GET   /api/pacote?id_lote=X
router.post('/', autenticar, criar);                          // POST  /api/pacote
router.patch('/:id/status', autenticar, atualizarStatus);     // PATCH /api/pacote/:id/status
router.delete('/:id', autenticar, deletar);                   // DELETE /api/pacote/:id

export default router;
