import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gerarRelatorioPersonalizado } from './exportService.js';
import * as dashboardModel from '../models/dashboardModel.js';
import { getTenantSupabase } from '../config/supabaseTenant.js';

// Isola o banco de dados e as dependências
vi.mock('../models/dashboardModel.js', () => ({
  buscarRelatorioMovimentacaoSecure: vi.fn()
}));

vi.mock('../config/supabaseTenant.js', () => ({
  getTenantSupabase: vi.fn()
}));

describe('ExportService - Relatórios Personalizados', () => {
  const mockToken = 'mock-user-token-123';
  const mockTenantSupabase = { mockClient: true };
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantSupabase).mockReturnValue(mockTenantSupabase);
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

  it('should call the database model with correct filters and sandboxed tenant client', async () => {
    // Arrange
    vi.mocked(dashboardModel.buscarRelatorioMovimentacaoSecure).mockResolvedValue(mockData);

    // Act
    await gerarRelatorioPersonalizado(mockFiltros, mockToken, 'EXCEL');

    // Assert: O isolamento de Tenant foi inicializado com o JWT
    expect(getTenantSupabase).toHaveBeenCalledWith(mockToken);
    
    // Assert: Os filtros (regra de negócio) e o cliente sandboxed foram passados para a camada de DB
    expect(dashboardModel.buscarRelatorioMovimentacaoSecure).toHaveBeenCalledWith(
      mockFiltros, 
      mockTenantSupabase
    );
  });

  it('should return a valid Buffer when exporting to EXCEL with filters applied', async () => {
    // Arrange
    vi.mocked(dashboardModel.buscarRelatorioMovimentacaoSecure).mockResolvedValue(mockData);

    // Act
    const resultBuffer = await gerarRelatorioPersonalizado(mockFiltros, mockToken, 'EXCEL');

    // Assert: Resultado observável válido
    expect(resultBuffer).toBeInstanceOf(Buffer);
    expect(resultBuffer.length).toBeGreaterThan(0);
  });

  it('should return a valid Buffer when exporting to PDF with filters applied', async () => {
    // Arrange
    vi.mocked(dashboardModel.buscarRelatorioMovimentacaoSecure).mockResolvedValue(mockData);

    // Act
    const resultBuffer = await gerarRelatorioPersonalizado(mockFiltros, mockToken, 'PDF');

    // Assert: Resultado observável válido
    expect(resultBuffer).toBeInstanceOf(Buffer);
    expect(resultBuffer.length).toBeGreaterThan(0);
  });
});

