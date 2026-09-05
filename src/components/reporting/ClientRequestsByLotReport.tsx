import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, differenceInCalendarMonths, format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, BarChart3, ChevronDown, ClipboardList, LineChart as LineChartIcon, Loader2, PieChart as PieChartIcon } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '../../lib/supabase';

type CatalogLot = { id: string; nom: string };
type RequestRow = {
  demande_id: string;
  report_date: string | null;
  famille_probleme: string | null;
  mode_defaillance: string | null;
  label: string | null;
  description: string | null;
};
type Period = { start: string; end: string };

const COLORS = ['#d95708', '#ef4444', '#f59e0b', '#eab308', '#94a3b8'];
const SERIES_COLORS = ['#f98440', '#334155', '#0f766e', '#7c3aed', '#0284c7', '#ca8a04'];
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

export default function ClientRequestsByLotReport() {
  const [lots, setLots] = useState<CatalogLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState('');
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [applied, setApplied] = useState<{ period: Period; lotId: string; lotName: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [loadingLots, setLoadingLots] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<RequestRow[]>([]);

  useEffect(() => {
    let active = true;
    supabase.from('plan_action_lots').select('id, nom').eq('actif', true).order('nom').then(({ data, error: lotError }) => {
      if (!active) return;
      if (lotError) setError('Impossible de charger les lots de défaillance.');
      const nextLots = (data || []) as CatalogLot[];
      setLots(nextLots);
      setSelectedLotId((current) => current || nextLots[0]?.id || '');
      setLoadingLots(false);
    });
    return () => { active = false; };
  }, []);

  const loadReport = async (lotId: string, period: Period) => {
    setLoading(true);
    setError('');
    try {
      const result: RequestRow[] = [];
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error: queryError } = await supabase
          .from('v_request_failure_classification')
          .select('demande_id, report_date, famille_probleme, mode_defaillance, label, description')
          .eq('problem_lot_id', lotId)
          .gte('report_date', `${period.start}T00:00:00`)
          .lt('report_date', `${format(addDays(new Date(`${period.end}T00:00:00`), 1), 'yyyy-MM-dd')}T00:00:00`)
          .range(from, from + pageSize - 1);
        if (queryError) throw queryError;
        const page = (data || []) as RequestRow[];
        result.push(...page);
        if (page.length < pageSize) break;
        from += pageSize;
      }
      setRows(result);
    } catch (caught) {
      console.error('Erreur chargement demandes par lot:', caught);
      setError(caught instanceof Error ? caught.message : 'Impossible de charger le rapport.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedLotId) return setError('Sélectionnez un lot.');
    if (!startDate || !endDate || startDate > endDate) return setError('La période sélectionnée est invalide.');
    const period = { start: startDate, end: endDate };
    if (buildMonths(period).length > 24) return setError('Sélectionnez une période de 24 mois maximum.');
    const lotName = lots.find((lot) => lot.id === selectedLotId)?.nom || 'Lot';
    setApplied({ period, lotId: selectedLotId, lotName });
    setOpen(true);
    await loadReport(selectedLotId, period);
  };

  const report = useMemo(() => {
    if (!applied) return null;
    const months = buildMonths(applied.period);
    const uniqueRequests = new Map<string, RequestRow>();
    rows.forEach((row) => uniqueRequests.set(row.demande_id, row));
    const requests = [...uniqueRequests.values()];

    const modeRequests = new Map<string, Set<string>>();
    const families = new Set<string>();
    const familyMonthRequests = new Map<string, Set<string>>();
    requests.forEach((row) => {
      const mode = row.mode_defaillance || row.label || 'Non classé';
      const family = row.famille_probleme || 'Non classé';
      if (!modeRequests.has(mode)) modeRequests.set(mode, new Set());
      modeRequests.get(mode)?.add(row.demande_id);
      if (row.report_date) {
        families.add(family);
        const key = `${family}\u0000${monthKey(new Date(row.report_date))}`;
        if (!familyMonthRequests.has(key)) familyMonthRequests.set(key, new Set());
        familyMonthRequests.get(key)?.add(row.demande_id);
      }
    });

    const ranked = [...modeRequests.entries()]
      .map(([name, ids]) => ({ name, value: ids.size }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'fr'));
    const topFour = ranked.slice(0, 4);
    const otherItems = ranked.slice(4);
    const otherTotal = otherItems.reduce((sum, item) => sum + item.value, 0);
    const total = requests.length;
    const frequencyRows = [
      ...topFour.map((item, index) => ({ rank: `${index + 1}${index === 0 ? 'ère' : 'ème'} importance`, ...item })),
      ...(otherTotal ? [{ rank: 'Autres', name: otherItems.map((item) => item.name).join(', '), value: otherTotal }] : []),
    ].map((item) => ({ ...item, percent: total ? Math.round((item.value / total) * 100) : 0 }));

    const sortedFamilies = [...families].sort((a, b) => a.localeCompare(b, 'fr'));
    const monthlyData = months.map((month) => ({
      month: month.label,
      ...Object.fromEntries(sortedFamilies.map((family) => [family, familyMonthRequests.get(`${family}\u0000${month.key}`)?.size || 0])),
    }));
    const dominant = ranked[0];
    const activeMonths = months.filter((month) => requests.some((row) => row.report_date && monthKey(new Date(row.report_date)) === month.key)).length;
    const comment = dominant
      ? `Le mode « ${dominant.name} » est le plus fréquent avec ${dominant.value} demande${dominant.value > 1 ? 's' : ''}, soit ${Math.round((dominant.value / total) * 100)} % des demandes du lot « ${applied.lotName} ». L’activité est répartie sur ${activeMonths} mois de la période.`
      : `Aucune demande client classée dans le lot « ${applied.lotName} » sur la période sélectionnée.`;

    return { total, frequencyRows, sortedFamilies, monthlyData, comment };
  }, [applied, rows]);

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700"><ClipboardList className="h-5 w-5" /></div>
            <div><h2 className="font-black text-slate-900">Suivi des demandes client par lot</h2><p className="mt-1 text-sm text-slate-500">Fréquence des demandes de dépannage et problèmes les plus courants.</p></div>
          </div>
          <form onSubmit={handleOpen} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Lot de défaillance<select value={selectedLotId} onChange={(event) => setSelectedLotId(event.target.value)} disabled={loadingLots} className="mt-1 block min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-[#f98440] focus:ring-2 focus:ring-orange-100"><option value="">Sélectionner</option>{lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.nom}</option>)}</select></label>
            <DateField label="Du" value={startDate} onChange={setStartDate} />
            <DateField label="Au" value={endDate} onChange={setEndDate} />
            <button type="submit" disabled={loading || loadingLots} className="inline-flex h-[38px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />}{open ? 'Actualiser' : 'Ouvrir le rapport'}</button>
            {open && <button type="button" onClick={() => setOpen(false)} className="h-[38px] rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-white">Fermer</button>}
          </form>
        </div>
        {error && <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}
      </div>

      {open && <div className="space-y-5 p-4 sm:p-5">
        {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-[#f98440]" /> Préparation du rapport…</div> : report && <>
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Lot analysé</p><h3 className="mt-1 text-xl font-black text-slate-900">{applied?.lotName}</h3><p className="mt-1 text-sm text-slate-500">Du {new Date(`${applied?.period.start}T00:00:00`).toLocaleDateString('fr-FR')} au {new Date(`${applied?.period.end}T00:00:00`).toLocaleDateString('fr-FR')}</p></div><div className="rounded-xl bg-blue-50 px-4 py-2 text-right ring-1 ring-blue-100"><p className="text-2xl font-black text-blue-700">{report.total}</p><p className="text-xs font-semibold text-blue-900">demandes distinctes</p></div></div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <ChartCard icon={<PieChartIcon className="h-4 w-4" />} title="Répartition des demandes les plus fréquentes">
              {report.total ? <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={report.frequencyRows} dataKey="value" nameKey="rank" cx="50%" cy="48%" outerRadius={95} label={({ percent }) => `${Math.round((percent || 0) * 100)}%`}>{report.frequencyRows.map((item, index) => <Cell key={item.rank} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value, _name, item) => [value, item.payload.name]} /><Legend /></PieChart></ResponsiveContainer> : <EmptyChart />}
            </ChartCard>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm"><thead className="bg-slate-900 text-white"><tr><th className="px-3 py-3 text-left">Fréquence</th><th className="px-3 py-3 text-center">Répartition</th><th className="px-3 py-3 text-center">Nombre</th><th className="px-3 py-3 text-left">Intitulé des demandes les plus fréquentes</th></tr></thead><tbody className="divide-y divide-slate-200">{report.frequencyRows.length ? report.frequencyRows.map((item) => <tr key={item.rank} className="odd:bg-white even:bg-slate-50"><td className="px-3 py-3 font-semibold text-slate-800">{item.rank}</td><td className="px-3 py-3 text-center font-bold text-[#d95708]">{item.percent}%</td><td className="px-3 py-3 text-center font-black text-slate-900">{item.value}</td><td className="max-w-sm px-3 py-3 text-slate-600">{item.name}</td></tr>) : <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500">Aucune demande sur cette période.</td></tr>}</tbody></table>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard icon={<LineChartIcon className="h-4 w-4" />} title="Évolution mensuelle par famille"><ResponsiveContainer width="100%" height={300}><LineChart data={report.monthlyData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Legend />{report.sortedFamilies.map((family, index) => <Line key={family} type="monotone" dataKey={family} stroke={SERIES_COLORS[index % SERIES_COLORS.length]} strokeWidth={2} connectNulls />)}</LineChart></ResponsiveContainer></ChartCard>
            <ChartCard icon={<BarChart3 className="h-4 w-4" />} title="Demandes les plus fréquentes"><ResponsiveContainer width="100%" height={300}><BarChart data={report.frequencyRows} layout="vertical" margin={{ top: 5, right: 15, left: 25, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="rank" width={100} /><Tooltip formatter={(value, _name, item) => [value, item.payload.name]} /><Bar dataKey="value" radius={[0, 5, 5, 0]}>{report.frequencyRows.map((item, index) => <Cell key={item.rank} fill={COLORS[index % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></ChartCard>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Commentaire automatique</p><p className="mt-2 text-sm leading-6 text-slate-700">{report.comment}</p></div>
        </>}
      </div>}
    </section>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}<input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-[#f98440] focus:ring-2 focus:ring-orange-100" /></label>;
}

function ChartCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">{icon}{title}</h3>{children}</div>;
}

function EmptyChart() {
  return <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">Aucune donnée à représenter.</div>;
}
