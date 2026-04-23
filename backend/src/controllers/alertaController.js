import { listarAlertas, deletarAlerta } from '../models/estoqueModel.js';

export const listar = async (req, res) => {
  try {
    const { tipo_alerta, id_lote } = req.query;
    const data = await listarAlertas({ tipo_alerta, id_lote });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};

/**
 * "Marcar como visto" — o schema não possui campo visualizado,
 * então implementamos como exclusão do alerta (consumido).
 * Assumição documentada: alerta visualizado = deletado.
 */
export const marcarComoVisto = async (req, res) => {
  try {
    await deletarAlerta(req.params.id);
    return res.status(200).json({ mensagem: 'Alerta marcado como visto.' });
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};
