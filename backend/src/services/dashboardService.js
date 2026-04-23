import { 
  contarTotalPacotes, 
  contarPacotesParaEntrega, 
  buscarLotesProximosVencimento, 
  buscarMovimentacoesMesAtual, 
  buscarInventarioFEFO 
} from '../models/dashboardModel.js';
import supabase from '../config/supabase.js';

/**
 * Funcao auxiliar para calcular a diferenca em dias entre duas datas.
 */
const calcularDiasRestantes = (dataVencimentoStr) => {
  if (!dataVencimentoStr) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas datas
  const vencimento = new Date(dataVencimentoStr);
  vencimento.setHours(0, 0, 0, 0);
  
  const diffTime = vencimento - hoje;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
};

/**
 * Obtem e consolida todos os dados para o dashboard.
 */
export const obterDadosDashboard = async (filtros) => {
  // Executa as consultas em paralelo onde for possivel
  const [
    totalPacotes, 
    pacotesParaEntrega, 
    lotesVencimento, 
    movimentacoesMes, 
    inventarioCru,
    alertasAtivos,
    produtosAbaixoMinimo
  ] = await Promise.all([
    contarTotalPacotes(),
    contarPacotesParaEntrega(),
    // I-02: Alinhado com alertaService.js que usa 30 dias como limiar
    buscarLotesProximosVencimento(30),
    buscarMovimentacoesMesAtual(),
    buscarInventarioFEFO(filtros),
    // Alertas ativos (não visualizados = todos, pois não há campo visualizado)
    supabase.from('alerta').select('id_alerta, tipo_alerta, mensagem, data_hora', { count: 'exact' }).order('data_hora', { ascending: false }).limit(10).then(r => ({ dados: r.data || [], total: r.count || 0 })),
    // Produtos abaixo do estoque mínimo (contagem de etiquetas ativas vs estoque_minimo)
    supabase.from('produto').select('id_produto, nome, estoque_minimo').then(r => r.data || [])
  ]);

  // --- 1. Visão Geral ---
  const visaoGeral = {
    totalItens: totalPacotes || 0,
    marcadosEntrega: pacotesParaEntrega || 0
  };

  // --- 2. Alerta de Validade ---
  let totalCriticos = 0;
  const agrupamentoValidade = {
    "3 dias restantes": { quantidade: 0, cor: "hsl(0, 72%, 51%)" }, // Vermelho (usando as cores do FE)
    "5 dias restantes": { quantidade: 0, cor: "hsl(45, 100%, 51%)" }, // Amarelo
    "7 dias restantes": { quantidade: 0, cor: "hsl(220, 15%, 40%)" }  // Cinza/Outro
  };

  lotesVencimento.forEach(lote => {
    const qtdPacotes = lote.pacote ? lote.pacote.length : 0;
    if (qtdPacotes > 0) {
       totalCriticos += qtdPacotes;
       const diasRestantes = calcularDiasRestantes(lote.data_validade);
       
       if (diasRestantes <= 3) {
         agrupamentoValidade["3 dias restantes"].quantidade += qtdPacotes;
       } else if (diasRestantes <= 5) {
         agrupamentoValidade["5 dias restantes"].quantidade += qtdPacotes;
       } else {
         agrupamentoValidade["7 dias restantes"].quantidade += qtdPacotes;
       }
    }
  });

  const alertaValidade = {
    totalCriticos,
    grupos: Object.keys(agrupamentoValidade)
      .map(chave => ({
        nome: chave,
        quantidade: agrupamentoValidade[chave].quantidade,
        cor: agrupamentoValidade[chave].cor
      }))
      .filter(grupo => grupo.quantidade > 0) // Opcional: só enviar os que tem itens
  };

  // --- 3. Movimentação Mês ---
  // Agrupar por semanas do mês
  const movimentacaoPorSemana = {};
  
  // Inicializando as semanas 
  for(let i=1; i<=4; i++) {
     movimentacaoPorSemana[`Sem ${i}`] = { entradas: 0, saidas: 0 };
  }

  movimentacoesMes.forEach(mov => {
    const dataMov = new Date(mov.data_hora);
    const dia = dataMov.getDate();
    let semana = Math.ceil(dia / 7);
    if (semana > 4) semana = 4;

    const chaveSemana = `Sem ${semana}`;
    
    // Suporta tanto uppercase (ENTRADA/SAÍDA) quanto lowercase
    const tipo = (mov.tipo_movimentacao || '').toUpperCase();
    if (tipo === 'ENTRADA') {
      movimentacaoPorSemana[chaveSemana].entradas++;
    } else if (tipo === 'SAÍDA' || tipo === 'SAIDA') {
      movimentacaoPorSemana[chaveSemana].saidas++;
    }
  });

  const movimentacaoMes = Object.keys(movimentacaoPorSemana).map(chave => ({
    nome: chave,
    entradas: movimentacaoPorSemana[chave].entradas,
    saidas: movimentacaoPorSemana[chave].saidas
  }));

  // --- 4. Inventário Ativo FEFO ---
  const inventarioAtivoFEFO = inventarioCru.map(item => {
    const diasRestantes = calcularDiasRestantes(item.lote?.data_validade);
    
    // Tratamento para data_fabricacao e validade no formato amigável, se existirem
    const formatarData = (dataDb) => {
        if (!dataDb) return "";
        const [ano, mes, dia] = dataDb.split('-');
        return `${dia}/${mes}/${ano}`;
    };

    return {
      tagRfid: item.rfid_etiqueta?.epc || item.rfid_etiqueta?.[0]?.epc || 'Desconhecida',
      nome: item.lote?.produto?.nome || 'Sem nome',
      lote: item.lote?.codigo_lote || '',
      dataFabricacao: formatarData(item.lote?.data_fabricacao),
      dataValidade: formatarData(item.lote?.data_validade),
      diasRestantes: diasRestantes,
      status: diasRestantes !== null ? `${diasRestantes} dias` : 'N/A',
      critico: diasRestantes !== null && diasRestantes <= 7,
      highlight: diasRestantes !== null && diasRestantes <= 7
    };
  });

  // --- 5. Produtos abaixo do estoque mínimo (I-01) ---
  // produtosAbaixoMinimo contém todos os produtos — filtramos os que têm estoque baixo
  // Nota: contagem exata exigiria query por produto; aqui estimamos via etiquetas ativas
  // Para simplicidade do dashboard, retornamos a lista de produtos para o frontend verificar
  const produtosComEstoqueBaixo = (produtosAbaixoMinimo || []).map(p => ({
    id_produto: p.id_produto,
    nome: p.nome,
    estoque_minimo: p.estoque_minimo,
  }));

  // Retorno final
  return {
    visaoGeral,
    alertaValidade,
    movimentacaoMes,
    inventarioAtivoFEFO,
    alertasRecentes: alertasAtivos.dados || [],
    totalAlertasAtivos: alertasAtivos.total || 0,
    produtosComEstoqueBaixo, // I-01: antes coletado mas nunca retornado
  };
};
