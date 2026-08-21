// planningUtils.ts
export const monthsForGamme = {
  mensuel: [0,1,2,3,4,5,6,7,8,9,10,11],
  trimestriel: [0,3,6,9],
  semestriel: [0,6],
  annuel: [0]
};

export const monthLabels = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export type PlanningRule = {
  weekOfMonth: number; // 1-4
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  time: string; // HH:mm
};

// Mapping correct des jours de la semaine
const dayOfWeekMap: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

export function formatPlanningRule(rule: PlanningRule): string {
  const dayNames: Record<string, string> = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche'
  };

  const weekLabels = ['', '1ère', '2e', '3e', '4e'];
  
  return `${weekLabels[rule.weekOfMonth]} semaine du mois, ${dayNames[rule.dayOfWeek]} à ${rule.time}`;
}

export function generateUpcomingDates(
  gamme: 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel',
  planningRule?: PlanningRule & { month?: number }, // on peut ajouter month pour les fréquences > mensuel
  yearsToShow: number = 3
): Array<{ date: string; formattedDate: string }> {
  const result: Array<{ date: string; formattedDate: string }> = [];
  const today = new Date();
  
  if (!planningRule) return [];

  // Déterminer les mois à utiliser
  let startingMonths: number[] = [];
  
  switch (gamme) {
    case 'mensuel':
      startingMonths = monthsForGamme.mensuel;
      break;
    case 'trimestriel':
    case 'semestriel':
    case 'annuel':
      // si un mois spécifique est choisi dans la règle, on ne prend que celui-ci
      if (planningRule.month !== undefined) {
        startingMonths = [planningRule.month];
      } else {
        startingMonths = monthsForGamme[gamme];
      }
      break;
  }

  const currentYear = today.getFullYear();

  for (let yearOffset = 0; yearOffset < yearsToShow; yearOffset++) {
    const targetYear = currentYear + yearOffset;

    for (const month of startingMonths) {
      const targetDate = findSpecificDayInMonth(
        targetYear,
        month,
        planningRule.weekOfMonth,
        dayOfWeekMap[planningRule.dayOfWeek]
      );

      const [hours, minutes] = planningRule.time.split(':').map(Number);
      targetDate.setHours(hours, minutes, 0, 0);

      if (targetDate > today) {
        const dateStr = targetDate.toISOString();
        const formattedDate = targetDate.toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        result.push({ date: dateStr, formattedDate });
      }
    }
  }

  return result;
}


/**
 * Trouve un jour spécifique dans une semaine spécifique d'un mois
 * @param year Année
 * @param month Mois (0-11)
 * @param weekOfMonth Semaine du mois (1-4)
 * @param targetDayOfWeek Jour de la semaine cible (0=Dimanche, 1=Lundi, ..., 6=Samedi)
 */
function findSpecificDayInMonth(
  year: number,
  month: number,
  weekOfMonth: number,
  targetDayOfWeek: number
): Date {
  // Premier jour du mois
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay(); // 0=Dimanche, 1=Lundi, etc.

  // Calculer le nombre de jours jusqu'au premier occurrence du jour cible
  let daysUntilTarget = (targetDayOfWeek - firstDayOfWeek + 7) % 7;
  
  // Si le premier jour du mois est déjà le jour cible, daysUntilTarget sera 0
  // Ce qui signifie que le premier jour du mois est notre premier occurrence
  
  // Calculer la date du jour cible dans la semaine demandée
  // weekOfMonth = 1 signifie la première occurrence, donc on ajoute (weekOfMonth - 1) * 7 jours
  const dayOfMonth = 1 + daysUntilTarget + (weekOfMonth - 1) * 7;

  // Vérifier que le jour existe dans le mois
  const resultDate = new Date(year, month, dayOfMonth);
  
  // Si on dépasse le mois (par exemple, demander la 5e semaine d'un mois court)
  // retourner le dernier occurrence valide
  if (resultDate.getMonth() !== month) {
    // Revenir à la semaine précédente
    return new Date(year, month, dayOfMonth - 7);
  }

  return resultDate;
}

// Fonction utilitaire pour déboguer
export function debugDate(date: Date): void {
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  console.log({
    date: date.toISOString(),
    dayName: dayNames[date.getDay()],
    dayOfWeek: date.getDay(),
    dayOfMonth: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear()
  });
}