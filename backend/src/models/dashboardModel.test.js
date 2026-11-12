import { describe, it, expect } from 'vitest';
import { buscarRelatorioMovimentacaoSecure } from './dashboardModel.js';

describe('Unit/Integration Test: dashboardModel query validation', () => {
  it('should successfully query movimentaçoes and return an array', async () => {
    const result = await buscarRelatorioMovimentacaoSecure({ tipo: 'TODOS' });
    expect(Array.isArray(result)).toBe(true);
  });
});
