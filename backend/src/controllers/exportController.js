import { gerarRelatorioPersonalizado } from '../services/exportService.js';

export const exportarInventario = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ erro: 'Token de autorização ausente.' });
    }
    const token = authHeader.split(' ')[1];
    
    const { formato = 'PDF', ...filtros } = req.query;

    const buffer = await gerarRelatorioPersonalizado(filtros, token, formato.toUpperCase());

    if (formato.toUpperCase() === 'EXCEL') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=relatorio_movimentacao.xlsx');
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=relatorio_movimentacao.pdf');
    }

    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Erro na exportação:', error);
    res.status(500).json({ erro: error.message || 'Erro interno ao exportar inventário.' });
  }
};
