import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { supabase, Client, Machine } from '../../lib/supabase';
import {
  Calendar,
  Settings,
  AlertCircle,
  Clock,
  Loader2,
  Info,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { MachineMultiSelect } from '../Ui/MachineMultiSelect';
import { FailureModePicker } from '../Ui/FailureModePicker';
import { GammeMaintenance } from '../../types/gammes';
import { MaintenancePreview } from '../Ui/MaintenancePreview';
import { JOURS_SEMAINE, SEMAINES_MOIS } from '../../utils/days';
import { toast } from 'react-toastify';

interface RecurrenceOption {
  value: string;
  label: string;
  type: string;
  intervalle: number;
  category: string;
}

const RECURRENCE_OPTIONS: RecurrenceOption[] = [
  { value: 'journaliere-1', label: 'S1 – Quotidienne', type: 'journalière', intervalle: 1, category: 'Haute fréquence' },

  { value: 'hebdomadaire-1', label: 'S01 – Hebdomadaire', type: 'hebdomadaire', intervalle: 1, category: 'Fréquence standard' },
  { value: 'hebdomadaire-2', label: 'S02 – Quinzaine', type: 'hebdomadaire', intervalle: 2, category: 'Fréquence standard' },

  { value: 'mensuelle-1', label: 'M01 – Mensuelle', type: 'mensuelle', intervalle: 1, category: 'Fréquence standard' },
  { value: 'mensuelle-2', label: 'M02 – Bimestrielle', type: 'mensuelle', intervalle: 2, category: 'Fréquence standard' },
  { value: 'mensuelle-3', label: 'M03 – Trimestrielle', type: 'mensuelle', intervalle: 3, category: 'Fréquence standard' },
  { value: 'mensuelle-6', label: 'M06 – Semestrielle', type: 'mensuelle', intervalle: 6, category: 'Fréquence standard' },

  { value: 'annuelle-1', label: 'A01 – Annuelle', type: 'annuelle', intervalle: 1, category: 'Basse fréquence' },
  { value: 'annuelle-2', label: 'A02 – Bisannuelle', type: 'annuelle', intervalle: 2, category: 'Basse fréquence' },
  { value: 'annuelle-3', label: 'A03 – Triennale', type: 'annuelle', intervalle: 3, category: 'Basse fréquence' },
  { value: 'annuelle-5', label: 'A05 – Quinquennale', type: 'annuelle', intervalle: 5, category: 'Basse fréquence' },
  { value: 'annuelle-10', label: 'A10 – Décennale', type: 'annuelle', intervalle: 10, category: 'Basse fréquence' },

  { value: 'custom', label: 'Personnalisé...', type: '', intervalle: 1, category: 'Personnalisé' }
];

const INTERVALLE_LIMITS = {
  'journalière': { min: 1, max: 365, unit: 'jour', plural: 'jours' },
  'hebdomadaire': { min: 1, max: 52, unit: 'semaine', plural: 'semaines' },
  'mensuelle': { min: 1, max: 60, unit: 'mois', plural: 'mois' },
  'annuelle': { min: 1, max: 10, unit: 'année', plural: 'années' }
};

interface FormData {
  client_id: string;
  machine_ids: string[];
  gamme_id: string;
  type_recurrence: string;
  intervalle: number;
  forcer_jour_semaine: boolean;
  jour_semaine: number | null;
  semaine_du_mois: number | null;
  date_debut: string;
  date_fin: string;
  statut: 'actif' | 'inactif';
  recurrence_preset: string;
  is_custom: boolean;
}

export default function PlanPreventifForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = id && id !== 'new';
  const [clients, setClients] = useState<Client[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [gammes, setGammes] = useState<GammeMaintenance[]>([]);
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(Boolean(isEditMode));
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingOT, setHasExistingOT] = useState(false);
  const [selectedFailureModeIds, setSelectedFailureModeIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    client_id: '',
    machine_ids: [],
    gamme_id: '',
    type_recurrence: '',
    intervalle: 1,
    forcer_jour_semaine: false,
    jour_semaine: null,
    semaine_du_mois: null,
    date_debut: '',
    date_fin: '',
    statut: 'actif',
    recurrence_preset: '',
    is_custom: false
  });

  const findRecurrencePreset = (type: string, intervalle: number): string => {
    const option = RECURRENCE_OPTIONS.find(
      opt => opt.type === type && opt.intervalle === intervalle
    );
    return option ? option.value : 'custom';
  };

  const handleRecurrencePresetChange = (option: RecurrenceOption | null) => {
    if (!option || option.value === 'custom') {
      setFormData(prev => ({
        ...prev,
        recurrence_preset: 'custom',
        is_custom: true
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        recurrence_preset: option.value,
        type_recurrence: option.type,
        intervalle: option.intervalle,
        semaine_du_mois: null, // Ne pas forcer une semaine du mois par défaut
        is_custom: false
      }));
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (isEditMode && clients.length > 0 && machines.length > 0) {
      loadPlanData(id);
    }
  }, [isEditMode, id, clients.length, machines.length]);

  useEffect(() => {
    if (formData.client_id) {
      const filtered = machines.filter(m => m.client_id === formData.client_id);
      setFilteredMachines(filtered);
      if (!isEditMode) {
        setFormData(prev => ({ ...prev, machine_ids: [] }));
      }
    } else {
      setFilteredMachines([]);
    }
  }, [formData.client_id, machines, isEditMode]);

  const loadInitialData = async () => {
    setLoadingInitialData(true);
    setError(null);
    try {
      const [clientsRes, machinesRes, gammesRes] = await Promise.all([
        supabase.from('clients').select('*').order('raison_sociale'),
        supabase.from('machines').select('*, client:clients(*)').order('nom'),
        supabase.from('gammes_maintenance').select('*').order('nom')
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (machinesRes.error) throw machinesRes.error;
      if (gammesRes.error) throw gammesRes.error;

      setClients(clientsRes.data || []);
      setMachines(machinesRes.data || []);
      setGammes(gammesRes.data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Impossible de charger les données. Veuillez réessayer.');
    } finally {
      setLoadingInitialData(false);
    }
  };

  const loadPlanData = async (planId: string) => {
    setLoadingPlan(true);
    try {
      let resolvedPlanId = planId;
      const { data: alias } = await supabase
        .from('plan_maintenance_aliases')
        .select('plan_id')
        .eq('legacy_plan_id', planId)
        .maybeSingle();

      if (alias?.plan_id) {
        resolvedPlanId = alias.plan_id;
        navigate(`/admin/plans-maintenance/${resolvedPlanId}`, { replace: true });
      }

      const { data: plan, error: planError } = await supabase
        .from('plans_maintenance')
        .select('*, machine:machines!plans_maintenance_machine_id_fkey(*, client:clients(*)), plan_machines(machine_id, machine:machines(*, client:clients(*))), plan_failure_modes(failure_mode_id)')
        .eq('id', resolvedPlanId)
        .single();

      if (planError) throw planError;
      if (!plan) {
        setError('Plan de maintenance introuvable');
        return;
      }

      // Vérifier s'il existe des OT liés à ce plan
      const { count, error: countError } = await supabase
          .from('ordres_travail')
          .select('*', { count: 'exact', head: true })
          .eq('plan_id', resolvedPlanId);

      if (countError) {
        console.error('Erreur lors du comptage des OT:', countError);
      } else {
        setHasExistingOT((count || 0) > 0);
      }

      const associatedMachineIds = (plan.plan_machines || []).map((item: any) => item.machine_id);
      const loadedMachineIds = associatedMachineIds.length > 0
        ? associatedMachineIds
        : plan.machine_id ? [plan.machine_id] : [];
      const firstAssociatedMachine = plan.plan_machines?.[0]?.machine;
      const clientId = firstAssociatedMachine?.client_id || plan.machine?.client_id || '';
      const presetValue = findRecurrencePreset(plan.type_recurrence || '', plan.intervalle || 1);
      const isCustom = presetValue === 'custom';
      setSelectedFailureModeIds(
        (plan.plan_failure_modes || []).map((item: { failure_mode_id: string }) => item.failure_mode_id),
      );

      setFormData({
        client_id: clientId,
        machine_ids: loadedMachineIds,
        gamme_id: plan.gamme_id,
        type_recurrence: plan.type_recurrence || '',
        intervalle: plan.intervalle || 1,
        forcer_jour_semaine: plan.forcer_jour_semaine,
        jour_semaine: plan.jour_semaine,
        semaine_du_mois: plan.semaine_du_mois || null,
        date_debut: plan.date_debut,
        date_fin: plan.date_fin || '',
        statut: plan.statut,
        recurrence_preset: presetValue,
        is_custom: isCustom
      });
    } catch (err) {
      console.error('Erreur lors du chargement du plan:', err);
      setError('Impossible de charger le plan de maintenance');
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    if (formData.machine_ids.length === 0) {
      toast.error('Veuillez sélectionner au moins une machine');
      return;
    }

    if (!formData.gamme_id) {
      toast.error('Veuillez sélectionner une gamme de maintenance');
      return;
    }

    if (!formData.recurrence_preset) {
      toast.error('Veuillez sélectionner une fréquence de maintenance');
      return;
    }

    if (formData.is_custom && !formData.type_recurrence) {
      toast.error('Veuillez sélectionner un type de récurrence pour la configuration personnalisée');
      return;
    }

    if (!formData.type_recurrence) {
      toast.error('Veuillez sélectionner un type de récurrence');
      return;
    }

    const intervalLimit = INTERVALLE_LIMITS[formData.type_recurrence as keyof typeof INTERVALLE_LIMITS];
    if (
      !Number.isInteger(formData.intervalle) ||
      !intervalLimit ||
      formData.intervalle < intervalLimit.min ||
      formData.intervalle > intervalLimit.max
    ) {
      toast.error(`L'intervalle doit être compris entre ${intervalLimit?.min ?? 1} et ${intervalLimit?.max ?? 999}`);
      return;
    }

    if (formData.forcer_jour_semaine && formData.jour_semaine === null) {
      toast.error('Veuillez sélectionner un jour de la semaine');
      return;
    }

    if (!formData.date_debut) {
      toast.error('Veuillez renseigner la date de début');
      return;
    }

    if (formData.date_fin && formData.date_fin < formData.date_debut) {
      toast.error('La date de fin doit être postérieure à la date de début');
      return;
    }

    setLoading(true);

    try {
      const basePlanData = {
        gamme_id: formData.gamme_id,
        type: 'préventive',
        type_recurrence: formData.type_recurrence,
        intervalle: formData.intervalle,
        forcer_jour_semaine: formData.forcer_jour_semaine,
        jour_semaine: formData.forcer_jour_semaine ? formData.jour_semaine : null,
        semaine_du_mois: formData.type_recurrence === 'mensuelle' ? formData.semaine_du_mois : null,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin || null,
        statut: formData.statut,
        failure_mode_ids: selectedFailureModeIds,
      };

      const { error: saveError } = await supabase.rpc('save_maintenance_plan', {
        p_plan_id: isEditMode ? id : null,
        p_plan: basePlanData,
        p_machine_ids: formData.machine_ids,
      });

      if (saveError) throw saveError;

      toast.success(
        isEditMode
          ? 'Plan de maintenance modifié avec succès'
          : `Plan créé avec succès pour ${formData.machine_ids.length} machine(s)`
      );

      navigate('/admin/plans-maintenance');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      toast.error(isEditMode ? 'Erreur lors de la modification du plan' : 'Erreur lors de la création du plan de maintenance');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/plans-maintenance');
  };

  const getIntervalleLabel = () => {
    switch (formData.type_recurrence) {
      case 'journalière':
        return 'Nombre de jours';
      case 'hebdomadaire':
        return 'Nombre de semaines';
      case 'mensuelle':
        return 'Nombre de mois';
      case 'annuelle':
        return 'Nombre d\'années';
      default:
        return 'Intervalle';
    }
  };

  const getIntervalleHelp = () => {
    if (!formData.type_recurrence) return null;

    const limit = INTERVALLE_LIMITS[formData.type_recurrence as keyof typeof INTERVALLE_LIMITS];
    if (!limit) return null;

    const { intervalle } = formData;
    const unit = intervalle > 1 ? limit.plural : limit.unit;

    let frequency = '';
    let example = '';

    switch (formData.type_recurrence) {
      case 'journalière':
        frequency = intervalle === 1 ? 'tous les jours' : `tous les ${intervalle} jours`;
        example = `Exemple : maintenance chaque ${intervalle > 1 ? intervalle : ''} ${unit}`;
        break;
      case 'hebdomadaire':
        frequency = intervalle === 1 ? 'toutes les semaines' : `toutes les ${intervalle} semaines`;
        example = intervalle === 2 ? 'Exemple : maintenance tous les 15 jours' :
                  intervalle === 4 ? 'Exemple : maintenance 1 fois par mois' :
                  `Exemple : maintenance toutes les ${intervalle} semaines`;
        break;
      case 'mensuelle':
        frequency = intervalle === 1 ? 'tous les mois' : `tous les ${intervalle} mois`;
        example = intervalle === 3 ? 'Exemple : maintenance trimestrielle' :
                  intervalle === 6 ? 'Exemple : maintenance semestrielle' :
                  intervalle === 12 ? 'Exemple : maintenance annuelle' :
                  `Exemple : maintenance tous les ${intervalle} mois`;
        break;
      case 'annuelle':
        frequency = intervalle === 1 ? 'tous les ans' : `tous les ${intervalle} ans`;
        example = intervalle === 2 ? 'Exemple : maintenance bisannuelle' :
                  intervalle === 5 ? 'Exemple : maintenance quinquennale' :
                  `Exemple : maintenance tous les ${intervalle} ans`;
        break;
    }

    return (
      <div className="mt-2 space-y-1">
        <p className="text-sm text-slate-600 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            La maintenance sera planifiée <strong>{frequency}</strong>
          </span>
        </p>
        <p className="text-xs text-slate-500 ml-6">{example}</p>
        <p className="text-xs text-amber-600 ml-6 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Limite : entre {limit.min} et {limit.max} {limit.max > 1 ? limit.plural : limit.unit}
        </p>
      </div>
    );
  };

  const getIntervalleMax = () => {
    if (!formData.type_recurrence) return 999;
    const limit = INTERVALLE_LIMITS[formData.type_recurrence as keyof typeof INTERVALLE_LIMITS];
    return limit ? limit.max : 999;
  };

  const selectOptions = RECURRENCE_OPTIONS.map(opt => ({
    ...opt,
    isDisabled: false
  }));

  const groupedOptions = [
    {
      label: 'Haute fréquence',
      options: selectOptions.filter(opt => opt.category === 'Haute fréquence')
    },
    {
      label: 'Fréquence standard',
      options: selectOptions.filter(opt => opt.category === 'Fréquence standard')
    },
    {
      label: 'Basse fréquence',
      options: selectOptions.filter(opt => opt.category === 'Basse fréquence')
    },
    {
      label: 'Personnalisé',
      options: selectOptions.filter(opt => opt.category === 'Personnalisé')
    }
  ];

  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      borderColor: state.isFocused ? '#ee6b1a' : '#cbd5e1',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(238, 107, 26, 0.2)' : 'none',
      '&:hover': {
        borderColor: '#ee6b1a'
      },
      padding: '0.375rem',
      borderRadius: '0.5rem'
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#ee6b1a' : state.isFocused ? '#fee8dc' : 'white',
      color: state.isSelected ? 'white' : '#1e293b',
      '&:active': {
        backgroundColor: '#f15c00'
      }
    }),
    groupHeading: (provided: any) => ({
      ...provided,
      color: '#64748b',
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    })
  };

  const handleClientChange = (clientId: string) => {
    setFormData(prev => ({
      ...prev,
      client_id: clientId,
      machine_ids: prev.client_id === clientId ? prev.machine_ids : [],
    }));
  };

  if (loadingPlan || loadingInitialData) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center px-4 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white px-10 py-8 text-center shadow-sm">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[#ee6b1a]" />
          <p className="font-medium text-slate-700">Chargement du formulaire...</p>
          <p className="mt-1 text-sm text-slate-500">Clients, machines et gammes de maintenance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10 pt-2">
      {/* Spinner global pendant la création/modification */}
      {loading && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/60 bg-white p-7 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 ring-1 ring-orange-100">
                <Loader2 className="h-9 w-9 animate-spin text-[#ee6b1a]" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {isEditMode ? 'Modification en cours...' : 'Création en cours...'}
              </h3>
              <p className="text-slate-600">
                {isEditMode 
                  ? 'Mise à jour du plan de maintenance...' 
                  : `Création d'un plan pour ${formData.machine_ids.length} machine(s)...`
                }
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                <span>Veuillez patienter</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-5 px-3 sm:px-5 lg:px-6">
        <div className="overflow-hidden rounded-2xl border border-orange-200/70 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-[#f98440] via-[#f97316] to-[#d95f24] px-5 py-6 text-white sm:px-7 lg:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                  {isEditMode ? 'Modifier le Plan Préventif' : 'Créer un Plan Préventif'}
                </h1>
                <p className="mt-1.5 max-w-3xl text-sm leading-6 text-orange-50/90">
                  Définissez les équipements, la fréquence, la gamme et la période d'exécution du plan.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-4 sm:mx-7 lg:mx-8">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-red-800">
                  <p className="font-semibold">Chargement impossible</p>
                  <p className="mt-0.5">{error}</p>
                  <button type="button" onClick={loadInitialData} className="mt-2 inline-flex items-center gap-1.5 font-semibold text-red-700 hover:text-red-900">
                    <RefreshCw className="h-3.5 w-3.5" /> Réessayer
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-7 lg:p-8">
            {/* SECTION 1: SÉLECTION DE LA CIBLE */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div className="mb-5 flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-slate-700">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
                  <span className="font-bold text-orange-600">1</span>
                </div>
                Sélection de la cible
              </div>

              <div className="space-y-5 lg:pl-12">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Client
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#ee6b1a] focus:ring-2 focus:ring-orange-100"
                    required
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.raison_sociale || client.prenom}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.client_id && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Machines
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <MachineMultiSelect
                      machines={filteredMachines}
                      selectedIds={formData.machine_ids}
                      onChange={(ids) => setFormData(prev => ({
                        ...prev,
                        machine_ids: ids,
                      }))}
                      placeholder={isEditMode ? 'Sélectionner une machine...' : 'Sélectionner des machines...'}
                    />
                    {filteredMachines.length === 0 && (
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
                        <AlertCircle className="h-4 w-4" /> Ce client ne possède aucune machine disponible.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: CONFIGURATION DE LA RÉCURRENCE */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div className="mb-5 flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-slate-700">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
                  <span className="font-bold text-orange-600">2</span>
                </div>
                Configuration de la récurrence
              </div>

              <div className="space-y-5 lg:pl-12">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fréquence de maintenance
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <Select
                    value={selectOptions.find(opt => opt.value === formData.recurrence_preset) || null}
                    onChange={handleRecurrencePresetChange}
                    options={groupedOptions}
                    styles={customStyles}
                    placeholder="Sélectionner une fréquence..."
                    noOptionsMessage={() => 'Aucune option disponible'}
                    classNamePrefix="react-select"
                  />
                </div>

                {formData.is_custom && (
                  <div className="space-y-5 rounded-xl border border-orange-300 bg-orange-50/40 p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-[#ee6b1a] font-semibold mb-4">
                      <Settings className="w-5 h-5" />
                      Configuration personnalisée de Récurrence
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <div className="flex items-start gap-2">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">Personnalisez votre récurrence</p>
                          <p>Choisissez le type de récurrence (journalière, hebdomadaire, mensuelle ou annuelle) puis définissez l'intervalle souhaité selon les limites autorisées.</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Type de récurrence
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <select
                          value={formData.type_recurrence}
                          onChange={(e) => setFormData({
                            ...formData,
                            type_recurrence: e.target.value,
                            intervalle: 1,
                            semaine_du_mois: null // Ne pas forcer une semaine du mois par défaut
                          })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-transparent bg-white"
                          required
                        >
                          <option value="">Sélectionner...</option>
                          <option value="journalière">Journalière (quotidien)</option>
                          <option value="hebdomadaire">Hebdomadaire (par semaine)</option>
                          <option value="mensuelle">Mensuelle (par mois)</option>
                          <option value="annuelle">Annuelle (par année)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {getIntervalleLabel()}
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={getIntervalleMax()}
                          value={formData.intervalle}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            const max = getIntervalleMax();
                            setFormData({
                              ...formData,
                              intervalle: Math.min(Math.max(val, 1), max)
                            });
                          }}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-transparent"
                          required
                          disabled={!formData.type_recurrence}
                        />
                        {getIntervalleHelp()}
                      </div>
                    </div>

                    {formData.type_recurrence === 'mensuelle' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Semaine du mois
                        </label>
                        <select
                          value={formData.semaine_du_mois || ''}
                          onChange={(e) => setFormData({ ...formData, semaine_du_mois: e.target.value ? parseInt(e.target.value) : null })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-transparent bg-white"
                        >
                          <option value="">Aucune préférence</option>
                          {SEMAINES_MOIS.map((semaine) => (
                            <option key={semaine.value} value={semaine.value}>
                              {semaine.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-2">
                          Spécifiez à quelle semaine du mois la maintenance doit être effectuée
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!formData.is_custom && formData.type_recurrence === 'mensuelle' && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Semaine du mois <span className="font-normal text-slate-400">(optionnel)</span>
                    </label>
                    <select
                      value={formData.semaine_du_mois || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        semaine_du_mois: e.target.value ? parseInt(e.target.value, 10) : null,
                      }))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#ee6b1a] focus:ring-2 focus:ring-orange-100"
                    >
                      <option value="">Conserver le jour de la date de début</option>
                      {SEMAINES_MOIS.map(semaine => (
                        <option key={semaine.value} value={semaine.value}>{semaine.label}</option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                      Permet de positionner les maintenances mensuelles sur une semaine précise.
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="forcer_jour"
                      checked={formData.forcer_jour_semaine}
                      onChange={(e) => setFormData({
                        ...formData,
                        forcer_jour_semaine: e.target.checked,
                        jour_semaine: e.target.checked ? 1 : null
                      })}
                      className="w-5 h-5 text-[#ee6b1a] rounded border-slate-300 focus:ring-2 focus:ring-[#ee6b1a] mt-0.5"
                    />
                    <div className="flex-1">
                      <label htmlFor="forcer_jour" className="font-medium text-slate-900 cursor-pointer">
                        Imposer un jour de la semaine
                      </label>
                      <p className="text-sm text-slate-600 mt-1">
                        Si la date calculée ne tombe pas sur ce jour, elle sera décalée au prochain jour valide
                      </p>

                      {formData.forcer_jour_semaine && (
                        <div className="mt-3">
                          <select
                            value={formData.jour_semaine !== null ? formData.jour_semaine : ''}
                            onChange={(e) => setFormData({ ...formData, jour_semaine: e.target.value !== '' ? parseInt(e.target.value) : null })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-transparent bg-white"
                            required={formData.forcer_jour_semaine}
                          >
                            <option value="">Sélectionner un jour</option>
                            {JOURS_SEMAINE.map((jour) => (
                              <option key={jour.value} value={jour.value}>
                                {jour.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: GAMME */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div className="mb-5 flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-slate-700">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
                  <span className="font-bold text-orange-600">3</span>
                </div>
                Gamme de maintenance
              </div>

              <div className="lg:pl-12">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Gamme de maintenance
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={formData.gamme_id}
                    onChange={(e) => setFormData({ ...formData, gamme_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#ee6b1a] focus:ring-2 focus:ring-orange-100"
                    required
                  >
                    <option value="">Sélectionner une gamme</option>
                    {gammes.map((gamme) => (
                      <option key={gamme.id} value={gamme.id}>
                        {gamme.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 4: DÉFAILLANCES POTENTIELLES */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div className="mb-5 flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-slate-700">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
                  <span className="font-bold text-orange-600">4</span>
                </div>
                Défaillances potentielles ciblées
              </div>

              <div className="space-y-4 lg:pl-12">
                <div className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50/70 p-3 text-sm text-slate-700">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#ee6b1a]" />
                  <p>
                    Sélection facultative. Ces modes seront copiés dans chaque OT généré par ce plan afin de préparer les analyses par lot, famille et mode de défaillance.
                  </p>
                </div>
                <FailureModePicker
                  value={selectedFailureModeIds}
                  onChange={setSelectedFailureModeIds}
                  multiple
                  disabled={loading}
                />
              </div>
            </div>

            {/* SECTION 5: PÉRIODE ET STATUT */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div className="mb-5 flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-slate-700">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
                  <span className="font-bold text-orange-600">5</span>
                </div>
                Période et statut
              </div>

              <div className="space-y-5 lg:pl-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Date de début
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date_debut}
                      onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                      disabled={Boolean(isEditMode && hasExistingOT)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#ee6b1a] focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      required
                    />
                    {isEditMode && hasExistingOT && (
                      <p className="mt-2 text-sm text-amber-600 flex items-start gap-1">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          La date de début est verrouillée car ce plan possède déjà des ordres de travail.
                        </span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Date de fin (optionnel)
                    </label>
                    <input
                      type="date"
                      value={formData.date_fin}
                      onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                      min={formData.date_debut}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#ee6b1a] focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                </div>

                <MaintenancePreview
                  dateDebut={formData.date_debut}
                  dateFin={formData.date_fin}
                  typeRecurrence={formData.type_recurrence}
                  intervalle={formData.intervalle}
                  forcerJourSemaine={formData.forcer_jour_semaine}
                  jourSemaine={formData.jour_semaine}
                  semaineduMois={formData.semaine_du_mois}
                  type="préventive"
                />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Statut
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${formData.statut === 'actif' ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-green-300'}`}>
                      <input
                        type="radio"
                        value="actif"
                        checked={formData.statut === 'actif'}
                        onChange={(e) => setFormData({ ...formData, statut: e.target.value as 'actif' })}
                        className="w-4 h-4 text-[#ee6b1a] focus:ring-2 focus:ring-[#ee6b1a]"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-slate-900">Actif</span>
                      </div>
                    </label>

                    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${formData.statut === 'inactif' ? 'border-slate-400 bg-slate-100' : 'border-slate-200 hover:border-slate-400'}`}>
                      <input
                        type="radio"
                        value="inactif"
                        checked={formData.statut === 'inactif'}
                        onChange={(e) => setFormData({ ...formData, statut: e.target.value as 'inactif' })}
                        className="w-4 h-4 text-[#ee6b1a] focus:ring-2 focus:ring-[#ee6b1a]"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                        <span className="font-medium text-slate-900">Inactif</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* BOUTONS D'ACTION */}
            <div className="sticky bottom-3 z-20 flex flex-col-reverse gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-200"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f98440] to-[#e96524] px-6 py-3 font-bold text-white shadow-md transition-all hover:from-[#e96524] hover:to-[#d95f24] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isEditMode ? 'Modification en cours...' : 'Création en cours...'}
                  </>
                ) : (
                  <>
                    <Settings className="h-5 w-5" />
                    {isEditMode ? 'Enregistrer les modifications' : 'Créer le plan'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
