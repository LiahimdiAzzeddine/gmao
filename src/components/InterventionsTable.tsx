import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Calendar, User, FileText, ChevronDown, Eye, Edit, Trash2, Loader2, CheckCircle, XCircle, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { MachineState, getMachineStateConfig } from '../types/machineState';
import { StatutEtapeGamme } from '../types/etapeGamme';
import ReplanificationModal from './ReplanificationModal';
import DualActionModal from './DualActionModal';
import CorrectifModal from './CorrectifModal';
import type { PlanActionFormData } from './PlanActionValidationModal';
import { createInterventionFollowup } from '../services/interventionFollowup';
import { getOtStatusLabel } from '../utils/otStatus';
import { getInterventionValidationConfig, getInterventionValidationLabel } from '../utils/interventionStatus';

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
        gamme_nom?: string | null;
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

let interventionsListStateCache: {
    signature: string;
    interventions: Intervention[];
    totalCount: number;
    hasMore: boolean;
    nextOffset: number;
    scrollY: number;
    showFilters: boolean;
} | null = null;

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
    const [searchTerm, setSearchTerm] = useState<string>(() => localStorage.getItem('interventions_searchTerm') || '');
    const [filterType, setFilterType] = useState<string>(() => localStorage.getItem('interventions_filterType') || 'all');
    const [filterTechnicien, setFilterTechnicien] = useState<string>(() => localStorage.getItem('interventions_filterTechnicien') || 'all');
    const [filterStatutOT, setFilterStatutOT] = useState<string>(() => localStorage.getItem('interventions_filterStatutOT') || 'all');
    const [filterDateProgrammee, setFilterDateProgrammee] = useState<string>(() => localStorage.getItem('interventions_filterDateProgrammee') || '');
    const [filterDateProgrammeeFin, setFilterDateProgrammeeFin] = useState<string>(() => localStorage.getItem('interventions_filterDateProgrammeeFin') || '');
    const [filterDateRealisation, setFilterDateRealisation] = useState<string>(() => localStorage.getItem('interventions_filterDateRealisation') || '');
    const [filterDateRealisationFin, setFilterDateRealisationFin] = useState<string>(() => localStorage.getItem('interventions_filterDateRealisationFin') || '');
    const [showFilters, setShowFilters] = useState(false);
    
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [techniciens, setTechniciens] = useState<any[]>([]);

    const selectedClient = clients.find((client) => client.id === selectedClientId) || null;
    
    // État du chargement progressif
    const PAGE_SIZE = 20;
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const nextOffsetRef = useRef(0);
    const requestVersionRef = useRef(0);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const restoreAttemptedRef = useRef(false);
    
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

    // Conserver les filtres lors d'un retour sur la page ou d'un rechargement.
    useEffect(() => {
        localStorage.setItem('interventions_searchTerm', searchTerm);
        localStorage.setItem('interventions_filterType', filterType);
        localStorage.setItem('interventions_filterTechnicien', filterTechnicien);
        localStorage.setItem('interventions_filterStatutOT', filterStatutOT);
        localStorage.setItem('interventions_filterDateProgrammee', filterDateProgrammee);
        localStorage.setItem('interventions_filterDateProgrammeeFin', filterDateProgrammeeFin);
        localStorage.setItem('interventions_filterDateRealisation', filterDateRealisation);
        localStorage.setItem('interventions_filterDateRealisationFin', filterDateRealisationFin);
    }, [searchTerm, filterType, filterTechnicien, filterStatutOT, filterDateProgrammee, filterDateProgrammeeFin, filterDateRealisation, filterDateRealisationFin]);

    // Charger les clients au montage
    useEffect(() => {
        fetchClients();
        fetchTechniciens(); // Charger les techniciens pour le modal
    }, []);

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

    const getNextDate = (date: string) => {
        const nextDate = new Date(`${date}T00:00:00Z`);
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        return nextDate.toISOString().slice(0, 10);
    };

    const getListSignature = () => JSON.stringify({
        selectedClientId,
        searchTerm,
        filterType,
        filterTechnicien,
        filterStatutOT,
        filterDateProgrammee,
        filterDateProgrammeeFin,
        filterDateRealisation,
        filterDateRealisationFin
    });

    const preserveListState = () => {
        interventionsListStateCache = {
            signature: getListSignature(),
            interventions,
            totalCount,
            hasMore,
            nextOffset: nextOffsetRef.current,
            scrollY: window.scrollY,
            showFilters
        };
    };

    const fetchInterventions = async (append = false): Promise<void> => {
        if (!selectedClientId) return;

        const version = append ? requestVersionRef.current : ++requestVersionRef.current;
        const offset = append ? nextOffsetRef.current : 0;

        try {
            setLoading(true);
            setError(null);

            // D'abord, récupérer les machines du client
            const { data: machinesData, error: machinesError } = await supabase
                .from('machines')
                .select('id, nom, modele')
                .eq('client_id', selectedClientId);

            if (machinesError) throw machinesError;

            const machineIds = machinesData?.map(m => m.id) || [];

            if (machineIds.length === 0) {
                if (version !== requestVersionRef.current) return;
                setInterventions([]);
                nextOffsetRef.current = 0;
                setTotalCount(0);
                setHasMore(false);
                return;
            }

            // Les filtres OT sont exécutés par PostgreSQL avant le chargement de la tranche.
            let otQuery = supabase
                .from('ordres_travail')
                .select('id, machine_id, plan:plans_maintenance(gamme:gammes_maintenance(nom))')
                .in('machine_id', machineIds);

            if (filterType !== 'all') otQuery = otQuery.eq('type', filterType);
            if (filterStatutOT !== 'all') otQuery = otQuery.eq('statut', filterStatutOT);
            if (filterDateProgrammee) {
                otQuery = otQuery.gte('date_programmee', `${filterDateProgrammee}T00:00:00`);
            }
            if (filterDateProgrammeeFin) {
                otQuery = otQuery.lt('date_programmee', `${getNextDate(filterDateProgrammeeFin)}T00:00:00`);
            }

            const { data: otData, error: otError } = await otQuery;

            if (otError) throw otError;

            const allOtIds = (otData || []).map((ot: any) => ot.id);
            let matchingOtIds = allOtIds;
            let matchingTechnicianIds: string[] = [];
            const normalizedSearch = searchTerm.trim().toLocaleLowerCase('fr');
            const normalizedInterventionId = normalizedSearch.replace(/^#/, '');
            const isInterventionIdSearch = /^[0-9a-f-]{1,36}$/.test(normalizedInterventionId);
            const interventionIdPrefix = normalizedInterventionId.slice(0, 8);

            if (normalizedSearch) {
                const selectedClientName = `${selectedClient?.raison_sociale || ''} ${selectedClient?.prenom || ''}`.toLocaleLowerCase('fr');
                if (!selectedClientName.includes(normalizedSearch)) {
                    const matchingMachineIds = new Set(
                        (machinesData || [])
                            .filter((machine: any) => `${machine.nom || ''} ${machine.modele || ''}`.toLocaleLowerCase('fr').includes(normalizedSearch))
                            .map((machine: any) => machine.id)
                    );
                    matchingOtIds = (otData || [])
                        .filter((ot: any) => {
                            const gammeNom = ot.plan?.gamme?.nom || '';
                            const matchesOtId = isInterventionIdSearch && ot.id.toLowerCase().startsWith(normalizedInterventionId);
                            return matchesOtId || matchingMachineIds.has(ot.machine_id) || gammeNom.toLocaleLowerCase('fr').includes(normalizedSearch);
                        })
                        .map((ot: any) => ot.id);

                    const { data: matchingTechnicians, error: techniciansError } = await supabase
                        .from('profiles')
                        .select('id')
                        .ilike('nom', `%${searchTerm.trim()}%`);
                    if (techniciansError) throw techniciansError;
                    matchingTechnicianIds = (matchingTechnicians || []).map((profile: any) => profile.id);
                }
            }

            if (allOtIds.length === 0 || (matchingOtIds.length === 0 && matchingTechnicianIds.length === 0 && !isInterventionIdSearch)) {
                if (version !== requestVersionRef.current) return;
                setInterventions([]);
                nextOffsetRef.current = 0;
                setTotalCount(0);
                setHasMore(false);
                return;
            }

            let interventionsQuery = supabase
                .from('interventions')
                .select(`
                    *,
                    ordre_travail:ordres_travail!interventions_ot_fkey(
                        id,
                        type,
                        statut,
                        date_programmee,
                        ot_parent_id,
                        intervention_source_id,
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
                `, { count: 'exact' })
                .in('ordre_travail_id', allOtIds)
                .order('date_debut', { ascending: false });

            if (normalizedSearch && matchingOtIds.length !== allOtIds.length) {
                const searchClauses: string[] = [];
                if (matchingOtIds.length > 0) searchClauses.push(`ordre_travail_id.in.(${matchingOtIds.join(',')})`);
                if (matchingTechnicianIds.length > 0) searchClauses.push(`technicien_id.in.(${matchingTechnicianIds.join(',')})`);
                if (isInterventionIdSearch) searchClauses.push(`search_id.ilike.${interventionIdPrefix}%`);
                interventionsQuery = interventionsQuery.or(searchClauses.join(','));
            }
            if (filterTechnicien !== 'all') {
                interventionsQuery = interventionsQuery.eq('technicien_id', filterTechnicien);
            }
            if (filterDateRealisation) {
                interventionsQuery = interventionsQuery.gte('date_debut', `${filterDateRealisation}T00:00:00`);
            }
            if (filterDateRealisationFin) {
                interventionsQuery = interventionsQuery.lt('date_debut', `${getNextDate(filterDateRealisationFin)}T00:00:00`);
            }

            const { data, error, count } = await interventionsQuery.range(offset, offset + PAGE_SIZE - 1);

            if (error) throw error;

            const interventionsAvecGamme = (data || []).map((item: any) => ({
                ...item,
                ordre_travail: {
                    ...item.ordre_travail,
                    gamme_nom: item.ordre_travail?.plan?.gamme?.nom || null
                }
            }));

            const parentIds = [...new Set(
                interventionsAvecGamme
                    .filter((item: any) => !item.ordre_travail?.gamme_nom && item.ordre_travail?.ot_parent_id)
                    .map((item: any) => item.ordre_travail.ot_parent_id)
            )];

            if (parentIds.length > 0) {
                const { data: parents } = await supabase
                    .from('ordres_travail')
                    .select(`
                        id,
                        plan:plans_maintenance(
                            gamme:gammes_maintenance(nom)
                        )
                    `)
                    .in('id', parentIds);

                const gammeParParent = new Map(
                    (parents || []).map((parent: any) => [parent.id, parent.plan?.gamme?.nom || null])
                );

                interventionsAvecGamme.forEach((item: any) => {
                    if (!item.ordre_travail?.gamme_nom && item.ordre_travail?.ot_parent_id) {
                        item.ordre_travail.gamme_nom = gammeParParent.get(item.ordre_travail.ot_parent_id) || null;
                    }
                });
            }

            if (version !== requestVersionRef.current) return;
            setInterventions((previous) => append ? [...previous, ...interventionsAvecGamme] : interventionsAvecGamme);
            nextOffsetRef.current = offset + interventionsAvecGamme.length;
            setTotalCount(count || 0);
            setHasMore(offset + interventionsAvecGamme.length < (count || 0));
        } catch (err) {
            if (version !== requestVersionRef.current) return;
            console.error('Erreur lors du chargement des interventions:', err);
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            if (version === requestVersionRef.current) setLoading(false);
        }
    };

    // Un court délai évite une requête à chaque frappe dans le champ de recherche.
    useEffect(() => {
        if (!selectedClientId) return;

        if (!restoreAttemptedRef.current) {
            restoreAttemptedRef.current = true;
            const saved = interventionsListStateCache;
            interventionsListStateCache = null;
            if (saved?.signature === getListSignature()) {
                setInterventions(saved.interventions);
                setTotalCount(saved.totalCount);
                setHasMore(saved.hasMore);
                nextOffsetRef.current = saved.nextOffset;
                setShowFilters(saved.showFilters);
                window.setTimeout(() => window.scrollTo({ top: saved.scrollY, behavior: 'auto' }), 0);
                return;
            }
        }

        const timer = window.setTimeout(() => fetchInterventions(false), 300);
        return () => window.clearTimeout(timer);
    }, [selectedClientId, searchTerm, filterType, filterTechnicien, filterStatutOT, filterDateProgrammee, filterDateProgrammeeFin, filterDateRealisation, filterDateRealisationFin]);

    useEffect(() => {
        const target = loadMoreRef.current;
        if (!target || !hasMore) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !loading) fetchInterventions(true);
            },
            { rootMargin: '300px' }
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [hasMore, loading]);

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
        failure_mode_id: data.failure_mode_id || null,
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

        const { error: otPlanActionError } = await supabase
            .from('ordres_travail')
            .update({
                ...buildPlanActionPayload(planActionData),
                classification_source: 'diagnostic',
                classification_confirmed: true,
            })
            .eq('id', intervention.ordre_travail_id);

        if (otPlanActionError) throw otPlanActionError;

        const { error } = await supabase
            .from('interventions')
            .update({
                action_cloturee: planActionData.action_cloturee,
                date_cloture_action: planActionData.date_cloture_action || null,
                commentaire: planActionData.observation_resultat.trim() || intervention.commentaire,
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

        {
            const intervention = selectedInterventionForOT;
            const result = await createInterventionFollowup({
                interventionId: intervention.id,
                parentOtNumber: (intervention.ordre_travail as any)?.numot,
                interventionDate: intervention.date_debut,
                steps: intervention.etapes_gamme_checkees || [],
                createReplanification: false,
                replanificationDate: new Date(),
                replanificationReason: '',
                createCorrective: true,
                correctiveDate: dateProgrammee,
                correctivePriority: priorite,
                correctiveObservations: observations,
                planAction,
            });
            await fetchInterventions();
            setShowCorrectifModal(false);
            setSelectedInterventionForOT(null);
            alert(`✅ OT correctif #${result.corrective_numot ?? ''} créé avec succès.`);
            return;
        }

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
                    classification_source: 'diagnostic',
                    classification_confirmed: true,
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
        planAction: PlanActionFormData | undefined,
        options: { creerReplanification: boolean; creerCorrectif: boolean }
    ) => {
        if (!selectedInterventionForReplan || !selectedInterventionForOT) return;
        if (options.creerCorrectif && !planAction) return;

        try {
            const intervention = selectedInterventionForReplan;
            const result = await createInterventionFollowup({
                interventionId: intervention.id,
                parentOtNumber: (intervention.ordre_travail as any)?.numot,
                interventionDate: intervention.date_debut,
                steps: intervention.etapes_gamme_checkees || [],
                createReplanification: options.creerReplanification,
                replanificationDate: dateReplanification,
                replanificationReason: raisonReport,
                createCorrective: options.creerCorrectif,
                correctiveDate: dateProgrammeeCorrectif,
                correctivePriority: prioriteCorrectif,
                correctiveObservations: observationsCorrectif,
                planAction,
            });

            await fetchInterventions();
            setShowDualActionModal(false);
            setSelectedInterventionForReplan(null);
            setSelectedInterventionForOT(null);

            const created = [
                result.replan_numot ? `OT de replanification #${result.replan_numot}` : '',
                result.corrective_numot ? `OT correctif #${result.corrective_numot}` : '',
            ].filter(Boolean).join('\n');
            alert(`✅ Création réussie\n${created}`);
            return;
        } catch (err) {
            console.error('Erreur lors de la création transactionnelle des OT:', err);
            alert(err instanceof Error ? err.message : '❌ Erreur lors de la création des OT');
            throw err;
        }

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
                    classification_source: 'diagnostic',
                    classification_confirmed: true,
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

        {
            const intervention = selectedInterventionForReplan;
            const result = await createInterventionFollowup({
                interventionId: intervention.id,
                parentOtNumber: (intervention.ordre_travail as any)?.numot,
                interventionDate: intervention.date_debut,
                steps: intervention.etapes_gamme_checkees || [],
                createReplanification: true,
                replanificationDate: dateReplanification,
                replanificationReason: raisonReport,
                createCorrective: false,
                correctiveDate: new Date().toISOString(),
                correctivePriority: 'moyenne',
                correctiveObservations: '',
            });
            await fetchInterventions();
            setShowReplanificationModal(false);
            setSelectedInterventionForReplan(null);
            alert(`✅ OT de replanification #${result.replan_numot ?? ''} créé avec succès.`);
            return;
        }

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

    const filteredInterventions = interventions;
    const paginatedInterventions = interventions;
    const activeFiltersCount = [
        filterType !== 'all',
        filterTechnicien !== 'all',
        filterStatutOT !== 'all',
        Boolean(filterDateProgrammee || filterDateProgrammeeFin),
        Boolean(filterDateRealisation || filterDateRealisationFin)
    ].filter(Boolean).length;

    const clearFilters = () => {
        setFilterType('all');
        setFilterTechnicien('all');
        setFilterStatutOT('all');
        setFilterDateProgrammee('');
        setFilterDateProgrammeeFin('');
        setFilterDateRealisation('');
        setFilterDateRealisationFin('');
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
        preserveListState();
        navigate(`/intervention/edit?ordre_id=${intervention.ordre_travail_id}&intervention_id=${intervention.id}`);
    };

    const handleView = (intervention: Intervention) => {
        preserveListState();
        navigate(`/admin/intervention/${intervention.id}`);
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

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
                <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
                    <p className="text-red-800 font-medium mb-2">Erreur de chargement</p>
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-2">
            {/* Modal de sélection de client */}
            {showClientModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl">
                        <div className="bg-[#f98440] p-5 text-white">
                            <h2 className="text-xl font-black">Sélectionner un client</h2>
                            <p className="mt-1 text-sm text-white/80">Choisissez le client et appliquez des filtres optionnels</p>
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
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
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
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
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
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
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
                                    <Loader2 size={32} className="mx-auto mb-2 animate-spin text-[#f98440]" />
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
                                            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm text-[#f98440]">
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
                                                className={`group rounded-lg p-3 text-left transition-all ${client.id === selectedClientId ? 'border-2 border-[#f98440] bg-orange-50 shadow-sm' : 'border-2 border-slate-200 hover:border-[#f98440]/60 hover:bg-orange-50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 transition-colors group-hover:bg-orange-200">
                                                        <User size={20} className="text-[#f98440]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="truncate font-semibold text-slate-800 group-hover:text-[#f98440]">
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
                <div className="mb-5 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Interventions</h1>
                            <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">Gestion et suivi des interventions techniques</p>
                        </div>
                        {selectedClientId && (
                            <button
                                onClick={() => setShowClientModal(true)}
                                className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-[#f98440] transition-colors hover:bg-orange-100"
                            >
                                <User size={18} />
                                Changer de client
                            </button>
                        )}
                    </div>
                </div>

                {/* Barre de recherche et compteur */}
                <div className="mb-5 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                        {/* Search */}
                        <div className="flex-1 w-full relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Rechercher par #ID intervention/OT, machine, technicien, gamme..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
                            />
                        </div>

                            <button
                                type="button"
                                onClick={() => setShowFilters((visible) => !visible)}
                                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${showFilters || activeFiltersCount > 0 ? 'bg-[#f98440] text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                                aria-expanded={showFilters}
                            >
                                <Filter size={18} />
                                Filtres
                                {activeFiltersCount > 0 && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[#f98440]">{activeFiltersCount}</span>}
                                <ChevronDown size={17} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                            </button>
                            <div className="text-xs sm:text-sm text-slate-600 whitespace-nowrap">
                                {interventions.length} sur {totalCount} intervention{totalCount > 1 ? 's' : ''}
                            </div>
                        </div>
                        {showFilters && (
                            <div className="border-t border-slate-200 pt-4">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30">
                                        <option value="all">Tous les types</option>
                                        <option value="préventif">Préventif</option>
                                        <option value="correctif">Correctif</option>
                                        <option value="curatif">Curatif</option>
                                    </select>
                                    <select value={filterTechnicien} onChange={(e) => setFilterTechnicien(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30">
                                        <option value="all">Tous les techniciens</option>
                                        {techniciens.map((technicien) => <option key={technicien.id} value={technicien.id}>{technicien.nom}</option>)}
                                    </select>
                                    <select value={filterStatutOT} onChange={(e) => setFilterStatutOT(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30">
                                        <option value="all">Tous les statuts OT</option>
                                        <option value="prévu">Prévu</option>
                                        <option value="en_cours">En cours</option>
                                        <option value="terminé">Clôturé</option>
                                        <option value="annulé">Annulé</option>
                                        <option value="clôturé_avec_anomalie">Clôturé avec anomalie</option>
                                    </select>
                                    <fieldset className="rounded-lg border border-slate-200 p-3 sm:col-span-2 xl:col-span-1">
                                        <legend className="px-1 text-xs font-semibold text-slate-600">Date programmée</legend>
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="text-xs text-slate-500">Du
                                                <input type="date" value={filterDateProgrammee} max={filterDateProgrammeeFin || undefined} onChange={(e) => setFilterDateProgrammee(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30" />
                                            </label>
                                            <label className="text-xs text-slate-500">Au
                                                <input type="date" value={filterDateProgrammeeFin} min={filterDateProgrammee || undefined} onChange={(e) => setFilterDateProgrammeeFin(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30" />
                                            </label>
                                        </div>
                                    </fieldset>
                                    <fieldset className="rounded-lg border border-slate-200 p-3 sm:col-span-2 xl:col-span-1">
                                        <legend className="px-1 text-xs font-semibold text-slate-600">Date de réalisation</legend>
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="text-xs text-slate-500">Du
                                                <input type="date" value={filterDateRealisation} max={filterDateRealisationFin || undefined} onChange={(e) => setFilterDateRealisation(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30" />
                                            </label>
                                            <label className="text-xs text-slate-500">Au
                                                <input type="date" value={filterDateRealisationFin} min={filterDateRealisation || undefined} onChange={(e) => setFilterDateRealisationFin(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30" />
                                            </label>
                                        </div>
                                    </fieldset>
                                </div>
                                {activeFiltersCount > 0 && (
                                    <div className="mt-3 flex justify-end">
                                        <button type="button" onClick={clearFilters} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-red-600">
                                            <X size={16} /> Réinitialiser les filtres
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
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
                                            <p className="mb-1 text-xs font-bold text-[#f98440]">
                                                #{intervention.id.slice(0, 8)}
                                            </p>
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
                                            {getOtStatusLabel(intervention.ordre_travail?.statut)}
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

                                    {/* Gamme */}
                                    <div className="flex items-center gap-2">
                                        <FileText size={14} className="text-slate-400 flex-shrink-0" />
                                        <span className="text-xs text-slate-600">Gamme:</span>
                                        <span className="truncate text-xs font-medium text-slate-900">
                                            {intervention.ordre_travail?.gamme_nom || 'Non renseignée'}
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
                                                    className="h-4 w-4 rounded border-slate-300 text-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
                                                />
                                                <span className="text-xs text-slate-600">
                                                    {intervention.valide ? (
                                                        <span className="flex items-center gap-1 text-green-700 font-medium">
                                                            <CheckCircle size={12} />
                                                            {getInterventionValidationLabel(true, 'admin')}
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-amber-700 font-medium">
                                                            <AlertTriangle size={12} />
                                                            {getInterventionValidationLabel(false, 'admin')}
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
                                        onClick={() => handleView(intervention)}
                                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#f98440] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#e97435]"
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

                    {!loading && filteredInterventions.length === 0 && (
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
                            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-600 text-base font-medium mb-2">Aucune intervention trouvée</p>
                            <p className="text-slate-500 text-sm">Essayez de modifier vos critères de recherche</p>
                        </div>
                    )}
                </div>

                {/* VUE DESKTOP - TABLE */}
                <div className="hidden overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-100 lg:block">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Intervention
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Machine
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Gamme
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
                                    
                                    <th className="sticky right-[400px] bg-white px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
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
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-[#f98440]">
                                                #{intervention.id.slice(0, 8)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-900 font-medium">
                                                {intervention.ordre_travail?.machine?.nom || 'N/A'}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {intervention.ordre_travail?.machine?.modele || ''}
                                            </div>
                                        </td>
                                        <td className="max-w-56 px-6 py-4">
                                            <span
                                                className="block truncate text-sm font-medium text-slate-900"
                                                title={intervention.ordre_travail?.gamme_nom || 'Non renseignée'}
                                            >
                                                {intervention.ordre_travail?.gamme_nom || 'Non renseignée'}
                                            </span>
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
                                                {getOtStatusLabel(intervention.ordre_travail?.statut)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEtatMachineColor(intervention.etat_machine_apres)}`}>
                                                {getMachineStateConfig(intervention.etat_machine_apres).label}
                                            </span>
                                        </td>
                                       
                                        <td className={`sticky right-[400px] ${typeStickyColor} px-6 py-4 whitespace-nowrap text-center shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)] transition-colors`}>
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
                                                    className="h-4 w-4 rounded border-slate-300 text-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
                                                />
                                                <span className="text-xs text-slate-500">
                                                    {getInterventionValidationLabel(intervention.valide, 'admin')}
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
                                                    onClick={() => handleView(intervention)}
                                                    className="rounded-lg border border-orange-200 bg-orange-50 p-2 text-[#f98440] transition-colors hover:bg-orange-100"
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

                    {!loading && filteredInterventions.length === 0 && (
                        <div className="text-center py-12">
                            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-600 text-lg font-medium mb-2">Aucune intervention trouvée</p>
                            <p className="text-slate-500 text-sm">Essayez de modifier vos critères de recherche</p>
                        </div>
                    )}
                </div>

                <div ref={loadMoreRef} className="flex min-h-16 items-center justify-center py-4 text-sm text-slate-500">
                    {loading && <><Loader2 size={18} className="mr-2 animate-spin text-[#f98440]" />Chargement des interventions...</>}
                    {!loading && hasMore && 'Faites défiler pour charger la suite'}
                    {!loading && !hasMore && interventions.length > 0 && `Toutes les interventions sont chargées (${totalCount})`}
                </div>

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
    compact?: boolean;
}) {
    const validation = getInterventionValidationConfig(intervention.client_valide, 'client');
    return (
        <div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${validation.className}`}>
                {intervention.client_valide ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                {validation.label}
            </span>
        </div>
    );
}

export default InterventionsTable;
