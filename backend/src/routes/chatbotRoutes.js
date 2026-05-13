import express from 'express';
import { autenticar } from '../middlewares/authMiddleware.js';
import { listarExports } from '../controllers/chatbotController.js';

const router = express.Router();

router.get('/exports', autenticar, listarExports);

export default router;
