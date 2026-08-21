import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, FileText, ChevronDown, Eye, Edit, Trash2, Loader2, CheckCircle, XCircle, X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { MachineState, getMachineStateConfig } from '../types/machineState';
import { StatutEtapeGamme } from '../types/etapeGamme';
import ReplanificationModal from './ReplanificationModal';
import DualActionModal from './DualActionModal';
import CorrectifModal from './CorrectifModal';
import type { PlanActionFormData } from './PlanActionValidationModal';

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
    // Relations
    ordre_travail: {
        id: string;
        type: string;
        statut: string;
        date_programmee: string;
        ot_parent_id?: string | null;
        intervention_source_id?: string | null;
        machine: {
            id: string;
            nom: string;
            modele: string;
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

const InterventionsTable: React.FC = () => {
    // État pour le modal de sélection de client
    const [selectedClientId, setSelectedClientId] = useState<string | null>(() => {
        return localStorage.getItem('interventions_selectedClientId');
    });
    const [showClientModal, setShowClientModal] = useState<boolean>(() => {
        return !localStorage.getItem('interventions_selectedClientId');
    });
    const [clients, setClients] = useState<any[]>([]);
    const [loadingClients, setLoadingClients] = useState<boolean>(true);
    
    // Filtres pré-sélection dans le modal
    const [preFilterType, setPreFilterType] = useState<string>(() => {
        return localStorage.getItem('interventions_preFilterType') || 'all';
    });
    const [preFilterTechnicien, setPreFilterTechnicien] = useState<string>(() => {
        return localStorage.getItem('interventions_preFilterTechnicien') || 'all';
    });
    const [preFilterStatutOT, setPreFilterStatutOT] = useState<string>(() => {
        return localStorage.getItem('interventions_preFilterStatutOT') || 'all';
    });
    
    // Filtres appliqués
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterTechnicien, setFilterTechnicien] = useState<string>('all');
    const [filterStatutOT, setFilterStatutOT] = useState<string>('all');
    
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [techniciens, setTechniciens] = useState<any[]>([]);

    const selectedClient = clients.find((client) => client.id === selectedClientId) || null;
    
    // États pour la pagination
    const [currentPage, setCurrentPage] = useState<number>(() => {
        return parseInt(localStorage.getItem('interventions_currentPage') || '1');
    });
    const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
        return parseInt(localStorage.getItem('interventions_itemsPerPage') || '10');
    });
    
    // États pour la dialog de validation
    const [showValidationDialog, setShowValidationDialog] = useState<boolean>(false);
    const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
    const [validationAction, setValidationAction] = useState<'validate' | 'invalidate'>('validate');
    const [validating, setValidating] = useState<boolean>(false);
    
    // États pour la création d'OT correctif
    const [selectedInterventionForOT, setSelectedInterventionForOT] = useState<Intervention | null>(null);
    
    // États pour la replanification
    const [showReplanificationModal, setShowReplanificationModal] = useState<boolean>(false);
    const [selectedInterventionForReplan, setSelectedInterventionForReplan] = useState<Intervention | null>(null);
    
    // État pour le modal double action (reporté + non-conforme)
    const [showDualActionModal, setShowDualActionModal] = useState<boolean>(false);
    
    // État pour le modal correctif seul
    const [showCorrectifModal, setShowCorrectifModal] = useState<boolean>(false);
    const [showPlanActionModal, setShowPlanActionModal] = useState<boolean>(false);
    const [selectedInterventionForPlanAction, setSelectedInterventionForPlanAction] = useState<any | null>(null);
    
    const navigate = useNavigate();
    const location = useLocation();

    // Si on arrive depuis le panneau admin, afficher le popup de filtre
    useEffect(() => {
        const state = (location.state as any) || {};

        if (state.showFiltersPopup) {
            setShowClientModal(true);

            // Consommer l'état pour éviter de rouvrir le modal au retour depuis une page d'édition ou de visualisation
            navigate(location.pathname, {
                replace: true,
                state: {
                    ...state,
                    showFiltersPopup: false
                }
            });
        }
    }, [location, navigate]);

    // Réinitialiser à la page 1 quand les filtres changent
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType, filterTechnicien, filterStatutOT]);

    // Charger les clients au montage
    useEffect(() => {
        fetchClients();
        fetchTechniciens(); // Charger les techniciens pour le modal
    }, []);

    // Charger les interventions seulement si un client est sélectionné
    useEffect(() => {
        if (selectedClientId) {
            fetchInterventions();
        }
    }, [selectedClientId]);

    const fetchClients = async (): Promise<void> => {
        try {
            setLoadingClients(true);
            const { data, error } = await supabase
                .from('clients')
                .select('id, raison_sociale, prenom')
                .order('raison_sociale');

            if (error) throw error;

            setClients(data || []);
        } catch (err) {
            console.error('Erreur lors du chargement des clients:', err);
        } finally {
            setLoadingClients(false);
        }
    };

    const handleClientSelection = (clientId: string) => {
        setSelectedClientId(clientId);
        localStorage.setItem('interventions_selectedClientId', clientId);
        localStorage.setItem('interventions_preFilterType', preFilterType);
        localStorage.setItem('interventions_preFilterTechnicien', preFilterTechnicien);
        localStorage.setItem('interventions_preFilterStatutOT', preFilterStatutOT);

        // Appliquer les filtres pré-sélectionnés
        setFilterType(preFilterType);
        setFilterTechnicien(preFilterTechnicien);
        setFilterStatutOT(preFilterStatutOT);
        setShowClientModal(false);
    };

    useEffect(() => {
        fetchInterventions();
        fetchTechniciens();
    }, []);

    const fetchInterventions = async (): Promise<void> => {
        if (!selectedClientId) return;
        
        try {
            setLoading(true);
            setError(null);

            // D'abord, récupérer les machines du client
            const { data: machinesData, error: machinesError } = await supabase
                .from('machines')
                .select('id')
                .eq('client_id', selectedClientId);

            if (machinesError) throw machinesError;

            const machineIds = machinesData?.map(m => m.id) || [];

            if (machineIds.length === 0) {
                setInterventions([]);
                setLoading(false);
                return;
            }

            // Ensuite, récupérer les OT de ces machines
            const { data: otData, error: otError } = await supabase
                .from('ordres_travail')
                .select('id')
                .in('machine_id', machineIds);

            if (otError) throw otError;

            const otIds = otData?.map(ot => ot.id) || [];

            if (otIds.length === 0) {
                setInterventions([]);
                setLoading(false);
                return;
            }

            // Enfin, récupérer les interventions de ces OT
            const { data, error } = await supabase
                .from('interventions')
                .select(`
                    *,
                    ordre_travail:ordres_travail!interventions_ot_fkey(
                        id,
                        type,
                        statut,
                        date_programmee,
                        machine:machines(
                            id,
                            nom,
                            modele,
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
                .in('ordre_travail_id', otIds)
                .order('date_debut', { ascending: false });

            if (error) throw error;

            setInterventions(data || []);
        } catch (err) {
            console.error('Erreur lors du chargement des interventions:', err);
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const fetchTechniciens = async (): Promise<void> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, nom')
                .eq('role', 'technicien')
                .order('nom');

            if (error) throw error;

            setTechniciens(data || []);
        } catch (err) {
            console.error('Erreur lors du chargement des techniciens:', err);
        }
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
        date_expression: data.date_expression || null
    });

    const updateValidation = async (id: string, valide: boolean) => {
        try {
            setValidating(true);
            console.log('[PlanAction] Debut validation intervention', { id, valide });
            
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
                .eq("id", id)
                .single();

            if (fetchError) {
                console.error('[PlanAction] Erreur fetch intervention complete', fetchError);
                throw fetchError;
            }

            console.log('[PlanAction] Intervention complete chargee', {
                intervention_id: interventionData?.id,
                ordre_travail_id: interventionData?.ordre_travail_id,
                valide_actuel: interventionData?.valide,
                ot: {
                    id: interventionData?.ordre_travail?.id,
                    numot: interventionData?.ordre_travail?.numot,
                    type: interventionData?.ordre_travail?.type,
                    statut: interventionData?.ordre_travail?.statut,
                    ot_parent_id: interventionData?.ordre_travail?.ot_parent_id,
                    intervention_source_id: interventionData?.ordre_travail?.intervention_source_id
                }
            });

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
                    // L'admin peut choisir de créer les OT ou de valider sans créer
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
                    // L'admin peut choisir de créer l'OT ou de valider sans créer
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
                    // L'admin peut choisir de créer l'OT ou de valider sans créer
                    setSelectedInterventionForOT(interventionAvecPlanId as Intervention);
                    setShowCorrectifModal(true);
                    setValidating(false);
                    setShowValidationDialog(false);
                    return;
                }
            }

            // 3. Mettre à jour l'intervention
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from("interventions")
                .update({ 
                    valide: valide,
                    valide_par: valide ? user?.id : null,
                    valide_le: valide ? new Date().toISOString() : null
                })
                .eq("id", id);

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
                    
                    // Si toutes les étapes sont conformes -> terminé
                    // Sinon -> clôturé_avec_anomalie
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

            // 6. Mettre à jour le state local
            setInterventions((prev) =>
                prev.map((intervention) =>
                    intervention.id === id
                        ? { 
                            ...intervention, 
                            valide: valide,
                            valide_le: valide ? new Date().toISOString() : null,
                            ordre_travail: intervention.ordre_travail ? {
                                ...intervention.ordre_travail,
                                statut: nouveauStatut
                            } : intervention.ordre_travail
                        }
                        : intervention
                )
            );

            // Fermer la dialog
            setShowValidationDialog(false);
            setSelectedIntervention(null);

        } catch (err) {
            console.error("Erreur lors de la validation :", err);
        } finally {
            setValidating(false);
        }
    };

    // Fonction pour valider sans créer d'OT (utilisée par les modals)
    const confirmerPlanActionEtValidation = async (planActionData: PlanActionFormData) => {
        if (!selectedInterventionForPlanAction) return;

        const intervention = selectedInterventionForPlanAction;
        console.log('[PlanAction] Enregistrement plan action et validation', {
            intervention_id: intervention.id,
            ordre_travail_id: intervention.ordre_travail_id,
            rpn: planActionData.gravite_classe * planActionData.occurrence_classe * planActionData.detectabilite_classe
        });
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('interventions')
            .update({
                ...buildPlanActionPayload(planActionData),
                valide: true,
                valide_par: user?.id,
                valide_le: new Date().toISOString()
            })
            .eq('id', intervention.id);

        if (error) {
            console.error('[PlanAction] Erreur update intervention plan action', error);
            throw error;
        }

        if (intervention.machine_id && intervention.etat_machine_apres) {
            const { error: machineError } = await supabase
                .from('machines')
                .update({ etat: intervention.etat_machine_apres })
                .eq('id', intervention.machine_id);

            if (machineError) {
                console.error("Erreur lors de la mise à jour de l'état de la machine:", machineError);
            }
        }

        if (intervention.ordre_travail_id) {
            const { error: otError } = await supabase
                .from('ordres_travail')
                .update({ statut: 'terminé' })
                .eq('id', intervention.ordre_travail_id);

            if (otError) {
                console.error("Erreur lors de la mise à jour du statut de l'OT:", otError);
            }
        }

        await fetchInterventions();
        setShowPlanActionModal(false);
        setSelectedInterventionForPlanAction(null);
        setSelectedIntervention(null);
    };

    const validerSansCreerOT = async () => {
        const intervention = selectedInterventionForReplan || selectedInterventionForOT;
        if (!intervention) return;

        try {
            // 1. Valider l'intervention
            const { data: { user } } = await supabase.auth.getUser();
            const { error: interventionError } = await supabase
                .from('interventions')
                .update({
                    valide: true,
                    valide_par: user?.id,
                    valide_le: new Date().toISOString()
                })
                .eq('id', intervention.id);

            if (interventionError) throw interventionError;

            // 2. Mettre à jour l'état de la machine
            if (intervention.machine_id && intervention.etat_machine_apres) {
                const { error: machineError } = await supabase
                    .from('machines')
                    .update({ etat: intervention.etat_machine_apres })
                    .eq('id', intervention.machine_id);

                if (machineError) throw machineError;
            }

            // 3. Déterminer le statut de l'OT
            const etapesGamme = intervention.etapes_gamme_checkees || [];
            const toutesConformes = etapesGamme.length === 0 || 
                etapesGamme.every((etape: any) => etape.statut === StatutEtapeGamme.CONFORME);
            
            const nouveauStatut = toutesConformes ? 'terminé' : 'clôturé_avec_anomalie';

            // 4. Mettre à jour le statut de l'OT
            const { error: otError } = await supabase
                .from('ordres_travail')
                .update({ statut: nouveauStatut })
                .eq('id', intervention.ordre_travail_id);

            if (otError) throw otError;

            // 5. Rafraîchir et fermer
            await fetchInterventions();
            setShowReplanificationModal(false);
            setShowCorrectifModal(false);
            setShowDualActionModal(false);
            setSelectedInterventionForReplan(null);
            setSelectedInterventionForOT(null);

        } catch (err) {
            console.error('Erreur lors de la validation:', err);
            alert('❌ Erreur lors de la validation');
        }
    };

    // Fonction pour créer un OT correctif seul
    const creerOTCorrectifSeul = async (dateProgrammee: string, priorite: string, observations: string, planAction: PlanActionFormData) => {
        if (!selectedInterventionForOT) return;

        try {
            const intervention = selectedInterventionForOT;
            const etapesNonConformes = intervention.etapes_gamme_checkees?.filter((etape: any) => 
                etape.statut === StatutEtapeGamme.ACTION_CORRECTIVE
            ) || [];

            // 1. Valider l'intervention
            const { data: { user } } = await supabase.auth.getUser();
            await supabase
                .from('interventions')
                .update({
                    valide: true,
                    valide_par: user?.id,
                    valide_le: new Date().toISOString()
                })
                .eq('id', intervention.id);

            // 2. Mettre à jour l'état de la machine
            if (intervention.machine_id && intervention.etat_machine_apres) {
                await supabase
                    .from('machines')
                    .update({ etat: intervention.etat_machine_apres })
                    .eq('id', intervention.machine_id);
            }

            // 3. Mettre à jour le statut de l'OT parent à "clôturé_avec_anomalie"
            await supabase
                .from('ordres_travail')
                .update({ statut: 'clôturé_avec_anomalie' })
                .eq('id', intervention.ordre_travail_id);

            // 4. Récupérer l'OT parent
            const { data: otParent } = await supabase
                .from('ordres_travail')
                .select('id, numot')
                .eq('id', intervention.ordre_travail_id)
                .single();

            // 5. Générer la description
            let descriptionNonConformites = `Suite à l'intervention préventive (OT #${otParent?.numot}), ${etapesNonConformes.length} non-conformité(s) détectée(s) :\n\n`;
            
            etapesNonConformes.forEach((etape: any, index: number) => {
                descriptionNonConformites += `${index + 1}. Étape ${etape.ordre}: ${etape.description}\n`;
                if (etape.commentaire) {
                    descriptionNonConformites += `   → ${etape.commentaire}\n`;
                }
                descriptionNonConformites += `\n`;
            });

            if (observations.trim()) {
                descriptionNonConformites += `\nObservations admin: ${observations}`;
            }

            // 6. Créer l'OT correctif
            const { data: otCorrectif, error: correctifError } = await supabase
                .from('ordres_travail')
                .insert({
                    type: 'correctif',
                    statut: 'prévu',
                    priorite: priorite,
                    date_programmee: dateProgrammee,
                    observations: descriptionNonConformites,
                    cause: 'Non-conformités détectées lors de la maintenance préventive',
                    machine_id: intervention.machine_id,
                    ot_parent_id: otParent?.id,
                    intervention_source_id: intervention.id,
                    ...buildPlanActionPayload(planAction),
                    // Stocker les étapes non-conformes pour affichage au technicien
                    etapes_non_conformes: etapesNonConformes
                })
                .select('id, numot')
                .single();

            if (correctifError) throw correctifError;

            // 7. Rafraîchir et fermer
            await fetchInterventions();
            setShowCorrectifModal(false);
            setSelectedInterventionForOT(null);
            
            alert(`✅ OT Correctif #${otCorrectif.numot} créé avec succès !\n${etapesNonConformes.length} non-conformité(s) à traiter.`);

        } catch (err) {
            console.error('Erreur lors de la création de l\'OT correctif:', err);
            alert('❌ Erreur lors de la création de l\'OT correctif');
        }
    };

    // Fonction pour créer à la fois un OT de replanification ET un OT correctif
    const creerOTDuaux = async (
        dateReplanification: Date,
        raisonReport: string,
        dateProgrammeeCorrectif: string,
        prioriteCorrectif: string,
        observationsCorrectif: string,
        planAction?: PlanActionFormData
    ) => {
        if (!selectedInterventionForReplan || !selectedInterventionForOT || !planAction) return;

        try {
            const intervention = selectedInterventionForReplan;
            const etapesReportees = intervention.etapes_gamme_checkees?.filter((etape: any) => 
                etape.statut === StatutEtapeGamme.REPORTE
            ) || [];
            const etapesNonConformes = intervention.etapes_gamme_checkees?.filter((etape: any) => 
                etape.statut === StatutEtapeGamme.ACTION_CORRECTIVE
            ) || [];
            
            // Récupérer toutes les étapes de la gamme pour identifier celles déjà faites
            const toutesEtapes = intervention.etapes_gamme_checkees || [];
            const etapesDejaFaites = toutesEtapes.filter((etape: any) => 
                etape.statut === StatutEtapeGamme.CONFORME
            ) || [];

            // 1. Valider l'intervention
            const { data: { user } } = await supabase.auth.getUser();
            await supabase
                .from('interventions')
                .update({
                    valide: true,
                    valide_par: user?.id,
                    valide_le: new Date().toISOString()
                })
                .eq('id', intervention.id);

            // 2. Mettre à jour l'état de la machine
            if (intervention.machine_id && intervention.etat_machine_apres) {
                await supabase
                    .from('machines')
                    .update({ etat: intervention.etat_machine_apres })
                    .eq('id', intervention.machine_id);
            }

            // 3. Mettre à jour le statut de l'OT parent à "clôturé_avec_anomalie"
            await supabase
                .from('ordres_travail')
                .update({ statut: 'clôturé_avec_anomalie' })
                .eq('id', intervention.ordre_travail_id);

            // 4. Créer l'OT de replanification
            const { data: otReplan, error: replanError } = await supabase
                .from('ordres_travail')
                .insert({
                    type: 'préventif',
                    statut: 'prévu',
                    date_programmee: dateReplanification.toISOString(),
                    machine_id: intervention.machine_id,
                    plan_id: (intervention.ordre_travail as any)?.plan_id || null,
                    ot_parent_id: intervention.ordre_travail_id,
                    raison_report: raisonReport || `Replanification de ${etapesReportees.length} étape(s) reportée(s)`,
                    date_report: new Date().toISOString(),
                    observations: `Replanification suite à l'intervention du ${new Date(intervention.date_debut).toLocaleDateString('fr-FR')}. Étapes à refaire: ${etapesReportees.map((e: any) => e.ordre).join(', ')}`,
                    // Stocker les étapes reportées (à refaire) et les étapes déjà faites (à désactiver)
                    etapes_reportees: etapesReportees,
                    etapes_deja_faites: etapesDejaFaites
                })
                .select('id, numot')
                .single();

            if (replanError) throw replanError;

            // 5. Créer l'OT correctif
            const { data: otParent } = await supabase
                .from('ordres_travail')
                .select('id, numot')
                .eq('id', intervention.ordre_travail_id)
                .single();

            let descriptionNonConformites = `Suite à l'intervention préventive (OT #${otParent?.numot}), ${etapesNonConformes.length} non-conformité(s) détectée(s) :\n\n`;
            
            etapesNonConformes.forEach((etape: any, index: number) => {
                descriptionNonConformites += `${index + 1}. Étape ${etape.ordre}: ${etape.description}\n`;
                if (etape.commentaire) {
                    descriptionNonConformites += `   → ${etape.commentaire}\n`;
                }
                descriptionNonConformites += `\n`;
            });

            if (observationsCorrectif.trim()) {
                descriptionNonConformites += `\nObservations admin: ${observationsCorrectif}`;
            }

            const { data: otCorrectif, error: correctifError } = await supabase
                .from('ordres_travail')
                .insert({
                    type: 'correctif',
                    statut: 'prévu',
                    priorite: prioriteCorrectif,
                    date_programmee: dateProgrammeeCorrectif,
                    ...buildPlanActionPayload(planAction),
                    observations: descriptionNonConformites,
                    cause: 'Non-conformités détectées lors de la maintenance préventive',
                    machine_id: intervention.machine_id,
                    ot_parent_id: otParent?.id,
                    intervention_source_id: intervention.id,
                    // Stocker les étapes non-conformes pour affichage au technicien
                    etapes_non_conformes: etapesNonConformes
                })
                .select('id, numot')
                .single();

            if (correctifError) throw correctifError;

            // 6. Rafraîchir et fermer
            await fetchInterventions();
            setShowDualActionModal(false);
            setSelectedInterventionForReplan(null);
            setSelectedInterventionForOT(null);
            
            alert(`✅ Succès !\n\n` +
                  `📅 OT de Replanification #${otReplan.numot} créé\n` +
                  `   → ${etapesReportees.length} étape(s) à refaire\n\n` +
                  `🔧 OT Correctif #${otCorrectif.numot} créé\n` +
                  `   → ${etapesNonConformes.length} non-conformité(s) à traiter`);

        } catch (err) {
            console.error('Erreur lors de la création des OT:', err);
            alert('❌ Erreur lors de la création des OT');
        }
    };

    // Fonction pour créer un OT de replanification
    const creerOTReplanification = async (dateReplanification: Date, raisonReport: string) => {
        if (!selectedInterventionForReplan) return;

        try {
            const intervention = selectedInterventionForReplan;
            const etapesReportees = intervention.etapes_gamme_checkees?.filter((etape: any) => 
                etape.statut === StatutEtapeGamme.REPORTE
            ) || [];
            
            // Récupérer toutes les étapes de la gamme pour identifier celles déjà faites
            const toutesEtapes = intervention.etapes_gamme_checkees || [];
            const etapesDejaFaites = toutesEtapes.filter((etape: any) => 
                etape.statut === StatutEtapeGamme.CONFORME
            ) || [];

            // 1. Valider l'intervention
            const { data: { user } } = await supabase.auth.getUser();
            await supabase
                .from('interventions')
                .update({
                    valide: true,
                    valide_par: user?.id,
                    valide_le: new Date().toISOString()
                })
                .eq('id', intervention.id);

            // 2. Mettre à jour l'état de la machine
            if (intervention.machine_id && intervention.etat_machine_apres) {
                await supabase
                    .from('machines')
                    .update({ etat: intervention.etat_machine_apres })
                    .eq('id', intervention.machine_id);
            }

            // 3. Mettre à jour le statut de l'OT parent à "clôturé_avec_anomalie"
            await supabase
                .from('ordres_travail')
                .update({ statut: 'clôturé_avec_anomalie' })
                .eq('id', intervention.ordre_travail_id);

            // 4. Créer le nouvel OT de replanification
            const { data: nouvelOT, error: otError } = await supabase
                .from('ordres_travail')
                .insert({
                    type: 'préventif',
                    statut: 'prévu',
                    date_programmee: dateReplanification.toISOString(),
                    machine_id: intervention.machine_id,
                    plan_id: (intervention.ordre_travail as any)?.plan_id || null,
                    ot_parent_id: intervention.ordre_travail_id,
                    raison_report: raisonReport || `Replanification de ${etapesReportees.length} étape(s) reportée(s)`,
                    date_report: new Date().toISOString(),
                    observations: `Replanification suite à l'intervention du ${new Date(intervention.date_debut).toLocaleDateString('fr-FR')}. Étapes à refaire: ${etapesReportees.map((e: any) => e.ordre).join(', ')}`,
                    // Stocker les étapes reportées (à refaire) et les étapes déjà faites (à désactiver)
                    etapes_reportees: etapesReportees,
                    etapes_deja_faites: etapesDejaFaites
                })
                .select('id, numot')
                .single();

            if (otError) throw otError;

            // 5. Note: L'intervention sera créée par le technicien lors de l'exécution
            // Les étapes déjà faites seront marquées automatiquement comme conformes

            // 6. Rafraîchir la liste
            await fetchInterventions();

            // 7. Fermer le modal et afficher un message de succès
            setShowReplanificationModal(false);
            setSelectedInterventionForReplan(null);
            alert(`✅ OT de replanification #${nouvelOT.numot} créé avec succès !\n${etapesReportees.length} étape(s) à refaire.`);

        } catch (err) {
            console.error('Erreur lors de la création de l\'OT de replanification:', err);
            alert('❌ Erreur lors de la création de l\'OT de replanification');
        }
    };

    const handleValidationClick = (intervention: Intervention, action: 'validate' | 'invalidate') => {
        console.log('[PlanAction] Clic validation depuis tableau', {
            intervention_id: intervention.id,
            action,
            ordre_travail_id: intervention.ordre_travail_id,
            type_ligne: intervention.ordre_travail?.type,
            ot_parent_id_ligne: intervention.ordre_travail?.ot_parent_id,
            intervention_source_id_ligne: intervention.ordre_travail?.intervention_source_id
        });
        setSelectedIntervention(intervention);
        setValidationAction(action);
        setShowValidationDialog(true);
    };

    const confirmValidation = () => {
        console.log('[PlanAction] Confirmation dialog validation', {
            selected_intervention_id: selectedIntervention?.id,
            validationAction
        });
        if (selectedIntervention) {
            updateValidation(selectedIntervention.id, validationAction === 'validate');
        }
    };

    const filteredInterventions = interventions.filter((intervention) => {
        const machineName = intervention.ordre_travail?.machine?.nom || '';
        const machineModele = intervention.ordre_travail?.machine?.modele || '';
        const technicienNom = intervention.technicien?.nom || '';
        const clientName = intervention.ordre_travail?.machine?.client?.raison_sociale || 
                          intervention.ordre_travail?.machine?.client?.prenom || '';

        const matchesSearch =
            machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            machineModele.toLowerCase().includes(searchTerm.toLowerCase()) ||
            technicienNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            clientName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === 'all' || intervention.ordre_travail?.type === filterType;
        const matchesTechnicien = filterTechnicien === 'all' || intervention.technicien?.id === filterTechnicien;
        
        // Logique de filtrage par statut OT
        const matchesStatutOT = filterStatutOT === 'all' || intervention.ordre_travail?.statut === filterStatutOT;

        return matchesSearch && matchesType && matchesTechnicien && matchesStatutOT;
    });

    // Calcul de la pagination
    const totalPages = Math.ceil(filteredInterventions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedInterventions = filteredInterventions.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    const getTypeColor = (type: string): string => {
        switch (type) {
            case 'préventif': return 'bg-purple-100 text-purple-800';
            case 'correctif': return 'bg-orange-100 text-orange-800';
            case 'curatif': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeLabel = (type: string): string => {
        switch (type) {
            case 'préventif': return 'Préventif';
            case 'correctif': return 'Correctif';
            case 'curatif': return 'Curatif';
            default: return type;
        }
    };

    const getTypeRowColor = (type: string): string => {
        switch (type) {
            case 'préventif': return 'bg-purple-50/30 hover:bg-purple-50/50';
            case 'correctif': return 'bg-orange-50/30 hover:bg-orange-50/50';
            case 'curatif': return 'bg-red-50/30 hover:bg-red-50/50';
            default: return 'hover:bg-slate-50';
        }
    };

    const getTypeStickyColor = (type: string): string => {
        return 'bg-white';
    };

    const getEtatMachineColor = (etat: MachineState): string => {
        const config = getMachineStateConfig(etat);
        return `${config.bgColor} ${config.textColor}`;
    };

    const getStatutOTColor = (statut: string): string => {
        switch (statut) {
            case 'prévu': return 'bg-blue-100 text-blue-800';
            case 'en_cours': return 'bg-yellow-100 text-yellow-800';
            case 'terminé': return 'bg-green-100 text-green-800';
            case 'annulé': return 'bg-gray-100 text-gray-800';
            case 'clôturé_avec_anomalie': return 'bg-orange-100 text-orange-800 border border-orange-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatutOTLabel = (statut: string): string => {
        switch (statut) {
            case 'prévu': return 'Prévu';
            case 'en_cours': return 'En cours';
            case 'terminé': return 'Clôturé';
            case 'annulé': return 'Annulé';
            case 'clôturé_avec_anomalie': return 'Clôturé avec anomalie';
            default: return statut;
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

    const handleDelete = async (id: string): Promise<void> => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette intervention ?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('interventions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await fetchInterventions();
        } catch (err) {
            console.error('Erreur lors de la suppression:', err);
            alert('Erreur lors de la suppression de l\'intervention');
        }
    };

    const handleEdit = (intervention: Intervention) => {
        navigate(`/intervention/edit?ordre_id=${intervention.ordre_travail_id}&intervention_id=${intervention.id}`);
    };

    // Analyser les étapes pour détecter les non-conformités
    const analyserNonConformites = (intervention: Intervention) => {
        if (!intervention.etapes_gamme_checkees || !Array.isArray(intervention.etapes_gamme_checkees)) {
            return { count: 0, etapes: [] };
        }

        const etapesProblematiques = intervention.etapes_gamme_checkees.filter((etape: any) => {
            return etape.statut === StatutEtapeGamme.ACTION_CORRECTIVE;
        });

        return {
            count: etapesProblematiques.length,
            etapes: etapesProblematiques
        };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={48} className="mx-auto text-blue-600 animate-spin mb-4" />
                    <p className="text-slate-600 text-lg">Chargement des interventions...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
                    <p className="text-red-800 font-medium mb-2">Erreur de chargement</p>
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-6">
            {/* Modal de sélection de client */}
            {showClientModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                            <h2 className="text-2xl font-bold">Sélectionner un client</h2>
                            <p className="text-blue-100 text-sm mt-1">Choisissez le client et appliquez des filtres optionnels</p>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                            {/* Filtres optionnels */}
                            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <Filter size={16} />
                                    Filtres optionnels
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Type d'ordre */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Type d'ordre
                                        </label>
                                        <select
                                            value={preFilterType}
                                            onChange={(e) => setPreFilterType(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="all">Tous les types</option>
                                            <option value="préventif">Préventif</option>
                                            <option value="correctif">Correctif</option>
                                        </select>
                                    </div>

                                    {/* Technicien */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Technicien
                                        </label>
                                        <select
                                            value={preFilterTechnicien}
                                            onChange={(e) => setPreFilterTechnicien(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="all">Tous les techniciens</option>
                                            {techniciens.map(tech => (
                                                <option key={tech.id} value={tech.id}>{tech.nom}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Statut OT */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Statut OT
                                        </label>
                                        <select
                                            value={preFilterStatutOT}
                                            onChange={(e) => setPreFilterStatutOT(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="all">Tous</option>
                                            <option value="prévu">Prévu</option>
                                            <option value="en_cours">En cours</option>
                                            <option value="terminé">Clôturé</option>
                                            <option value="annulé">Annulé</option>
                                            <option value="clôturé_avec_anomalie">Clôturé avec anomalie</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Liste des clients */}
                            {loadingClients ? (
                                <div className="text-center py-8">
                                    <Loader2 size={32} className="mx-auto text-blue-600 animate-spin mb-2" />
                                    <p className="text-slate-600">Chargement des clients...</p>
                                </div>
                            ) : clients.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-slate-600">Aucun client trouvé</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <h3 className="text-sm font-semibold text-slate-700">
                                            Sélectionner un client ({clients.length})
                                        </h3>
                                        {selectedClient && (
                                            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700">
                                                <span className="font-medium">Client actuel:</span>
                                                <span>{selectedClient.raison_sociale || selectedClient.prenom}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {clients.map((client) => (
                                            <button
                                                key={client.id}
                                                onClick={() => handleClientSelection(client.id)}
                                                className={`p-4 rounded-lg transition-all text-left group ${client.id === selectedClientId ? 'border-2 border-blue-500 bg-blue-50 shadow-sm' : 'border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                                        <User size={20} className="text-blue-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                                                            {client.raison_sociale || client.prenom}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1 sm:mb-2">Interventions</h1>
                            <p className="text-sm sm:text-base text-slate-600">Gestion et suivi des interventions techniques</p>
                        </div>
                        {selectedClientId && (
                            <button
                                onClick={() => setShowClientModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm font-medium"
                            >
                                <User size={18} />
                                Changer de client
                            </button>
                        )}
                    </div>
                </div>

                {/* Barre de recherche et compteur */}
                <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                        {/* Search */}
                        <div className="flex-1 w-full relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Results Count */}
                        <div className="text-xs sm:text-sm text-slate-600 whitespace-nowrap">
                            {filteredInterventions.length} intervention{filteredInterventions.length > 1 ? 's' : ''} trouvée{filteredInterventions.length > 1 ? 's' : ''}
                            {filteredInterventions.length > itemsPerPage && (
                                <span className="ml-2">
                                    (page {currentPage} sur {totalPages})
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* VUE MOBILE - CARTES */}
                <div className="lg:hidden space-y-3">
                    {paginatedInterventions.map((intervention) => {
                        const nonConformites = analyserNonConformites(intervention);
                        const etapesReportees = intervention.etapes_gamme_checkees?.filter((etape: any) => 
                            etape.statut === StatutEtapeGamme.REPORTE
                        ) || [];
                        
                        return (
                            <div 
                                key={intervention.id} 
                                className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden border-l-4 ${
                                    intervention.ordre_travail?.type === 'préventif' ? 'border-l-purple-400' :
                                    intervention.ordre_travail?.type === 'correctif' ? 'border-l-orange-400' :
                                    intervention.ordre_travail?.type === 'curatif' ? 'border-l-red-400' :
                                    'border-l-slate-300'
                                }`}
                            >
                                {/* Header de la carte */}
                                <div className="p-3 border-b border-slate-200 bg-slate-50">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <h3 className="text-sm font-bold text-slate-900">
                                                {intervention.ordre_travail?.machine?.nom || 'N/A'}
                                            </h3>
                                            <p className="text-xs text-slate-600">
                                                {intervention.ordre_travail?.machine?.modele || ''}
                                            </p>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getTypeColor(intervention.ordre_travail?.type || '')}`}>
                                            {getTypeLabel(intervention.ordre_travail?.type || '')}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getStatutOTColor(intervention.ordre_travail?.statut || '')}`}>
                                            {getStatutOTLabel(intervention.ordre_travail?.statut || 'N/A')}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getEtatMachineColor(intervention.etat_machine_apres)}`}>
                                            {getMachineStateConfig(intervention.etat_machine_apres).label}
                                        </span>
                                    </div>
                                </div>

                                {/* Contenu de la carte */}
                                <div className="p-3 space-y-2">
                                    {/* Client */}
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-slate-400 flex-shrink-0" />
                                        <span className="text-xs text-slate-600">Client:</span>
                                        <span className="text-xs text-slate-900 font-medium">
                                            {intervention.ordre_travail?.machine?.client?.raison_sociale || 
                                             intervention.ordre_travail?.machine?.client?.prenom || 'N/A'}
                                        </span>
                                    </div>

                                    {/* Technicien */}
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-slate-400 flex-shrink-0" />
                                        <span className="text-xs text-slate-600">Technicien:</span>
                                        <span className="text-xs text-slate-900 font-medium">
                                            {intervention.technicien?.nom || 'Non assigné'}
                                        </span>
                                    </div>

                                    {/* Date */}
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                                        <span className="text-xs text-slate-600">Date:</span>
                                        <span className="text-xs text-slate-900 font-medium">
                                            {formatDate(intervention.date_debut)}
                                        </span>
                                    </div>

                                    {/* Problèmes */}
                                    {(etapesReportees.length > 0 || nonConformites.count > 0) && (
                                        <div className="pt-2 border-t border-slate-200">
                                            <div className="flex flex-wrap gap-2">
                                                {etapesReportees.length > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                                        <Calendar size={12} />
                                                        {etapesReportees.length} reportée{etapesReportees.length > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                {nonConformites.count > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                                                        <AlertTriangle size={12} />
                                                        {nonConformites.count} non-conforme{nonConformites.count > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Validation */}
                                    <div className="pt-2 border-t border-slate-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={intervention.valide}
                                                    onChange={(e) => handleValidationClick(intervention, e.target.checked ? 'validate' : 'invalidate')}
                                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                                                />
                                                <span className="text-xs text-slate-600">
                                                    {intervention.valide ? (
                                                        <span className="flex items-center gap-1 text-green-700 font-medium">
                                                            <CheckCircle size={12} />
                                                            Validé
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-amber-700 font-medium">
                                                            <AlertTriangle size={12} />
                                                            En attente
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            {intervention.valide && intervention.valide_le && (
                                                <span className="text-xs text-slate-400">
                                                    {new Date(intervention.valide_le).toLocaleDateString('fr-FR')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-200">
                                        <ClientValidationSummary intervention={intervention} compact />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
                                    <button
                                        onClick={() => navigate(`/admin/intervention/${intervention.id}`)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs transition-colors"
                                    >
                                        <Eye size={14} />
                                        <span>Voir</span>
                                    </button>
                                    <button
                                        onClick={() => handleEdit(intervention)}
                                        disabled={intervention.valide}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs transition-colors ${
                                            intervention.valide
                                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                                        }`}
                                    >
                                        <Edit size={14} />
                                        <span>Modifier</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(intervention.id)}
                                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {filteredInterventions.length === 0 && (
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
                            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-600 text-base font-medium mb-2">Aucune intervention trouvée</p>
                            <p className="text-slate-500 text-sm">Essayez de modifier vos critères de recherche</p>
                        </div>
                    )}
                </div>

                {/* VUE DESKTOP - TABLE */}
                <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Machine
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Client
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Technicien
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Date début
                                    </th><th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Statut OT
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        État machine
                                    </th>
                                    
                                    <th className="sticky right-[420px] bg-white px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                                        Problèmes
                                    </th>
                                    <th className="sticky right-[280px] bg-white px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                                        Validation admin
                                    </th>
                                    <th className="sticky right-[140px] bg-white px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                                        Validation client
                                    </th>
                                    <th className="sticky right-0 bg-white px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {paginatedInterventions.map((intervention) => {
                                    const nonConformites = analyserNonConformites(intervention);
                                    const typeRowColor = getTypeRowColor(intervention.ordre_travail?.type || '');
                                    const typeStickyColor = getTypeStickyColor(intervention.ordre_travail?.type || '');
                                    
                                    return (
                                    <tr key={intervention.id} className={`group ${typeRowColor} transition-colors border-l-4 ${
                                        intervention.ordre_travail?.type === 'préventif' ? 'border-l-purple-400' :
                                        intervention.ordre_travail?.type === 'correctif' ? 'border-l-orange-400' :
                                        intervention.ordre_travail?.type === 'curatif' ? 'border-l-red-400' :
                                        'border-l-transparent'
                                    }`}>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-900 font-medium">
                                                {intervention.ordre_travail?.machine?.nom || 'N/A'}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {intervention.ordre_travail?.machine?.modele || ''}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-900 font-medium">
                                                {intervention.ordre_travail?.machine?.client?.raison_sociale || 
                                                 intervention.ordre_travail?.machine?.client?.prenom || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(intervention.ordre_travail?.type || '')}`}>
                                                {getTypeLabel(intervention.ordre_travail?.type || '')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <User size={16} className="text-slate-400" />
                                                <span className="text-sm text-slate-900">
                                                    {intervention.technicien?.nom || 'Non assigné'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={16} className="text-slate-400" />
                                                <span className="text-sm text-slate-900">
                                                    {formatDate(intervention.date_debut)}
                                                </span>
                                            </div>
                                        </td> <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatutOTColor(intervention.ordre_travail?.statut || '')}`}>
                                                {getStatutOTLabel(intervention.ordre_travail?.statut || 'N/A')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEtatMachineColor(intervention.etat_machine_apres)}`}>
                                                {getMachineStateConfig(intervention.etat_machine_apres).label}
                                            </span>
                                        </td>
                                       
                                        <td className={`sticky right-[420px] ${typeStickyColor} px-6 py-4 whitespace-nowrap text-center shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)] transition-colors`}>
                                            <div className="flex flex-col items-center gap-2">
                                                {/* Badge pour les étapes reportées */}
                                                {(() => {
                                                    const etapesReportees = intervention.etapes_gamme_checkees?.filter((etape: any) => 
                                                        etape.statut === StatutEtapeGamme.REPORTE
                                                    ) || [];
                                                    
                                                    return etapesReportees.length > 0 ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                                            <Calendar size={14} />
                                                            {etapesReportees.length} reportée{etapesReportees.length > 1 ? 's' : ''}
                                                        </span>
                                                    ) : null;
                                                })()}
                                                
                                                {/* Badge pour les non-conformités */}
                                                {nonConformites.count > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                                                        <AlertTriangle size={14} />
                                                        {nonConformites.count} non-conforme{nonConformites.count > 1 ? 's' : ''}
                                                    </span>
                                                ) : null}
                                                
                                                {/* Message si aucun problème */}
                                                {nonConformites.count === 0 && 
                                                 (intervention.etapes_gamme_checkees?.filter((etape: any) => 
                                                    etape.statut === StatutEtapeGamme.REPORTE
                                                 ) || []).length === 0 && (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={`sticky right-[280px] ${typeStickyColor} px-6 py-4 whitespace-nowrap shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)] transition-colors`}>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={intervention.valide}
                                                    onChange={(e) => handleValidationClick(intervention, e.target.checked ? 'validate' : 'invalidate')}
                                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                                                />
                                                <span className="text-xs text-slate-500">
                                                    {intervention.valide ? 'Validé' : 'En attente'}
                                                </span>
                                            </div>
                                            {intervention.valide && intervention.valide_le && (
                                                <div className="text-xs text-slate-400 mt-1">
                                                    {formatDate(intervention.valide_le)}
                                                </div>
                                            )}
                                        </td>
                                        <td className={`sticky right-[140px] ${typeStickyColor} px-6 py-4 min-w-[180px] shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)] transition-colors`}>
                                            <ClientValidationSummary intervention={intervention} />
                                        </td>
                                        <td className={`sticky right-0 ${typeStickyColor} px-6 py-4 whitespace-nowrap shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)] transition-colors`}>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/admin/intervention/${intervention.id}`)}
                                                    className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                                                    title="Voir détails"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(intervention)}
                                                    disabled={intervention.valide}
                                                    className={`p-2 rounded-lg transition-colors border ${
                                                        intervention.valide
                                                            ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed opacity-50'
                                                            : 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                                    }`}
                                                    title={intervention.valide ? "Intervention validée - modification impossible" : "Modifier"}
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(intervention.id)}
                                                    className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {filteredInterventions.length === 0 && (
                        <div className="text-center py-12">
                            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-600 text-lg font-medium mb-2">Aucune intervention trouvée</p>
                            <p className="text-slate-500 text-sm">Essayez de modifier vos critères de recherche</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {filteredInterventions.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mt-4 sm:mt-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                            {/* Items per page */}
                            <div className="flex items-center gap-2 text-xs sm:text-sm">
                                <label className="text-slate-600">Afficher:</label>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className="text-slate-600 hidden sm:inline">par page</span>
                            </div>

                            {/* Page info */}
                            <div className="text-xs sm:text-sm text-slate-600 text-center">
                                {startIndex + 1} - {Math.min(endIndex, filteredInterventions.length)} sur {filteredInterventions.length}
                            </div>

                            {/* Page navigation */}
                            <div className="flex items-center gap-1 sm:gap-2">
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-1.5 sm:p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="Page précédente"
                                >
                                    <ChevronLeft size={16} className="text-slate-600" />
                                </button>

                                <div className="flex items-center gap-1">
                                    {getPageNumbers().map((page, index) => (
                                        page === '...' ? (
                                            <span key={`ellipsis-${index}`} className="px-2 sm:px-3 py-1 sm:py-1.5 text-slate-400 text-xs sm:text-sm">
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                key={page}
                                                onClick={() => goToPage(page as number)}
                                                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                                                    currentPage === page
                                                        ? 'bg-blue-600 text-white'
                                                        : 'text-slate-600 hover:bg-slate-100'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        )
                                    ))}
                                </div>

                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 sm:p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="Page suivante"
                                >
                                    <ChevronRight size={16} className="text-slate-600" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dialog de confirmation de validation */}
                {showValidationDialog && selectedIntervention && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
                            {/* En-tête */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-200">
                                <h3 className="text-lg font-semibold text-slate-900">
                                    {validationAction === 'validate' ? 'Valider l\'intervention' : 'Invalider l\'intervention'}
                                </h3>
                                <button
                                    onClick={() => setShowValidationDialog(false)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            {/* Contenu */}
                            <div className="p-6">
                                <div className="mb-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        {validationAction === 'validate' ? (
                                            <CheckCircle className="text-green-600" size={24} />
                                        ) : (
                                            <XCircle className="text-red-600" size={24} />
                                        )}
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                {selectedIntervention.ordre_travail?.machine?.nom}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                Technicien: {selectedIntervention.technicien?.nom}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                    <div>
                                        <span className="text-slate-500">Date:</span>
                                        <p className="font-medium">{formatDate(selectedIntervention.date_debut)}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Durée:</span>
                                        <p className="font-medium">{formatDuree(selectedIntervention.duree_minutes)}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Résultat:</span>
                                        <p className="font-medium">{selectedIntervention.resultat || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">État machine:</span>
                                        <p className="font-medium">{getMachineStateConfig(selectedIntervention.etat_machine_apres).label}</p>
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                                    <p className="text-sm text-amber-800">
                                        {validationAction === 'validate' 
                                            ? 'Êtes-vous sûr de vouloir valider cette intervention ? Cette action confirmera que le travail a été effectué correctement.'
                                            : 'Êtes-vous sûr de vouloir invalider cette intervention ? Cette action indiquera que le travail nécessite une révision.'
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 p-6 border-t border-slate-200">
                                <button
                                    onClick={() => setShowValidationDialog(false)}
                                    disabled={validating}
                                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={confirmValidation}
                                    disabled={validating}
                                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                        validationAction === 'validate'
                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                            : 'bg-red-600 hover:bg-red-700 text-white'
                                    }`}
                                >
                                    {validating ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            {validationAction === 'validate' ? 'Validation...' : 'Invalidation...'}
                                        </>
                                    ) : (
                                        validationAction === 'validate' ? 'Valider' : 'Invalider'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de replanification */}
                {showReplanificationModal && selectedInterventionForReplan && (
                    <ReplanificationModal
                        etapesReportees={selectedInterventionForReplan.etapes_gamme_checkees?.filter((etape: any) => 
                            etape.statut === StatutEtapeGamme.REPORTE
                        ) || []}
                        etapesGammeDetails={[]}
                        ordreOriginal={{
                            id: selectedInterventionForReplan.ordre_travail_id,
                            machine: selectedInterventionForReplan.ordre_travail?.machine || { nom: 'N/A' },
                            plans_maintenance: selectedInterventionForReplan.ordre_travail?.plan ? {
                                gamme: { nom: selectedInterventionForReplan.ordre_travail.plan.gamme?.nom || 'N/A' }
                            } : undefined
                        }}
                        onConfirm={creerOTReplanification}
                        onCancel={() => {
                            setShowReplanificationModal(false);
                            setSelectedInterventionForReplan(null);
                        }}
                        onValidateWithoutOT={validerSansCreerOT}
                    />
                )}

                {/* Modal double action (reporté + non-conforme) */}
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
                            machine: selectedInterventionForReplan.ordre_travail?.machine || { nom: 'N/A' },
                            plans_maintenance: selectedInterventionForReplan.ordre_travail?.plan ? {
                                gamme: { nom: selectedInterventionForReplan.ordre_travail.plan.gamme?.nom || 'N/A' }
                            } : undefined
                        }}
                        onConfirm={creerOTDuaux}
                        onCancel={() => {
                            setShowDualActionModal(false);
                            setSelectedInterventionForReplan(null);
                            setSelectedInterventionForOT(null);
                        }}
                        onValidateWithoutOT={validerSansCreerOT}
                    />
                )}

                {/* Modal correctif seul */}
                {showCorrectifModal && selectedInterventionForOT && (
                    <CorrectifModal
                        etapesNonConformes={selectedInterventionForOT.etapes_gamme_checkees?.filter((etape: any) => 
                            etape.statut === StatutEtapeGamme.ACTION_CORRECTIVE
                        ) || []}
                        ordreOriginal={{
                            id: selectedInterventionForOT.ordre_travail_id,
                            machine: selectedInterventionForOT.ordre_travail?.machine || { nom: 'N/A' },
                            plans_maintenance: selectedInterventionForOT.ordre_travail?.plan ? {
                                gamme: { nom: selectedInterventionForOT.ordre_travail.plan.gamme?.nom || 'N/A' }
                            } : undefined
                        }}
                        onConfirm={creerOTCorrectifSeul}
                        onCancel={() => {
                            setShowCorrectifModal(false);
                            setSelectedInterventionForOT(null);
                        }}
                        onValidateWithoutOT={validerSansCreerOT}
                    />
                )}
            </div>
        </div>
    );
};

function ClientValidationSummary({
    intervention
}: {
    intervention: Pick<Intervention, 'client_valide'>;
}) {
    return (
        <div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                intervention.client_valide
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
                {intervention.client_valide ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                {intervention.client_valide ? 'Validé client' : 'Non validé client'}
            </span>
        </div>
    );
}

export default InterventionsTable;
