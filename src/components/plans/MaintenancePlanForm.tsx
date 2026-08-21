import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { supabase, Client, Machine } from '../../lib/supabase';
import { Calendar, Settings, AlertCircle, Clock, Loader2, Info } from 'lucide-react';
import { MachineMultiSelect } from '../Ui/MachineMultiSelect';
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
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingOT, setHasExistingOT] = useState(false);

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
      setFormData({
        ...formData,
        recurrence_preset: 'custom',
        is_custom: true
      });
    } else {
      setFormData({
        ...formData,
        recurrence_preset: option.value,
        type_recurrence: option.type,
        intervalle: option.intervalle,
        semaine_du_mois: null, // Ne pas forcer une semaine du mois par défaut
        is_custom: false
      });
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
    }
  };

  const loadPlanData = async (planId: string) => {
    setLoadingPlan(true);
    try {
      const { data: plan, error: planError } = await supabase
        .from('plans_maintenance')
        .select('*, machine:machines(*, client:clients(*))')
        .eq('id', planId)
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
        .eq('plan_id', planId);

      if (countError) {
        console.error('Erreur lors du comptage des OT:', countError);
      } else {
        setHasExistingOT((count || 0) > 0);
      }

      const clientId = plan.machine?.client_id || '';
      const presetValue = findRecurrencePreset(plan.type_recurrence || '', plan.intervalle || 1);
      const isCustom = presetValue === 'custom';

      setFormData({
        client_id: clientId,
        machine_ids: plan.machine_id ? [plan.machine_id] : [],
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

    if (formData.forcer_jour_semaine && formData.jour_semaine === null) {
      toast.error('Veuillez sélectionner un jour de la semaine');
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
        statut: formData.statut
      };

      if (isEditMode) {
        const { error: updateError } = await supabase
          .from('plans_maintenance')
          .update({ ...basePlanData, machine_id: formData.machine_ids[0] })
          .eq('id', id);

        if (updateError) throw updateError;
        toast.success('Plan de maintenance modifié avec succès');
      } else {
        const plansToInsert = formData.machine_ids.map(machine_id => ({
          ...basePlanData,
          machine_id
        }));

        const { error: insertError } = await supabase
          .from('plans_maintenance')
          .insert(plansToInsert);

        if (insertError) throw insertError;
        toast.success(`${plansToInsert.length} plan(s) de maintenance créé(s) avec succès`);
      }

      setTimeout(() => {
        navigate('/admin/plans-maintenance');
      }, 500);
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

  if (loadingPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#ee6b1a] mx-auto mb-4" />
          <p className="text-slate-600">Chargement du plan de maintenance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      {/* Spinner global pendant la création/modification */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <Loader2 className="w-16 h-16 animate-spin text-[#ee6b1a] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {isEditMode ? 'Modification en cours...' : 'Création en cours...'}
              </h3>
              <p className="text-slate-600">
                {isEditMode 
                  ? 'Mise à jour du plan de maintenance...' 
                  : `Création de ${formData.machine_ids.length} plan(s) de maintenance...`
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

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200">
          <div className="border-b border-slate-200 bg-gradient-to-r from-[#ee6b1a] to-[#f15c00] px-8 py-6 rounded-t-xl">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {isEditMode ? 'Modifier le Plan Préventif' : 'Créer un Plan Préventif'}
                </h1>
                <p className="text-[#fee8dc] text-sm mt-1">
                  Configurez un plan de maintenance préventive planifiée pour vos machines
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-8 mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* SECTION 1: SÉLECTION DE LA CIBLE */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide">
                <div className="w-8 h-8 bg-[#fee8dc] rounded-lg flex items-center justify-center">
                  <span className="text-[#ee6b1a] font-bold">1</span>
                </div>
                Sélection de la cible
              </div>

              <div className="ml-10 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Client
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-transparent bg-white"
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
                      onChange={(ids) => setFormData({ ...formData, machine_ids: ids })}
                      placeholder="Sélectionner des machines..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: CONFIGURATION DE LA RÉCURRENCE */}
            <div className="border-t border-slate-200 pt-8 space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide">
                <div className="w-8 h-8 bg-[#fee8dc] rounded-lg flex items-center justify-center">
                  <span className="text-[#ee6b1a] font-bold">2</span>
                </div>
                Configuration de la récurrence
              </div>

              <div className="ml-10 space-y-6">
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
                  <div className="bg-slate-50 border-2 border-[#ee6b1a] rounded-lg p-6 space-y-6">
                    <div className="flex items-center gap-2 text-[#ee6b1a] font-semibold mb-4">
                      <Settings className="w-5 h-5" />
                      Configuration personnalisée de Récurrence
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
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

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
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
            <div className="border-t border-slate-200 pt-8 space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide">
                <div className="w-8 h-8 bg-[#fee8dc] rounded-lg flex items-center justify-center">
                  <span className="text-[#ee6b1a] font-bold">3</span>
                </div>
                Gamme de maintenance
              </div>

              <div className="ml-10">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Gamme de maintenance
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={formData.gamme_id}
                    onChange={(e) => setFormData({ ...formData, gamme_id: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-transparent bg-white"
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

            {/* SECTION 4: PÉRIODE ET STATUT */}
            <div className="border-t border-slate-200 pt-8 space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide">
                <div className="w-8 h-8 bg-[#fee8dc] rounded-lg flex items-center justify-center">
                  <span className="text-[#ee6b1a] font-bold">4</span>
                </div>
                Période et statut
              </div>

              <div className="ml-10 space-y-6">
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
                      min={isEditMode && hasExistingOT ? new Date().toISOString().split('T')[0] : undefined}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-transparent"
                      required
                    />
                    {isEditMode && hasExistingOT && (
                      <p className="mt-2 text-sm text-amber-600 flex items-start gap-1">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          La date de début ne peut pas être antérieure à aujourd'hui car ce plan a déjà des ordres de travail créés.
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
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-transparent"
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
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 px-4 py-3 border-2 border-slate-300 rounded-lg cursor-pointer hover:border-[#f15c00] transition-colors flex-1">
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

                    <label className="flex items-center gap-2 px-4 py-3 border-2 border-slate-300 rounded-lg cursor-pointer hover:border-[#f15c00] transition-colors flex-1">
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
            <div className="border-t border-slate-200 pt-8 flex justify-end gap-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-[#ee6b1a] to-[#f15c00] text-white rounded-lg hover:from-[#f15c00] hover:to-[#ff7f2a] transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isEditMode ? 'Modification en cours...' : 'Création en cours...'}
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5" />
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
