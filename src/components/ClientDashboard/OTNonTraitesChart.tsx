import { OTByType } from './types';

export function OTNonTraitesChart({ otByType }: { otByType: OTByType[] }) {
  if (otByType.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm font-semibold text-slate-400">
        Aucun OT non traité
      </div>
    );
  }

  const total = otByType.reduce((sum, item) => sum + item.count, 0);
  const maxValue = Math.max(...otByType.map(item => item.count), 1);

  return (
    <div className="space-y-6">
      {/* Barres horizontales */}
      <div className="space-y-4">
        {otByType.map((item, index) => {
          const widthPercent = (item.count / maxValue) * 100;
          const percentage = ((item.count / total) * 100).toFixed(1);

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-bold text-slate-700">{item.type}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{item.count}</span>
                  <span className="text-xs font-semibold text-slate-500">({percentage}%)</span>
                </div>
              </div>
              <div className="relative h-8 overflow-hidden rounded-lg bg-slate-100">
                <div
                  className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500 ease-out flex items-center justify-start px-3"
                  style={{ 
                    width: `${Math.max(widthPercent, 10)}%`,
                    backgroundColor: item.color 
                  }}
                >
                  {item.count > 0 && (
                    <span className="text-sm font-bold text-white">
                      {item.count} OT
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Résumé en cartes */}
      <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
        {otByType.map((item, index) => (
          <div 
            key={index} 
            className="rounded-lg p-4 text-center"
            style={{ backgroundColor: `${item.color}15` }}
          >
            <div 
              className="text-xs font-semibold mb-1"
              style={{ color: item.color }}
            >
              {item.type}
            </div>
            <div className="text-3xl font-black text-slate-900">{item.count}</div>
            <div className="text-xs font-medium text-slate-600 mt-1">
              {((item.count / total) * 100).toFixed(0)}% du total
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
