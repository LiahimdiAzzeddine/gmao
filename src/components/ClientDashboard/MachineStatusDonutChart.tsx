import { ClientStats } from './types';

export function MachineStatusDonutChart({ stats }: { stats: ClientStats }) {
  const total = stats.machines;
  if (total === 0) {
    return (
      <div className="flex h-48 w-48 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
        Aucune machine
      </div>
    );
  }

  // Calcul des pourcentages et des angles pour le graphique en donut
  const enServicePercent = (stats.machinesEnService / total) * 100;
  const enPannePercent = (stats.machinesEnPanne / total) * 100;
  const horsServicePercent = (stats.machinesHorsService / total) * 100;

  // Calcul des angles pour le SVG (commence à -90° pour partir du haut)
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  
  const enServiceLength = (enServicePercent / 100) * circumference;
  const enPanneLength = (enPannePercent / 100) * circumference;
  const horsServiceLength = (horsServicePercent / 100) * circumference;

  const enServiceOffset = 0;
  const enPanneOffset = enServiceLength;
  const horsServiceOffset = enServiceLength + enPanneLength;

  return (
    <div className="relative h-48 w-48">
      <svg className="h-48 w-48 -rotate-90 transform" viewBox="0 0 160 160">
        {/* Cercle de fond */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="20"
        />
        
        {/* En service (vert) */}
        {enServicePercent > 0 && (
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth="20"
            strokeDasharray={`${enServiceLength} ${circumference}`}
            strokeDashoffset={-enServiceOffset}
            strokeLinecap="round"
          />
        )}
        
        {/* En panne (rouge) */}
        {enPannePercent > 0 && (
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#ef4444"
            strokeWidth="20"
            strokeDasharray={`${enPanneLength} ${circumference}`}
            strokeDashoffset={-enPanneOffset}
            strokeLinecap="round"
          />
        )}
        
        {/* Hors service (gris) */}
        {horsServicePercent > 0 && (
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="20"
            strokeDasharray={`${horsServiceLength} ${circumference}`}
            strokeDashoffset={-horsServiceOffset}
            strokeLinecap="round"
          />
        )}
      </svg>
      
      {/* Centre avec le total */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-black text-slate-900">{total}</div>
        <div className="text-xs font-semibold text-slate-500">Machines</div>
      </div>
    </div>
  );
}
