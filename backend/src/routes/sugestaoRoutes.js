import express from 'express';
import { listar, gerar } from '../controllers/sugestaoController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', autenticar, listar);   // GET  /api/sugestao?id_produto=X
router.post('/', autenticar, gerar);   // POST /api/sugestao

export default router;
