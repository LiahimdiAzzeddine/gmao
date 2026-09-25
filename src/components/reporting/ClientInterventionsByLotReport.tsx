import { useMemo } from 'react';
import { MessageSquareText } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ReportProps } from './reportingData';
import { buildLotReports, displayPercent } from './reportingCalculations';
import { ChartCard } from './ReportPrimitives';

export default function ClientInterventionsByLotReport({ rows, period }: ReportProps) {
  const reports = useMemo(() => buildLotReports(rows, period), [rows, period]);

  return (
    <div className="space-y-8">
      {reports.map((report) => (
        <section key={report.id} aria-labelledby={`lot-report-${report.id}`} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
            <div>
              <h2 id={`lot-report-${report.id}`} className="text-base font-bold text-slate-900">Lot : {report.name}</h2>
              <p className="mt-1 text-xs text-slate-500">Suivi des interventions correctives · Fréquence des pannes</p>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-right">
              <p className="text-2xl font-bold tabular-nums text-orange-700">{report.total}</p>
              <p className="text-xs text-orange-800">interventions distinctes</p>
            </div>
          </div>

          <div className="space-y-5 p-3 sm:p-5">
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <ChartCard title="Répartition des interventions les plus fréquentes" description="Les quatre premiers modes de défaillance et les autres cas.">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={report.frequencyRows} dataKey="value" nameKey="rank" cx="50%" cy="45%" outerRadius={85} isAnimationActive={false} label={({ percent }) => displayPercent((percent || 0) * 100)}>
                      {report.frequencyRows.map((item) => <Cell key={item.rank} fill={item.color} />)}
                    </Pie>
                    <Tooltip formatter={(value, _name, item) => [value, item.payload.name]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-4">
                  <h3 className="text-sm font-semibold text-slate-900">Tableau des fréquences</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Classement des modes de défaillance du lot sur la période.</p>
                </div>
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`Tableau des fréquences du lot ${report.name}`}>
                  <table className="w-full min-w-[520px] text-left text-xs">
                    <caption className="sr-only">Fréquence, répartition, nombre d’interventions et intitulé des pannes du lot {report.name}</caption>
                    <thead className="bg-slate-900 text-white">
                      <tr><th scope="col" className="px-3 py-3 font-semibold">Fréquence</th><th scope="col" className="px-3 py-3 text-right font-semibold">Répartition</th><th scope="col" className="px-3 py-3 text-right font-semibold">Interventions</th><th scope="col" className="px-3 py-3 font-semibold">Modes de défaillance les plus fréquents</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {report.frequencyRows.map((item) => <tr key={item.rank} className="odd:bg-white even:bg-slate-50">
                        <th scope="row" className="whitespace-nowrap px-3 py-4 font-medium text-slate-700"><span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.rank}</th>
                        <td className="px-3 py-4 text-right font-semibold tabular-nums text-orange-700">{displayPercent(item.sharePercent)}</td>
                        <td className="px-3 py-4 text-right font-bold tabular-nums text-slate-900">{item.value}</td>
                        <td className="min-w-48 px-3 py-4 leading-5 text-slate-600">{item.name}</td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>
                {report.modeTotal > report.total && <p className="border-t border-slate-200 px-4 py-3 text-xs leading-5 text-slate-500">Une intervention peut présenter plusieurs pannes. Les pourcentages portent sur les occurrences des modes ; le total des interventions reste dédupliqué.</p>}
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <ChartCard title="Évolution mensuelle des interventions" description="Chaque intervention est comptée selon sa date de début.">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={report.monthlyData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} minTickGap={18} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line isAnimationActive={false} type="linear" dataKey="value" name="Interventions" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Pannes les plus fréquentes" description="Nombre d’interventions pour les quatre premiers modes de défaillance.">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={report.topFour} layout="vertical" margin={{ top: 10, right: 25, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="rank" width={105} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(value, _name, item) => [value, item.payload.name]} />
                    <Bar isAnimationActive={false} dataKey="value" name="Interventions" maxBarSize={34} radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 12, fill: '#475569' }}>
                      {report.topFour.map((item) => <Cell key={item.rank} fill={item.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><MessageSquareText size={16} className="text-orange-600" />Commentaire</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{report.comment}</p>
              <p className="mt-2 text-xs text-slate-500">Synthèse automatique des interventions de la période.</p>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
