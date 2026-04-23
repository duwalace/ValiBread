import { listarLeitores, buscarLeitorPorId, criarLeitor, atualizarLeitor } from '../models/rfidModel.js';

const STATUS_VALIDOS = ['ATIVO', 'INATIVO', 'MANUTENÇÃO'];

export const listar = async (req, res) => {
  try {
    const data = await listarLeitores();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const buscar = async (req, res) => {
  try {
    const data = await buscarLeitorPorId(req.params.id);
    if (!data) return res.status(404).json({ erro: 'Leitor não encontrado.' });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

export const criar = async (req, res) => {
  try {
    const { codigo_equipamento, localizacao, status } = req.body;
    if (!codigo_equipamento || !localizacao) {
      return res.status(400).json({ erro: 'codigo_equipamento e localizacao são obrigatórios.' });
    }
    if (status && !STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ erro: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` });
    }
    const data = await criarLeitor({ codigo_equipamento, localizacao, status: status || 'ATIVO' });
    return res.status(201).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};

export const atualizar = async (req, res) => {
  try {
    const { codigo_equipamento, localizacao, status } = req.body;
    if (status && !STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ erro: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` });
    }
    const dados = {};
    if (codigo_equipamento !== undefined) dados.codigo_equipamento = codigo_equipamento;
    if (localizacao !== undefined) dados.localizacao = localizacao;
    if (status !== undefined) dados.status = status;
    const data = await atualizarLeitor(req.params.id, dados);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};

// I-07: Renomeado de alternarStatus → atualizarStatus com lógica de toggle real
export const atualizarStatusLeitor = async (req, res) => {
  try {
    const leitorAtual = await buscarLeitorPorId(req.params.id);
    if (!leitorAtual) return res.status(404).json({ erro: 'Leitor não encontrado.' });

    // Se body tiver status explícito, usa; se não, faz toggle ATIVO↔INATIVO
    const novoStatus = req.body?.status
      ? req.body.status
      : leitorAtual.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';

    if (!STATUS_VALIDOS.includes(novoStatus)) {
      return res.status(400).json({ erro: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` });
    }
    const data = await atualizarLeitor(req.params.id, { status: novoStatus });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};
