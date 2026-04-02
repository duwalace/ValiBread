import express from 'express';

import { registrarLeituraEsp32, listarHistoricoLeituras } from '../controllers/rfidController.js';

const rfidRoutes = express.Router();

rfidRoutes.post('/leitura', registrarLeituraEsp32);
rfidRoutes.get('/historico', listarHistoricoLeituras);

export default rfidRoutes;