import { DailyActivity } from './types';

export function MaintenanceActivityChart({ activity }: { activity: DailyActivity[] }) {
  if (activity.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm font-semibold text-slate-400">
        Aucune donnée d'activité
      </div>
    );
  }

  // Trouver la valeur maximale pour normaliser les hauteurs
  const maxValue = Math.max(
    ...activity.map((day) => Math.max(day.otCrees, day.interventionsTerminees)),
    1 // Minimum 1 pour éviter la division par zéro
  );

  return (
    <>
      <div className="flex h-52 items-end justify-between gap-4">
        {activity.map((day, index) => {
          const otHeight = (day.otCrees / maxValue) * 100;
          const interventionsHeight = (day.interventionsTerminees / maxValue) * 100;
          
          return (
            <div key={index} className="flex flex-1 items-end justify-center gap-1 group relative">
              {/* Barre OT créés */}
              <div 
                className="w-2 rounded-full bg-[#ff6b57] transition-all duration-300 hover:bg-[#ff5544]" 
                style={{ height: `${Math.max(8, otHeight)}%` }}
                title={`${day.otCrees} OT créés`}
              />
              {/* Barre Interventions terminées */}
              <div 
                className="w-2 rounded-full bg-blue-500 transition-all duration-300 hover:bg-blue-600" 
                style={{ height: `${Math.max(8, interventionsHeight)}%` }}
                title={`${day.interventionsTerminees} interventions`}
              />
              
              {/* Tooltip au survol */}
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                  <div className="font-semibold mb-1">{day.day}</div>
                  <div className="flex items-center gap-2 text-[#ff6b57]">
                    <span className="w-2 h-2 rounded-full bg-[#ff6b57]"></span>
                    {day.otCrees} OT
                  </div>
                  <div className="flex items-center gap-2 text-blue-400">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {day.interventionsTerminees} Int.
                  </div>
                </div>
                {/* Flèche */}
                <div className="w-2 h-2 bg-slate-800 transform rotate-45 -mt-1"></div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold text-slate-400">
        {activity.map((day, index) => (
          <span key={index}>{day.day}</span>
        ))}
      </div>
    </>
  );
}
