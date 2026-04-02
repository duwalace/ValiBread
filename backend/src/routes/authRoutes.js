import { Router } from 'express';
import { login, registrar } from '../controllers/authController.js';

const router = Router();

// Rota: POST /api/auth/login
router.post('/login', login);
router.post('/cadastro', registrar);

export default router;