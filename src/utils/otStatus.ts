export const OT_STATUS_VALUES = [
  'prévu',
  'en_cours',
  'terminé',
  'clôturé_avec_anomalie',
  'annulé',
] as const;

export type OtStatus = typeof OT_STATUS_VALUES[number];

export const OT_STATUS_OPTIONS: ReadonlyArray<{ value: OtStatus; label: string }> = [
  { value: 'prévu', label: 'À faire' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'terminé', label: 'Clôturé' },
  { value: 'clôturé_avec_anomalie', label: 'Clôturé avec anomalie' },
  { value: 'annulé', label: 'Annulé' },
];

const STATUS_ALIASES: Record<string, OtStatus> = {
  prevu: 'prévu',
  a_faire: 'prévu',
  en_cours: 'en_cours',
  termine: 'terminé',
  cloture: 'terminé',
  cloture_avec_anomalie: 'clôturé_avec_anomalie',
  annule: 'annulé',
};

export function normalizeOtStatus(status?: string | null): OtStatus | null {
  if (!status) return null;

  const normalized = status
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  return STATUS_ALIASES[normalized] || null;
}

export function getOtStatusLabel(status?: string | null): string {
  const normalized = normalizeOtStatus(status);
  if (!normalized) return status?.trim() || 'Inconnu';
  return OT_STATUS_OPTIONS.find((option) => option.value === normalized)?.label || 'Inconnu';
}

export function isOtClosed(status?: string | null): boolean {
  const normalized = normalizeOtStatus(status);
  return normalized === 'terminé' || normalized === 'clôturé_avec_anomalie';
}
