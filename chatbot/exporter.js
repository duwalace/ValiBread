/**
 * exporter.js
 * Gera planilhas .xlsx com ExcelJS.
 * Recebe um array de objetos e um nome de arquivo.
 */

import ExcelJS from 'exceljs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import supabase from '../backend/src/config/supabase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Gera arquivo .xlsx com os dados fornecidos, salva no Supabase Storage e registra na base.
 *
 * @param {Object[]} dados      - Array de objetos com os dados a exportar
 * @param {string}   nomeArquivo - Nome do arquivo sem extensão
 * @param {string}   titulo     - Título exibido na aba da planilha
 * @param {number}   id_usuario - ID do usuário logado
 * @returns {string} URL pública do arquivo gerado
 */
export const gerarPlanilha = async (dados, nomeArquivo, titulo = 'Relatório', id_usuario) => {
  if (!dados || dados.length === 0) {
    throw new Error('Nenhum dado disponível para exportar.');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ValiBread Chatbot';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(titulo.substring(0, 31)); // Excel limita a 31 chars

  // ── Estilo do cabeçalho ──────────────────────────────────────────────────
  const headerStyle = {
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A1A2E' }, // Azul escuro ValiBread
    },
    font: {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 11,
    },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      bottom: { style: 'thin', color: { argb: 'FFE94560' } },
    },
  };

  // ── Colunas baseadas nas chaves do primeiro objeto ───────────────────────
  const colunas = Object.keys(dados[0]);
  sheet.columns = colunas.map((chave) => ({
    header: formatarCabecalho(chave),
    key: chave,
    width: Math.max(chave.length + 6, 18),
  }));

  // Aplica estilo no cabeçalho (linha 1)
  const headerRow = sheet.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    Object.assign(cell, headerStyle);
    cell.font = headerStyle.font;
    cell.fill = headerStyle.fill;
    cell.alignment = headerStyle.alignment;
    cell.border = headerStyle.border;
  });

  // ── Linhas de dados ──────────────────────────────────────────────────────
  dados.forEach((item, index) => {
    const row = sheet.addRow(item);
    row.height = 20;

    // Zebra striping
    if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F5' },
        };
      });
    }

    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle' };
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
      };
    });
  });

  // ── Rodapé com data/hora de geração ─────────────────────────────────────
  const linhaRodape = sheet.rowCount + 2;
  sheet.getCell(`A${linhaRodape}`).value =
    `Gerado em: ${new Date().toLocaleString('pt-BR')} | Total de registros: ${dados.length}`;
  sheet.getCell(`A${linhaRodape}`).font = { italic: true, color: { argb: 'FF888888' }, size: 9 };

  // ── Salva arquivo na memória (Buffer) ────────────────────────────────────
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const nomeSeguro = nomeArquivo.replace(/[^a-z0-9_\-]/gi, '_');
  const fileName = `${nomeSeguro}_${timestamp}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();

  // ── Upload para Supabase Storage ─────────────────────────────────────────
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('chatbot_exports')
    .upload(fileName, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true
    });

  if (uploadError) {
    console.error('Erro ao fazer upload da planilha para o Supabase:', uploadError);
    throw new Error('Falha ao salvar a planilha no storage.');
  }

  // ── Obter URL Pública ───────────────────────────────────────────────────
  const { data: urlData } = supabase.storage
    .from('chatbot_exports')
    .getPublicUrl(fileName);
    
  const publicUrl = urlData.publicUrl;

  // ── Registrar na Tabela chatbot_export ──────────────────────────────────
  if (id_usuario) {
    const { error: dbError } = await supabase.from('chatbot_export').insert([{
      id_usuario: id_usuario,
      nome_arquivo: fileName,
      url_arquivo: publicUrl
    }]);

    if (dbError) {
      console.error('Erro ao registrar export no banco:', dbError);
      // Não joga erro para o usuário se apenas o log falhar, mas loga no servidor.
    }
  }

  return publicUrl;
};

/**
 * Converte snake_case para "Título Legível".
 * @param {string} chave - ex: 'total_perdas'
 * @returns {string} - ex: 'Total Perdas'
 */
function formatarCabecalho(chave) {
  return chave
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
