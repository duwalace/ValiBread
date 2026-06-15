import { listarRelatorios, criarRelatorio } from '../models/relatorioModel.js';
import { buscarRelatorioCompleto } from '../models/dashboardModel.js';

export const listar = async (req, res) => {
  try {
    const { id_usuario, tipo_relatorio } = req.query;
    const data = await listarRelatorios({ id_usuario, tipo_relatorio });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const gerar = async (req, res) => {
  try {
    const { tipo_relatorio } = req.body;
    const id_usuario = req.usuario?.id_usuario;
    if (!id_usuario) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }
    const data = await criarRelatorio(tipo_relatorio, id_usuario);
    return res.status(201).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};

/**
 * GET /api/relatorio/preview?tipo=Entrada&dataInicio=2025-01-01&dataFim=2025-01-31
 *
 * Retorna movimentações + perdas filtradas por período e tipo para pré-visualização.
 * tipos aceitos: Entrada | Saída | Transferência | Perda | TODOS (padrão)
 */
export const previsualizar = async (req, res) => {
  try {
    const { tipo, dataInicio, dataFim } = req.query;

    if (!dataInicio || !dataFim) {
      return res.status(400).json({ erro: 'dataInicio e dataFim são obrigatórios.' });
    }

    const inicioISO = `${dataInicio}T00:00:00`;
    const fimISO   = `${dataFim}T23:59:59`;

    let todos = [];

    // Busca via função unificada (movimentações + perdas por lote vencido)
    todos = await buscarRelatorioCompleto({ tipo, dataInicio, dataFim });

    // Aplica limite de 100 registros após a mesclagem
    const amostra = todos.slice(0, 100);

    // Resumo contado sobre o resultado COMPLETO
    const resumo = { 'Entrada': 0, 'Saída': 0, 'Transferência': 0, 'Perda': 0 };
    todos.forEach((m) => {
      const t = m.tipo_movimentacao;
      if (t in resumo) {
        resumo[t]++;
      } else {
        resumo[t] = (resumo[t] ?? 0) + 1;
      }
    });

    return res.status(200).json({
      total: todos.length,
      resumo,
      movimentacoes: amostra,
    });
  } catch (error) {
    console.error('[previsualizar] Erro inesperado:', error.message, error.stack);
    return res.status(500).json({ erro: `Erro ao gerar pré-visualização: ${error.message}` });
  }
};
