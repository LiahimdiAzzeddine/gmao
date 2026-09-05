import { FormEvent, ReactNode, useMemo, useState } from 'react';
import { addDays, addMonths, differenceInCalendarMonths, format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, BarChart3, ChevronDown, FileBarChart, Loader2, PieChart as PieChartIcon } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '../../lib/supabase';

type ReportRow = {
  ordre_travail_id: string;
  type: string;
  report_date: string | null;
  lot_defaillance: string | null;
  famille_probleme: string | null;
};

type Period = { start: string; end: string };

const COLORS = ['#f98440', '#334155', '#0f766e', '#7c3aed', '#0284c7', '#ca8a04', '#be123c', '#64748b'];
const currentYear = new Date().getFullYear();

function monthKey(date: Date) {
  return format(date, 'yyyy-MM');
}

function buildMonths(period: Period) {
  const first = startOfMonth(new Date(`${period.start}T00:00:00`));
  const last = startOfMonth(new Date(`${period.end}T00:00:00`));
  const count = differenceInCalendarMonths(last, first) + 1;
  return Array.from({ length: count }, (_, index) => {
    const date = addMonths(first, index);
    return { key: monthKey(date), label: format(date, 'MMM-yy', { locale: fr }).replace('.', '') };
  });
}

export default function CorrectiveInterventionsReport() {
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [period, setPeriod] = useState<Period | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<ReportRow[]>([]);

  const loadReport = async (nextPeriod: Period) => {
    setLoading(true);
    setError('');
    try {
      const result: ReportRow[] = [];
      const pageSize = 1000;
      let from = 0;

      while (true) {
        const { data, error: queryError } = await supabase
          .from('v_work_order_failure_classification')
          .select('ordre_travail_id, type, report_date, lot_defaillance, famille_probleme')
          .eq('type', 'correctif')
          .gte('report_date', `${nextPeriod.start}T00:00:00`)
          .lt('report_date', `${format(addDays(new Date(`${nextPeriod.end}T00:00:00`), 1), 'yyyy-MM-dd')}T00:00:00`)
          .range(from, from + pageSize - 1);

        if (queryError) throw queryError;
        const page = (data || []) as ReportRow[];
        result.push(...page);
        if (page.length < pageSize) break;
        from += pageSize;
      }

      setRows(result);
    } catch (caught) {
      console.error('Erreur chargement rapport correctif:', caught);
      setError(caught instanceof Error ? caught.message : 'Impossible de charger le rapport.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (event: FormEvent) => {
    event.preventDefault();
    if (!startDate || !endDate || startDate > endDate) {
      setError('La période sélectionnée est invalide.');
      return;
    }
    const nextPeriod = { start: startDate, end: endDate };
    if (buildMonths(nextPeriod).length > 24) {
      setError('Sélectionnez une période de 24 mois maximum.');
      return;
    }
    setPeriod(nextPeriod);
    setOpen(true);
    await loadReport(nextPeriod);
  };

  const report = useMemo(() => {
    if (!period) return null;
    const months = buildMonths(period);
    const uniqueByGroup = new Map<string, Set<string>>();
    const lots = new Set<string>();
    const familiesByLot = new Map<string, Set<string>>();

    rows.forEach((row) => {
      if (!row.report_date) return;
      const lot = row.lot_defaillance || 'Non classé';
      const family = row.famille_probleme || 'Non classé';
      const month = monthKey(new Date(row.report_date));
      lots.add(lot);
      if (!familiesByLot.has(lot)) familiesByLot.set(lot, new Set());
      familiesByLot.get(lot)?.add(family);
      const key = `${lot}\u0000${family}\u0000${month}`;
      if (!uniqueByGroup.has(key)) uniqueByGroup.set(key, new Set());
      uniqueByGroup.get(key)?.add(row.ordre_travail_id);
    });

    const sortedLots = [...lots].sort((a, b) => a.localeCompare(b, 'fr'));
    const tableRows = sortedLots.flatMap((lot) => {
      const families = [...(familiesByLot.get(lot) || [])].sort((a, b) => a.localeCompare(b, 'fr'));
      return families.map((family, familyIndex) => {
        const counts = months.map((month) => uniqueByGroup.get(`${lot}\u0000${family}\u0000${month.key}`)?.size || 0);
        return { lot, family, familyIndex, familyCount: families.length, counts, total: counts.reduce((sum, value) => sum + value, 0) };
      });
    });

    const monthTotals = months.map((_, monthIndex) => tableRows.reduce((sum, row) => sum + row.counts[monthIndex], 0));
    const lotTotals = sortedLots.map((lot) => ({
      name: lot,
      value: tableRows.filter((row) => row.lot === lot).reduce((sum, row) => sum + row.total, 0),
    })).filter((item) => item.value > 0);
    const barData = months.map((month, monthIndex) => ({
      month: month.label,
      ...Object.fromEntries(sortedLots.map((lot) => [lot, tableRows.filter((row) => row.lot === lot).reduce((sum, row) => sum + row.counts[monthIndex], 0)])),
    }));
    const total = monthTotals.reduce((sum, value) => sum + value, 0);
    const dominant = [...lotTotals].sort((a, b) => b.value - a.value)[0];
    const comment = dominant && total > 0
      ? `${dominant.value} intervention${dominant.value > 1 ? 's' : ''} corrective${dominant.value > 1 ? 's' : ''} concerne${dominant.value > 1 ? 'nt' : ''} le lot « ${dominant.name} », soit ${Math.round((dominant.value / total) * 100)} % du total sur la période.`
      : 'Aucune intervention corrective n’a été trouvée sur la période sélectionnée.';

    return { months, sortedLots, tableRows, monthTotals, lotTotals, barData, total, comment };
  }, [period, rows]);

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-orange-100 p-2.5 text-[#d95708]"><FileBarChart className="h-5 w-5" /></div>
            <div>
              <h2 className="font-black text-slate-900">Interventions correctives par lot</h2>
              <p className="mt-1 text-sm text-slate-500">Répartition par lot de défaillance, famille de problèmes et mois.</p>
            </div>
          </div>

          <form onSubmit={handleOpen} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Du
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-[#f98440] focus:ring-2 focus:ring-orange-100" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Au
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-[#f98440] focus:ring-2 focus:ring-orange-100" />
            </label>
            <button type="submit" disabled={loading} className="inline-flex h-[38px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />}
              {open ? 'Actualiser' : 'Ouvrir le rapport'}
            </button>
            {open && <button type="button" onClick={() => setOpen(false)} className="h-[38px] rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-white">Fermer</button>}
          </form>
        </div>
        {error && <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}
      </div>

      {open && (
        <div className="space-y-5 p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-[#f98440]" /> Préparation du rapport…</div>
          ) : report && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Période analysée</p>
                  <p className="mt-1 font-semibold text-slate-900">Du {new Date(`${period?.start}T00:00:00`).toLocaleDateString('fr-FR')} au {new Date(`${period?.end}T00:00:00`).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="rounded-xl bg-orange-50 px-4 py-2 text-right ring-1 ring-orange-100">
                  <p className="text-2xl font-black text-[#d95708]">{report.total}</p>
                  <p className="text-xs font-semibold text-orange-900">OT correctifs distincts</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-300">
                <table className="min-w-full border-collapse text-xs">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="border-r border-slate-700 px-3 py-3 text-left">Lot</th>
                      <th className="border-r border-slate-700 px-3 py-3 text-left">Famille de problèmes</th>
                      {report.months.map((month) => <th key={month.key} className="border-r border-slate-700 px-2 py-3 text-center capitalize">{month.label}</th>)}
                      <th className="bg-[#d95708] px-3 py-3 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.tableRows.length === 0 ? (
                      <tr><td colSpan={report.months.length + 3} className="px-4 py-10 text-center text-sm text-slate-500">Aucune intervention corrective sur cette période.</td></tr>
                    ) : report.tableRows.map((row) => (
                      <tr key={`${row.lot}-${row.family}`} className="border-t border-slate-200 odd:bg-white even:bg-slate-50">
                        {row.familyIndex === 0 && <td rowSpan={row.familyCount} className="border-r border-slate-200 bg-orange-50 px-3 py-3 font-bold text-slate-900">{row.lot}</td>}
                        <td className="border-r border-slate-200 px-3 py-3 font-medium text-slate-700">{row.family}</td>
                        {row.counts.map((count, index) => <td key={report.months[index].key} className="border-r border-slate-200 px-2 py-3 text-center font-semibold text-slate-700">{count}</td>)}
                        <td className="bg-orange-50 px-3 py-3 text-center font-black text-[#d95708]">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  {report.tableRows.length > 0 && <tfoot className="border-t-2 border-slate-800 bg-slate-100 font-black text-slate-900"><tr><td colSpan={2} className="px-3 py-3">TOTAL DES INTERVENTIONS</td>{report.monthTotals.map((total, index) => <td key={report.months[index].key} className="px-2 py-3 text-center">{total}</td>)}<td className="bg-orange-100 px-3 py-3 text-center text-[#d95708]">{report.total}</td></tr></tfoot>}
                </table>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard icon={<PieChartIcon className="h-4 w-4" />} title="Répartition par lot">
                  {report.lotTotals.length ? <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={report.lotTotals} dataKey="value" nameKey="name" cx="50%" cy="48%" outerRadius={95} label={({ name, percent }) => `${name} ${Math.round((percent || 0) * 100)}%`}>{report.lotTotals.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer> : <EmptyChart />}
                </ChartCard>
                <ChartCard icon={<BarChart3 className="h-4 w-4" />} title="Évolution mensuelle par lot">
                  {report.total ? <ResponsiveContainer width="100%" height={300}><BarChart data={report.barData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Legend />{report.sortedLots.map((lot, index) => <Bar key={lot} dataKey={lot} stackId="lots" fill={COLORS[index % COLORS.length]} />)}</BarChart></ResponsiveContainer> : <EmptyChart />}
                </ChartCard>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Commentaire automatique</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{report.comment}</p>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function ChartCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">{icon}{title}</h3>{children}</div>;
}

function EmptyChart() {
  return <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">Aucune donnée à représenter.</div>;
}
