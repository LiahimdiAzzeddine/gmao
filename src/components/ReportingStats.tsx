import { FormEvent, useMemo, useState } from 'react';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { AlertCircle, ArrowRight, BarChart3, CalendarDays, Download, Filter, RefreshCw, Search } from 'lucide-react';
import CorrectiveInterventionsReport from './reporting/CorrectiveInterventionsReport';
import ClientInterventionsByLotReport from './reporting/ClientInterventionsByLotReport';
import { buildMonths, Period, useReportingRows } from './reporting/reportingData';
import { EmptyReport } from './reporting/ReportPrimitives';

const inputClass = 'mt-1.5 h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50';

export default function ReportingStats() {
  const [view, setView] = useState<'overview' | 'failures'>('overview');
  const [period, setPeriod] = useState<Period>(() => {
    const year = new Date().getFullYear();
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  });
  const [draftPeriod, setDraftPeriod] = useState(period);
  const [lotId, setLotId] = useState('');
  const [draftLotId, setDraftLotId] = useState('');
  const [validationError, setValidationError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const { rows, loading, error } = useReportingRows(period, refresh);

  const lots = useMemo(() => {
    const options = new Map<string, string>();
    rows.forEach((row) => options.set(row.problem_lot_id || 'unclassified', row.lot_defaillance || 'Non classé'));
    return [...options].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [rows]);
  const filteredRows = useMemo(() => rows.filter((row) => !lotId || (row.problem_lot_id || 'unclassified') === lotId), [rows, lotId]);
  const lotName = lotId ? lots.find((lot) => lot.id === lotId)?.name || 'Lot sélectionné' : 'Tous les lots';
  const pending = draftPeriod.start !== period.start || draftPeriod.end !== period.end || draftLotId !== lotId;

  async function exportExcel() {
    if (exporting || loading || error || pending || !filteredRows.length) return;
    setExporting(true);
    setExportError('');
    try {
      const { downloadReportingExcel } = await import('./reporting/exportReportingExcel');
      await downloadReportingExcel({ rows: filteredRows, period, lotName });
    } catch (cause) {
      console.error('Reporting Excel export failed:', cause);
      setExportError('Le rapport Excel n’a pas pu être généré. Veuillez réessayer.');
    } finally {
      setExporting(false);
    }
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    if (!draftPeriod.start || !draftPeriod.end || draftPeriod.start > draftPeriod.end) {
      setValidationError('La date de fin doit être postérieure ou égale à la date de début.');
      return;
    }
    const months = buildMonths(draftPeriod);
    if (!months.length || months.length > 24) {
      setValidationError('Choisissez une période de 24 mois maximum.');
      return;
    }
    setValidationError('');
    setPeriod({ ...draftPeriod });
    setLotId(draftLotId);
    setRefresh((value) => value + 1);
  }

  function selectPreset(preset: 'month' | 'quarter' | 'year') {
    const today = new Date();
    setValidationError('');
    setDraftPeriod(preset === 'year'
      ? { start: `${today.getFullYear()}-01-01`, end: `${today.getFullYear()}-12-31` }
      : { start: format(startOfMonth(preset === 'quarter' ? subMonths(today, 2) : today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <p className="max-w-3xl text-sm leading-6 text-slate-500">Suivez les interventions correctives et identifiez les pannes récurrentes. Les interventions sont incluses, que leur OT soit créé directement ou issu d’une demande.</p>
        <div className="shrink-0 space-y-2 lg:text-right">
          <button type="button" onClick={exportExcel} disabled={exporting || loading || !!error || pending || !filteredRows.length} title={pending ? 'Appliquez les filtres avant de télécharger le rapport.' : 'Exporter les deux vues avec les filtres appliqués'} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
            {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            {exporting ? 'Préparation du rapport…' : 'Télécharger Excel'}
          </button>
          <p className="text-xs text-slate-500" aria-live="polite">{exporting ? 'Génération des tableaux et graphiques…' : 'Vue d’ensemble et interventions par lot'}</p>
        </div>
      </div>
      {exportError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{exportError}</p>}
      <section aria-label="Filtres du reporting" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Filter size={16} className="text-orange-600" />Filtrer les interventions</h2>
          <div className="flex flex-wrap gap-1.5" aria-label="Périodes rapides">
            {([{ key: 'month', label: 'Ce mois' }, { key: 'quarter', label: '3 derniers mois' }, { key: 'year', label: 'Cette année' }] as const).map((preset) => (
              <button key={preset.key} type="button" disabled={loading} onClick={() => selectPreset(preset.key)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50">{preset.label}</button>
            ))}
          </div>
        </div>
        <form onSubmit={applyFilters} className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr_auto] xl:items-end">
          <label className="min-w-0 text-xs font-semibold text-slate-600">Date de début<input required type="date" value={draftPeriod.start} disabled={loading} onChange={(event) => setDraftPeriod((current) => ({ ...current, start: event.target.value }))} className={inputClass} /></label>
          <label className="min-w-0 text-xs font-semibold text-slate-600">Date de fin<input required type="date" min={draftPeriod.start} value={draftPeriod.end} disabled={loading} onChange={(event) => setDraftPeriod((current) => ({ ...current, end: event.target.value }))} className={inputClass} /></label>
          <label className="min-w-0 text-xs font-semibold text-slate-600">Lot de défaillance<select value={draftLotId} disabled={loading} onChange={(event) => setDraftLotId(event.target.value)} className={inputClass}>
            <option value="">Tous les lots</option>
            {draftLotId && !lots.some((lot) => lot.id === draftLotId) && <option value={draftLotId}>Lot sélectionné (sans données)</option>}
            {lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.name}</option>)}
          </select></label>
          <button disabled={loading} type="submit" className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
            {loading ? <RefreshCw size={16} className="animate-spin" /> : pending ? <ArrowRight size={16} /> : <RefreshCw size={16} />}
            {loading ? 'Chargement…' : pending ? 'Appliquer les filtres' : 'Actualiser'}
          </button>
        </form>
        {validationError && <p role="alert" className="mt-3 text-sm text-red-700">{validationError}</p>}
        {pending && !loading && <p role="status" className="mt-3 text-xs text-orange-700">Filtres modifiés. Appliquez-les pour mettre à jour les résultats.</p>}
      </section>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1" role="group" aria-label="Vue du rapport">
          {([{ id: 'overview', label: 'Vue d’ensemble', icon: BarChart3 }, { id: 'failures', label: 'Interventions par lot', icon: Search }] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:px-5 ${view === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}><Icon size={16} className="hidden shrink-0 sm:block" />{label}</button>
          ))}
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500"><CalendarDays size={14} />{format(new Date(`${period.start}T00:00:00`), 'dd/MM/yyyy')} – {format(new Date(`${period.end}T00:00:00`), 'dd/MM/yyyy')}<span aria-hidden="true">·</span><span className="font-semibold text-slate-700">{lotName}</span></p>
      </div>
      <section aria-label={view === 'overview' ? 'Vue d’ensemble des interventions' : 'Interventions par lot'} aria-busy={loading}>
        {loading ? <div role="status" className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white"><RefreshCw className="h-6 w-6 animate-spin text-orange-500" /><p className="text-sm text-slate-500">Chargement des interventions…</p></div>
          : error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6"><h2 className="flex items-center gap-2 font-semibold text-red-800"><AlertCircle size={18} />Le rapport n’a pas pu être chargé</h2><p className="mt-2 text-sm text-red-700">Vérifiez votre connexion puis réessayez.</p><button type="button" onClick={() => setRefresh((value) => value + 1)} className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 focus-visible:ring-2 focus-visible:ring-red-500">Réessayer</button></div>
          : !filteredRows.length ? <EmptyReport onResetLot={lotId ? () => { setLotId(''); setDraftLotId(''); } : undefined} />
          : view === 'overview' ? <CorrectiveInterventionsReport rows={filteredRows} period={period} />
          : <ClientInterventionsByLotReport rows={filteredRows} period={period} />}
      </section>
      <p className="text-xs leading-5 text-slate-400">Chaque intervention est comptée une seule fois, selon sa date de début. Plusieurs interventions sur un même OT sont comptées séparément. Les OT sans intervention sont exclus.</p>
    </div>
  );
}
