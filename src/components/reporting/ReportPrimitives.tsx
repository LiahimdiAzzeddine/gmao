import { ReactNode } from 'react';
import { Search } from 'lucide-react';

export function MetricCard({ label, value, detail, accent = false }: { label: string; value: ReactNode; detail: string; accent?: boolean }) {
  return <div className={`min-w-0 rounded-2xl border p-5 ${accent ? 'border-orange-200 bg-orange-50/70' : 'border-slate-200 bg-white'}`}><p className="text-xs font-medium text-slate-500">{label}</p><p className={`mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl ${accent ? 'text-orange-700' : 'text-slate-900'}`}>{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p></div>;
}

export function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><h3 className="text-sm font-semibold text-slate-900">{title}</h3><p className="mb-6 mt-1 text-xs leading-5 text-slate-500">{description}</p>{children}</div>;
}

export function EmptyReport({ onResetLot }: { onResetLot?: () => void }) {
  return <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><div className="mb-4 rounded-full bg-slate-100 p-3"><Search className="h-6 w-6 text-slate-400" /></div><h2 className="font-semibold text-slate-900">Aucune intervention sur cette sélection</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Essayez une période plus large ou sélectionnez un autre lot pour consulter les interventions disponibles.</p>{onResetLot && <button type="button" onClick={onResetLot} className="mt-5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-orange-500">Afficher tous les lots</button>}</div>;
}
