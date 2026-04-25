import express from 'express';
import { exportarInventario } from '../controllers/exportController.js';

const router = express.Router();

router.get('/inventario', exportarInventario);

export default router;
