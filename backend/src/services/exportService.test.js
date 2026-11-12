import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gerarRelatorioPersonalizado } from './exportService.js';
import * as dashboardModel from '../models/dashboardModel.js';

// Isola o banco de dados e as dependências
vi.mock('../models/dashboardModel.js', () => ({
  buscarRelatorioMovimentacaoSecure: vi.fn()
}));

vi.mock('../config/database.js', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [] })
  }
}));

describe('ExportService - Relatórios Personalizados', () => {
  const mockToken = 'mock-user-token-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFiltros = {
    tipo: 'ENTRADA',
    dataInicio: '2026-04-01',
    dataFim: '2026-04-30'
  };

  const mockData = [
    {
      tipo_movimentacao: 'ENTRADA',
      data_hora: '2026-04-15T10:00:00Z',
      pacote: {
        lote: {
          codigo_lote: 'LOTE-123',
          produto: { nome: 'Pão Francês' }
        }
      }
    }
  ];

  it('should call the database model with correct filters', async () => {
    vi.mocked(dashboardModel.buscarRelatorioMovimentacaoSecure).mockResolvedValue(mockData);

    await gerarRelatorioPersonalizado(mockFiltros, mockToken, 'EXCEL');

    expect(dashboardModel.buscarRelatorioMovimentacaoSecure).toHaveBeenCalledWith(mockFiltros);
  });

  it('should return a valid Buffer when exporting to EXCEL with filters applied', async () => {
    vi.mocked(dashboardModel.buscarRelatorioMovimentacaoSecure).mockResolvedValue(mockData);

    const resultBuffer = await gerarRelatorioPersonalizado(mockFiltros, mockToken, 'EXCEL');

    expect(resultBuffer).toBeInstanceOf(Buffer);
    expect(resultBuffer.length).toBeGreaterThan(0);
  });

  it('should return a valid Buffer when exporting to PDF with filters applied', async () => {
    vi.mocked(dashboardModel.buscarRelatorioMovimentacaoSecure).mockResolvedValue(mockData);

    const resultBuffer = await gerarRelatorioPersonalizado(mockFiltros, mockToken, 'PDF');

    expect(resultBuffer).toBeInstanceOf(Buffer);
    expect(resultBuffer.length).toBeGreaterThan(0);
  });
});
