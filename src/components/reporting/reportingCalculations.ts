import { buildMonths, monthKey, Period, ReportingRow } from './reportingData';

const FREQUENCY_COLORS = ['#c2410c', '#ef4444', '#f59e0b', '#eab308', '#94a3b8'];
const RANKS = ['1re importance', '2e importance', '3e importance', '4e importance'];
const percentage = (value: number, total: number) => total ? value / total * 100 : 0;
export const displayPercent = (value: number) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;

export function buildOverviewReport(rows: ReportingRow[], period: Period) {
  const months = buildMonths(period);
  const byLot = new Map<string, Set<string>>();
  const byMonth = new Map<string, Set<string>>();
  const byLotMonth = new Map<string, Set<string>>();
  const byFamilyMonth = new Map<string, Set<string>>();
  const families = new Map<string, Set<string>>();
  const add = (map: Map<string, Set<string>>, key: string, id: string) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(id);
  };
  rows.forEach((row) => {
    const lot = row.lot_defaillance || 'Non classé';
    const family = row.famille_probleme || 'Non classé';
    const month = monthKey(row.date_debut);
    add(byLot, lot, row.intervention_id);
    add(byMonth, month, row.intervention_id);
    add(byLotMonth, JSON.stringify([lot, month]), row.intervention_id);
    add(byFamilyMonth, JSON.stringify([lot, family, month]), row.intervention_id);
    add(families, lot, family);
  });
  const total = new Set(rows.map((row) => row.intervention_id)).size;
  const lots = [...byLot].map(([name, ids]) => ({ name, value: ids.size })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'fr'));
  const monthlyData = months.map((month) => ({
    month: month.label,
    ...Object.fromEntries(lots.map((lot, index) => [`lot${index}`, byLotMonth.get(JSON.stringify([lot.name, month.key]))?.size || 0])),
  }));
  const tableRows = lots.flatMap((lot) => [...(families.get(lot.name) || [])].sort((a, b) => a.localeCompare(b, 'fr')).map((family) => {
    const counts = months.map((month) => byFamilyMonth.get(JSON.stringify([lot.name, family, month.key]))?.size || 0);
    return { lot: lot.name, family, counts, total: counts.reduce((sum, value) => sum + value, 0) };
  }));
  const dominant = lots[0];
  const dominantShare = dominant && total ? Math.round(dominant.value / total * 100) : 0;
  const comment = !dominant
    ? 'Aucune intervention corrective enregistrée sur la période sélectionnée.'
    : dominant.name === 'Non classé'
      ? `${dominant.value} intervention${dominant.value > 1 ? 's' : ''} sans lot renseigné, soit ${dominantShare} % des ${total} interventions de la sélection.`
      : `Le lot « ${dominant.name} » regroupe ${dominant.value} intervention${dominant.value > 1 ? 's' : ''} corrective${dominant.value > 1 ? 's' : ''}, soit ${dominantShare} % de l’ensemble des interventions sur la période et les lots sélectionnés.`;
  return { months, total, lots, monthlyData, tableRows, comment, monthTotals: months.map((month) => byMonth.get(month.key)?.size || 0) };
}

export function buildLotReports(rows: ReportingRow[], period: Period) {
  const months = buildMonths(period);
  const grouped = new Map<string, { id: string; name: string; rows: ReportingRow[] }>();
  rows.forEach((row) => {
    const id = row.problem_lot_id || 'unclassified';
    if (!grouped.has(id)) grouped.set(id, { id, name: row.lot_defaillance || 'Non classé', rows: [] });
    grouped.get(id)!.rows.push(row);
  });

  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((lot) => {
    const modes = new Map<string, Set<string>>();
    const monthInterventions = new Map<string, Set<string>>();
    const interventions = new Set<string>();
    lot.rows.forEach((row) => {
      interventions.add(row.intervention_id);
      const mode = row.mode_defaillance || 'Non classé';
      if (!modes.has(mode)) modes.set(mode, new Set());
      modes.get(mode)!.add(row.intervention_id);
      const month = monthKey(row.date_debut);
      if (!monthInterventions.has(month)) monthInterventions.set(month, new Set());
      monthInterventions.get(month)!.add(row.intervention_id);
    });
    const ranked = [...modes].map(([name, ids]) => ({ name, value: ids.size }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'fr'));
    const modeTotal = ranked.reduce((sum, item) => sum + item.value, 0);
    const topFour = ranked.slice(0, 4).map((item, index) => ({
      ...item, rank: RANKS[index], color: FREQUENCY_COLORS[index], sharePercent: percentage(item.value, modeTotal),
    }));
    const otherItems = ranked.slice(4);
    const otherTotal = otherItems.reduce((sum, item) => sum + item.value, 0);
    const frequencyRows = [
      ...topFour,
      ...(otherTotal ? [{ rank: 'Autres', name: otherItems.map((item) => item.name).join(', '), value: otherTotal, color: FREQUENCY_COLORS[4], sharePercent: percentage(otherTotal, modeTotal) }] : []),
    ];
    const monthlyData = months.map((month) => ({ month: month.label, value: monthInterventions.get(month.key)?.size || 0 }));
    const total = interventions.size;
    const activeMonths = monthlyData.filter((month) => month.value > 0).length;
    const dominant = ranked.find((item) => item.name !== 'Non classé');
    const unclassifiedCount = modes.get('Non classé')?.size || 0;
    const comment = [
      `${total} intervention${total > 1 ? 's' : ''} corrective${total > 1 ? 's' : ''} dans le lot « ${lot.name} », répartie${total > 1 ? 's' : ''} sur ${activeMonths} mois de la période.`,
      dominant ? `Parmi les modes renseignés, « ${dominant.name} » est le plus fréquent : ${dominant.value} intervention${dominant.value > 1 ? 's' : ''}, soit ${displayPercent(percentage(dominant.value, total))} des interventions du lot.` : '',
      unclassifiedCount ? `Le mode de défaillance n’est pas renseigné pour ${unclassifiedCount} intervention${unclassifiedCount > 1 ? 's' : ''}.` : '',
    ].filter(Boolean).join(' ');
    return { id: lot.id, name: lot.name, total, modeTotal, topFour, frequencyRows, monthlyData, comment };
  });
}

