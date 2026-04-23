import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const router = Router();

// I-09: Dashboard estava sem autenticação — dados de inventário são sensíveis
router.get('/', autenticar, getDashboard);

export default router;
