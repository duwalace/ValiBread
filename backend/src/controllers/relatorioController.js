import { listarRelatorios, criarRelatorio } from '../models/relatorioModel.js';
import supabase from '../config/supabase.js';

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
 * GET /api/relatorio/preview?tipo=ENTRADA&dataInicio=2025-01-01&dataFim=2025-01-31
 * Retorna movimentações filtradas por período e tipo para pré-visualização.
 * tipos aceitos: ENTRADA | SAÍDA | PERDA | TRANSFERÊNCIA | (omitido = todos)
 */
export const previsualizar = async (req, res) => {
  try {
    const { tipo, dataInicio, dataFim } = req.query;

    if (!dataInicio || !dataFim) {
      return res.status(400).json({ erro: 'dataInicio e dataFim são obrigatórios.' });
    }

    // Construir query base em movimentacao_estoque com joins corretos pelo schema
    // movimentacao_estoque.id_pacote → pacote
    // pacote → rfid_etiqueta (FK inversa: rfid_etiqueta.id_pacote)
    // pacote.id_lote → lote → produto
    let query = supabase
      .from('movimentacao_estoque')
      .select(`
        id_movimentacao,
        tipo_movimentacao,
        data_hora,
        pacote (
          id_pacote,
          rfid_etiqueta ( epc, status ),
          lote ( codigo_lote, produto ( nome ) )
        ),
        leitor_rfid ( codigo_equipamento, localizacao )
      `)
      .gte('data_hora', `${dataInicio}T00:00:00`)
      .lte('data_hora', `${dataFim}T23:59:59`)
      .order('data_hora', { ascending: false })
      .limit(100);

    // Filtrar por tipo se especificado
    if (tipo && tipo !== 'TODOS') {
      query = query.eq('tipo_movimentacao', tipo);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Erro ao buscar movimentações: ${error.message}`);

    // Agrupa por tipo para o resumo
    const resumo = { ENTRADA: 0, 'SAÍDA': 0, TRANSFERÊNCIA: 0 };
    (data || []).forEach((m) => {
      const t = m.tipo_movimentacao?.toUpperCase();
      if (t in resumo) resumo[t]++;
      else resumo[t] = (resumo[t] ?? 0) + 1;
    });

    return res.status(200).json({
      total: (data || []).length,
      resumo,
      movimentacoes: data || [],
    });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

