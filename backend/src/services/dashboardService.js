import pool from '../config/database.js';
import { 
  contarTotalPacotes, 
  contarPacotesParaEntrega, 
  buscarLotesProximosVencimento, 
  buscarMovimentacoesMesAtual, 
  buscarInventarioFEFO 
} from '../models/dashboardModel.js';

/**
 * Calcula a diferença em dias entre hoje e uma data (passada ou futura).
 * Valores negativos = item já vencido.
 */
const calcularDiasRestantes = (dataVencimentoStr) => {
  if (!dataVencimentoStr) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(dataVencimentoStr);
  vencimento.setHours(0, 0, 0, 0);
  const diffTime = vencimento - hoje;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Busca lotes vencidos (data_validade < hoje) e agrupa por faixa de atraso.
 */
const buscarItensVencidos = async () => {
  const hojeISO = new Date().toISOString().split('T')[0];

  try {
    const query = `
      SELECT 
        l.id_lote, 
        l.data_validade::text AS data_validade, 
        COALESCE(
          json_agg(
            json_build_object('id_pacote', p.id_pacote)
          ) FILTER (WHERE p.id_pacote IS NOT NULL),
          '[]'
        ) AS pacote
      FROM lote l
      LEFT JOIN pacote p ON l.id_lote = p.id_lote
      WHERE l.data_validade < $1::date
      GROUP BY l.id_lote, l.data_validade
    `;
    const { rows } = await pool.query(query, [hojeISO]);

    const grupos = {
      '1-3 dias de atraso':         { quantidade: 0, cor: 'hsl(30, 70%, 45%)'  },
      '4-6 dias de atraso':         { quantidade: 0, cor: 'hsl(0, 65%, 38%)'   },
      'Mais de 1 semana de atraso': { quantidade: 0, cor: 'hsl(345, 60%, 30%)' },
    };

    let totalVencidos = 0;

    rows.forEach(lote => {
      const qtd = lote.pacote ? lote.pacote.length : 0;
      if (qtd === 0) return;
      const diasAtraso = Math.abs(calcularDiasRestantes(lote.data_validade) ?? 0);
      totalVencidos += qtd;
      if (diasAtraso <= 3)      grupos['1-3 dias de atraso'].quantidade += qtd;
      else if (diasAtraso <= 6) grupos['4-6 dias de atraso'].quantidade += qtd;
      else                      grupos['Mais de 1 semana de atraso'].quantidade += qtd;
    });

    return {
      totalVencidos,
      grupos: Object.keys(grupos).map(chave => ({
        nome: chave,
        quantidade: grupos[chave].quantidade,
        cor: grupos[chave].cor,
      })),
    };
  } catch (error) {
    throw new Error(`Erro ao buscar itens vencidos: ${error.message}`);
  }
};

/**
 * Obtém e consolida todos os dados para o dashboard.
 */
export const obterDadosDashboard = async (filtros) => {
  const [
    totalPacotes,
    pacotesParaEntrega,
    lotesVencimento,
    movimentacoesMes,
    inventarioCru,
    alertasAtivos,
    produtosAbaixoMinimo,
    itensVencidos,
  ] = await Promise.all([
    contarTotalPacotes(),
    contarPacotesParaEntrega(),
    buscarLotesProximosVencimento(7),
    buscarMovimentacoesMesAtual(),
    buscarInventarioFEFO(filtros),
    (async () => {
      const [dadosRes, totalRes] = await Promise.all([
        pool.query('SELECT id_alerta, tipo_alerta, mensagem, data_hora FROM alerta ORDER BY data_hora DESC LIMIT 10'),
        pool.query('SELECT COUNT(*)::int AS count FROM alerta')
      ]);
      return {
        dados: dadosRes.rows || [],
        total: totalRes.rows[0]?.count || 0
      };
    })(),
    pool.query('SELECT id_produto, nome, estoque_minimo FROM produto').then(r => r.rows || []),
    buscarItensVencidos(),
  ]);

  // --- 1. Visão Geral ---
  const visaoGeral = {
    totalItens: totalPacotes || 0,
    marcadosEntrega: pacotesParaEntrega || 0,
  };

  // --- 2. Alerta de Validade (próximos 7 dias) ---
  let totalCriticos = 0;
  const agrupamentoValidade = {
    '3 dias restantes': { quantidade: 0, cor: 'hsl(0, 72%, 51%)'   },
    '5 dias restantes': { quantidade: 0, cor: 'hsl(45, 100%, 51%)' },
    '7 dias restantes': { quantidade: 0, cor: 'hsl(30, 10%, 40%)'  },
  };

  lotesVencimento.forEach(lote => {
    const qtd = lote.pacote ? lote.pacote.length : 0;
    if (qtd === 0) return;
    totalCriticos += qtd;
    const dias = calcularDiasRestantes(lote.data_validade);
    if (dias <= 3)      agrupamentoValidade['3 dias restantes'].quantidade += qtd;
    else if (dias <= 5) agrupamentoValidade['5 dias restantes'].quantidade += qtd;
    else                agrupamentoValidade['7 dias restantes'].quantidade += qtd;
  });

  const alertaValidade = {
    totalCriticos,
    grupos: Object.keys(agrupamentoValidade).map(chave => ({
      nome: chave,
      quantidade: agrupamentoValidade[chave].quantidade,
      cor: agrupamentoValidade[chave].cor,
    })),
  };

  // --- 3. Movimentação Mês (agrupada por semana) ---
  const movimentacaoPorSemana = {
    'Sem 1': { entradas: 0, saidas: 0 },
    'Sem 2': { entradas: 0, saidas: 0 },
    'Sem 3': { entradas: 0, saidas: 0 },
    'Sem 4': { entradas: 0, saidas: 0 },
  };

  movimentacoesMes.forEach(mov => {
    const dia = new Date(mov.data_hora).getDate();
    const semana = `Sem ${Math.min(Math.ceil(dia / 7), 4)}`;
    const tipo = (mov.tipo_movimentacao || '').toLowerCase();
    if (tipo === 'entrada')                        movimentacaoPorSemana[semana].entradas++;
    else if (tipo === 'saída' || tipo === 'saida')  movimentacaoPorSemana[semana].saidas++;
  });

  const movimentacaoMes = Object.keys(movimentacaoPorSemana).map(chave => ({
    nome: chave,
    entradas: movimentacaoPorSemana[chave].entradas,
    saidas: movimentacaoPorSemana[chave].saidas,
  }));

  // --- 4. Inventário Ativo FEFO ---
  const formatarData = (dataDb) => {
    if (!dataDb) return '';
    const [ano, mes, dia] = dataDb.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const inventarioAtivoFEFO = inventarioCru.map(item => {
    const diasRestantes = calcularDiasRestantes(item.lote?.data_validade);
    return {
      tagRfid:        item.rfid_etiqueta?.epc || item.rfid_etiqueta?.[0]?.epc || 'Desconhecida',
      nome:           item.lote?.produto?.nome || 'Sem nome',
      lote:           item.lote?.codigo_lote   || '',
      dataFabricacao: formatarData(item.lote?.data_fabricacao),
      dataValidade:   formatarData(item.lote?.data_validade),
      diasRestantes,
      status:   diasRestantes !== null ? `${diasRestantes} dias` : 'N/A',
      critico:  diasRestantes !== null && diasRestantes <= 7,
      highlight: diasRestantes !== null && diasRestantes <= 7,
    };
  });

  // --- 5. Produtos abaixo do mínimo ---
  const produtosComEstoqueBaixo = (produtosAbaixoMinimo || []).map(p => ({
    id_produto:     p.id_produto,
    nome:           p.nome,
    estoque_minimo: p.estoque_minimo,
  }));

  return {
    visaoGeral,
    alertaValidade,
    itensVencidos,
    movimentacaoMes,
    inventarioAtivoFEFO,
    alertasRecentes:    alertasAtivos.dados  || [],
    totalAlertasAtivos: alertasAtivos.total  || 0,
    produtosComEstoqueBaixo,
  };
};
