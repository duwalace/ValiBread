import { listarPacotes, criarPacote, atualizarPacoteStatus, deletarPacote } from '../models/estoqueModel.js';
import { registrarMovimentacao } from '../models/movimentacaoModel.js';

// Mapeamento de transição de status → tipo de movimentação
// Reflete a lógica de negócio: ao mover um pacote manualmente via painel admin,
// o tipo de movimentação é inferido automaticamente para alimentar o gráfico do dashboard.
const inferirTipoMovimentacao = (statusAntigo, statusNovo) => {
  if (statusNovo === 'EM_ESTOQUE')  return 'Entrada';      // voltou ao estoque ou entrou
  if (statusNovo === 'EXPEDIDO')    return 'Saída';         // saiu do armazém
  if (statusNovo === 'SEPARADO')    return 'Transferência'; // separado para expedição
  return null; // transição desconhecida → não registra movimentação
};

export const listar = async (req, res) => {
  try {
    const { id_lote } = req.query;
    const data = await listarPacotes({ id_lote });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const criar = async (req, res) => {
  try {
    const { id_lote } = req.body;
    if (!id_lote) return res.status(400).json({ erro: 'id_lote é obrigatório.' });
    const data = await criarPacote({ id_lote: Number(id_lote) });
    return res.status(201).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};

export const atualizarStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ erro: 'Campo status é obrigatório.' });

    const id_pacote = Number(req.params.id);

    // Atualiza o status do pacote
    const pacoteAtualizado = await atualizarPacoteStatus(id_pacote, status);

    // Infere e registra a movimentação correspondente automaticamente
    const tipoMovimentacao = inferirTipoMovimentacao(null, status);
    if (tipoMovimentacao) {
      try {
        // id_usuario extraído do JWT pelo authMiddleware (pode ser null se não autenticado)
        const id_usuario = req.usuario?.id_usuario ?? null;
        await registrarMovimentacao({
          tipo_movimentacao: tipoMovimentacao,
          id_pacote,
          id_usuario,
        });
      } catch (errMovimentacao) {
        // Não falha a requisição principal se a movimentação não puder ser registrada
        console.warn(`[pacoteController] Aviso: status atualizado mas movimentação não registrada: ${errMovimentacao.message}`);
      }
    }

    return res.status(200).json(pacoteAtualizado);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};

export const deletar = async (req, res) => {
  try {
    await deletarPacote(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};
