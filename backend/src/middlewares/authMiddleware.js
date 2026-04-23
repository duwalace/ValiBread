import jwt from 'jsonwebtoken';

// C-01: Sem fallback — o servidor deve falhar ao iniciar se JWT_SECRET não estiver definida.
// "chave_super_secreta_padrao" é pública e qualquer pessoa pode forjar tokens com ela.
if (!process.env.JWT_SECRET) {
  throw new Error('[authMiddleware] JWT_SECRET não definida nas variáveis de ambiente. O servidor não pode iniciar com segurança.');
}
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware que valida o token JWT no header Authorization.
 * Rotas protegidas devem usar este middleware.
 */
export const autenticar = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // formato: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ erro: 'Acesso negado. Token não fornecido.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload; // { id_usuario, id_perfil, nome_perfil }
    next();
  } catch (err) {
    return res.status(403).json({ erro: 'Token inválido ou expirado.' });
  }
};
