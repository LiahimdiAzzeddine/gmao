import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ClipboardList, Calendar, User, Clock, 
  CheckCircle2, PlayCircle, XCircle,
  ChevronDown, ChevronUp, FileText, Wrench,
  Filter, Search, X, AlertCircle, Hash, Download, Loader2
} from 'lucide-react';
import { Machine, Technicien, supabase } from '../../lib/supabase';
import { generateInterventionPDFFromNew } from '../../utils/generateInterventionPDF';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { generateOTPdfReact } from '../../utils/generateOTPdfReact';
import { generateOTCPdfReact } from '../../utils/generateOTCPdfReact';
import ClientInterventionValidationModal from '../ClientInterventionValidationModal';
import { getOtStatusLabel } from '../../utils/otStatus';
import { getInterventionValidationLabel } from '../../utils/interventionStatus';

interface OrdreTravail {
  id: string;
  statut: 'prévu' | 'en_cours' | 'terminé' | 'clôturé_avec_anomalie' | 'annulé';
  plan_id: string;
  type: string;
  created_at: string;
  technicien: Technicien | null;
  observations: string | null;
  technicien_id: string;
  date_execution: string | null;
  date_programmee: string;
}

interface Intervention {
  id: string;
  ordre_travail_id: string;
  valide: boolean;
  valide_le: string | null;
  client_valide: boolean;
  commentaire_client: string | null;
  date_debut: string;
  actions_realisees?: string;
}

interface OrdresTravailProps {
  machine: Machine;
  onVoirDetails?: (otId: string) => void;
  onDemarrer?: (otId: string) => void;
}

interface OrdreTravailEnrichi extends OrdreTravail {
  gamme_nom?: string;
  gamme_type?: string;
  intervention?: Intervention | null;
}

interface StatutConfig {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  textColor: string;
}

interface TypeConfig {
  color: string;
  label: string;
}

const OrdresTravail: React.FC<OrdresTravailProps> = ({ 
  machine, 
  onVoirDetails,
  onDemarrer
}) => {
  const navigate = useNavigate();
  const { profile } = useAuth(); // Récupérer le profil de l'utilisateur connecté
  const savedFilters = useRef(readSavedOTFilters(machine.id)).current;
  const [expandedOT, setExpandedOT] = useState<string | null>(null);
  // Pour les techniciens, filtrer par défaut sur les OT non clôturés
  const [filtreStatut, setFiltreStatut] = useState<string>(savedFilters.filtreStatut || (profile?.role === 'technicien' ? 'non_cloture' : 'tous'));
  const [filtreType, setFiltreType] = useState<string>(savedFilters.filtreType || 'tous');
  const [searchTerm, setSearchTerm] = useState<string>(savedFilters.searchTerm || '');
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loadingInterventions, setLoadingInterventions] = useState<boolean>(true);
  const [generatingPDF, setGeneratingPDF] = useState<boolean>(false);
  const [savingClientValidationId, setSavingClientValidationId] = useState<string | null>(null);
  const [selectedClientValidation, setSelectedClientValidation] = useState<Intervention | null>(null);

  useEffect(() => {
    if (profile?.role === 'technicien') {
      setFiltreStatut('non_cloture');
    }
  }, [profile?.role]);

  useEffect(() => {
    sessionStorage.setItem(getOTFiltersKey(machine.id), JSON.stringify({
      filtreStatut,
      filtreType,
      searchTerm,
    }));
  }, [machine.id, filtreStatut, filtreType, searchTerm]);

  // Charger les interventions associées aux ordres de travail
  useEffect(() => {
    loadInterventions();
  }, [machine]); // Recharger quand la machine change

  const loadInterventions = async () => {
    try {
      setLoadingInterventions(true);
      
      // Extraire tous les IDs des ordres de travail (des plans ET directement de la machine)
      const ordreIds: string[] = [];

      // IDs des ordres de travail des plans
      if (machine.plans_maintenance) {
        machine.plans_maintenance.forEach((plan: any) => {
          if (plan.ordres_travail) {
            plan.ordres_travail.forEach((ot: any) => {
              ordreIds.push(ot.id);
            });
          }
        });
      }

      // IDs des ordres de travail directement liés à la machine
      const machineWithOrdres = machine as Machine & { ordres_travail?: any[] };
      if (machineWithOrdres.ordres_travail) {
        machineWithOrdres.ordres_travail.forEach((ot: any) => {
          if (!ordreIds.includes(ot.id)) { // Éviter les doublons
            ordreIds.push(ot.id);
          }
        });
      }

      if (ordreIds.length === 0) {
        setInterventions([]);
        setLoadingInterventions(false);
        return;
      }

      const { data, error } = await supabase
        .from('interventions')
        .select('id, ordre_travail_id, valide, valide_le, client_valide, commentaire_client, date_debut')
        .in('ordre_travail_id', ordreIds);

      if (error) throw error;

      setInterventions(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des interventions:', err);
      setInterventions([]);
    } finally {
      setLoadingInterventions(false);
    }
  };

  // Extraire tous les ordres de travail avec leurs interventions
  const ordresTravail: OrdreTravailEnrichi[] = useMemo(() => {
    const ordres: OrdreTravailEnrichi[] = [];

    // 1. Ordres de travail des plans de maintenance (préventifs)
    if (machine.plans_maintenance) {
      machine.plans_maintenance.forEach((plan: { ordres_travail: any[]; type: any; gamme: { nom: any; type: any; }; }) => {
        if (plan.ordres_travail) {
          plan.ordres_travail.forEach((ot: any) => {
            const intervention = interventions.find(i => i.ordre_travail_id === ot.id);
            ordres.push({
              ...ot,
              gamme_nom: plan.gamme?.nom,
              gamme_type: plan.gamme?.type,
              intervention: intervention || null
            });
          });
        }
      });
    }

    // 2. Tous les ordres de travail directement liés à la machine (préventifs, correctifs, curatifs)
    const machineWithOrdres = machine as Machine & { ordres_travail?: any[] };
    if (machineWithOrdres.ordres_travail) {
      machineWithOrdres.ordres_travail.forEach((ot: any) => {
        // Éviter les doublons (si l'ordre est déjà dans les plans)
        const existeDeja = ordres.some(ordre => ordre.id === ot.id);
        if (!existeDeja) {
          const intervention = interventions.find(i => i.ordre_travail_id === ot.id);
          ordres.push({
            ...ot,
            gamme_nom: ot.plans_maintenance?.gamme?.nom,
            gamme_type: ot.plans_maintenance?.gamme?.type,
            intervention: intervention || null
          });
        }
      });
    }

    // Console log pour voir les statuts
    console.log('=== STATUTS DES ORDRES DE TRAVAIL ===');
    console.log('Total OT:', ordres.length);
    const statutsCount = ordres.reduce((acc, ot) => {
      acc[ot.statut] = (acc[ot.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('Répartition par statut:', statutsCount);
    console.log('Détails de chaque OT:');
    ordres.forEach((ot, index) => {
      console.log(`${index + 1}. OT #${ot.id.slice(0, 8)} - Statut: ${ot.statut} - Type: ${ot.type} - Gamme: ${ot.gamme_nom || 'N/A'}`);
    });
    console.log('=====================================');

    return ordres;
  }, [machine, interventions]);

  // Filtrer les ordres de travail
  const ordresFiltres = useMemo(() => {
    return ordresTravail.filter((ot) => {
      const normalizedStatus = normalizeFilterValue(ot.statut);
      const normalizedType = normalizeOTType(ot.type);
      const normalizedSearch = normalizeFilterValue(searchTerm.trim());

      // Pour les techniciens avec filtre 'non_cloture', exclure les OT terminés et clôturés avec anomalie
      const matchStatut = filtreStatut === 'tous' 
        ? true 
        : filtreStatut === 'non_cloture'
        ? normalizedStatus !== 'termine' && normalizedStatus !== 'cloture_avec_anomalie'
        : normalizedStatus === normalizeFilterValue(filtreStatut);
      
      const matchType = filtreType === 'tous' || normalizedType === filtreType;
      const matchSearch = normalizedSearch === '' || 
        normalizeFilterValue(ot.id).includes(normalizedSearch) ||
        normalizeFilterValue(ot.gamme_nom).includes(normalizedSearch) ||
        normalizeFilterValue(ot.technicien?.nom).includes(normalizedSearch);
      
      return matchStatut && matchType && matchSearch;
    });
  }, [ordresTravail, filtreStatut, filtreType, searchTerm]);

  const getStatutConfig = (statut: string): StatutConfig => {
    const configs: Record<string, StatutConfig> = {
      'prévu': {
        icon: <Clock size={18} />,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700'
      },
      'en_cours': {
        icon: <PlayCircle size={18} />,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700'
      },
      'terminé': {
        icon: <CheckCircle2 size={18} />,
        color: 'bg-green-100 text-green-800 border-green-200',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700'
      },
      'clôturé_avec_anomalie': {
        icon: <AlertCircle size={18} />,
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-700'
      },
      'annulé': {
        icon: <XCircle size={18} />,
        color: 'bg-red-100 text-red-800 border-red-200',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700'
      }
    };
    return configs[statut] || configs['prévu'];
  };

  const getTypeConfig = (type: string): TypeConfig => {
    const configs: Record<string, TypeConfig> = {
      'corrective': {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        label: 'Corrective'
      },
      'préventive': {
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        label: 'Préventive'
      },
      'curative': {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: 'Curative'
      }
    };
    const normalizedType = normalizeOTType(type);
    const normalizedConfigs: Record<string, TypeConfig> = {
      preventif: configs['préventive'],
      correctif: configs['corrective'],
      curatif: configs.curative,
    };
    return normalizedConfigs[normalizedType] || { color: 'bg-gray-100 text-gray-800 border-gray-200', label: type };
  };

  const getTypeRowColor = (type: string): string => {
    const colors: Record<string, string> = {
      'préventive': 'bg-purple-50',
      'corrective': 'bg-orange-50',
      'curative': 'bg-red-50'
    };
    const normalizedColors: Record<string, string> = {
      preventif: colors['préventive'],
      correctif: colors.corrective,
      curatif: colors.curative,
    };
    return normalizedColors[normalizeOTType(type)] || 'bg-white';
  };

  const getTypeBorderColor = (type: string): string => {
    const colors: Record<string, string> = {
      'préventive': 'border-l-purple-500',
      'corrective': 'border-l-orange-500',
      'curative': 'border-l-red-500'
    };
    const normalizedColors: Record<string, string> = {
      preventif: colors['préventive'],
      correctif: colors.corrective,
      curatif: colors.curative,
    };
    return normalizedColors[normalizeOTType(type)] || 'border-l-slate-300';
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const toggleExpand = (otId: string): void => {
    setExpandedOT(expandedOT === otId ? null : otId);
  };

  const handleVoirDetails = (otId: string): void => {
    if (onVoirDetails) {
      onVoirDetails(otId);
    }
  };

  const handleDemarrer = (otId: string): void => {
    if (onDemarrer) {
      onDemarrer(otId);
    }
  };

  const handleDownloadPDF = async (interventionId: string, ordreType: string): Promise<void> => {
    setGeneratingPDF(true);
    try {
      // Récupérer l'ordre de travail complet avec toutes les relations
      const { data: intervention, error: interventionError } = await supabase
        .from('interventions')
        .select('ordre_travail_id')
        .eq('id', interventionId)
        .single();

      if (interventionError) throw interventionError;
      if (!intervention) throw new Error('Intervention non trouvée');

      // Récupérer l'ordre de travail complet
      const { data: ordre, error: ordreError } = await supabase
        .from('ordres_travail')
        .select(`
          *,
          machine:machines(
            *,
            poste_technique:poste_technique_id (
              id,
              code_pt,
              batiment,
              site:site_id (
                code,
                nom
              ),
              domaine:domaine_id (
                code,
                libelle
              ),
              secteur:secteur_id (
                code,
                libelle
              )
            ),
            client:client_id (
              id,
              raison_sociale,
              prenom,
              logo_url
            )
          ),
          plans_maintenance:plan_id(
            *,
            gamme:gamme_id(
              id,
              nom,
              description,
              type,
              etapes_gamme (
                id,
                ordre,
                description,
                duree_estimee,
                outil,
                piece,
                consigne_securite
              )
            )
          ),
          interventions:interventions!interventions_ot_fkey(
            *,
            technicien:profiles!interventions_technicien_fkey(*),
            validateur:profiles!interventions_valide_par_fkey(
              id,
              nom
            )
          )
        `)
        .eq('id', intervention.ordre_travail_id)
        .single();

      if (ordreError) throw ordreError;
      if (!ordre) throw new Error('Ordre de travail non trouvé');

      // Générer le PDF selon le type
      if (ordreType === 'préventif') {
        await generateOTPdfReact(ordre);
      } else {
        await generateOTCPdfReact(ordre);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleClientValidate = async (interventionId: string, commentaireClient: string): Promise<void> => {
    const intervention = interventions.find((item) => item.id === interventionId);
    if (!intervention || intervention.client_valide || profile?.role !== 'consultant') return;

    try {
      setSavingClientValidationId(interventionId);

      const { data, error } = await supabase
        .from('interventions')
        .update({
          client_valide: true,
          commentaire_client: commentaireClient.trim() || null,
        })
        .eq('id', interventionId)
        .select('id, client_valide, commentaire_client')
        .single();

      if (error) throw error;

      setInterventions((current) =>
        current.map((item) =>
          item.id === interventionId
            ? {
                ...item,
                client_valide: data?.client_valide ?? true,
                commentaire_client: data?.commentaire_client ?? (commentaireClient.trim() || null),
              }
            : item
        )
      );
      setSelectedClientValidation(null);
    } catch (error) {
      console.error('Erreur validation client:', error);
      alert("Impossible d'enregistrer la validation client.");
    } finally {
      setSavingClientValidationId(null);
    }
  };

  // Déterminer l'état d'un ordre de travail selon son intervention
  const getOrdreState = (ordre: OrdreTravailEnrichi) => {
    // Debug: log pour comprendre l'état
    console.log(`Ordre ${ordre.id.slice(0, 8)}:`, {
      statut: ordre.statut,
      hasIntervention: !!ordre.intervention,
      interventionValide: ordre.intervention?.valide
    });

    // Si pas d'intervention ET statut prévu → Bouton Intervenir visible SEULEMENT pour les techniciens
    if (!ordre.intervention) {
      if (ordre.statut === 'prévu') {
        return {
          canStart: true,
          showStartButton: profile?.role === 'technicien', // Seuls les techniciens peuvent voir le bouton
          statusMessage: null,
          statusColor: null
        };
      } else {
        // Ordre sans intervention mais pas en statut prévu
        return {
          canStart: false,
          showStartButton: false,
          statusMessage: null,
          statusColor: null
        };
      }
    }

    // Si intervention validée → Message "Intervention validée"
    if (ordre.intervention.valide) {
      return {
        canStart: false,
        showStartButton: false,
        statusMessage: getInterventionValidationLabel(true, 'admin'),
        statusColor: 'bg-green-100 text-green-800 border-green-200'
      };
    }

    // Si intervention non validée → Message "En attente de validation"
    return {
      canStart: false,
      showStartButton: false,
      statusMessage: 'En attente de validation',
      statusColor: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
  };

  const resetFiltres = () => {
    // Pour les techniciens, ne pas réinitialiser le filtre statut (toujours 'non_cloture')
    if (profile?.role !== 'technicien') {
      setFiltreStatut('tous');
    }
    setFiltreType('tous');
    setSearchTerm('');
  };

  const filtresActifs = (profile?.role === 'technicien' ? false : filtreStatut !== 'tous') || filtreType !== 'tous' || searchTerm !== '';

  return (
    <div className="space-y-6">
      {/* Spinner global pendant la génération du PDF */}
      {generatingPDF && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <Loader2 className="w-16 h-16 animate-spin text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Génération du PDF en cours...
              </h3>
              <p className="text-slate-600">
                Préparation du document de maintenance...
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                <span>Veuillez patienter</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <div className="p-2 sm:p-3 rounded-lg flex-shrink-0" style={{ backgroundColor: '#f15c0015' }}>
            <ClipboardList size={20} className="sm:w-6 sm:h-6" style={{ color: '#f15c00' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Ordres de travail</h2>
            <p className="text-sm sm:text-base text-slate-600 hidden sm:block">Gestion des interventions de maintenance</p>
          </div>
          {loadingInterventions && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 flex-shrink-0">
              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-slate-300 border-t-slate-600"></div>
              <span className="hidden sm:inline">Chargement des interventions...</span>
              <span className="sm:hidden">Chargement...</span>
            </div>
          )}
        </div>
        
        <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-500 flex-shrink-0"></div>
            <span className="text-slate-600">Total: <span className="font-semibold text-slate-900">
              {profile?.role === 'technicien' 
                ? ordresTravail.filter(ot => ot.statut !== 'terminé' && ot.statut !== 'clôturé_avec_anomalie').length 
                : ordresTravail.length}
            </span></span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
            <span className="text-slate-600">À faire: <span className="font-semibold text-slate-900">{ordresTravail.filter(ot => ot.statut === 'prévu').length}</span></span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></div>
            <span className="text-slate-600">En cours: <span className="font-semibold text-slate-900">{ordresTravail.filter(ot => ot.statut === 'en_cours').length}</span></span>
          </div>
          {/* Afficher "Clôturés" pour les consultants (clients) */}
          {profile?.role === 'consultant' && (
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
              <span className="text-slate-600">Clôturés: <span className="font-semibold text-slate-900">{ordresTravail.filter(ot => ot.statut === 'terminé' || ot.statut === 'clôturé_avec_anomalie').length}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* FILTRES */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="sm:w-5 sm:h-5 text-slate-600 flex-shrink-0" />
          <h3 className="text-base sm:text-lg font-semibold text-slate-900">Filtres</h3>
          {filtresActifs && (
            <button
              onClick={resetFiltres}
              className="ml-auto text-xs sm:text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <X size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Réinitialiser</span>
              <span className="sm:hidden">Reset</span>
            </button>
          )}
        </div>

        <div className={`grid grid-cols-1 gap-3 sm:gap-4 ${profile?.role === 'technicien' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {/* Recherche */}
          <div className="relative sm:col-span-1">
            <Search size={16} className="sm:w-[18px] sm:h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filtre Statut - Masqué pour les techniciens */}
          {profile?.role !== 'technicien' && (
            <div>
              <select
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              >
                <option value="tous">Tous les statuts</option>
                <option value="prévu">À faire</option>
                <option value="en_cours">En cours</option>
                <option value="terminé">Clôturé</option>
                <option value="clôturé_avec_anomalie">Clôturé avec anomalie</option>
                <option value="annulé">Annulé</option>
              </select>
            </div>
          )}

          {/* Filtre Type */}
          <div>
            <select
              value={filtreType}
              onChange={(e) => setFiltreType(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            >
              <option value="tous">Tous les types</option>
              <option value="preventif">Préventif</option>
              <option value="correctif">Correctif</option>
              <option value="curatif">Curatif</option>
            </select>
          </div>
        </div>

        {filtresActifs && (
          <div className="mt-3 text-xs sm:text-sm text-slate-600">
            {ordresFiltres.length} résultat{ordresFiltres.length > 1 ? 's' : ''} trouvé{ordresFiltres.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* LISTE DES ORDRES DE TRAVAIL - RESPONSIVE */}
      {ordresFiltres.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-100 mb-4">
            <ClipboardList size={24} className="sm:w-8 sm:h-8 text-slate-400" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">
            {filtresActifs ? 'Aucun résultat' : 'Aucun ordre de travail'}
          </h3>
          <p className="text-sm sm:text-base text-slate-600 px-4">
            {filtresActifs 
              ? 'Aucun ordre de travail ne correspond à vos critères de recherche.' 
              : 'Il n\'y a pas encore d\'ordres de travail pour cette machine.'}
          </p>
        </div>
      ) : (
        <>
          {/* VUE MOBILE - CARTES */}
          <div className="md:hidden space-y-3">
            {ordresFiltres.map((ot) => {
              const statutConfig = getStatutConfig(ot.statut);
              const typeConfig = getTypeConfig(ot.type);
              const isExpanded = expandedOT === ot.id;
              const ordreState = getOrdreState(ot);

              return (
                <div 
                  key={ot.id} 
                  className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden border-l-4 ${getTypeBorderColor(ot.type)} ${getTypeRowColor(ot.type)}`}
                >
                  {/* Header de la carte */}
                  <div className="p-3 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-900">#{ot.id.slice(0, 8)}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statutConfig.color}`}>
                        {React.cloneElement(statutConfig.icon as React.ReactElement, { size: 12 })}
                        {getOtStatusLabel(ot.statut)}
                      </span>
                    </div>
                  </div>

                  {/* Contenu de la carte */}
                  <div className="p-3 space-y-2">
                    {ot.technicien && (
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-900">{ot.technicien.nom}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-900">
                        {new Intl.DateTimeFormat('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }).format(new Date(ot.date_programmee))}
                      </span>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg bg-orange-50 px-2.5 py-2">
                      <Wrench size={14} className="mt-0.5 flex-shrink-0 text-orange-600" />
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-orange-600">Gamme associée</span>
                        <span className="block truncate text-sm font-semibold text-slate-800">
                          {ot.gamme_nom || 'Aucune gamme associée'}
                        </span>
                      </div>
                    </div>

                    {ordreState.statusMessage && (
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${
                        ordreState.statusMessage === getInterventionValidationLabel(true, 'admin')
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {ordreState.statusMessage === getInterventionValidationLabel(true, 'admin') ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <AlertCircle size={12} />
                        )}
                        {ordreState.statusMessage}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-3 border-t border-slate-200 flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if (ot.intervention) {
                          handleDownloadPDF(ot.intervention.id, ot.type);
                        }
                      }}
                      disabled={!ot.intervention}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                    >
                      <Download size={14} />
                      <span>PDF</span>
                    </button>
                    
                    {ordreState.showStartButton && ordreState.canStart && (
                      <button 
                        onClick={() => handleDemarrer(ot.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs transition-colors"
                      >
                        <PlayCircle size={14} />
                        <span>Intervenir</span>
                      </button>
                    )}
                  </div>

                  {/* Détails expandables */}
                  {isExpanded && (
                    <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-3">
                      {ot.intervention && (
                        <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Wrench size={14} className="text-blue-600" />
                            <h4 className="font-semibold text-slate-900 text-xs">Intervention réalisée</h4>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-slate-500">Date:</span>
                              <p className="font-semibold text-slate-900">{formatDate(ot.intervention.date_debut)}</p>
                            </div>
                            {ot.intervention.actions_realisees && (
                              <div>
                                <span className="text-slate-500">Actions:</span>
                                <p className="text-slate-700">{ot.intervention.actions_realisees}</p>
                              </div>
                            )}
                            {profile?.role === 'consultant' && (
                              <ClientValidationStatus
                                intervention={ot.intervention}
                                onOpen={() => setSelectedClientValidation(ot.intervention || null)}
                              />
                            )}
                          </div>
                        </div>
                      )}
                      
                      {ot.observations && (
                        <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText size={14} className="text-amber-600" />
                            <h4 className="font-semibold text-slate-900 text-xs">Observations</h4>
                          </div>
                          <p className="text-xs text-slate-700">{ot.observations}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* VUE DESKTOP - TABLEAU */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Gamme associée
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Technicien
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Date programmée
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    État intervention
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ordresFiltres.map((ot) => {
                  const statutConfig = getStatutConfig(ot.statut);
                  const typeConfig = getTypeConfig(ot.type);
                  const isExpanded = expandedOT === ot.id;
                  const ordreState = getOrdreState(ot);

                  return (
                    <React.Fragment key={ot.id}>
                      <tr className={`hover:bg-slate-50 transition-colors border-l-4 ${getTypeBorderColor(ot.type)} ${getTypeRowColor(ot.type)}`}>
                        {/* ID */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-slate-900">
                            #{ot.id.slice(0, 8)}
                          </span>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${typeConfig.color}`}>
                            {typeConfig.label}
                          </span>
                        </td>

                        {/* Gamme associée */}
                        <td className="px-4 py-3">
                          <div className="flex max-w-[220px] items-center gap-2">
                            <Wrench size={14} className="flex-shrink-0 text-orange-600" />
                            <span className={`truncate text-sm ${ot.gamme_nom ? 'font-semibold text-slate-800' : 'italic text-slate-400'}`} title={ot.gamme_nom || undefined}>
                              {ot.gamme_nom || 'Aucune gamme'}
                            </span>
                          </div>
                        </td>

                        {/* Statut */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statutConfig.color}`}>
                            {React.cloneElement(statutConfig.icon as React.ReactElement, { 
                              size: 14
                            })}
                            {getOtStatusLabel(ot.statut)}
                          </span>
                        </td>

                        {/* Technicien */}
                        <td className="px-4 py-3">
                          {ot.technicien ? (
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-slate-400 flex-shrink-0" />
                              <span className="text-sm text-slate-900">{ot.technicien.nom}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Non assigné</span>
                          )}
                        </td>

                        {/* Date programmée */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-slate-900">
                              {new Intl.DateTimeFormat('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              }).format(new Date(ot.date_programmee))}
                            </span>
                          </div>
                        </td>

                        {/* État intervention */}
                        <td className="px-4 py-3">
                          {ordreState.statusMessage ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              ordreState.statusMessage === getInterventionValidationLabel(true, 'admin')
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {ordreState.statusMessage === getInterventionValidationLabel(true, 'admin') ? (
                                <CheckCircle2 size={12} />
                              ) : (
                                <AlertCircle size={12} />
                              )}
                              {ordreState.statusMessage}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {/* Bouton télécharger PDF - toujours visible */}
                            <button 
                              onClick={() => {
                                if (ot.intervention) {
                                  handleDownloadPDF(ot.intervention.id, ot.type);
                                }
                              }}
                              className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Télécharger PDF"
                              disabled={!ot.intervention}
                            >
                              <Download size={16} />
                            </button>
                            
                            {ordreState.showStartButton && ordreState.canStart && (
                              <button 
                                onClick={() => handleDemarrer(ot.id)}
                                className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                                title="Intervenir"
                              >
                                <PlayCircle size={16} />
                              </button>
                            )}

                            <button 
                              onClick={() => toggleExpand(ot.id)}
                              className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                              title={isExpanded ? "Réduire" : "Développer"}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* DÉTAILS EXPANDABLES */}
                      {isExpanded && (
                        <tr className={`border-l-4 ${getTypeBorderColor(ot.type)}`}>
                          <td colSpan={8} className={`px-4 py-4 ${getTypeRowColor(ot.type)}`}>
                            <div className="space-y-4">
                              {/* Informations d'intervention */}
                              {ot.intervention && (
                                <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Wrench size={16} className="text-blue-600" />
                                    <h4 className="font-semibold text-slate-900 text-sm">Intervention réalisée</h4>
                                  </div>
                                  
                                  <div className="grid grid-cols-3 gap-4 mb-3">
                                    <div className="bg-slate-50 rounded-lg p-3">
                                      <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Date</span>
                                      <p className="text-sm font-semibold text-slate-900 mt-1">{formatDate(ot.intervention.date_debut)}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                      <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Statut</span>
                                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1 ${
                                        ot.intervention.valide 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {getInterventionValidationLabel(ot.intervention.valide, 'admin')}
                                      </span>
                                    </div>
                                    {ot.intervention.valide && ot.intervention.valide_le && (
                                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                        <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Validée le</span>
                                        <p className="text-sm font-semibold text-green-800 mt-1">{formatDate(ot.intervention.valide_le)}</p>
                                      </div>
                                    )}
                                  </div>

                                  {ot.intervention.actions_realisees && (
                                    <div className="bg-slate-50 rounded-lg p-3">
                                      <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Actions réalisées</span>
                                      <p className="text-sm text-slate-700 mt-1">{ot.intervention.actions_realisees}</p>
                                    </div>
                                  )}
                                  {profile?.role === 'consultant' && (
                                    <div className="mt-3">
                                      <ClientValidationStatus
                                        intervention={ot.intervention}
                                        onOpen={() => setSelectedClientValidation(ot.intervention || null)}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Observations */}
                              {ot.observations && (
                                <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                                  <div className="flex items-center gap-2 mb-3">
                                    <FileText size={16} className="text-amber-600" />
                                    <h4 className="font-semibold text-slate-900 text-sm">Observations</h4>
                                  </div>
                                  <div className="bg-slate-50 rounded-lg p-3">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{ot.observations}</p>
                                  </div>
                                </div>
                              )}

                              {/* Informations techniques */}
                              <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <Hash size={16} className="text-slate-600" />
                                  <h4 className="font-semibold text-slate-900 text-sm">Informations techniques</h4>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-slate-50 rounded-lg p-3">
                                    <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">ID Ordre</span>
                                    <p className="text-xs font-mono text-slate-900 break-all mt-1">{ot.id}</p>
                                  </div>
                                  <div className="bg-slate-50 rounded-lg p-3">
                                    <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Créé le</span>
                                    <p className="text-sm text-slate-900 mt-1">{formatDate(ot.created_at)}</p>
                                  </div>
                                  {ot.date_execution && (
                                    <div className="bg-slate-50 rounded-lg p-3">
                                      <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Exécuté le</span>
                                      <p className="text-sm text-slate-900 mt-1">{formatDate(ot.date_execution)}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
      <ClientInterventionValidationModal
        isOpen={Boolean(selectedClientValidation)}
        intervention={selectedClientValidation ? {
          id: selectedClientValidation.id,
          client_valide: selectedClientValidation.client_valide,
          commentaire_client: selectedClientValidation.commentaire_client,
          title: `Intervention #${selectedClientValidation.id.slice(0, 8)}`,
          subtitle: machine.nom,
        } : null}
        isSaving={savingClientValidationId === selectedClientValidation?.id}
        onClose={() => setSelectedClientValidation(null)}
        onConfirm={handleClientValidate}
      />
    </div>
  );
};

function ClientValidationStatus({
  intervention,
  onOpen,
}: {
  intervention: Intervention;
  onOpen: () => void;
}) {
  if (intervention.client_valide) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 size={13} />
          Validée par client
        </div>
        {intervention.commentaire_client && (
          <p className="mt-2 text-xs text-emerald-900 whitespace-pre-wrap">{intervention.commentaire_client}</p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-700"
    >
      <CheckCircle2 size={14} />
      Valider cote client
    </button>
  );
}

function normalizeFilterValue(value?: string | null): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeOTType(value?: string | null): 'preventif' | 'correctif' | 'curatif' | 'autre' {
  const normalized = normalizeFilterValue(value);
  if (normalized.includes('prevent')) return 'preventif';
  if (normalized.includes('correct')) return 'correctif';
  if (normalized.includes('curat')) return 'curatif';
  return 'autre';
}

function getOTFiltersKey(machineId: string): string {
  return `machine-ot-filters-${machineId}`;
}

function readSavedOTFilters(machineId: string): {
  filtreStatut?: string;
  filtreType?: string;
  searchTerm?: string;
} {
  try {
    return JSON.parse(sessionStorage.getItem(getOTFiltersKey(machineId)) || '{}');
  } catch {
    return {};
  }
}

export default OrdresTravail;
