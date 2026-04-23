import express from 'express';
import { listar, buscar, criar, atualizar, deletar } from '../controllers/perfilController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', listar);           // GET  /api/perfil
router.get('/:id', buscar);        // GET  /api/perfil/:id
router.post('/', autenticar, criar);         // POST /api/perfil
router.put('/:id', autenticar, atualizar);   // PUT  /api/perfil/:id
router.delete('/:id', autenticar, deletar);  // DEL  /api/perfil/:id

export default router;
