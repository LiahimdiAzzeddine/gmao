import { supabase } from '../lib/supabase';
import type { PlanActionFormData } from '../components/PlanActionValidationModal';
import { StatutEtapeGamme } from '../types/etapeGamme';

type CheckedStep = {
  ordre?: number;
  description?: string;
  commentaire?: string;
  statut?: string;
};

type FollowupInput = {
  interventionId: string;
  parentOtNumber?: number | string | null;
  interventionDate?: string | null;
  steps: CheckedStep[];
  createReplanification: boolean;
  replanificationDate: Date;
  replanificationReason: string;
  createCorrective: boolean;
  correctiveDate: string;
  correctivePriority: string;
  correctiveObservations: string;
  planAction?: PlanActionFormData;
};

export type FollowupResult = {
  replan_id: string | null;
  replan_numot: number | null;
  corrective_id: string | null;
  corrective_numot: number | null;
};

export async function createInterventionFollowup(input: FollowupInput): Promise<FollowupResult> {
  const reported = input.steps.filter((step) => step.statut === StatutEtapeGamme.REPORTE);
  const compliant = input.steps.filter((step) => step.statut === StatutEtapeGamme.CONFORME);
  const nonCompliant = input.steps.filter((step) => step.statut === StatutEtapeGamme.ACTION_CORRECTIVE);

  if (input.createCorrective && !input.planAction?.failure_mode_id) {
    throw new Error('Sélectionnez un mode de défaillance dans le catalogue.');
  }

  const interventionLabel = input.interventionDate
    ? new Date(input.interventionDate).toLocaleDateString('fr-FR')
    : 'date inconnue';
  const correctiveDetails = nonCompliant.map((step, index) => {
    const comment = step.commentaire ? ` — ${step.commentaire}` : '';
    return `${index + 1}. Étape ${step.ordre ?? '-'} : ${step.description || 'Non-conformité'}${comment}`;
  }).join('\n');
  const correctiveDescription = [
    `Suite à l'intervention préventive (OT #${input.parentOtNumber ?? '-'}), ${nonCompliant.length} non-conformité(s) détectée(s) :`,
    correctiveDetails,
    input.correctiveObservations.trim() ? `Observations admin : ${input.correctiveObservations.trim()}` : '',
  ].filter(Boolean).join('\n\n');

  const planAction = input.planAction;
  const { data, error } = await supabase.rpc('finalize_intervention_followup', {
    p_intervention_id: input.interventionId,
    p_create_replan: input.createReplanification,
    p_replan: {
      date_programmee: input.replanificationDate.toISOString(),
      raison: input.replanificationReason || `Replanification de ${reported.length} étape(s) reportée(s)`,
      observations: `Replanification suite à l'intervention du ${interventionLabel}. Étapes à refaire : ${reported.map((step) => step.ordre).join(', ')}`,
      etapes_reportees: reported,
      etapes_deja_faites: compliant,
    },
    p_create_corrective: input.createCorrective,
    p_corrective: {
      date_programmee: input.correctiveDate,
      priorite: input.correctivePriority,
      observations: correctiveDescription,
      etapes_non_conformes: nonCompliant,
      failure_mode_id: planAction?.failure_mode_id,
      action_recommandee: planAction?.action_recommandee,
      gravite_libelle: planAction?.gravite_libelle,
      gravite_classe: planAction?.gravite_classe,
      occurrence_libelle: planAction?.occurrence_libelle,
      occurrence_classe: planAction?.occurrence_classe,
      detectabilite_libelle: planAction?.detectabilite_libelle,
      detectabilite_classe: planAction?.detectabilite_classe,
      rpn: planAction ? planAction.gravite_classe * planAction.occurrence_classe * planAction.detectabilite_classe : null,
      date_expression: planAction?.date_expression,
    },
  });

  if (error) throw error;
  return data as FollowupResult;
}
