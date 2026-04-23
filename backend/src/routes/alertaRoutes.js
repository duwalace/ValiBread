import express from 'express';
import { listar, marcarComoVisto } from '../controllers/alertaController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', autenticar, listar);                       // GET  /api/alerta?tipo_alerta=VALIDADE
router.delete('/:id/visto', autenticar, marcarComoVisto); // DEL  /api/alerta/:id/visto

export default router;
