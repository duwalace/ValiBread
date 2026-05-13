import exceljs from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import jwt from 'jsonwebtoken';
import { buscarRelatorioMovimentacaoSecure } from '../models/dashboardModel.js';
import { getTenantSupabase } from '../config/supabaseTenant.js';
import supabase from '../config/supabase.js';

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

    const buffer = await workbook.xlsx.writeBuffer();
    await registrarExport(buffer, 'EXCEL', userToken, filtros.tipo || 'TODOS');
    return buffer;
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

    const buffer = Buffer.from(doc.output('arraybuffer'));
    await registrarExport(buffer, 'PDF', userToken, filtros.tipo || 'TODOS');
    return buffer;
  }

  throw new Error(`Formato ${formato} não suportado.`);
};

const registrarExport = async (buffer, formato, userToken, tipo) => {
  try {
    const payload = jwt.decode(userToken);
    const id_usuario = payload?.id_usuario;

    if (!id_usuario) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const fileName = `Dashboard_${tipo}_${timestamp}.${formato === 'EXCEL' ? 'xlsx' : 'pdf'}`;
    const contentType = formato === 'EXCEL' 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      : 'application/pdf';

    const { error: uploadError } = await supabase.storage
      .from('chatbot_exports')
      .upload(fileName, buffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error('Erro ao fazer upload para o Supabase no dashboard:', uploadError);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('chatbot_exports')
      .getPublicUrl(fileName);

    await supabase.from('chatbot_export').insert([{
      id_usuario,
      nome_arquivo: fileName,
      url_arquivo: urlData.publicUrl
    }]);

  } catch (error) {
    console.error('Erro ao registrar export do dashboard:', error);
  }
};
