import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import exportRoutes from './exportRoutes.js';
import * as exportService from '../services/exportService.js';
import supabase from '../config/supabase.js';

// Fazemos mock do getTenantSupabase para retornar a instância real do supabase global
// Assim, pulamos a verificação de RLS/JWT localmente e o teste pode bater na lógica real
// e esbarrar no erro de sintaxe/relation do banco de dados que causou o 500.
vi.mock('../config/supabaseTenant.js', () => ({
  getTenantSupabase: vi.fn(() => supabase)
}));

const app = express();
app.use(express.json());
app.use('/api/export', exportRoutes);

describe('Integration Test: GET /api/export/inventario', () => {
  it('should trigger the exact error when sending the real query params from frontend (RED STAGE)', async () => {
    
    // Dispara a requisição simulando o que o Frontend mandou.
    // O mock do tenant passará e, com a query corrigida, o banco deve retornar os dados (ou array vazio)
    // sem estourar o erro de relacionamento.
    const response = await request(app)
      .get('/api/export/inventario?formato=PDF&dataInicio=2026-01-01&dataFim=2026-04-22')
      .set('Authorization', 'Bearer MOCK_TOKEN_HERE');

    // O teste espera que o endpoint responda com 200 e que seja um arquivo
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.body).toBeInstanceOf(Buffer);
  });
});
