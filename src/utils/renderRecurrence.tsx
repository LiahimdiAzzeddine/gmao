import React from 'react';
import { PlanMaintenanceDetail } from '../types/ot';


export function renderRecurrence(plan: PlanMaintenanceDetail): string {
  const intervalle = plan.intervalle ?? 1

  switch (plan.type_recurrence) {

    /* ================= JOURNALIÈRE ================= */
    case 'journalière': {
      if (intervalle === 1) {
        return 'S1 – Quotidienne'
      }
      return `S1/${intervalle} – Tous les ${intervalle} jours`
    }

    /* ================= HEBDOMADAIRE ================= */
    case 'hebdomadaire': {
      const weeks = intervalle
      const code = `S${String(weeks).padStart(2, '0')}`

      const labels: Record<number, string> = {
        1: 'Hebdomadaire',
        2: 'Quinzaine',
        4: 'Mensuelle',
        8: 'Bimestrielle',
        12: 'Trimestrielle',
        24: 'Semestrielle',
        52: 'Annuelle'
      }

      const label = labels[weeks] ?? `Toutes les ${weeks} semaines`
      return `${code} – ${label}`
    }

    /* ================= MENSUELLE ================= */
    case 'mensuelle': {
      const months = intervalle
      const weeks = months * 4
      const code = `S${String(weeks).padStart(2, '0')}`

      const labels: Record<number, string> = {
        1: 'Mensuelle',
        2: 'Bimestrielle',
        3: 'Trimestrielle',
        6: 'Semestrielle',
        12: 'Annuelle'
      }

      let label = labels[months] ?? `Tous les ${months} mois`

      if (plan.semaine_du_mois) {
        label += ` (semaine ${plan.semaine_du_mois})`
      }

      return `${code} – ${label}`
    }

    /* ================= ANNUELLE ================= */
    case 'annuelle': {
      const years = intervalle
      const code = `A${String(years).padStart(2, '0')}`

      const labels: Record<number, string> = {
        1: 'Annuelle',
        2: 'Bisannuelle',
        3: 'Triennale',
        5: 'Quinquennale',
        10: 'Décennale'
      }

      const label = labels[years] ?? `Tous les ${years} ans`
      return `${code} – ${label}`
    }

    default:
      return 'Non défini'
  }
}

