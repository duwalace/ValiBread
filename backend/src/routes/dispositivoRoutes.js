/**
 * dispositivoRoutes.js
 * ====================
 * Rotas dedicadas ao leitor RFID físico (ESP32).
 * Protegidas por API Key estática (validarApiKeyRfid), sem JWT.
 *
 * Montadas em /api/rfid/dispositivo via rfidRoutes.js
 */

import express from 'express';
import { cadastrar, consultar, registrarSaida, excluir } from '../controllers/dispositivoController.js';
import { validarApiKeyRfid } from '../middlewares/rfidApiKeyMiddleware.js';

const router = express.Router();

// Todas as rotas deste grupo exigem API Key do hardware
router.use(validarApiKeyRfid);

router.post('/cadastrar',  cadastrar);       // POST   /api/rfid/dispositivo/cadastrar
router.post('/consultar',  consultar);       // POST   /api/rfid/dispositivo/consultar
router.post('/saida',      registrarSaida);  // POST   /api/rfid/dispositivo/saida
router.delete('/excluir',  excluir);         // DELETE /api/rfid/dispositivo/excluir

export default router;
