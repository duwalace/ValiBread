import exceljs from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import jwt from 'jsonwebtoken';
import { BlobServiceClient } from '@azure/storage-blob';
import { buscarRelatorioMovimentacaoSecure } from '../models/dashboardModel.js';
import pool from '../config/database.js';

const formatarDataHora = (dataStr) => {
  if (!dataStr) return "";
  const d = new Date(dataStr);
  return d.toLocaleString('pt-BR');
};

/**
 * Gera um relatório personalizado em EXCEL ou PDF.
 */
export const gerarRelatorioPersonalizado = async (filtros, userToken, formato) => {
  const dadosBrutos = await buscarRelatorioMovimentacaoSecure(filtros);

  const dados = (dadosBrutos || []).map(item => [
    formatarDataHora(item.data_hora),
    item.tipo_movimentacao,
    item.pacote?.lote?.produto?.nome || 'Desconhecido',
    item.pacote?.lote?.codigo_lote  || 'N/A',
  ]);

  const colunas = ['Data/Hora', 'Tipo', 'Produto', 'Lote'];
  const tipoLabel = filtros.tipo || 'TODOS';
  const titulo = `Relatório de Movimentações (${tipoLabel})`;

  if (formato === 'EXCEL') {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Relatório');

    worksheet.addRow(colunas);
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE68A00' }, // Âmbar do Warm Industrial
    };
    headerRow.alignment = { horizontal: 'center' };

    dados.forEach(linha => {
      const row = worksheet.addRow(linha);
      if (linha[1] === 'Perda') {
        row.eachCell(cell => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFDE8E8' },
          };
        });
      }
    });

    worksheet.columns.forEach(column => {
      column.width = 22;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    await registrarExport(buffer, 'EXCEL', userToken, tipoLabel);
    return buffer;
  }

  if (formato === 'PDF') {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(titulo, 14, 15);

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
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 240, 235],
      },
      didParseCell(data) {
        if (data.section === 'body' && dados[data.row.index]?.[1] === 'Perda') {
          data.cell.styles.fillColor = [253, 232, 232];
          data.cell.styles.textColor = [180, 30, 30];
        }
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
    });

    const buffer = Buffer.from(doc.output('arraybuffer'));
    await registrarExport(buffer, 'PDF', userToken, tipoLabel);
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
    const nomeSeguro = tipo.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const fileName = `Dashboard_${nomeSeguro}_${timestamp}.${formato === 'EXCEL' ? 'xlsx' : 'pdf'}`;
    const contentType = formato === 'EXCEL'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';

    let urlArquivo = `/exports/${fileName}`;
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER || 'chatbot-exports';

    if (connectionString) {
      try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists();

        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        await blockBlobClient.uploadData(buffer, {
          blobHTTPHeaders: { blobContentType: contentType }
        });
        urlArquivo = blockBlobClient.url;
      } catch (uploadError) {
        console.error('Erro ao fazer upload para o Azure Blob Storage:', uploadError.message);
      }
    } else {
      console.warn('[registrarExport] AZURE_STORAGE_CONNECTION_STRING não configurada no .env. Registro salvo sem upload para Blob.');
    }

    await pool.query(
      'INSERT INTO chatbot_export (id_usuario, nome_arquivo, url_arquivo) VALUES ($1, $2, $3)',
      [id_usuario, fileName, urlArquivo]
    );

  } catch (error) {
    console.error('Erro ao registrar export do dashboard:', error.message);
  }
};
