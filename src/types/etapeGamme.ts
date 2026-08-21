/**
 * Statuts possibles pour une étape de gamme
 */
export enum StatutEtapeGamme {
  CONFORME = 'Conforme',
  REPORTE = 'Reporté/Replanification',
  ACTION_CORRECTIVE = 'Action corrective requise'
}

/**
 * Configuration d'affichage pour chaque statut
 */
export const STATUT_ETAPE_CONFIG = {
  [StatutEtapeGamme.CONFORME]: {
    label: 'Conforme',
    icon: '✓',
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    badgeColor: 'bg-green-100 text-green-800 border-green-200',
    description: 'Étape réalisée conformément aux spécifications'
  },
  [StatutEtapeGamme.REPORTE]: {
    label: 'Reporté/Replanification',
    icon: '📅',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Étape reportée, nécessite une replanification'
  },
  [StatutEtapeGamme.ACTION_CORRECTIVE]: {
    label: 'Action corrective requise',
    icon: '🔧',
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    badgeColor: 'bg-red-100 text-red-800 border-red-200',
    description: 'Action corrective nécessaire (non-conformité détectée)'
  }
} as const;

/**
 * Liste de tous les statuts disponibles
 */
export const ALL_STATUTS_ETAPE = Object.values(StatutEtapeGamme);

/**
 * Obtenir la configuration d'un statut
 */
export function getStatutEtapeConfig(statut: string) {
  return STATUT_ETAPE_CONFIG[statut as StatutEtapeGamme] || STATUT_ETAPE_CONFIG[StatutEtapeGamme.CONFORME];
}

/**
 * Vérifier si un statut est valide
 */
export function isValidStatutEtape(statut: string): statut is StatutEtapeGamme {
  return ALL_STATUTS_ETAPE.includes(statut as StatutEtapeGamme);
}

/**
 * Interface pour une étape de gamme
 */
export interface EtapeGamme {
  etape_id: string;
  ordre: number;
  description: string;
  statut: StatutEtapeGamme;
  commentaire: string;
}
