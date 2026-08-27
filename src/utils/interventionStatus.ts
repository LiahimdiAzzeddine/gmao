export type InterventionValidationScope = 'admin' | 'client';

export type InterventionValidationConfig = {
  label: string;
  className: string;
  validated: boolean;
};

const VALIDATED_CLASS = 'bg-emerald-100 text-emerald-800 border-emerald-200';
const PENDING_CLASS = 'bg-amber-100 text-amber-800 border-amber-200';

export function getInterventionValidationConfig(
  validated: boolean | null | undefined,
  scope: InterventionValidationScope,
): InterventionValidationConfig {
  const isValidated = validated === true;

  return {
    validated: isValidated,
    label: isValidated
      ? scope === 'admin' ? 'Validée par admin' : 'Validée par client'
      : scope === 'admin' ? 'En attente admin' : 'En attente client',
    className: isValidated ? VALIDATED_CLASS : PENDING_CLASS,
  };
}

export function getInterventionValidationLabel(
  validated: boolean | null | undefined,
  scope: InterventionValidationScope,
): string {
  return getInterventionValidationConfig(validated, scope).label;
}
