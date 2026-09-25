import { useMemo } from 'react';
import { MessageSquareText } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { REPORT_COLORS, ReportProps } from './reportingData';
import { buildOverviewReport } from './reportingCalculations';
import { ChartCard, MetricCard } from './ReportPrimitives';

export default function CorrectiveInterventionsReport({ rows, period }: ReportProps) {
  const report = useMemo(() => buildOverviewReport(rows, period), [rows, period]);

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <MetricCard label="Interventions correctives" value={report.total} detail="Interventions enregistrées sur la période" accent />
      <MetricCard label="Lots concernés" value={report.lots.length} detail="Lots avec une activité sur la sélection" />
      <MetricCard label="Lot le plus sollicité" value={report.lots[0]?.name || '—'} detail={`${report.lots[0]?.value || 0} interventions correctives`} />
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
      <ChartCard title="Évolution des interventions" description="Nombre d’interventions correctives par mois et par lot.">
        <ResponsiveContainer width="100%" height={300}><BarChart data={report.monthlyData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={18} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: '#f1f5f9' }} /><Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />{report.lots.map((lot, index) => <Bar isAnimationActive={false} key={lot.name} dataKey={`lot${index}`} name={lot.name} stackId="lots" fill={REPORT_COLORS[index % REPORT_COLORS.length]} maxBarSize={40} />)}</BarChart></ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Activité par lot" description="Part des interventions concernant chaque lot.">
        <div className="max-h-[300px] space-y-5 overflow-y-auto pr-1">
          {report.lots.map((lot, index) => <div key={lot.name}><div className="mb-2 flex items-start justify-between gap-3 text-sm"><span className="min-w-0 break-words font-medium text-slate-700">{lot.name}</span><span className="shrink-0 font-semibold tabular-nums text-slate-900">{lot.value} <span className="ml-1 text-xs font-normal text-slate-400">{Math.round(lot.value / report.total * 100)} %</span></span></div><div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${lot.value / report.total * 100}%`, backgroundColor: REPORT_COLORS[index % REPORT_COLORS.length] }} /></div></div>)}
        </div>
      </ChartCard>
    </div>
    <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-slate-800 marker:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500">Détail mensuel par famille de problèmes <span className="ml-2 text-xs font-normal text-slate-400">{report.tableRows.length} lignes</span></summary>
      <div className="overflow-x-auto border-t border-slate-200" tabIndex={0} role="region" aria-label="Tableau mensuel des interventions">
        <table className="w-full border-collapse text-left text-xs">
          <caption className="sr-only">Interventions par lot, famille et mois sur la période sélectionnée</caption>
          <thead className="bg-slate-50 text-slate-500"><tr><th scope="col" className="min-w-32 px-4 py-3 font-semibold">Lot</th><th scope="col" className="min-w-48 px-4 py-3 font-semibold">Famille de problèmes</th>{report.months.map((month) => <th scope="col" key={month.key} className="whitespace-nowrap px-3 py-3 text-center font-medium capitalize">{month.label}</th>)}<th scope="col" className="px-4 py-3 text-center font-semibold text-orange-700">Total</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{report.tableRows.map((row) => <tr key={JSON.stringify([row.lot, row.family])} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-700">{row.lot}</td><th scope="row" className="px-4 py-3 text-left font-normal text-slate-600">{row.family}</th>{row.counts.map((count, index) => <td key={index} className={`px-3 py-3 text-center tabular-nums ${count ? 'font-medium text-slate-800' : 'text-slate-300'}`}>{count || '—'}</td>)}<td className="bg-orange-50/50 px-4 py-3 text-center font-semibold text-orange-700">{row.total}</td></tr>)}</tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900"><tr><th scope="row" colSpan={2} className="px-4 py-3">Total des interventions</th>{report.monthTotals.map((total, index) => <td key={index} className="px-3 py-3 text-center tabular-nums">{total}</td>)}<td className="px-4 py-3 text-center text-orange-700">{report.total}</td></tr></tfoot>
        </table>
      </div>
      <p className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-400">Une intervention peut concerner plusieurs familles ou lots. Les totaux sont dédupliqués et peuvent différer de la somme des lignes.</p>
    </details>
    <section aria-labelledby="overview-comments" className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 sm:p-5">
      <h2 id="overview-comments" className="flex items-center gap-2 text-sm font-semibold text-slate-900"><MessageSquareText size={16} className="text-orange-600" />Commentaires</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">{report.comment}</p>
      <p className="mt-2 text-xs text-slate-500">Synthèse automatique des interventions de la sélection.</p>
    </section>
  </div>;
}
