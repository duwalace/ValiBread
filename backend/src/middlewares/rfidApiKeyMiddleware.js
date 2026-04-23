import supabase from '../config/supabase.js';

// ── Constante de API Key para hardware RFID (C-03) ──────────────
// O ESP32 deve enviar o header: X-Api-Key: <valor de RFID_API_KEY no .env>
const RFID_API_KEY = process.env.RFID_API_KEY;

/**
 * C-03: Middleware para validar API Key enviada pelo hardware RFID.
 * Diferente do JWT (para usuários), este token é estático e pré-cadastrado no .env.
 * O hardware não tem capacidade de gerar/renovar tokens JWT.
 *
 * Header esperado: X-Api-Key: <RFID_API_KEY>
 *
 * Se RFID_API_KEY não estiver definida, a rota fica BLOQUEADA para todos.
 * Configure a variável no .env e no firmware do ESP32.
 */
export const validarApiKeyRfid = (req, res, next) => {
  if (!RFID_API_KEY) {
    return res.status(503).json({
      erro: 'Endpoint RFID desabilitado: RFID_API_KEY não configurada no servidor.'
    });
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== RFID_API_KEY) {
    return res.status(401).json({
      erro: 'API Key inválida ou ausente. Envie o header X-Api-Key.'
    });
  }

  next();
};
