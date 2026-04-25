import exceljs from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buscarRelatorioMovimentacaoSecure } from '../models/dashboardModel.js';
import { getTenantSupabase } from '../config/supabaseTenant.js';

const formatarDataHora = (dataStr) => {
  if (!dataStr) return "";
  const d = new Date(dataStr);
  return d.toLocaleString('pt-BR');
};

export const gerarRelatorioPersonalizado = async (filtros, userToken, formato) => {
  const tenantSupabase = getTenantSupabase(userToken);
  const dadosBrutos = await buscarRelatorioMovimentacaoSecure(filtros, tenantSupabase);

  const dados = dadosBrutos.map(item => [
    formatarDataHora(item.data_hora),
    item.tipo_movimentacao,
    item.pacote?.lote?.produto?.nome || 'Desconhecido',
    item.pacote?.lote?.codigo_lote || 'N/A'
  ]);

  const colunas = ['Data/Hora', 'Tipo', 'Produto', 'Lote'];
  const titulo = `Relatório de Movimentações (${filtros.tipo || 'TODOS'})`;

  if (formato === 'EXCEL') {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Relatório');

    worksheet.addRow(colunas);
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE68A00' } // Âmbar do Warm Industrial
    };
    headerRow.alignment = { horizontal: 'center' };

    dados.forEach(linha => worksheet.addRow(linha));

    worksheet.columns.forEach(column => {
      column.width = 20;
    });

    return await workbook.xlsx.writeBuffer();
  }

  if (formato === 'PDF') {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(titulo, 14, 15);
    
    // Filtros aplicados no cabeçalho do PDF
    doc.setFontSize(10);
    const sub = `Período: ${filtros.dataInicio || 'Início'} a ${filtros.dataFim || 'Hoje'}`;
    doc.text(sub, 14, 22);
    
    autoTable(doc, {
      startY: 28,
      head: [colunas],
      body: dados,
      theme: 'grid',
      headStyles: { 
        fillColor: [230, 138, 0], // Âmbar
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: { 
        fillColor: [245, 240, 235] // Cinza Quente
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
      }
    });

    return Buffer.from(doc.output('arraybuffer'));
  }

  throw new Error(`Formato ${formato} não suportado.`);
};
