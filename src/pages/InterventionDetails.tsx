import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, User, Wrench, CheckCircle, XCircle, 
  AlertCircle, Edit, FileText, Image as ImageIcon, Loader2, MapPin 
} from 'lucide-react';
import { MachineState, getMachineStateConfig } from '../types/machineState';
import { StatutEtapeGamme } from '../types/etapeGamme';
import { StatutIcon } from '../components/StatutIcon';
import ReplanificationModal from '../components/ReplanificationModal';
import CorrectifModal from '../components/CorrectifModal';
import DualActionModal from '../components/DualActionModal';
import PlanActionValidationModal, { PlanActionFormData } from '../components/PlanActionValidationModal';

interface Intervention {
  id: string;
  ordre_travail_id: string;
  machine_id: string;
  technicien_id: string;
  date_debut: string;
  date_fin: string | null;
  duree_minutes: number | null;
  resultat: 'réussi' | 'partiel' | 'échec' | null;
  etat_machine_apres: MachineState;
  pieces_remplacees: any[];
  etapes_gamme_checkees: any[];
  image_avant_urls: string[];
  image_apres_urls: string[];
  commentaire: string | null;
  valide: boolean;
  valide_par: string | null;
  valide_le: string | null;
  client_valide: boolean;
  commentaire_client: string | null;
  created_at: string;
  updated_at: string;
  ordre_travail: {
    id: string;
    numot: number;
    type: string;
    statut: string;
    date_programmee: string;
    plan_id?: string | null;
    ot_parent_id?: string | null;
    intervention_source_id?: string | null;
    machine: {
      id: string;
      nom: string;
      modele: string;
      numero_serie: string;
      localisation: string;
      lot?: {
        id: string;
        nom: string;
        code: string;
      } | null;
      client: {
        id: string;
        raison_sociale: string;
        prenom: string;
      } | null;
    };
    plan: {
      type: string;
      gamme: {
        nom: string;
        type: string;
      } | null;
    } | null;
  };
  technicien: {
    id: string;
    nom: string;
  };
  validateur: {
    id: string;
    nom: string;
  } | null;
}

const InterventionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isClientInterventionDetails = location.pathname.startsWith('/mes-interventions');
  const backPath = isClientInterventionDetails ? '/mes-interventions' : '/admin/interventions';
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationAction, setValidationAction] = useState<'validate' | 'invalidate'>('validate');
  
  // États pour les modals de création d'OT
  const [showReplanificationModal, setShowReplanificationModal] = useState(false);
  const [showCorrectifModal, setShowCorrectifModal] = useState(false);
  const [showDualActionModal, setShowDualActionModal] = useState(false);
  const [showPlanActionModal, setShowPlanActionModal] = useState(false);
  const [selectedInterventionForReplan, setSelectedInterventionForReplan] = useState<Intervention | null>(null);
  const [selectedInterventionForOT, setSelectedInterventionForOT] = useState<Intervention | null>(null);
  const [selectedInterventionForPlanAction, setSelectedInterventionForPlanAction] = useState<any | null>(null);

  useEffect(() => {
    if (id) {
      fetchIntervention();
    }
  }, [id]);

  const fetchIntervention = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('interventions')
        .select(`
          *,
          ordre_travail:ordres_travail!interventions_ot_fkey(
            id,
            numot,
            type,
            statut,
            date_programmee,
            machine:machines(
              id,
              nom,
              modele,
              numero_serie,
              localisation,
              client:clients(
                id,
                raison_sociale,
                prenom
              )
            ),
            plan:plans_maintenance(
              type,
              gamme:gammes_maintenance(
                nom,
                type
              )
            )
          ),
          technicien:profiles!interventions_technicien_fkey(
            id,
            nom
          ),
          validateur:profiles!interventions_valide_par_fkey(
            id,
            nom
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Intervention non trouvée');

      setIntervention(data);
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuree = (minutes: number | null): string => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const getResultatColor = (resultat: string | null): string => {
    // Use neutral styling to avoid strong colors
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  const getResultatIcon = (resultat: string | null) => {
    // Neutral icons for less colorful UI
    return <AlertCircle size={20} className="text-slate-600" />;
  };

  const getStatutOTLabel = (statut: string): string => {
    switch (statut) {
      case 'prévu': return 'Prévu';
      case 'en_cours': return 'En cours';
      case 'terminé': return 'Clôturé';
      case 'annulé': return 'Annulé';
      case 'clôturé_avec_anomalie': return 'Clôturé avec anomalie';
      default: return statut.replace('_', ' ');
    }
  };

  const isCorrectiveChildIntervention = (interventionData: any): boolean => {
    return interventionData?.ordre_travail?.type === 'correctif' &&
      Boolean(interventionData?.ordre_travail?.ot_parent_id || interventionData?.ordre_travail?.intervention_source_id);
  };

  const buildPlanActionPayload = (data: PlanActionFormData) => ({
    lot_defaillance: data.lot_defaillance.trim(),
    famille_probleme: data.famille_probleme.trim(),
    mode_defaillance: data.mode_defaillance.trim(),
    action_recommandee: data.action_recommandee.trim(),
    gravite_libelle: data.gravite_libelle.trim() || null,
    gravite_classe: data.gravite_classe,
    occurrence_libelle: data.occurrence_libelle.trim() || null,
    occurrence_classe: data.occurrence_classe,
    detectabilite_libelle: data.detectabilite_libelle.trim() || null,
    detectabilite_classe: data.detectabilite_classe,
    rpn: data.gravite_classe * data.occurrence_classe * data.detectabilite_classe,
    date_expression: data.date_expression || null,
    action_cloturee: data.action_cloturee,
    date_cloture_action: data.date_cloture_action || null,
    observation_resultat: data.observation_resultat.trim() || null
  });

  // Les champs de cloture ci-dessus appartiennent a l'intervention et ne sont
  // pas presents dans ordres_travail. Ce payload doit rester identique a celui
  // utilise par la table des interventions lors de la creation d'un OT correctif.
  const buildCorrectiveOTPlanActionPayload = (data: PlanActionFormData) => ({
    lot_defaillance: data.lot_defaillance.trim(),
    famille_probleme: data.famille_probleme.trim(),
    mode_defaillance: data.mode_defaillance.trim(),
    action_recommandee: data.action_recommandee.trim(),
    gravite_libelle: data.gravite_libelle.trim() || null,
    gravite_classe: data.gravite_classe,
    occurrence_libelle: data.occurrence_libelle.trim() || null,
    occurrence_classe: data.occurrence_classe,
    detectabilite_libelle: data.detectabilite_libelle.trim() || null,
    detectabilite_classe: data.detectabilite_classe,
    rpn: data.gravite_classe * data.occurrence_classe * data.detectabilite_classe,
    date_expression: data.date_expression || null
  });

  const handleValidation = async (valide: boolean) => {
    if (!intervention) return;

    setValidating(true);
    try {
      // 1. Récupérer l'intervention complète
      const { data: interventionData, error: fetchError } = await supabase
        .from("interventions")
        .select(`
          *,
          ordre_travail:ordres_travail!interventions_ot_fkey(
            *,
            machine:machines(
              *,
              lot:lots(
                id,
                nom,
                code
              )
            ),
            plan:plans_maintenance(
              *,
              gamme:gammes_maintenance(
                *,
                etapes_gamme(*)
              )
            )
          )
        `)
        .eq("id", intervention.id)
        .single();

      if (fetchError) throw fetchError;

      // 2. Vérifier s'il y a des étapes reportées ET/OU des non-conformités
      if (valide) {
        const etapesReportees = interventionData.etapes_gamme_checkees?.filter((etape: any) => 
          etape.statut === StatutEtapeGamme.REPORTE
        ) || [];

        const etapesNonConformes = interventionData.etapes_gamme_checkees?.filter((etape: any) => 
          etape.statut === StatutEtapeGamme.ACTION_CORRECTIVE
        ) || [];

        // CAS 1: Étapes reportées ET non-conformités
        if (etapesReportees.length > 0 && etapesNonConformes.length > 0) {
          // Récupérer le plan_id
          const { data: otData } = await supabase
            .from('ordres_travail')
            .select('plan_id')
            .eq('id', interventionData.ordre_travail_id)
            .single();
          
          const interventionAvecPlanId = {
            ...interventionData,
            ordre_travail: {
              ...interventionData.ordre_travail,
              plan_id: otData?.plan_id
            }
          };
          
          // Afficher un modal spécial pour gérer les deux cas
          setSelectedInterventionForReplan(interventionAvecPlanId as Intervention);
          setSelectedInterventionForOT(interventionAvecPlanId as Intervention);
          setShowDualActionModal(true);
          setValidating(false);
          setShowValidationDialog(false);
          return;
        }
        
        // CAS 2: Seulement des étapes reportées
        if (etapesReportees.length > 0) {
          const { data: otData } = await supabase
            .from('ordres_travail')
            .select('plan_id')
            .eq('id', interventionData.ordre_travail_id)
            .single();
          
          const interventionAvecPlanId = {
            ...interventionData,
            ordre_travail: {
              ...interventionData.ordre_travail,
              plan_id: otData?.plan_id
            }
          };
          
          // Afficher le modal de replanification
          setSelectedInterventionForReplan(interventionAvecPlanId as Intervention);
          setShowReplanificationModal(true);
          setValidating(false);
          setShowValidationDialog(false);
          return;
        }
        
        // CAS 3: Seulement des non-conformités
        if (etapesNonConformes.length > 0) {
          const { data: otData } = await supabase
            .from('ordres_travail')
            .select('plan_id')
            .eq('id', interventionData.ordre_travail_id)
            .single();
          
          const interventionAvecPlanId = {
            ...interventionData,
            ordre_travail: {
              ...interventionData.ordre_travail,
              plan_id: otData?.plan_id
            }
          };
          
          // Afficher le modal correctif
          setSelectedInterventionForOT(interventionAvecPlanId as Intervention);
          setShowCorrectifModal(true);
          setValidating(false);
          setShowValidationDialog(false);
          return;
        }
      }

      // 3. Mettre à jour l'intervention (cas normal sans étapes problématiques)
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("interventions")
        .update({ 
          valide: valide,
          valide_par: valide ? user?.id : null,
          valide_le: valide ? new Date().toISOString() : null
        })
        .eq("id", intervention.id);

      if (error) throw error;

      // 4. Si validation = true, mettre à jour l'état de la machine
      if (valide && interventionData?.machine_id && interventionData?.etat_machine_apres) {
        const { error: machineError } = await supabase
          .from("machines")
          .update({ etat: interventionData.etat_machine_apres })
          .eq("id", interventionData.machine_id);

        if (machineError) {
          console.error("Erreur lors de la mise à jour de l'état de la machine:", machineError);
        }
      }

      // 5. Mettre à jour le statut de l'ordre de travail
      let nouveauStatut = 'en_cours'; // Par défaut pour dévalidation
      
      if (interventionData?.ordre_travail_id) {
        if (valide) {
          // Vérifier si toutes les étapes de gamme sont conformes
          const etapesGamme = interventionData.etapes_gamme_checkees || [];
          const toutesConformes = etapesGamme.length === 0 || 
            etapesGamme.every((etape: any) => etape.statut === StatutEtapeGamme.CONFORME);

          nouveauStatut = toutesConformes ? 'terminé' : 'clôturé_avec_anomalie';
        }
        
        const { error: otError } = await supabase
          .from("ordres_travail")
          .update({ 
            statut: nouveauStatut
          })
          .eq("id", interventionData.ordre_travail_id);

        if (otError) {
          console.error("Erreur lors de la mise à jour du statut de l'OT:", otError);
        }
      }

      // 6. Recharger l'intervention pour afficher les changements
      await fetchIntervention();
      
      setShowValidationDialog(false);
    } catch (err) {
      console.error('Erreur lors de la validation:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la validation');
    } finally {
      setValidating(false);
    }
  };

  const handleCorrectifConfirm = async (
    dateProgrammee: string,
    priorite: string,
    observations: string,
    planAction: PlanActionFormData
  ) => {
    if (!selectedInterventionForOT) return;
    
    try {
      const etapesNonConformes = selectedInterventionForOT.etapes_gamme_checkees?.filter((etape: any) => 
        etape.statut === StatutEtapeGamme.ACTION_CORRECTIVE
      ) || [];

      const { data: nouvelOT, error: createError } = await supabase
        .from('ordres_travail')
        .insert({
          machine_id: selectedInterventionForOT.machine_id,
          type: 'correctif',
          statut: 'prévu',
          date_programmee: new Date(dateProgrammee).toISOString(),
          priorite: priorite,
          observations: observations,
          ot_parent_id: selectedInterventionForOT.ordre_travail_id,
          intervention_source_id: selectedInterventionForOT.id,
          ...buildCorrectiveOTPlanActionPayload(planAction),
          etapes_non_conformes: etapesNonConformes
        })
        .select('id, numot')
        .single();

      if (createError) throw createError;

      // Mettre à jour le statut de l'OT parent et valider l'intervention
      const { data: { user } } = await supabase.auth.getUser();
      await Promise.all([
        supabase.from('ordres_travail').update({ statut: 'clôturé_avec_anomalie' }).eq('id', selectedInterventionForOT.ordre_travail_id),
        supabase.from('interventions').update({
          valide: true,
          valide_par: user?.id,
          valide_le: new Date().toISOString()
        }).eq('id', selectedInterventionForOT.id)
      ]);

      handleCorrectifSuccess();
    } catch (error) {
      console.error('Erreur lors de la création de l\'OT correctif:', error);
      throw error;
    }
  };

  const confirmerPlanActionEtValidation = async (planActionData: PlanActionFormData) => {
    if (!selectedInterventionForPlanAction) return;

    const interventionData = selectedInterventionForPlanAction;
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('interventions')
      .update({
        ...buildPlanActionPayload(planActionData),
        valide: true,
        valide_par: user?.id,
        valide_le: new Date().toISOString()
      })
      .eq('id', interventionData.id);

    if (error) throw error;

    if (interventionData.machine_id && interventionData.etat_machine_apres) {
      const { error: machineError } = await supabase
        .from('machines')
        .update({ etat: interventionData.etat_machine_apres })
        .eq('id', interventionData.machine_id);

      if (machineError) {
        console.error("Erreur lors de la mise à jour de l'état de la machine:", machineError);
      }
    }

    if (interventionData.ordre_travail_id) {
      const { error: otError } = await supabase
        .from('ordres_travail')
        .update({ statut: 'terminé' })
        .eq('id', interventionData.ordre_travail_id);

      if (otError) {
        console.error("Erreur lors de la mise à jour du statut de l'OT:", otError);
      }
    }

    setShowPlanActionModal(false);
    setSelectedInterventionForPlanAction(null);
    setShowValidationDialog(false);
    await fetchIntervention();
  };

  const handleValidateWithoutOT = async () => {
    const interventionToValidate = selectedInterventionForReplan || selectedInterventionForOT || intervention;
    if (!interventionToValidate) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: interventionError } = await supabase
        .from('interventions')
        .update({
          valide: true,
          valide_par: user?.id,
          valide_le: new Date().toISOString()
        })
        .eq('id', interventionToValidate.id);

      if (interventionError) throw interventionError;

      if (interventionToValidate.machine_id && interventionToValidate.etat_machine_apres) {
        const { error: machineError } = await supabase
          .from('machines')
          .update({ etat: interventionToValidate.etat_machine_apres })
          .eq('id', interventionToValidate.machine_id);

        if (machineError) throw machineError;
      }

      if (interventionToValidate.ordre_travail_id) {
        const etapesGamme = interventionToValidate.etapes_gamme_checkees || [];
        const toutesConformes = etapesGamme.length === 0 ||
          etapesGamme.every((etape: any) => etape.statut === StatutEtapeGamme.CONFORME);
        const nouveauStatut = toutesConformes ? 'terminé' : 'clôturé_avec_anomalie';

        const { error: otError } = await supabase
          .from('ordres_travail')
          .update({ statut: nouveauStatut })
          .eq('id', interventionToValidate.ordre_travail_id);

        if (otError) throw otError;
      }

      // Fermer toutes les modals et recharger
      setShowReplanificationModal(false);
      setShowCorrectifModal(false);
      setShowDualActionModal(false);
      setSelectedInterventionForReplan(null);
      setSelectedInterventionForOT(null);
      await fetchIntervention();
    } catch (error) {
      console.error('Erreur lors de la validation sans OT:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de la validation sans OT');
    }
  };

  const handleReplanificationSuccess = () => {
    setShowReplanificationModal(false);
    setSelectedInterventionForReplan(null);
    fetchIntervention();
  };

  // Fonctions pour gérer les modals
  const handleReplanificationConfirm = async (date: Date, raison: string) => {
    if (!selectedInterventionForReplan) return;
    
    try {
      const etapesReportees = selectedInterventionForReplan.etapes_gamme_checkees?.filter((etape: any) => 
        etape.statut === StatutEtapeGamme.REPORTE
      ) || [];

      const etapesDejaFaites = selectedInterventionForReplan.etapes_gamme_checkees?.filter((etape: any) => 
        etape.statut === StatutEtapeGamme.CONFORME
      ) || [];

      const { data: nouvelOT, error: createError } = await supabase
        .from('ordres_travail')
        .insert({
          machine_id: selectedInterventionForReplan.machine_id,
          plan_id: selectedInterventionForReplan.ordre_travail.plan_id,
          type: 'préventif',
          statut: 'prévu',
          date_programmee: date.toISOString(),
          priorite: 'normale',
          raison_report: raison,
          date_report: new Date().toISOString(),
          observations: `Replanification suite à l'intervention du ${new Date(selectedInterventionForReplan.date_debut).toLocaleDateString('fr-FR')}. Étapes à refaire: ${etapesReportees.map((e: any) => e.ordre).join(', ')}`,
          etapes_reportees: etapesReportees,
          etapes_deja_faites: etapesDejaFaites
        })
        .select('id, numot')
        .single();

      if (createError) throw createError;

      // Mettre à jour le statut de l'OT parent et valider l'intervention
      await Promise.all([
        supabase.from('ordres_travail').update({ statut: 'clôturé_avec_anomalie' }).eq('id', selectedInterventionForReplan.ordre_travail_id),
        supabase.from('interventions').update({
          valide: true,
          valide_par: (await supabase.auth.getUser()).data.user?.id,
          valide_le: new Date().toISOString()
        }).eq('id', selectedInterventionForReplan.id)
      ]);

      handleReplanificationSuccess();
    } catch (error) {
      console.error('Erreur lors de la création de l\'OT de replanification:', error);
      throw error;
    }
  };

  const handleCorrectifSuccess = () => {
    setShowCorrectifModal(false);
    setSelectedInterventionForOT(null);
    fetchIntervention(); // Recharger les données
  };

  const handleDualActionSuccess = () => {
    setShowDualActionModal(false);
    setSelectedInterventionForReplan(null);
    setSelectedInterventionForOT(null);
    fetchIntervention(); // Recharger les données
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="mx-auto text-blue-600 animate-spin mb-4" />
          <p className="text-slate-600 text-lg">Chargement de l'intervention...</p>
        </div>
      </div>
    );
  }

  if (error || !intervention) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
          <p className="text-red-800 font-medium mb-2">Erreur de chargement</p>
          <p className="text-red-600 text-sm mb-4">{error || 'Intervention non trouvée'}</p>
          <button
            onClick={() => navigate(backPath)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  const etatMachineConfig = getMachineStateConfig(intervention.etat_machine_apres);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
            <button
              onClick={() => navigate(backPath)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={20} />
              Retour à la liste
            </button>
            
            {!isClientInterventionDetails && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate(`/ordres-travail/${intervention.ordre_travail_id}`)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <FileText size={18} />
                Voir l'OT
              </button>
              
              {!intervention.valide ? (
                <>
                  <button
                    onClick={() => navigate(`/intervention/edit?ordre_id=${intervention.ordre_travail_id}&intervention_id=${intervention.id}`)}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Edit size={18} />
                    Modifier
                  </button>
                  <button
                    onClick={() => {
                      setValidationAction('validate');
                      setShowValidationDialog(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <CheckCircle size={18} />
                    Valider
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setValidationAction('invalidate');
                    setShowValidationDialog(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <XCircle size={18} />
                  Dévalider
                </button>
              )}
            </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                Intervention #{intervention.id.slice(0, 8)}
              </h1>
              <p className="text-slate-600">
                {intervention.ordre_travail.machine.nom} - {intervention.ordre_travail.machine.modele}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {intervention.valide ? (
                <div className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-800 rounded-lg">
                  <CheckCircle size={20} />
                  <span className="font-medium">Validée</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 border border-amber-200 text-amber-800 rounded-lg">
                  <AlertCircle size={20} />
                  <span className="font-medium">En attente</span>
                </div>
              )}
              {intervention.client_valide ? (
                <div className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-800 rounded-lg">
                  <CheckCircle size={20} />
                  <span className="font-medium">Validée client</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg">
                  <AlertCircle size={20} />
                  <span className="font-medium">Attente client</span>
                </div>
              )}
            </div>
          </div>

          {intervention.valide && (
            <div className="mt-4 p-3 border border-slate-200 rounded-lg bg-slate-50">
              <p className="text-sm text-slate-700">
                <span className="font-medium">Note:</span> Cette intervention est validée et n'est plus modifiable.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche - Informations principales */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations générales */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText size={24} className="text-slate-700" />
                Informations générales
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Type d'OT</label>
                  <p className="text-slate-900 font-medium capitalize">{intervention.ordre_travail.type}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Statut OT</label>
                  <p className="text-slate-900 font-medium">{getStatutOTLabel(intervention.ordre_travail.statut)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Date programmée</label>
                  <p className="text-slate-900 font-medium">{formatDate(intervention.ordre_travail.date_programmee)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Date début</label>
                  <p className="text-slate-900 font-medium">{formatDate(intervention.date_debut)}</p>
                </div>

                {intervention.date_fin && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-slate-500">Date fin</label>
                      <p className="text-slate-900 font-medium">{formatDate(intervention.date_fin)}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-500">Durée</label>
                      <p className="text-slate-900 font-medium">{formatDuree(intervention.duree_minutes)}</p>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-500">Résultat</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getResultatIcon(intervention.resultat)}
                    <span className="font-medium capitalize text-slate-900">{intervention.resultat || 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-500">État machine après</label>
                  <p className="mt-1 text-slate-900 font-medium">{getMachineStateConfig(intervention.etat_machine_apres).label}</p>
                </div>
              </div>
            </div>

            {/* Étapes de gamme (résumé) */}
            {intervention.etapes_gamme_checkees && intervention.etapes_gamme_checkees.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-2">Étapes de gamme</h2>
                <p className="text-sm text-slate-600">{intervention.etapes_gamme_checkees.length} étape(s) enregistrée(s)</p>
              </div>
            )}

            {/* Pièces remplacées */}
            {intervention.pieces_remplacees && intervention.pieces_remplacees.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Wrench size={24} className="text-slate-700" />
                  Pièces remplacées ({intervention.pieces_remplacees.length})
                </h2>

                <div className="space-y-2">
                  {intervention.pieces_remplacees.map((piece: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-900 font-medium">{piece.nom || piece.designation}</span>
                      {piece.quantite && (
                        <span className="text-slate-600 text-sm">Qté: {piece.quantite}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commentaire */}
            {intervention.commentaire && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Commentaire</h2>
                <p className="text-slate-700 whitespace-pre-wrap">{intervention.commentaire}</p>
              </div>
            )}

            {(intervention.client_valide || intervention.commentaire_client) && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl font-bold text-slate-800">Validation client</h2>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                    intervention.client_valide
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {intervention.client_valide ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {intervention.client_valide ? 'Validée par client' : 'Non validée par client'}
                  </span>
                </div>
                {intervention.commentaire_client ? (
                  <p className="text-slate-700 whitespace-pre-wrap">{intervention.commentaire_client}</p>
                ) : (
                  <p className="text-sm text-slate-500">Aucun commentaire client.</p>
                )}
              </div>
            )}

            {/* Photos */}
            {(intervention.image_avant_urls.length > 0 || intervention.image_apres_urls.length > 0) && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <ImageIcon size={24} className="text-slate-700" />
                  Photos
                </h2>

                {intervention.image_avant_urls.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-700 mb-3">Photos avant</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {intervention.image_avant_urls.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-blue-500 transition-colors"
                        >
                          <img
                            src={url}
                            alt={`Photo avant ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {intervention.image_apres_urls.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3">Photos après</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {intervention.image_apres_urls.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-blue-500 transition-colors"
                        >
                          <img
                            src={url}
                            alt={`Photo après ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Colonne droite - Résumé compact */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Machine</h3>
              <p className="text-sm text-slate-700">{intervention.ordre_travail.machine.nom || 'N/A'}</p>
              <p className="text-xs text-slate-500 mt-1">{intervention.ordre_travail.machine.modele || ''}</p>
            </div>

            {intervention.ordre_travail.machine.client && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Client</h3>
                <p className="text-sm text-slate-700">{intervention.ordre_travail.machine.client.raison_sociale || intervention.ordre_travail.machine.client.prenom}</p>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Technicien</h3>
              <p className="text-sm text-slate-700">{intervention.technicien.nom}</p>
            </div>

            {intervention.valide && intervention.validateur && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Validation</h3>
                <p className="text-sm text-slate-700">{intervention.validateur.nom} — {formatDate(intervention.valide_le!)}</p>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Validation client</h3>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                intervention.client_valide
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {intervention.client_valide ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                {intervention.client_valide ? 'Validée' : 'En attente'}
              </div>
              {intervention.commentaire_client && (
                <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{intervention.commentaire_client}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Boîte de dialogue de confirmation */}
      {showValidationDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {validationAction === 'validate' ? (
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle size={24} className="text-red-600" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {validationAction === 'validate' ? 'Valider l\'intervention' : 'Dévalider l\'intervention'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {validationAction === 'validate' 
                      ? 'Confirmer que le travail a été effectué correctement'
                      : 'Marquer l\'intervention comme nécessitant une révision'}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-800">
                  {validationAction === 'validate' 
                    ? 'Cette action mettra à jour l\'état de la machine et le statut de l\'ordre de travail.'
                    : 'Cette action remettra le statut de l\'ordre de travail à "En cours".'}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowValidationDialog(false)}
                  disabled={validating}
                  className="flex-1 px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleValidation(validationAction === 'validate')}
                  disabled={validating}
                  className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    validationAction === 'validate'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {validating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Traitement...</span>
                    </>
                  ) : (
                    validationAction === 'validate' ? 'Valider' : 'Dévalider'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals pour la création d'OT */}
      {showPlanActionModal && selectedInterventionForPlanAction && (
        <PlanActionValidationModal
          machineName={selectedInterventionForPlanAction.ordre_travail?.machine?.nom}
          lotName={
            selectedInterventionForPlanAction.ordre_travail?.machine?.lot?.nom ||
            selectedInterventionForPlanAction.ordre_travail?.machine?.lot?.code
          }
          onConfirm={confirmerPlanActionEtValidation}
          onCancel={() => {
            setShowPlanActionModal(false);
            setSelectedInterventionForPlanAction(null);
          }}
        />
      )}

      {showReplanificationModal && selectedInterventionForReplan && (
        <ReplanificationModal
          etapesReportees={selectedInterventionForReplan.etapes_gamme_checkees?.filter((etape: any) => 
            etape.statut === StatutEtapeGamme.REPORTE
          ) || []}
          etapesGammeDetails={selectedInterventionForReplan.ordre_travail?.plan?.gamme?.etapes_gamme || []}
          ordreOriginal={{
            id: selectedInterventionForReplan.ordre_travail_id,
            machine: { nom: selectedInterventionForReplan.ordre_travail.machine.nom },
            plans_maintenance: selectedInterventionForReplan.ordre_travail.plan ? {
              gamme: { nom: selectedInterventionForReplan.ordre_travail.plan.gamme?.nom || '' }
            } : undefined
          }}
          onConfirm={handleReplanificationConfirm}
          onCancel={() => {
            setShowReplanificationModal(false);
            setSelectedInterventionForReplan(null);
          }}
          onValidateWithoutOT={handleValidateWithoutOT}
        />
      )}

      {showCorrectifModal && selectedInterventionForOT && (
        <CorrectifModal
          etapesNonConformes={selectedInterventionForOT.etapes_gamme_checkees?.filter((etape: any) => 
            etape.statut === StatutEtapeGamme.ACTION_CORRECTIVE
          ) || []}
          ordreOriginal={{
            id: selectedInterventionForOT.ordre_travail_id,
            machine: selectedInterventionForOT.ordre_travail.machine,
            plans_maintenance: selectedInterventionForOT.ordre_travail.plan ? {
              gamme: { nom: selectedInterventionForOT.ordre_travail.plan.gamme?.nom || '' }
            } : undefined
          }}
          onConfirm={handleCorrectifConfirm}
          onCancel={() => {
            setShowCorrectifModal(false);
            setSelectedInterventionForOT(null);
          }}
          onValidateWithoutOT={handleValidateWithoutOT}
        />
      )}

      {showDualActionModal && selectedInterventionForReplan && selectedInterventionForOT && (
        <DualActionModal
          etapesReportees={selectedInterventionForReplan.etapes_gamme_checkees?.filter((etape: any) => 
            etape.statut === StatutEtapeGamme.REPORTE
          ) || []}
          etapesNonConformes={selectedInterventionForOT.etapes_gamme_checkees?.filter((etape: any) => 
            etape.statut === StatutEtapeGamme.ACTION_CORRECTIVE
          ) || []}
          ordreOriginal={{
            id: selectedInterventionForReplan.ordre_travail_id,
            machine: { nom: selectedInterventionForReplan.ordre_travail.machine.nom },
            plans_maintenance: selectedInterventionForReplan.ordre_travail.plan ? {
              gamme: { nom: selectedInterventionForReplan.ordre_travail.plan.gamme?.nom || '' }
            } : undefined
          }}
          onConfirm={async (dateReplan, raison, dateCorr, priorite, obs, planAction) => {
            // Cette fonction sera appelée par DualActionModal selon les choix de l'admin
            await handleReplanificationConfirm(dateReplan, raison);
            if (!planAction) {
              throw new Error("Les informations du plan d'action sont requises pour creer l'OT correctif.");
            }
            await handleCorrectifConfirm(dateCorr, priorite, obs, planAction);
          }}
          onCancel={() => {
            setShowDualActionModal(false);
            setSelectedInterventionForReplan(null);
            setSelectedInterventionForOT(null);
          }}
          onValidateWithoutOT={handleValidateWithoutOT}
        />
      )}
    </div>
  );
};

export default InterventionDetails;
