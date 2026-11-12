import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('[database] DATABASE_URL não definida nas variáveis de ambiente. Adicione DATABASE_URL ao .env.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('🔴 Erro inesperado no pool PostgreSQL:', err.message);
});

pool.query('SELECT NOW() AS agora')
  .then((res) => console.log(`🟢 Conectado ao PostgreSQL (Azure) — ${res.rows[0].agora}`))
  .catch((err) => console.error('🔴 Falha ao conectar ao PostgreSQL:', err.message));

export default pool;

