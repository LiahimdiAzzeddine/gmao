import JSZip from 'jszip';

type Series = { name: string; values: number[]; range: string; color: string };
export type ExcelChart = {
  sheetIndex: number;
  title: string;
  kind: 'columns' | 'bars' | 'line' | 'pie';
  categories: string[];
  categoryRange: string;
  series: Series[];
  colors?: string[];
  stacked?: boolean;
  legend?: boolean;
  from: { col: number; row: number };
  to: { col: number; row: number };
};

const CHART_NS = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
const DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const MAIN_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PACKAGE_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function xml(value: string | number) {
  return Array.from(String(value)).filter((char) => char.charCodeAt(0) >= 32 || '\t\n\r'.includes(char)).join('')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function chartXml(chart: ExcelChart) {
  const categories = `<c:cat><c:strRef><c:f>${xml(chart.categoryRange)}</c:f><c:strCache><c:ptCount val="${chart.categories.length}"/>${chart.categories.map((label, i) => `<c:pt idx="${i}"><c:v>${xml(label)}</c:v></c:pt>`).join('')}</c:strCache></c:strRef></c:cat>`;
  const series = chart.series.map((item, index) => {
    const fill = `<a:solidFill><a:srgbClr val="${item.color.replace('#', '')}"/></a:solidFill>`;
    const shape = chart.kind === 'line' ? `<a:ln w="25400">${fill}</a:ln>` : fill;
    const points = (chart.colors || []).map((color, i) => `<c:dPt><c:idx val="${i}"/><c:spPr><a:solidFill><a:srgbClr val="${color.replace('#', '')}"/></a:solidFill></c:spPr></c:dPt>`).join('');
    return `<c:ser><c:idx val="${index}"/><c:order val="${index}"/><c:tx><c:v>${xml(item.name)}</c:v></c:tx><c:spPr>${shape}</c:spPr>${points}${categories}<c:val><c:numRef><c:f>${xml(item.range)}</c:f><c:numCache><c:formatCode>0</c:formatCode><c:ptCount val="${item.values.length}"/>${item.values.map((value, i) => `<c:pt idx="${i}"><c:v>${value}</c:v></c:pt>`).join('')}</c:numCache></c:numRef></c:val></c:ser>`;
  }).join('');
  const axesIds = '<c:axId val="1"/><c:axId val="2"/>';
  let plot: string;
  if (chart.kind === 'pie') {
    plot = `<c:pieChart><c:varyColors val="1"/>${series}<c:dLbls><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="1"/><c:showLeaderLines val="1"/></c:dLbls></c:pieChart>`;
  } else {
    plot = chart.kind === 'line'
      ? `<c:lineChart><c:grouping val="standard"/>${series}<c:marker val="1"/>${axesIds}</c:lineChart>`
      : `<c:barChart><c:barDir val="${chart.kind === 'bars' ? 'bar' : 'col'}"/><c:grouping val="${chart.stacked ? 'stacked' : 'clustered'}"/>${series}<c:gapWidth val="80"/>${chart.stacked ? '<c:overlap val="100"/>' : ''}${axesIds}</c:barChart>`;
    plot += `<c:catAx><c:axId val="1"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="${chart.kind === 'bars' ? 'l' : 'b'}"/><c:tickLblPos val="nextTo"/><c:crossAx val="2"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx>`;
    plot += `<c:valAx><c:axId val="2"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:axPos val="${chart.kind === 'bars' ? 'b' : 'l'}"/><c:majorGridlines/><c:numFmt formatCode="0" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="1"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
  }
  const title = `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="fr-FR" sz="1200"/><a:t>${xml(chart.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`;
  const legend = chart.legend ? '<c:legend><c:legendPos val="b"/><c:layout/><c:overlay val="0"/></c:legend>' : '';
  return `${declaration}<c:chartSpace xmlns:c="${CHART_NS}" xmlns:a="${MAIN_NS}" xmlns:r="${REL_NS}"><c:lang val="fr-FR"/><c:chart>${title}<c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>${plot}</c:plotArea>${legend}<c:plotVisOnly val="1"/><c:dispBlanksAs val="zero"/></c:chart></c:chartSpace>`;
}

function anchor(chart: ExcelChart, index: number) {
  const position = (tag: string, point: { col: number; row: number }) => `<xdr:${tag}><xdr:col>${point.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${point.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:${tag}>`;
  return `<xdr:twoCellAnchor>${position('from', chart.from)}${position('to', chart.to)}<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${index + 1}" name="${xml(chart.title)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${CHART_NS}"><c:chart xmlns:c="${CHART_NS}" xmlns:r="${REL_NS}" r:id="rId${index + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
}

// Add native, editable Excel charts to the styled workbook produced by SheetJS.
// Each chart references worksheet cells and carries cached values for previews.
export async function addExcelCharts(workbook: ArrayBuffer, charts: ExcelChart[]): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(workbook);
  let contentTypes = await zip.file('[Content_Types].xml')!.async('string');
  const sheetIndexes = [...new Set(charts.map((chart) => chart.sheetIndex))];
  let chartIndex = 0;
  for (const sheetIndex of sheetIndexes) {
    const sheetNumber = sheetIndex + 1;
    const sheetCharts = charts.filter((chart) => chart.sheetIndex === sheetIndex);
    const relations: string[] = [];
    for (const chart of sheetCharts) {
      chartIndex += 1;
      zip.file(`xl/charts/chart${chartIndex}.xml`, chartXml(chart));
      relations.push(`<Relationship Id="rId${relations.length + 1}" Type="${REL_NS}/chart" Target="../charts/chart${chartIndex}.xml"/>`);
      contentTypes = contentTypes.replace('</Types>', `<Override PartName="/xl/charts/chart${chartIndex}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`);
    }
    zip.file(`xl/drawings/drawing${sheetNumber}.xml`, `${declaration}<xdr:wsDr xmlns:xdr="${DRAWING_NS}" xmlns:a="${MAIN_NS}">${sheetCharts.map(anchor).join('')}</xdr:wsDr>`);
    zip.file(`xl/drawings/_rels/drawing${sheetNumber}.xml.rels`, `${declaration}<Relationships xmlns="${PACKAGE_NS}">${relations.join('')}</Relationships>`);
    const sheetPath = `xl/worksheets/sheet${sheetNumber}.xml`;
    let sheetXml = await zip.file(sheetPath)!.async('string');
    if (!sheetXml.includes('xmlns:r=')) sheetXml = sheetXml.replace('<worksheet ', `<worksheet xmlns:r="${REL_NS}" `);
    zip.file(sheetPath, sheetXml.replace('</worksheet>', '<drawing r:id="rIdReportingDrawing"/></worksheet>'));
    const relationsPath = `xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`;
    const existing = zip.file(relationsPath);
    const sheetRelations = existing ? await existing.async('string') : `${declaration}<Relationships xmlns="${PACKAGE_NS}"></Relationships>`;
    zip.file(relationsPath, sheetRelations.replace('</Relationships>', `<Relationship Id="rIdReportingDrawing" Type="${REL_NS}/drawing" Target="../drawings/drawing${sheetNumber}.xml"/></Relationships>`));
    contentTypes = contentTypes.replace('</Types>', `<Override PartName="/xl/drawings/drawing${sheetNumber}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
  }
  zip.file('[Content_Types].xml', contentTypes);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
