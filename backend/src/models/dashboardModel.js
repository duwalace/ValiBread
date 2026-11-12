import pool from '../config/database.js';

/**
 * Conta pacotes ativos em estoque: EM_ESTOQUE + SEPARADO.
 * Exclui EXPEDIDO (já saíram fisicamente).
 */
export const contarTotalPacotes = async () => {
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS count FROM pacote WHERE status IN ('EM_ESTOQUE', 'SEPARADO')"
    );
    return rows[0]?.count ?? 0;
  } catch (error) {
    throw new Error(`Erro ao contar pacotes ativos: ${error.message}`);
  }
};

/**
 * Conta pacotes com status 'SEPARADO' — separados na expedição,
 * aguardando saída física. Fonte do card "Para Entrega" no dashboard.
 */
export const contarPacotesParaEntrega = async () => {
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS count FROM pacote WHERE status = 'SEPARADO'"
    );
    return rows[0]?.count ?? 0;
  } catch (error) {
    throw new Error(`Erro ao contar pacotes separados: ${error.message}`);
  }
};

/**
 * Busca lotes com data_validade dentro dos próximos N dias a partir de hoje.
 * Retorna cada lote com a contagem de pacotes vinculados.
 */
export const buscarLotesProximosVencimento = async (dias = 7) => {
  const hoje = new Date();
  const limite = new Date();
  limite.setDate(hoje.getDate() + dias);

  const hojeISO = hoje.toISOString().split('T')[0];
  const limiteISO = limite.toISOString().split('T')[0];

  try {
    const query = `
      SELECT 
        l.id_lote,
        l.codigo_lote,
        l.data_validade::text AS data_validade,
        pr.nome AS produto_nome,
        COALESCE(
          json_agg(
            json_build_object('id_pacote', p.id_pacote)
          ) FILTER (WHERE p.id_pacote IS NOT NULL),
          '[]'
        ) AS pacote
      FROM lote l
      LEFT JOIN produto pr ON l.id_produto = pr.id_produto
      LEFT JOIN pacote p ON l.id_lote = p.id_lote
      WHERE l.data_validade >= $1::date AND l.data_validade <= $2::date
      GROUP BY l.id_lote, l.codigo_lote, l.data_validade, pr.nome
      ORDER BY l.data_validade ASC
    `;

    const { rows } = await pool.query(query, [hojeISO, limiteISO]);
    return rows.map(r => ({
      id_lote: r.id_lote,
      codigo_lote: r.codigo_lote,
      data_validade: r.data_validade,
      produto: r.produto_nome ? { nome: r.produto_nome } : null,
      pacote: r.pacote || []
    }));
  } catch (error) {
    throw new Error(`Erro ao buscar lotes próximos ao vencimento: ${error.message}`);
  }
};

/**
 * Busca todas as movimentações do mês atual.
 */
export const buscarMovimentacoesMesAtual = async () => {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioMesISO = inicioMes.toISOString();

  try {
    const query = `
      SELECT id_movimentacao, tipo_movimentacao, data_hora
      FROM movimentacao_estoque
      WHERE data_hora >= $1
      ORDER BY data_hora ASC
    `;
    const { rows } = await pool.query(query, [inicioMesISO]);
    return rows;
  } catch (error) {
    throw new Error(`Erro ao buscar movimentações: ${error.message}`);
  }
};

/**
 * Busca o inventário ativo (pacotes com lote válido), ordenado por
 * data_validade ASC (FEFO). Suporta filtros opcionais.
 */
export const buscarInventarioFEFO = async (filtros = {}) => {
  try {
    const conditions = [];
    const values = [];

    if (filtros.categoria) {
      values.push(`%${filtros.categoria}%`);
      conditions.push(`pr.nome ILIKE $${values.length}`);
    }
    if (filtros.lote) {
      values.push(`%${filtros.lote}%`);
      conditions.push(`l.codigo_lote ILIKE $${values.length}`);
    }
    if (filtros.dataFabricacaoInicio) {
      values.push(filtros.dataFabricacaoInicio);
      conditions.push(`l.data_fabricacao >= $${values.length}::date`);
    }
    if (filtros.dataFabricacaoFim) {
      values.push(filtros.dataFabricacaoFim);
      conditions.push(`l.data_fabricacao <= $${values.length}::date`);
    }
    if (filtros.dataValidadeInicio) {
      values.push(filtros.dataValidadeInicio);
      conditions.push(`l.data_validade >= $${values.length}::date`);
    }
    if (filtros.dataValidadeFim) {
      values.push(filtros.dataValidadeFim);
      conditions.push(`l.data_validade <= $${values.length}::date`);
    }
    if (filtros.tagRfid) {
      values.push(`%${filtros.tagRfid}%`);
      conditions.push(`r.epc ILIKE $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT 
        p.id_pacote,
        l.id_lote,
        l.codigo_lote,
        l.data_fabricacao::text AS data_fabricacao,
        l.data_validade::text AS data_validade,
        l.status AS lote_status,
        pr.id_produto,
        pr.nome AS produto_nome,
        r.epc AS rfid_epc,
        r.status AS rfid_status
      FROM pacote p
      JOIN lote l ON p.id_lote = l.id_lote
      JOIN produto pr ON l.id_produto = pr.id_produto
      LEFT JOIN rfid_etiqueta r ON p.id_pacote = r.id_pacote
      ${whereClause}
      ORDER BY l.data_validade ASC
    `;

    const { rows } = await pool.query(query, values);
    return rows.map(r => ({
      id_pacote: r.id_pacote,
      lote: {
        id_lote: r.id_lote,
        codigo_lote: r.codigo_lote,
        data_fabricacao: r.data_fabricacao,
        data_validade: r.data_validade,
        status: r.lote_status,
        produto: {
          id_produto: r.id_produto,
          nome: r.produto_nome
        }
      },
      rfid_etiqueta: r.rfid_epc ? {
        epc: r.rfid_epc,
        status: r.rfid_status
      } : null
    }));
  } catch (error) {
    throw new Error(`Erro ao buscar inventário FEFO: ${error.message}`);
  }
};

/**
 * Busca o inventário ativo FEFO (mantido para compatibilidade).
 */
export const buscarInventarioFEFOSecure = async (filtros = {}, _tenantClient = null) => {
  return buscarInventarioFEFO(filtros);
};

/**
 * Busca as movimentações de estoque para relatórios personalizados.
 */
export const buscarRelatorioMovimentacaoSecure = async (filtros = {}, _tenantClient = null) => {
  try {
    const conditions = [];
    const values = [];

    if (filtros.tipo && filtros.tipo !== 'TODOS') {
      values.push(filtros.tipo);
      conditions.push(`m.tipo_movimentacao = $${values.length}`);
    }
    if (filtros.dataInicio) {
      values.push(`${filtros.dataInicio}T00:00:00`);
      conditions.push(`m.data_hora >= $${values.length}`);
    }
    if (filtros.dataFim) {
      values.push(`${filtros.dataFim}T23:59:59`);
      conditions.push(`m.data_hora <= $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT 
        m.id_movimentacao,
        m.tipo_movimentacao,
        m.data_hora,
        l.codigo_lote,
        pr.nome AS produto_nome
      FROM movimentacao_estoque m
      LEFT JOIN pacote p ON m.id_pacote = p.id_pacote
      LEFT JOIN lote l ON p.id_lote = l.id_lote
      LEFT JOIN produto pr ON l.id_produto = pr.id_produto
      ${whereClause}
      ORDER BY m.data_hora DESC
    `;

    const { rows } = await pool.query(query, values);
    return rows.map(r => ({
      id_movimentacao: r.id_movimentacao,
      tipo_movimentacao: r.tipo_movimentacao,
      data_hora: r.data_hora,
      pacote: r.codigo_lote ? {
        lote: {
          codigo_lote: r.codigo_lote,
          produto: r.produto_nome ? { nome: r.produto_nome } : null
        }
      } : null
    }));
  } catch (error) {
    throw new Error(`Erro ao buscar relatório de movimentações: ${error.message}`);
  }
};

/**
 * Busca o relatório completo de movimentações + perdas para o painel do dashboard.
 */
export const buscarRelatorioCompleto = async (filtros = {}) => {
  const inicioISO = filtros.dataInicio ? `${filtros.dataInicio}T00:00:00` : null;
  const fimISO    = filtros.dataFim    ? `${filtros.dataFim}T23:59:59`    : null;

  const tipoEhPerda = filtros.tipo === 'Perda';
  const tipoEhTodos = !filtros.tipo || filtros.tipo === 'TODOS';

  const incluirMovimentacoes = tipoEhTodos || !tipoEhPerda;
  const incluirPerdas        = tipoEhTodos || tipoEhPerda;

  let movimentacoes = [];
  if (incluirMovimentacoes) {
    try {
      const conditions = [];
      const values = [];

      if (!tipoEhTodos) {
        values.push(filtros.tipo);
        conditions.push(`m.tipo_movimentacao = $${values.length}`);
      }
      if (inicioISO) {
        values.push(inicioISO);
        conditions.push(`m.data_hora >= $${values.length}`);
      }
      if (fimISO) {
        values.push(fimISO);
        conditions.push(`m.data_hora <= $${values.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT 
          m.id_movimentacao,
          m.tipo_movimentacao,
          m.data_hora,
          p.id_pacote,
          r.epc AS rfid_epc,
          r.status AS rfid_status,
          l.codigo_lote,
          pr.nome AS produto_nome
        FROM movimentacao_estoque m
        LEFT JOIN pacote p ON m.id_pacote = p.id_pacote
        LEFT JOIN rfid_etiqueta r ON p.id_pacote = r.id_pacote
        LEFT JOIN lote l ON p.id_lote = l.id_lote
        LEFT JOIN produto pr ON l.id_produto = pr.id_produto
        ${whereClause}
        ORDER BY m.data_hora DESC
      `;

      const { rows } = await pool.query(query, values);
      movimentacoes = rows.map(r => ({
        id_movimentacao: r.id_movimentacao,
        tipo_movimentacao: r.tipo_movimentacao,
        data_hora: r.data_hora,
        pacote: r.id_pacote ? {
          id_pacote: r.id_pacote,
          rfid_etiqueta: r.rfid_epc ? { epc: r.rfid_epc, status: r.rfid_status } : null,
          lote: r.codigo_lote ? {
            codigo_lote: r.codigo_lote,
            produto: r.produto_nome ? { nome: r.produto_nome } : null
          } : null
        } : null
      }));
    } catch (e) {
      console.error('[buscarRelatorioCompleto] Excecao em movimentacoes:', e.message);
    }
  }

  let perdas = [];
  if (incluirPerdas) {
    try {
      const conditions = [];
      const values = [];

      if (inicioISO) {
        values.push(filtros.dataInicio);
        conditions.push(`l.data_validade >= $${values.length}::date`);
      }
      if (fimISO) {
        values.push(filtros.dataFim);
        conditions.push(`l.data_validade <= $${values.length}::date`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT 
          l.id_lote,
          l.codigo_lote,
          l.data_validade::text AS data_validade,
          pr.nome AS produto_nome,
          COALESCE(
            json_agg(
              json_build_object('id_pacote', p.id_pacote)
            ) FILTER (WHERE p.id_pacote IS NOT NULL),
            '[]'
          ) AS pacotes
        FROM lote l
        LEFT JOIN produto pr ON l.id_produto = pr.id_produto
        LEFT JOIN pacote p ON l.id_lote = p.id_lote
        ${whereClause}
        GROUP BY l.id_lote, l.codigo_lote, l.data_validade, pr.nome
      `;

      const { rows } = await pool.query(query, values);
      for (const lote of rows) {
        const dataPerda = `${lote.data_validade}T00:00:00`;
        const pacotes = lote.pacotes || [];
        for (const pacote of pacotes) {
          perdas.push({
            id_movimentacao: `perda-${lote.id_lote}-${pacote.id_pacote}`,
            tipo_movimentacao: 'Perda',
            data_hora: dataPerda,
            pacote: {
              id_pacote: pacote.id_pacote,
              lote: {
                codigo_lote: lote.codigo_lote,
                produto: lote.produto_nome ? { nome: lote.produto_nome } : null,
              },
            },
          });
        }
      }
    } catch (e) {
      console.error('[buscarRelatorioCompleto] Excecao em perdas:', e.message);
    }
  }

  return [...movimentacoes, ...perdas].sort(
    (a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
  );
};
