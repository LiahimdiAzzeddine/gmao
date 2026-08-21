import { DemandeIntervention, Machine, Intervention, PlanningItem, Lot, Client } from '../lib/supabase';

// ============================================
// FONCTIONS DE CALCUL DE SEMAINE - ISO 8601
// ============================================

/**
 * Calcule le numéro de semaine ISO 8601 d'une date
 * Selon ISO 8601, la semaine 1 est la première semaine qui contient au moins 4 jours dans la nouvelle année
 */
export function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const jan4 = new Date(target.getFullYear(), 0, 4);
  const dayDiff = (target.valueOf() - jan4.valueOf()) / 86400000;
  return 1 + Math.ceil(dayDiff / 7);
}

/**
 * Obtient l'année ISO d'une date (peut différer de l'année calendaire)
 */
export function getISOYear(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  return target.getFullYear();
}

/**
 * Obtient le lundi d'une date donnée
 */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Obtient le jeudi d'une semaine (milieu de la semaine ISO pour déterminer le mois)
 */
function getThursday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -3 : 4);
  return new Date(d.setDate(diff));
}

/**
 * Obtient le lundi de la semaine ISO pour une année et un numéro de semaine donnés
 */
export function getStartOfISOWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const mondayOfWeek1 = new Date(year, 0, 4 - jan4Day);
  const targetMonday = new Date(mondayOfWeek1);
  targetMonday.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
  return targetMonday;
}

// ============================================
// GÉNÉRATION DES SEMAINES POUR L'AFFICHAGE
// ============================================

/**
 * Génère toutes les semaines d'une année avec numéros ISO 8601
 * et affichage des noms de mois
 */
export function generateWeeks(year: number) {
  const weeks = [];

  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
                      'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const mondayOfWeek1 = new Date(year, 0, 4 - jan4Day);

  const dec28 = new Date(year, 11, 28);
  const lastWeekNum = getWeekNumber(dec28);
  const totalWeeks = lastWeekNum >= 52 ? lastWeekNum : 52;

  for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
    const monday = getStartOfISOWeek(year, weekNum);

    const isoYear = getISOYear(monday);
    if (isoYear !== year) continue;

    const thursday = getThursday(monday);
    const monthIndex = thursday.getMonth();

    weeks.push({
      number: weekNum,
      startDate: new Date(monday),
      month: monthIndex,
      label: `S${weekNum}`,
      displayDate: monthNames[monthIndex]
    });
  }

  return weeks;
}

// ============================================
// CALCUL DES OCCURRENCES
// ============================================

/**
 * Calcule les numéros de semaine ISO 8601 pour une gamme de maintenance
 */

export function calculateOccurrences(startDate: string, gamme: string | null, targetYear: number): number[] {
  if (!gamme || !startDate) {
    console.warn('⚠️ calculateOccurrences: gamme ou startDate manquant');
    return [];
  }

  const weeks: number[] = [];
  const start = new Date(startDate);
  
  // Validation de la date
  if (isNaN(start.getTime())) {
    console.warn('⚠️ calculateOccurrences: date invalide', startDate);
    return [];
  }

  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd = new Date(targetYear, 11, 31);

  let currentDate = new Date(start);
  let iterations = 0;
  const MAX_ITERATIONS = 1000; // Protection contre boucle infinie

  // Avancer jusqu'au début de l'année cible
  while (currentDate < yearStart && iterations < MAX_ITERATIONS) {
    iterations++;
    switch (gamme) {
      case 'hebdomadaire':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'mensuel':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'trimestriel':
        currentDate.setMonth(currentDate.getMonth() + 3);
        break;
      case 'semestriel':
        currentDate.setMonth(currentDate.getMonth() + 6);
        break;
      case 'annuel':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
      default:
        console.warn('⚠️ Gamme inconnue:', gamme);
        return [];
    }
  }

  if (iterations >= MAX_ITERATIONS) {
    console.error('❌ calculateOccurrences: trop d\'itérations (boucle infinie évitée)');
    return [];
  }

  // Calculer les occurrences dans l'année
  iterations = 0;
  while (currentDate <= yearEnd && iterations < MAX_ITERATIONS) {
    iterations++;
    const isoYear = getISOYear(currentDate);

    if (isoYear === targetYear) {
      const weekNum = getWeekNumber(currentDate);
      if (weekNum >= 1 && weekNum <= 53) {
        weeks.push(weekNum);
      }
    }

    switch (gamme) {
      case 'hebdomadaire':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'mensuel':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'trimestriel':
        currentDate.setMonth(currentDate.getMonth() + 3);
        break;
      case 'semestriel':
        currentDate.setMonth(currentDate.getMonth() + 6);
        break;
      case 'annuel':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
    }
  }

  if (iterations >= MAX_ITERATIONS) {
    console.error('❌ calculateOccurrences: trop d\'itérations dans l\'année');
  }

  return [...new Set(weeks)].sort((a, b) => a - b);
}

// ============================================
// GÉNÉRATION DU PLANNING
// ============================================

/**
 * Génère les items de planning à partir des demandes d'intervention
 * Utilise getWeekNumber() pour garantir la cohérence ISO 8601
 */
export function generatePlanningFromDemandes(
  demandes: DemandeIntervention[],
  machinesList: Machine[],
  interventionsList: Intervention[],
  year: number
): PlanningItem[] {
  const planningMap = new Map<string, PlanningItem>();

  demandes
    .filter(d => d.type_intervention === 'preventive' && d.gamme)
    .forEach(demande => {
      const machine = machinesList.find(m => m.id === demande.machine_id);
      if (!machine) return;

      const key = `${machine.id}_${demande.gamme}`;

      if (!planningMap.has(key)) {
        planningMap.set(key, {
          id: `plan_${machine.id}_${demande.gamme}`,
          lot_id: machine.lot_id,
          machine_id: machine.id,
          nom: demande.label,
          gamme: demande.gamme || '',
          hebdomadaire: demande.gamme === 'hebdomadaire',
          mensuel: demande.gamme === 'mensuel',
          trimestriel: demande.gamme === 'trimestriel',
          semestriel: demande.gamme === 'semestriel',
          annuelle: demande.gamme === 'annuel',
          weeks: {},
          interventions: {},
          machine: machine,
        });
      }

      const plan = planningMap.get(key)!;
      
      // Calculer les semaines planifiées avec ISO 8601
      const weekNumbers = calculateOccurrences(demande.date_intervention, demande.gamme, year);

      weekNumbers.forEach(weekNum => {
        plan.weeks[weekNum] = true;
      });

      const demandeInterventions = interventionsList.filter(
        int => int.demande_id === demande.id
      );

      demandeInterventions.forEach(intervention => {
        const interventionDate = new Date(intervention.date_intervention);
        const isoYear = getISOYear(interventionDate);

        if (isoYear === year) {
          const weekNum = getWeekNumber(interventionDate);

          if (weekNum >= 1 && weekNum <= 53) {
            if (!plan.interventions[weekNum]) {
              plan.interventions[weekNum] = [];
            }
            plan.interventions[weekNum].push({
              id: intervention.id,
              status: intervention.status,
              date: intervention.date_intervention
            });
          }
        }
      });
    });

  return Array.from(planningMap.values());
}

// ============================================
// UTILITAIRES POUR L'AFFICHAGE
// ============================================

/**
 * Obtient les semaines à afficher selon le mode et les données
 */
export function getWeeksForGamme(
  year: number, 
  planningData: PlanningItem[], 
  viewMode: 'month' | 'year' = 'year',
  selectedMonth?: number
) {
  const allWeeks = generateWeeks(year);
  
  // Filtrer par mois si le mode est 'month'
  let weeks = allWeeks;
  if (viewMode === 'month' && selectedMonth !== undefined) {
    weeks = allWeeks.filter(w => w.month === selectedMonth);
  }
  
  // Récupérer toutes les semaines qui ont soit une planification soit une intervention
  const usedWeeks = new Set<number>();
  
  planningData.forEach(plan => {
    // Vérifier les semaines planifiées
    if (plan.weeks) {
      Object.keys(plan.weeks).forEach(weekStr => {
        const weekNum = parseInt(weekStr);
        if (plan.weeks[weekNum]) {
          usedWeeks.add(weekNum);
        }
      });
    }
    
    // Vérifier les interventions
    if (plan.interventions) {
      Object.keys(plan.interventions).forEach(weekStr => {
        const weekNum = parseInt(weekStr);
        if (plan.interventions[weekNum] && plan.interventions[weekNum].length > 0) {
          usedWeeks.add(weekNum);
        }
      });
    }
  });
  
  // Si en mode mois, retourner toutes les semaines du mois même si non utilisées
  if (viewMode === 'month' && selectedMonth !== undefined) {
    return weeks;
  }
  
  // En mode année, si aucune semaine n'est utilisée, retourner toutes les semaines
  if (usedWeeks.size === 0) return weeks;
  
  // Retourner les semaines utilisées
  return weeks.filter(w => usedWeeks.has(w.number));
}

// ============================================
// EXPORT EXCEL
// ============================================

export const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Groupe les semaines par mois pour l'en-tête Excel
 */
function getMonthHeaders(weeks: any[], year: number) {
  const monthsMap: { [key: string]: { name: string; count: number } } = {};
  
  weeks.forEach(week => {
    const monthName = MONTHS[week.month];
    
    if (!monthsMap[monthName]) {
      monthsMap[monthName] = { name: monthName, count: 0 };
    }
    monthsMap[monthName].count++;
  });
  
  return Object.values(monthsMap);
}

/**
 * Export du planning vers Excel
 */
export function exportToExcel(
  planningData: PlanningItem[],
  lots: Lot[],
  machines: Machine[],
  clients: Client[],
  currentYear: number,
  filterGamme: string = 'all',
  viewMode: 'month' | 'year' = 'year',
  selectedMonth?: number
) {
  const weeks = getWeeksForGamme(currentYear, planningData, viewMode, selectedMonth);
  console.log("🚀 ~ exportToExcel ~ weeks:", weeks);

  // Grouper les semaines par mois pour l'en-tête
  const monthHeaders = getMonthHeaders(weeks, currentYear);

  // Déterminer le titre selon le mode
  let periodText = `Année : ${currentYear}`;
  if (viewMode === 'month' && selectedMonth !== undefined) {
    periodText = `${MONTHS[selectedMonth]} ${currentYear}`;
  }

  // Créer le contenu HTML avec styles
  let html = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          table { 
            border-collapse: collapse; 
            font-family: Arial, sans-serif; 
            font-size: 11px;
            width: 100%;
          }
          .title { 
            font-size: 16px; 
            font-weight: bold; 
            text-align: center; 
            padding: 10px;
            background-color: #f15c00;
            color: white;
          }
          .subtitle { 
            font-size: 12px; 
            text-align: center; 
            padding: 5px;
            background-color: #fef3f0;
            color: #f15c00;
            font-weight: bold;
          }
          th { 
            background-color: #f8f9fa; 
            border: 1px solid #dee2e6; 
            padding: 8px;
            font-weight: bold;
            text-align: center;
            color: #495057;
          }
          th.header-main {
            background-color: #343a40;
            color: white;
          }
          th.month-header {
            background-color: #f15c00;
            color: white;
            font-size: 12px;
          }
          td { 
            border: 1px solid #dee2e6; 
            padding: 6px;
            text-align: center;
          }
          td.text-left {
            text-align: left;
          }
          tr:nth-child(even) { 
            background-color: #f8f9fa; 
          }
          tr:hover {
            background-color: #fef3f0;
          }
          .gamme-cell {
            font-weight: bold;
            color: #f15c00;
          }
          .x-mark {
            color: #28a745;
            font-weight: bold;
            font-size: 14px;
          }
          .client-cell {
            color: #0066cc;
            font-weight: 600;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th colspan="${8 + weeks.length}" class="title">
                Planning des visites préventives
              </th>
            </tr>
            <tr>
              <th colspan="${8 + weeks.length}" class="subtitle">
                ${periodText} | Fréquence : ${filterGamme === 'all' ? 'Toutes' : filterGamme}
              </th>
            </tr>
            <tr>
              <th colspan="8" class="header-main"></th>
              ${monthHeaders.map(month => 
                `<th colspan="${month.count}" class="month-header">${month.name}</th>`
              ).join('')}
            </tr>
            <tr>
              <th class="header-main">LOT</th>
              <th class="header-main">Client</th>
              <th class="header-main">Equipment</th>
              <th class="header-main">Hebdo.</th>
              <th class="header-main">Mens.</th>
              <th class="header-main">Trim.</th>
              <th class="header-main">Semes.</th>
              <th class="header-main">Annuel</th>
              ${weeks.map(w => `<th>${w.label}</th>`).join('')}
            </tr>
            <tr>
              <th colspan="8"></th>
              ${weeks.map(w => `<th>${w.displayDate}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
  `;

  // Filtrer les données de planning
  const weekNumbers = new Set(weeks.map(w => w.number));
  const relevantPlanning = planningData.filter(plan => {
    if (viewMode === 'month') {
      return weeks.some(w => {
        const isPlanned = plan.weeks?.[w.number];
        const hasInterventions = (plan.interventions?.[w.number] || []).length > 0;
        return isPlanned || hasInterventions;
      });
    }
    
    return weeks.some(w => {
      const isPlanned = plan.weeks?.[w.number];
      const hasInterventions = (plan.interventions?.[w.number] || []).length > 0;
      return isPlanned || hasInterventions;
    });
  });

  relevantPlanning.forEach(plan => {
    const lot = lots.find(l => l.id === plan.lot_id);
    const machine = machines.find(m => m.id === plan.machine_id);
    const client = machine?.client || clients.find(c => c.id === machine?.client_id);

    html += '<tr>';
    html += `<td class="text-left">${lot?.nom || ''}</td>`;
    html += `<td class="text-left client-cell">${client?.raison_sociale || '-'}</td>`;
    html += `<td class="text-left">${machine?.nom || ''}</td>`;
    html += `<td>${plan.hebdomadaire ? '<span class="x-mark">✓</span>' : ''}</td>`;
    html += `<td>${plan.mensuel ? '<span class="x-mark">✓</span>' : ''}</td>`;
    html += `<td>${plan.trimestriel ? '<span class="x-mark">✓</span>' : ''}</td>`;
    html += `<td>${plan.semestriel ? '<span class="x-mark">✓</span>' : ''}</td>`;
    html += `<td>${plan.annuelle ? '<span class="x-mark">✓</span>' : ''}</td>`;

    weeks.forEach(w => {
      const isPlanned = plan.weeks?.[w.number];
      const interventions = plan.interventions?.[w.number] || [];
      const hasApproved = interventions.some(i => i.status === 'approved');
      
      if (hasApproved) {
        html += `<td><span class="x-mark">✓</span></td>`;
      } else if (isPlanned) {
        html += `<td style="color: #6b7280; font-weight: normal;">P</td>`;
      } else {
        html += `<td></td>`;
      }
    });

    html += '</tr>';
  });

  html += `
          </tbody>
        </table>
      </body>
    </html>
  `;

  // Téléchargement avec nom de fichier adapté
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  
  let filename = `planning-visites-preventives-${filterGamme}`;
  if (viewMode === 'month' && selectedMonth !== undefined) {
    filename += `-${MONTHS[selectedMonth]}-${currentYear}`;
  } else {
    filename += `-${currentYear}`;
  }
  filename += '.xls';
  
  a.download = filename;
  a.click();
}