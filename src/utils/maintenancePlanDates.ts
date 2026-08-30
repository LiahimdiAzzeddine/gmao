export interface MaintenanceRecurrence {
  date_debut: string;
  date_fin?: string | null;
  type_recurrence: string;
  intervalle?: number | null;
  forcer_jour_semaine?: boolean | null;
  jour_semaine?: number | null;
  semaine_du_mois?: number | null;
}

export function toLocalDateKey(date: Date | string): string {
  const value = date instanceof Date ? date : new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(value: string): Date {
  if (value.includes('T')) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addMonthsPreservingDay(date: Date, interval: number): Date {
  const dayOfMonth = date.getDate();
  const totalMonth = date.getMonth() + interval;
  const targetYear = date.getFullYear() + Math.floor(totalMonth / 12);
  const targetMonth = ((totalMonth % 12) + 12) % 12;
  const candidate = new Date(targetYear, targetMonth, dayOfMonth);

  return candidate.getMonth() === targetMonth
    ? candidate
    : new Date(targetYear, targetMonth + 1, 0);
}

export function generateMaintenancePlanDates(
  plan: MaintenanceRecurrence,
  rangeStart: Date,
  rangeEnd: Date,
  maxOccurrences = 5000
): Date[] {
  if (!plan.date_debut || !plan.type_recurrence) return [];

  const interval = Math.max(1, Number(plan.intervalle) || 1);
  const start = parseLocalDate(plan.date_debut);
  const requestedStart = new Date(rangeStart);
  requestedStart.setHours(0, 0, 0, 0);
  const requestedEnd = new Date(rangeEnd);
  requestedEnd.setHours(23, 59, 59, 999);
  const configuredEnd = plan.date_fin ? parseLocalDate(plan.date_fin) : requestedEnd;
  const effectiveEnd = configuredEnd < requestedEnd ? configuredEnd : requestedEnd;
  const occurrences: Date[] = [];
  let currentDate = new Date(start);
  let iterations = 0;

  while (currentDate <= effectiveEnd && iterations < maxOccurrences) {
    if (currentDate >= requestedStart) occurrences.push(new Date(currentDate));

    switch (plan.type_recurrence) {
      case 'journalière':
        currentDate.setDate(currentDate.getDate() + interval);
        break;
      case 'hebdomadaire':
        currentDate.setDate(currentDate.getDate() + (7 * interval));
        break;
      case 'mensuelle':
        if (plan.semaine_du_mois) {
          const totalMonth = currentDate.getMonth() + interval;
          const targetYear = currentDate.getFullYear() + Math.floor(totalMonth / 12);
          const targetMonth = ((totalMonth % 12) + 12) % 12;
          currentDate = new Date(
            targetYear,
            targetMonth,
            1 + ((plan.semaine_du_mois - 1) * 7)
          );
        } else {
          currentDate = addMonthsPreservingDay(currentDate, interval);
        }
        break;
      case 'annuelle':
        currentDate.setFullYear(currentDate.getFullYear() + interval);
        break;
      default:
        return occurrences;
    }

    if (
      plan.forcer_jour_semaine
      && plan.jour_semaine !== null
      && plan.jour_semaine !== undefined
    ) {
      let checkedDays = 0;
      while (currentDate.getDay() !== plan.jour_semaine && checkedDays < 7) {
        currentDate.setDate(currentDate.getDate() + 1);
        checkedDays++;
      }
    }

    currentDate.setHours(0, 0, 0, 0);
    iterations++;
  }

  return occurrences;
}
