import { obterDadosDashboard } from '../services/dashboardService.js';

export const getDashboard = async (req, res) => {
  try {
    // Extrai possíveis filtros da query string
    const { 
      categoria, 
      lote, 
      dataFabricacaoInicio, 
      dataFabricacaoFim,
      dataValidadeInicio,
      dataValidadeFim,
      tagRfid 
    } = req.query;

    const filtros = {
      categoria,
      lote,
      dataFabricacaoInicio,
      dataFabricacaoFim,
      dataValidadeInicio,
      dataValidadeFim,
      tagRfid
    };

    const dashboardData = await obterDadosDashboard(filtros);

    return res.status(200).json(dashboardData);

  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    return res.status(500).json({ erro: error.message || 'Erro interno ao buscar dados do dashboard.' });
  }
};
