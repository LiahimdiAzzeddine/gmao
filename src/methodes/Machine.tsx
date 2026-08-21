export function generateDates(
  startDate: string | number | Date, 
  frequency: "hebdomadaire" | "mensuel" | "trimestriel" | "semestriel" | "annuel" | "quinzaine" | string
) {
  const dates: Date[] = [];
  const date = new Date(startDate);
  const endOfYear = new Date(date.getFullYear(), 11, 31); // 31 décembre de l'année de startDate

  while (date <= endOfYear) {
    dates.push(new Date(date));

    switch (frequency) {
      case "hebdomadaire":
        date.setDate(date.getDate() + 7);
        break;
      case "quinzaine":
        date.setDate(date.getDate() + 15); // tous les 15 jours
        break;
      case "mensuel":
        date.setMonth(date.getMonth() + 1);
        break;
      case "trimestriel":
        date.setMonth(date.getMonth() + 3);
        break;
      case "semestriel":
        date.setMonth(date.getMonth() + 6);
        break;
      case "annuel":
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
  }

  return dates;
}
type PeriodItem = {
  year: number;
  periodNumber: number;
  periodType: string;
  month: string;
  dayOfWeek: string;
  date: string;
};

export const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const DAYS_OF_WEEK = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
];

export function getISOWeek(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getPeriodNumber(
  date: Date,
  frequency: string
): number {
  switch (frequency) {
    case "hebdomadaire":
      return getISOWeek(date);
    case "quinzaine":
      return Math.ceil(getISOWeek(date) / 2);
    case "mensuel":
      return date.getMonth() + 1; // Mois de 1 à 12
    case "trimestriel":
      return Math.ceil((date.getMonth() + 1) / 3); // Trimestre de 1 à 4
    case "semestriel":
      return Math.ceil((date.getMonth() + 1) / 6); // Semestre de 1 à 2
    case "annuel":
      return 1; // Toujours 1 pour annuel
    default:
      return 1;
  }
}

export function getPeriodType(frequency: string): string {
  switch (frequency) {
    case "hebdomadaire":
      return "Semaine";
    case "quinzaine":
      return "Quinzaine";
    case "mensuel":
      return "Mois";
    case "trimestriel":
      return "Trimestre";
    case "semestriel":
      return "Semestre";
    case "annuel":
      return "Année";
    default:
      return "Période";
  }
}

export function generatePeriods(
  startDate: string | number | Date,
  frequency:
    | "hebdomadaire"
    | "quinzaine"
    | "mensuel"
    | "trimestriel"
    | "semestriel"
    | "annuel"|any
) {
  const periods: PeriodItem[] = [];
  const date = new Date(startDate);
  const endOfYear = new Date(date.getFullYear(), 11, 31);

  while (date <= endOfYear) {
    periods.push({
      year: date.getFullYear(),
      periodNumber: getPeriodNumber(date, frequency),
      periodType: getPeriodType(frequency),
      month: MONTHS[date.getMonth()],
      dayOfWeek: DAYS_OF_WEEK[date.getDay()],
      date: date.toLocaleDateString('fr-FR')
    });
    
    switch (frequency) {
      case "hebdomadaire":
        date.setDate(date.getDate() + 7);
        break;
      case "quinzaine":
        date.setDate(date.getDate() + 14);
        break;
      case "mensuel":
        date.setMonth(date.getMonth() + 1);
        break;
      case "trimestriel":
        date.setMonth(date.getMonth() + 3);
        break;
      case "semestriel":
        date.setMonth(date.getMonth() + 6);
        break;
      case "annuel":
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
  }

  return periods;
}