import { listarAlertas, deletarAlerta, criarAlerta } from '../models/estoqueModel.js';
import { buscarLotesProximosVencimento } from '../models/dashboardModel.js';
import pool from '../config/database.js';

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

export const checarVencimentosDiario = async (req, res) => {
  try {
    // 1. Busca todos os lotes que vencem em até 7 dias
    const lotes = await buscarLotesProximosVencimento(7);
    
    // 2. Busca alertas já gerados hoje para não duplicar
    const hoje = new Date().toISOString().split('T')[0];
    const { rows: alertasHoje } = await pool.query(
      'SELECT id_lote FROM alerta WHERE tipo_alerta = $1 AND data_hora >= $2',
      ['VENCIMENTO_PROXIMO', `${hoje}T00:00:00.000Z`]
    );
    
    const lotesComAlertaHoje = alertasHoje.map(a => a.id_lote);
    let gerados = 0;
    
    for (const lote of lotes) {
      // 3. Gera alerta se ainda não foi gerado hoje E se o lote tem pacotes ativos
      const temPacotes = lote.pacote && lote.pacote.length > 0;
      
      if (!lotesComAlertaHoje.includes(lote.id_lote) && temPacotes) {
        const dataValidade = new Date(lote.data_validade + 'T00:00:00');
        const hojeObj = new Date(hoje + 'T00:00:00');
        const diasRestantes = Math.ceil((dataValidade - hojeObj) / (1000 * 60 * 60 * 24));
        
        const mensagem = `O lote ${lote.codigo_lote} de ${lote.produto?.nome} vence em ${diasRestantes} dia(s).`;
        await criarAlerta('VENCIMENTO_PROXIMO', mensagem, lote.id_lote);
        gerados++;
      }
    }
    
    return res.status(200).json({ mensagem: `Check diário concluído. ${gerados} alertas gerados.` });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};
