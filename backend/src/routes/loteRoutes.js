import express from 'express';
import { listar, buscar, criar, atualizar, deletar } from '../controllers/loteController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', autenticar, listar);          // GET  /api/lote
router.get('/:id', autenticar, buscar);       // GET  /api/lote/:id
router.post('/', autenticar, criar);          // POST /api/lote
router.put('/:id', autenticar, atualizar);    // PUT  /api/lote/:id
router.delete('/:id', autenticar, deletar);   // DEL  /api/lote/:id

export default router;
