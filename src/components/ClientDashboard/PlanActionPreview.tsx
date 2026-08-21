import { ArrowRight, CheckCircle2, ClipboardList } from 'lucide-react';
import type { PlanActionPreviewItem } from './types';

type PlanActionPreviewProps = {
  total: number;
  cloturees: number;
  rpnEleve: number;
  actions: PlanActionPreviewItem[];
  onOpen: () => void;
};

export function PlanActionPreview({
  total,
  cloturees,
  rpnEleve,
  actions,
  onOpen,
}: PlanActionPreviewProps) {
  const enCours = Math.max(0, total - cloturees);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Metric label="Total" value={total} tone="slate" />
        <Metric label="En cours" value={enCours} tone="orange" />
        <Metric label="Risque élevé" value={rpnEleve} tone="red" />
      </div>

      <div className="mt-4 space-y-2">
        {actions.length === 0 ? (
          <div className="flex min-h-28 flex-col items-center justify-center rounded-lg bg-slate-50 px-4 text-center">
            <CheckCircle2 className="mb-2 text-emerald-500" size={24} />
            <p className="text-sm font-bold text-slate-700">Aucune action corrective</p>
            <p className="mt-1 text-xs text-slate-500">Le plan d’action est vide pour le moment.</p>
          </div>
        ) : (
          actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={onOpen}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:border-orange-200 hover:bg-orange-50"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                action.cloturee ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {action.cloturee ? <CheckCircle2 size={16} /> : <ClipboardList size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-black text-slate-900 sm:text-sm">{action.equipment}</div>
                <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500 sm:text-xs">
                  {action.modeDefaillance} · {action.actionRecommandee}
                </div>
              </div>
              {action.rpn !== null && (
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                  action.rpn >= 60
                    ? 'bg-red-100 text-red-700'
                    : action.rpn >= 24
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                }`}>
                  RPN {action.rpn}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#f04438] hover:text-[#d92d20] sm:text-sm"
      >
        Voir le plan d’action complet
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'orange' | 'red';
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div className={`rounded-lg px-2 py-3 text-center sm:px-3 ${tones[tone]}`}>
      <div className="text-lg font-black sm:text-xl">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold sm:text-xs">{label}</div>
    </div>
  );
}
