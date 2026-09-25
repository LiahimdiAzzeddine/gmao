import * as XLSX from 'xlsx-js-style';
import { format } from 'date-fns';
import { buildLotReports, buildOverviewReport } from './reportingCalculations';
import { Period, REPORT_COLORS, ReportingRow } from './reportingData';
import { addExcelCharts, ExcelChart } from './excelCharts';

type CellValue = string | number;
type ExportOptions = { rows: ReportingRow[]; period: Period; lotName: string };

const bodyStyle: XLSX.CellStyle = {
  font: { name: 'Calibri', sz: 11, color: { rgb: '334155' } },
  alignment: { vertical: 'center', wrapText: true },
  border: { bottom: { style: 'thin', color: { rgb: 'E2E8F0' } } },
};
const headerStyle: XLSX.CellStyle = {
  ...bodyStyle, font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '334155' } },
};
const sectionStyle: XLSX.CellStyle = {
  ...bodyStyle, font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: '9A3412' } },
  fill: { fgColor: { rgb: 'FFF7ED' } },
};

class ReportSheet {
  sheet: XLSX.WorkSheet = {};
  private lastRow = 0;
  private lastCol: number;
  constructor(columns = 14) {
    this.lastCol = columns - 1;
    this.sheet['!cols'] = Array.from({ length: columns }, (_, index) => ({ wch: index === 0 ? 25 : index === 1 ? 24 : 13 }));
    this.sheet['!rows'] = [];
    this.sheet['!merges'] = [];
  }
  cell(row: number, col: number, value: CellValue, style = bodyStyle, numberFormat?: string) {
    this.lastRow = Math.max(this.lastRow, row);
    this.lastCol = Math.max(this.lastCol, col);
    this.sheet[XLSX.utils.encode_cell({ r: row, c: col })] = { t: typeof value === 'number' ? 'n' : 's', v: value, s: style, ...(numberFormat ? { z: numberFormat } : {}) };
    this.sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: this.lastRow, c: this.lastCol } });
  }
  height(row: number, height = 24) {
    this.sheet['!rows']![row] = { hpt: height };
  }
  merged(row: number, start: number, end: number, text: string, style = bodyStyle, height = 30) {
    for (let col = start; col <= end; col++) this.cell(row, col, col === start ? text : '', style);
    if (end > start) this.sheet['!merges']!.push({ s: { r: row, c: start }, e: { r: row, c: end } });
    this.height(row, height);
  }
  band(row: number, text: string, style = sectionStyle, height = 28) {
    this.merged(row, 0, this.lastCol, text, style, height);
  }
  table(row: number, headers: string[], data: CellValue[][]) {
    headers.forEach((header, col) => this.cell(row, col, header, headerStyle));
    this.height(row, 34);
    data.forEach((values, index) => {
      values.forEach((value, col) => this.cell(row + index + 1, col, value, {
        ...bodyStyle, fill: { fgColor: { rgb: index % 2 ? 'F8FAFC' : 'FFFFFF' } },
      }));
      this.height(row + index + 1, 32);
    });
    return { first: row + 1, last: row + data.length, next: row + data.length + 2 };
  }
  reserveCharts(first: number, last: number) {
    for (let row = first; row <= last; row++) this.height(row, 22);
    this.cell(last, this.lastCol, '');
  }
}

function range(sheet: string, col: number, first: number, last: number) {
  const letter = XLSX.utils.encode_col(col);
  return `'${sheet.replace(/'/g, "''")}'!$${letter}$${first + 1}:$${letter}$${last + 1}`;
}

function uniqueSheetName(label: string, existing: string[]) {
  const clean = Array.from(label).filter((char) => char.charCodeAt(0) >= 32).join('')
    .replace(/[\\/:*?[\]]/g, '-').replace(/^'+|'+$/g, '').trim() || 'Lot';
  let name = clean.slice(0, 31);
  let suffix = 2;
  while (existing.some((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    const ending = ` (${suffix++})`;
    name = `${clean.slice(0, 31 - ending.length)}${ending}`;
  }
  return name;
}

export function buildReportingWorkbook({ rows, period, lotName }: ExportOptions) {
  if (!rows.length) throw new Error('Aucune intervention à exporter.');
  const overview = buildOverviewReport(rows, period);
  const lots = buildLotReports(rows, period);
  const workbook = XLSX.utils.book_new();
  workbook.Props = { Title: 'Rapport des interventions correctives', Subject: lotName, Author: 'GMAO', CreatedDate: new Date() };
  const charts: ExcelChart[] = [];
  const periodLabel = `Du ${format(new Date(`${period.start}T00:00:00`), 'dd/MM/yyyy')} au ${format(new Date(`${period.end}T00:00:00`), 'dd/MM/yyyy')}`;
  const name = 'Vue d’ensemble';
  const summary = new ReportSheet(Math.max(14, overview.months.length + 3));
  summary.band(0, 'VUE D’ENSEMBLE — INTERVENTIONS CORRECTIVES', headerStyle, 36);
  summary.band(1, periodLabel, bodyStyle);
  summary.band(2, `Sélection : ${lotName}`, bodyStyle);
  summary.table(4, ['Interventions distinctes', 'Lots concernés', 'Lot le plus sollicité'], [[overview.total, overview.lots.length, overview.lots[0]?.name || '—']]);
  summary.merged(5, 2, 13, overview.lots[0]?.name || '—');
  summary.band(7, 'Commentaires');
  summary.band(8, overview.comment, bodyStyle, 52);
  summary.reserveCharts(10, 26);
  summary.band(28, 'Détail mensuel par lot et famille de problèmes');
  const detail = summary.table(29, ['Lot', 'Famille de problèmes', ...overview.months.map((month) => month.label), 'Total'], overview.tableRows.map((row) => [row.lot, row.family, ...row.counts, row.total]));
  ['TOTAL DES INTERVENTIONS', '', ...overview.monthTotals, overview.total].forEach((value, col) => summary.cell(detail.last + 1, col, value, sectionStyle));
  summary.height(detail.last + 1, 30);
  summary.band(detail.next + 1, 'Une intervention peut concerner plusieurs lots ou familles. Le total général compte chaque intervention une seule fois.', bodyStyle, 38);
  summary.band(detail.next + 3, 'Activité par lot');
  const activity = summary.table(detail.next + 4, ['Lot', 'Interventions', 'Part du total'], overview.lots.map((lot) => [lot.name, lot.value, lot.value / overview.total]));
  overview.lots.forEach((lot, i) => summary.cell(activity.first + i, 2, lot.value / overview.total, bodyStyle, '0.0%'));
  summary.band(activity.next + 1, 'Évolution mensuelle par lot');
  const monthly = summary.table(activity.next + 2, ['Mois', ...overview.lots.map((lot) => lot.name), 'Total distinct'], overview.monthlyData.map((month, index) => [month.month, ...overview.lots.map((_, lotIndex) => Number(month[`lot${lotIndex}` as keyof typeof month]) || 0), overview.monthTotals[index]]));
  summary.band(monthly.next + 1, 'Base de calcul : interventions enregistrées, selon leur date de début. Les OT sans intervention sont exclus.', bodyStyle, 38);
  XLSX.utils.book_append_sheet(workbook, summary.sheet, name);
  charts.push({ sheetIndex: 0, title: 'Évolution mensuelle des interventions', kind: 'columns', stacked: true, legend: true,
    categories: overview.months.map((month) => month.label), categoryRange: range(name, 0, monthly.first, monthly.last),
    series: overview.lots.map((lot, index) => ({ name: lot.name, values: overview.monthlyData.map((month) => Number(month[`lot${index}` as keyof typeof month]) || 0), range: range(name, index + 1, monthly.first, monthly.last), color: REPORT_COLORS[index % REPORT_COLORS.length] })),
    from: { col: 0, row: 10 }, to: { col: 7, row: 26 } });
  charts.push({ sheetIndex: 0, title: 'Activité par lot', kind: 'bars', categories: overview.lots.map((lot) => lot.name), categoryRange: range(name, 0, activity.first, activity.last),
    series: [{ name: 'Interventions', values: overview.lots.map((lot) => lot.value), range: range(name, 1, activity.first, activity.last), color: REPORT_COLORS[0] }],
    colors: overview.lots.map((_, index) => REPORT_COLORS[index % REPORT_COLORS.length]), from: { col: 7, row: 10 }, to: { col: 14, row: 26 } });

  lots.forEach((lot) => {
    const sheetName = uniqueSheetName(`Lot - ${lot.name}`, workbook.SheetNames);
    const sheetIndex = workbook.SheetNames.length;
    const sheet = new ReportSheet();
    sheet.band(0, `LOT : ${lot.name} — SUIVI DES INTERVENTIONS`, headerStyle, 36);
    sheet.band(1, periodLabel, bodyStyle);
    sheet.band(2, `${lot.total} interventions distinctes · Sélection : ${lotName}`, bodyStyle);
    sheet.band(4, 'Tableau des fréquences');
    const frequencies = sheet.table(5, ['Fréquence', 'Répartition', 'Interventions', 'Modes de défaillance'], lot.frequencyRows.map((item) => [item.rank, item.sharePercent / 100, item.value, item.name]));
    sheet.merged(5, 3, 13, 'Modes de défaillance les plus fréquents', headerStyle, 34);
    lot.frequencyRows.forEach((item, i) => {
      sheet.cell(frequencies.first + i, 1, item.sharePercent / 100, bodyStyle, '0.0%');
      sheet.cell(frequencies.first + i, 0, item.rank, { ...bodyStyle, font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: item.color.replace('#', '') } } });
      sheet.merged(frequencies.first + i, 3, 13, item.name, bodyStyle, Math.max(32, Math.ceil(item.name.length / 120) * 16));
    });
    const commentRow = frequencies.next;
    sheet.band(commentRow, 'Commentaires');
    sheet.band(commentRow + 1, lot.comment, bodyStyle, 62);
    sheet.band(commentRow + 2, lot.modeTotal > lot.total
      ? 'Une intervention peut présenter plusieurs pannes. La répartition porte sur les occurrences des modes ; le total des interventions est dédupliqué.'
      : 'Synthèse automatique des interventions sur la période sélectionnée.', bodyStyle, 38);
    const chartRow = commentRow + 4;
    sheet.reserveCharts(chartRow, chartRow + 34);
    sheet.band(chartRow + 36, 'Évolution mensuelle des interventions');
    const monthTable = sheet.table(chartRow + 37, ['Mois', 'Interventions'], lot.monthlyData.map((month) => [month.month, month.value]));
    sheet.cell(monthTable.last + 1, 0, 'TOTAL', sectionStyle);
    sheet.cell(monthTable.last + 1, 1, lot.total, sectionStyle);
    XLSX.utils.book_append_sheet(workbook, sheet.sheet, sheetName);
    charts.push({ sheetIndex, title: 'Répartition des interventions les plus fréquentes', kind: 'pie', legend: true,
      categories: lot.frequencyRows.map((item) => item.rank), categoryRange: range(sheetName, 0, frequencies.first, frequencies.last),
      series: [{ name: 'Interventions', values: lot.frequencyRows.map((item) => item.value), range: range(sheetName, 2, frequencies.first, frequencies.last), color: lot.frequencyRows[0].color }],
      colors: lot.frequencyRows.map((item) => item.color), from: { col: 0, row: chartRow }, to: { col: 7, row: chartRow + 16 } });
    charts.push({ sheetIndex, title: 'Pannes les plus fréquentes', kind: 'bars',
      categories: lot.topFour.map((item) => item.rank), categoryRange: range(sheetName, 0, frequencies.first, frequencies.first + lot.topFour.length - 1),
      series: [{ name: 'Interventions', values: lot.topFour.map((item) => item.value), range: range(sheetName, 2, frequencies.first, frequencies.first + lot.topFour.length - 1), color: lot.topFour[0].color }],
      colors: lot.topFour.map((item) => item.color), from: { col: 7, row: chartRow }, to: { col: 14, row: chartRow + 16 } });
    charts.push({ sheetIndex, title: 'Évolution mensuelle des interventions', kind: 'line',
      categories: lot.monthlyData.map((month) => month.month), categoryRange: range(sheetName, 0, monthTable.first, monthTable.last),
      series: [{ name: 'Interventions', values: lot.monthlyData.map((month) => month.value), range: range(sheetName, 1, monthTable.first, monthTable.last), color: '#2563eb' }],
      from: { col: 0, row: chartRow + 18 }, to: { col: 14, row: chartRow + 34 } });
  });
  return { workbook, charts };
}

export async function generateReportingExcel(options: ExportOptions) {
  const { workbook, charts } = buildReportingWorkbook(options);
  const bytes: ArrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true });
  return addExcelCharts(bytes, charts);
}

export async function downloadReportingExcel(options: ExportOptions) {
  const bytes = await generateReportingExcel(options);
  const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rapport-interventions_${options.period.start}_${options.period.end}.xlsx`;
  document.body.appendChild(link);
  try { link.click(); } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
