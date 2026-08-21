import { Calendar, AlertCircle } from 'lucide-react';

interface MaintenancePreviewProps {
  dateDebut: string;
  dateFin: string;
  typeRecurrence: string;
  intervalle: number;
  forcerJourSemaine: boolean;
  jourSemaine: number | null|undefined;
  semaineduMois: number | null;
  type: 'préventive' | 'corrective';
}

export function MaintenancePreview({
  dateDebut,
  dateFin,
  typeRecurrence,
  intervalle,
  forcerJourSemaine,
  jourSemaine,
  semaineduMois,
  type
}: MaintenancePreviewProps) {
  if (type === 'corrective') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            Maintenance corrective - Pas de planification périodique
          </div>
        </div>
      </div>
    );
  }

  if (!dateDebut || !typeRecurrence) {
    return null;
  }

  const generateUpcomingDates = () => {
    const dates: { date: Date; isPast: boolean }[] = [];
    
    // Parser la date correctement pour éviter les problèmes de fuseau horaire
    // Si dateDebut est "2026-04-25", on veut s'assurer d'avoir le 25 avril en heure locale
    let currentDate: Date;
    if (dateDebut.includes('T')) {
      // Format ISO complet avec heure
      currentDate = new Date(dateDebut);
    } else {
      // Format date seule (YYYY-MM-DD), parser en heure locale
      const [year, month, day] = dateDebut.split('-').map(Number);
      currentDate = new Date(year, month - 1, day);
    }
    
    const endDate = dateFin ? new Date(dateFin) : new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDates = 6;

    while (dates.length < maxDates && currentDate <= endDate) {
      dates.push({ date: new Date(currentDate), isPast: currentDate < today });

      switch (typeRecurrence) {
        case 'journalière':
          currentDate.setDate(currentDate.getDate() + intervalle);
          break;
        case 'hebdomadaire':
          currentDate.setDate(currentDate.getDate() + (7 * intervalle));
          break;
        case 'mensuelle':
          if (semaineduMois) {
            // Si une semaine du mois est spécifiée, calculer la date dans cette semaine
            currentDate.setMonth(currentDate.getMonth() + intervalle);
            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const targetDate = new Date(firstDay);
            targetDate.setDate(1 + (semaineduMois - 1) * 7);
            if (targetDate.getMonth() === currentDate.getMonth()) {
              currentDate = targetDate;
            }
          } else {
            // Sinon, simplement ajouter les mois en préservant le jour du mois
            const dayOfMonth = currentDate.getDate();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            
            // Calculer le nouveau mois et année
            const newMonth = currentMonth + intervalle;
            const newYear = currentYear + Math.floor(newMonth / 12);
            const finalMonth = newMonth % 12;
            
            // Créer une nouvelle date avec le même jour
            currentDate = new Date(newYear, finalMonth, dayOfMonth);
            
            // Gérer le cas où le jour n'existe pas dans le nouveau mois (ex: 31 février)
            // JavaScript ajuste automatiquement (31 fév devient 3 mars), donc on vérifie le mois
            if (currentDate.getMonth() !== finalMonth) {
              // Le jour était invalide, revenir au dernier jour du mois cible
              currentDate = new Date(newYear, finalMonth + 1, 0);
            }
          }
          break;
        case 'annuelle':
          currentDate.setFullYear(currentDate.getFullYear() + intervalle);
          break;
      }

      if (forcerJourSemaine && jourSemaine !== null) {
        while (currentDate.getDay() !== jourSemaine && currentDate <= endDate) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }

    return dates;
  };

  const upcomingDates = generateUpcomingDates();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const firstFutureIdx = upcomingDates.findIndex(d => !d.isPast);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900">
          Aperçu des prochaines maintenances
        </h3>
      </div>

      {upcomingDates.length === 0 ? (
        <div className="text-sm text-slate-600">
          Aucune date de maintenance dans la période configurée
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingDates.map(({ date, isPast }, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                isPast
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-white border-blue-100'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isPast ? 'bg-orange-100' : 'bg-blue-100'
              }`}>
                <span className={`font-bold text-sm ${isPast ? 'text-orange-600' : 'text-blue-600'}`}>
                  {String(date.getDate()).padStart(2, '0')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isPast ? 'text-orange-900' : 'text-slate-900'}`}>
                  {formatDate(date)}
                </p>
              </div>
              {isPast && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium flex-shrink-0">
                  À rattraper
                </span>
              )}
              {!isPast && idx === firstFutureIdx && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex-shrink-0">
                  Prochaine
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {forcerJourSemaine && jourSemaine !== null && jourSemaine !== undefined && (
        <div className="text-xs text-slate-600 mt-3 p-2 bg-white rounded border border-slate-200">
          Jour imposé: {['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][jourSemaine]}
        </div>
      )}
    </div>
  );
}
