import express from 'express';
import { listar, buscar, criar, atualizar, deletar } from '../controllers/usuarioController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(autenticar); // Todas as rotas de usuário exigem autenticação

router.get('/', listar);          // GET  /api/usuario
router.get('/:id', buscar);       // GET  /api/usuario/:id
router.post('/', criar);          // POST /api/usuario
router.put('/:id', atualizar);    // PUT  /api/usuario/:id
router.delete('/:id', deletar);   // DEL  /api/usuario/:id

export default router;
