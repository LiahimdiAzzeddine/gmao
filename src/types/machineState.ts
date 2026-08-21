/**
 * États possibles pour une machine
 */
export enum MachineState {
  EN_SERVICE = 'En service',
  EN_PANNE = 'En panne',
  HORS_SERVICE = 'Hors service'
}

/**
 * Configuration d'affichage pour chaque état
 */
export const MACHINE_STATE_CONFIG = {
  [MachineState.EN_SERVICE]: {
    label: 'En service',
    icon: '✓',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-100',
    activeBg: 'bg-green-600',
    description: 'Machine opérationnelle et en production'
  },
  [MachineState.EN_PANNE]: {
    label: 'En panne',
    icon: '✕',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    dotColor: 'bg-red-500',
    hoverBg: 'hover:bg-red-100',
    activeBg: 'bg-red-600',
    description: 'Machine en panne nécessitant une intervention'
  },
  [MachineState.HORS_SERVICE]: {
    label: 'Hors service',
    icon: '⊗',
    color: 'slate',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-200',
    dotColor: 'bg-slate-500',
    hoverBg: 'hover:bg-slate-100',
    activeBg: 'bg-slate-600',
    description: 'Machine définitivement hors service'
  }
} as const;

/**
 * Liste de tous les états disponibles
 */
export const ALL_MACHINE_STATES = Object.values(MachineState);

const LEGACY_MACHINE_STATE_MAP: Record<string, MachineState> = {
  opérationnel: MachineState.EN_SERVICE,
  operationnel: MachineState.EN_SERVICE,
  normal: MachineState.EN_SERVICE,
  "à l'arrêt": MachineState.HORS_SERVICE,
  "a l'arret": MachineState.HORS_SERVICE,
  consigné: MachineState.HORS_SERVICE,
  consigne: MachineState.HORS_SERVICE,
  maintenance: MachineState.HORS_SERVICE,
  dégradé: MachineState.EN_PANNE,
  degrade: MachineState.EN_PANNE,
  hors_service: MachineState.HORS_SERVICE,
  'hors service': MachineState.HORS_SERVICE,
};

/**
 * Obtenir la configuration d'un état
 */
export function getMachineStateConfig(state: string) {
  const normalizedState = normalizeMachineState(state);
  return MACHINE_STATE_CONFIG[normalizedState];
}

/**
 * Vérifier si un état est valide
 */
export function isValidMachineState(state: string): state is MachineState {
  return ALL_MACHINE_STATES.includes(state as MachineState);
}

/**
 * Convertir les anciens états DB/UI vers les 3 états applicatifs.
 */
export function normalizeMachineState(state: string | null | undefined): MachineState {
  if (!state) return MachineState.HORS_SERVICE;
  if (ALL_MACHINE_STATES.includes(state as MachineState)) return state as MachineState;

  const normalized = state
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return LEGACY_MACHINE_STATE_MAP[state.toLowerCase()] ||
    LEGACY_MACHINE_STATE_MAP[normalized] ||
    MachineState.HORS_SERVICE;
}
