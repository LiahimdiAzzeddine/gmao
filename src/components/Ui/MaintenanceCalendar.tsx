import { useState } from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface MaintenanceCalendarProps {
  nextOccurrences: Date[];
  label?: string;
}

export function MaintenanceCalendar({ nextOccurrences, label }: MaintenanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Créer un Map des dates d'intervention pour une recherche rapide
  const interventionMap = new Map(
    nextOccurrences.map((date, idx) => [date.toDateString(), { date, index: idx }])
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Ajouter les jours vides du début
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Ajouter tous les jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDayClick = (date: Date) => {
    if (interventionMap.has(date.toDateString())) {
      setSelectedDate(date);
    }
  };

  const selectedIntervention = selectedDate 
    ? interventionMap.get(selectedDate.toDateString())
    : null;

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  const handleSelectIntervention = (date: Date) => {
  setSelectedDate(date);
  setCurrentMonth(new Date(date.getFullYear(), date.getMonth()));
};


  if (nextOccurrences.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
      <h4 className="font-semibold text-slate-800 mb-6 flex items-center gap-3 text-lg">
        <div className="p-2 bg-orange-100 rounded-lg">
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        Aperçu des 5 prochaines interventions
      </h4>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Liste des dates */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <ul className="space-y-3">
              {nextOccurrences.map((date, idx) => (
                <li 
                  key={idx} 
                  className="group text-sm text-slate-600 flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-white rounded-xl hover:from-orange-50 hover:to-white transition-all duration-200 border border-transparent hover:border-orange-200 hover:shadow-sm cursor-pointer"
                  onClick={() => {setSelectedDate(date);handleSelectIntervention(date)}}
                >
                  <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center text-sm font-bold shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">
                      {date.toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Détails de l'intervention sélectionnée */}
          {selectedIntervention && (
            <div className="mt-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200 shadow-sm">
              <h5 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Intervention sélectionnée
              </h5>
              <p className="text-sm text-orange-800">
                <strong>Date:</strong> {selectedIntervention.date.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="text-sm text-orange-800 mt-1">
                <strong>Heure:</strong> {selectedIntervention.date.toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
              <p className="text-sm text-orange-800 mt-1">
                <strong>Type:</strong> {label || 'Maintenance préventive'}
              </p>
            </div>
          )}
        </div>

        {/* Calendrier personnalisé */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          {/* En-tête du calendrier */}
          <div className="flex items-center justify-between mb-6">
            <button
            type="button"
              onClick={previousMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h3 className="text-lg font-semibold text-slate-800">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button
            type="button"
              onClick={nextMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Jours du mois */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }

              const intervention = interventionMap.get(day.toDateString());
              const hasIntervention = !!intervention;
              const isTodayDate = isToday(day);
              const isSelected = selectedDate?.toDateString() === day.toDateString();

              return (
                <button
                type="button"
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  className={`
                    aspect-square rounded-lg text-sm font-medium transition-all duration-200
                    ${hasIntervention 
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-md hover:shadow-lg cursor-pointer' 
                      : 'text-slate-700 hover:bg-slate-100 cursor-default'
                    }
                    ${isTodayDate && !hasIntervention ? 'bg-slate-100 font-bold' : ''}
                    ${isSelected ? 'ring-2 ring-orange-400 ring-offset-2' : ''}
                  `}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <span>{day.getDate()}</span>
                    {hasIntervention && (
                      <span className="text-xs mt-0.5 opacity-90">
                        #{intervention.index + 1}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Légende */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded"></div>
              <span>Intervention</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-100 rounded"></div>
              <span>Aujourd'hui</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}