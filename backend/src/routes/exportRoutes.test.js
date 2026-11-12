import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import exportRoutes from './exportRoutes.js';
import * as exportService from '../services/exportService.js';

vi.mock('../services/exportService.js', () => ({
  gerarRelatorioPersonalizado: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock pdf content'))
}));

const app = express();
app.use(express.json());
app.use('/api/export', exportRoutes);

describe('Integration Test: GET /api/export/inventario', () => {
  it('should return PDF buffer with status 200 when sending valid query params', async () => {
    const response = await request(app)
      .get('/api/export/inventario?formato=PDF&dataInicio=2026-01-01&dataFim=2026-04-22')
      .set('Authorization', 'Bearer MOCK_TOKEN_HERE');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.body).toBeInstanceOf(Buffer);
    expect(exportService.gerarRelatorioPersonalizado).toHaveBeenCalled();
  });
});
