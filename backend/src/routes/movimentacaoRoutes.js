import express from 'express';
import { listar, listarPorPacote, registrar } from '../controllers/movimentacaoController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(autenticar);

router.get('/', listar);                  // GET  /api/movimentacao?tipo=&data_inicio=&data_fim=&id_produto=
router.get('/:id_pacote', listarPorPacote); // GET  /api/movimentacao/:id_pacote
router.post('/', registrar);              // POST /api/movimentacao

export default router;
