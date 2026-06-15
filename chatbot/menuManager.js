/**
 * menuManager.js
 * Gerencia a renderização de menus e opções, retornando objetos estruturados
 * em vez de usar console.log. O estado será gerenciado no index.js por sessão.
 */

export const getMenuPrincipal = () => {
  return {
    message: '🍞 ValiBread — Assistente de Estoque\n\nO que você deseja saber?',
    options: [
      { key: '1', label: '📦 Quantidade' },
      { key: '2', label: '⚠️ Produtos em Risco' },
      { key: '3', label: '🔄 Entradas e Saídas' },
      { key: '4', label: '🗑️ Perdas' },
      { key: '0', label: 'Fechar' }
    ]
  };
};

export const getMenuQuantidade = (produtos) => {
  const options = produtos.map((p, i) => ({
    key: String(i + 1),
    label: p.nome
  }));
  
  options.push({ key: '*', label: 'Exportar planilha com todos' });
  options.push({ key: '0', label: 'Voltar' });

  return {
    message: '📦 Quantidade — Selecione o Produto',
    options
  };
};

export const getMenuRisco = () => {
  return {
    message: '⚠️ Produtos em Risco — Selecione a Faixa',
    options: [
      { key: '1', label: 'Vencendo em até 3 dias' },
      { key: '2', label: 'Vencendo em até 5 dias' },
      { key: '3', label: 'Vencendo em até 7 dias' },
      { key: '*', label: 'Exportar planilha (7 dias)' },
      { key: '0', label: 'Voltar' }
    ]
  };
};

export const getMenuMovimentacao = () => {
  return {
    message: '🔄 Entradas e Saídas',
    options: [
      { key: '1', label: 'Ver totais gerais' },
      { key: '2', label: 'Filtrar por produto...' },
      { key: '*', label: 'Exportar planilha geral' },
      { key: '0', label: 'Voltar' }
    ]
  };
};

export const getMenuMovimentacaoProduto = (produtos) => {
  const options = produtos.map((p, i) => ({
    key: String(i + 1),
    label: p.nome
  }));
  
  options.push({ key: '0', label: 'Voltar' });

  return {
    message: '🔄 Selecione o Produto',
    options
  };
};

export const getMenuTipoMovimentacao = (nomeProduto) => {
  return {
    message: `🔄 ${nomeProduto} — Tipo de Movimentação`,
    options: [
      { key: '1', label: 'Entradas' },
      { key: '2', label: 'Saídas' },
      { key: '3', label: 'Todos' },
      { key: '*', label: 'Exportar planilha' },
      { key: '0', label: 'Voltar' }
    ]
  };
};

export const getMenuPerdas = () => {
  return {
    message: '🗑️ Perdas (Itens Vencidos em Estoque)',
    options: [
      { key: '1', label: 'Ver perdas recentes' },
      { key: '2', label: 'Filtrar por período...' },
      { key: '*', label: 'Exportar planilha de perdas' },
      { key: '0', label: 'Voltar' }
    ]
  };
};

export const getMenuPerdasPeriodo = () => {
  return {
    message: '📅 Selecione o período de perdas',
    options: [
      { key: '1', label: 'Últimos 7 dias' },
      { key: '2', label: 'Últimos 30 dias' },
      { key: '3', label: 'Todas as perdas' },
      { key: '0', label: 'Voltar' }
    ]
  };
};

export const getErroMessage = (msg = 'Opção inválida. Tente novamente.') => {
  return {
    message: `❌ ${msg}`,
    options: []
  };
};

export const getSucessoMessage = (msg) => {
  return {
    message: `✅ ${msg}`,
    options: []
  };
};

export const getInfoMessage = (msg) => {
  return {
    message: `ℹ️ ${msg}`,
    options: []
  };
};
