/**
 * index.js — Core do ValiBread Chatbot
 *
 * Refatorado para exportar a lógica da sessão de chat em vez de usar readline.
 * Cada conexão WebSocket instanciará uma ChatbotSession.
 */

import {
  getMenuPrincipal,
  getMenuQuantidade,
  getMenuRisco,
  getMenuMovimentacao,
  getMenuMovimentacaoProduto,
  getMenuTipoMovimentacao,
  getMenuPerdas,
  getErroMessage,
  getSucessoMessage,
  getInfoMessage,
} from './menuManager.js';

import {
  listarProdutos,
  contarPacotesPorProduto,
  resumoQuantidadeTodosProdutos,
  buscarLotesEmRisco,
  buscarRiscoAgrupadoPorFaixa,
  contarEntradasSaidasGeral,
  buscarMovimentacoesFiltradas,
  resumoEntradasSaidasPorProduto,
  buscarPerdas,
  resumoPerdas,
} from './queries.js';

import { gerarPlanilha } from './exporter.js';

let produtosCached = null;

export const getProdutos = async () => {
  if (!produtosCached) {
    produtosCached = await listarProdutos();
  }
  return produtosCached;
};

export class ChatbotSession {
  constructor(socket, id_usuario) {
    this.socket = socket;
    this.id_usuario = id_usuario;
    this.state = {
      menu: 'principal',
      produtoSelecionado: null,
      tipoMovimentacao: null,
      dadosUltimaConsulta: null,
      nomeUltimaConsulta: 'relatorio',
    };
  }

  setMenu(menu) {
    this.state.menu = menu;
  }

  voltarMenuPrincipal() {
    this.state.menu = 'principal';
    this.state.produtoSelecionado = null;
    this.state.tipoMovimentacao = null;
  }

  async processarEntrada(entrada) {
    try {
      let result = null;
      switch (this.state.menu) {
        case 'principal':
          result = await this.handleMenuPrincipal(entrada);
          break;
        case 'quantidade':
          result = await this.handleMenuQuantidade(entrada);
          break;
        case 'risco':
          result = await this.handleMenuRisco(entrada);
          break;
        case 'movimentacao':
          result = await this.handleMenuMovimentacao(entrada);
          break;
        case 'movimentacao_produto':
          result = await this.handleMenuMovimentacaoProduto(entrada);
          break;
        case 'movimentacao_tipo':
          result = await this.handleMenuMovimentacaoTipo(entrada);
          break;
        case 'perdas':
          result = await this.handleMenuPerdas(entrada);
          break;
        default:
          this.voltarMenuPrincipal();
          result = getMenuPrincipal();
      }
      return result;
    } catch (err) {
      console.error('Erro na sessão:', err);
      this.voltarMenuPrincipal();
      return getErroMessage('Ocorreu um erro interno. Voltando ao menu principal.');
    }
  }

  async iniciar() {
    await getProdutos();
    return getMenuPrincipal();
  }

  async handleMenuPrincipal(entrada) {
    switch (entrada) {
      case '0':
        this.voltarMenuPrincipal();
        return { message: 'Sessão reiniciada.', options: getMenuPrincipal().options };
      case '1':
        this.setMenu('quantidade');
        return getMenuQuantidade(await getProdutos());
      case '2':
        this.setMenu('risco');
        return getMenuRisco();
      case '3':
        this.setMenu('movimentacao');
        return getMenuMovimentacao();
      case '4':
        this.setMenu('perdas');
        return getMenuPerdas();
      default:
        return getErroMessage();
    }
  }

  async handleMenuQuantidade(entrada) {
    const produtos = await getProdutos();

    if (entrada === '0') {
      this.voltarMenuPrincipal();
      return getMenuPrincipal();
    }

    if (entrada === '*') {
      const dados = await resumoQuantidadeTodosProdutos();
      if (dados.length === 0) {
        return getInfoMessage('Nenhum produto com estoque ativo encontrado.');
      }
      const url = await gerarPlanilha(dados, 'quantidade_todos_produtos', 'Quantidade por Produto', this.id_usuario);
      return { 
        ...getSucessoMessage(`Planilha gerada com sucesso!`),
        downloadUrl: url
      };
    }

    const indice = parseInt(entrada, 10) - 1;
    if (isNaN(indice) || indice < 0 || indice >= produtos.length) {
      return getErroMessage();
    }

    const produto = produtos[indice];
    const resultado = await contarPacotesPorProduto(produto.id_produto);
    
    let msg = `📦 ${produto.nome}\n`;
    msg += `Total em estoque (ativo): ${resultado.total} pacotes\n`;
    msg += `├─ EM_ESTOQUE : ${resultado.em_estoque} pacotes\n`;
    msg += `└─ SEPARADO   : ${resultado.separado} pacotes`;

    return { message: msg, options: getMenuQuantidade(produtos).options };
  }

  async handleMenuRisco(entrada) {
    const faixasMap = { '1': 3, '2': 5, '3': 7 };

    if (entrada === '0') {
      this.voltarMenuPrincipal();
      return getMenuPrincipal();
    }

    if (entrada === '*') {
      const grupos = await buscarRiscoAgrupadoPorFaixa();
      const dados = grupos[7];
      if (dados.length === 0) {
        return getInfoMessage('Nenhum lote em risco nos próximos 7 dias.');
      }
      const url = await gerarPlanilha(dados, 'risco_vencimento_7_dias', 'Produtos em Risco', this.id_usuario);
      return { 
        ...getSucessoMessage(`Planilha gerada com sucesso!`),
        downloadUrl: url
      };
    }

    const dias = faixasMap[entrada];
    if (!dias) return getErroMessage();

    const dados = await buscarLotesEmRisco(dias);

    if (dados.length === 0) {
      return { message: `ℹ️ Nenhum lote vencendo nos próximos ${dias} dias. ✨`, options: getMenuRisco().options };
    }

    let msg = `⚠️ Lotes Vencendo em até ${dias} dias (${dados.length} lote(s))\n\n`;
    dados.forEach((d) => {
      const flag = d.dias_restantes <= 1 ? '🔴' : d.dias_restantes <= 3 ? '🟠' : '🟡';
      msg += `${flag} ${d.produto} | Lote: ${d.codigo_lote} | Validade: ${d.data_validade} | ${d.dias_restantes} dias restantes\n`;
    });

    return { message: msg.trim(), options: getMenuRisco().options };
  }

  async handleMenuMovimentacao(entrada) {
    if (entrada === '0') {
      this.voltarMenuPrincipal();
      return getMenuPrincipal();
    }

    if (entrada === '*') {
      const dados = await resumoEntradasSaidasPorProduto();
      if (dados.length === 0) return getInfoMessage('Nenhuma movimentação registrada.');
      const url = await gerarPlanilha(dados, 'entradas_saidas_por_produto', 'Entradas e Saídas', this.id_usuario);
      return { 
        ...getSucessoMessage(`Planilha gerada com sucesso!`),
        downloadUrl: url
      };
    }

    if (entrada === '1') {
      const totais = await contarEntradasSaidasGeral();
      let msg = `🔄 Movimentações — Totais Gerais\n\n`;
      msg += `Total de Entradas: ${totais.total_entradas}\n`;
      msg += `Total de Saídas: ${totais.total_saidas}\n`;
      msg += `Total Geral: ${totais.total_geral}`;
      return { message: msg, options: getMenuMovimentacao().options };
    }

    if (entrada === '2') {
      this.setMenu('movimentacao_produto');
      return getMenuMovimentacaoProduto(await getProdutos());
    }

    return getErroMessage();
  }

  async handleMenuMovimentacaoProduto(entrada) {
    const produtos = await getProdutos();

    if (entrada === '0') {
      this.setMenu('movimentacao');
      return getMenuMovimentacao();
    }

    const indice = parseInt(entrada, 10) - 1;
    if (isNaN(indice) || indice < 0 || indice >= produtos.length) {
      return getErroMessage();
    }

    const produto = produtos[indice];
    this.state.produtoSelecionado = produto;
    this.setMenu('movimentacao_tipo');
    return getMenuTipoMovimentacao(produto.nome);
  }

  async handleMenuMovimentacaoTipo(entrada) {
    const produto = this.state.produtoSelecionado;
    const tiposMap = { '1': 'ENTRADA', '2': 'SAIDA', '3': 'TODOS' };

    if (entrada === '0') {
      this.setMenu('movimentacao_produto');
      return getMenuMovimentacaoProduto(await getProdutos());
    }

    if (entrada === '*') {
      const tipo = this.state.tipoMovimentacao || 'TODOS';
      const dados = await buscarMovimentacoesFiltradas(produto.id_produto, tipo);
      const dadosFlat = dados.map((m) => ({
        produto: m.pacote?.lote?.produto?.nome ?? produto.nome,
        lote: m.pacote?.lote?.codigo_lote ?? '-',
        tipo: m.tipo_movimentacao,
        data_hora: new Date(m.data_hora).toLocaleString('pt-BR'),
      }));

      if (dadosFlat.length === 0) return getInfoMessage('Nenhuma movimentação encontrada para este filtro.');
      
      const url = await gerarPlanilha(dadosFlat, `movimentacao_${produto.nome}_${tipo}`, `${produto.nome} — ${tipo}`, this.id_usuario);
      return { 
        ...getSucessoMessage(`Planilha gerada com sucesso!`),
        downloadUrl: url
      };
    }

    const tipo = tiposMap[entrada];
    if (!tipo) return getErroMessage();

    this.state.tipoMovimentacao = tipo;
    const dados = await buscarMovimentacoesFiltradas(produto.id_produto, tipo);

    let msg = `🔄 ${produto.nome} — ${tipo} (${dados.length} registros)\n\n`;
    if (dados.length === 0) {
      msg = `ℹ️ Nenhuma movimentação encontrada.`;
    } else {
      dados.slice(0, 10).forEach((m) => {
        msg += `${new Date(m.data_hora).toLocaleString('pt-BR')} | Lote: ${m.pacote?.lote?.codigo_lote ?? '-'} | ${m.tipo_movimentacao}\n`;
      });
      if (dados.length > 10) {
        msg += `... e mais ${dados.length - 10} registros. Use [*] para exportar tudo.`;
      }
    }

    return { message: msg.trim(), options: getMenuTipoMovimentacao(produto.nome).options };
  }

  async handleMenuPerdas(entrada) {
    if (entrada === '0') {
      this.voltarMenuPrincipal();
      return getMenuPrincipal();
    }

    if (entrada === '*' || entrada === '1') {
      const resumo = await resumoPerdas();
      const perdas = await buscarPerdas();

      if (perdas.length === 0) {
        return getInfoMessage('Nenhuma perda registrada. 🎉');
      }

      if (entrada === '*') {
        const dadosFlat = perdas.map((a) => ({
          produto: a.lote?.produto?.nome ?? 'Desconhecido',
          lote: a.lote?.codigo_lote ?? '-',
          data_validade: a.lote?.data_validade ?? '-',
          mensagem: a.mensagem ?? '-',
          data_hora: new Date(a.data_hora).toLocaleString('pt-BR'),
        }));
        const url = await gerarPlanilha(dadosFlat, 'perdas', 'Perdas', this.id_usuario);
        return { 
          ...getSucessoMessage(`Planilha gerada com sucesso!`),
          downloadUrl: url
        };
      }

      let msg = `🗑️ Perdas — Resumo por Produto\n\n`;
      resumo.forEach((r) => {
        msg += `${r.produto} | ${r.total_perdas} perda(s)\n`;
      });
      msg += `\nTOTAL GERAL: ${perdas.length} perdas registradas`;

      return { message: msg, options: getMenuPerdas().options };
    }

    return getErroMessage();
  }
}
