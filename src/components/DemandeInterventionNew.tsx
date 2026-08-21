import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase, DemandeData, ExistingDemande, PlanningData, FrequencyType } from '../lib/supabase';
import { AlertCircle, Wrench, CheckCircle2, AlertTriangle, Trash2, Calendar, Loader2 } from 'lucide-react';
import { ClientSearchableSelect } from './Ui/ClientSearchableSelect';
import { MachineMultiSelect } from './Ui/MachineMultiSelect';
import { useClients } from '../hooks/loadClients';
import { useMachines } from '../hooks/loadMachines';
import { RRule, Weekday } from 'rrule';
import { MaintenanceCalendar } from './Ui/MaintenanceCalendar';
// import { useGammes } from '../hooks/loadgammes';

export default function DemandeInterventionNew() {
  const navigate = useNavigate();
  const { machine_id } = useParams();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [demandeData, setDemandeData] = useState<DemandeData>({
    machine_ids: machine_id ? [machine_id] : [],
    type_intervention: 'corrective',
    urgence: 'moyenne',
    description: '',
    label: '',
    planning: undefined,
  });
  const [planningData, setPlanningData] = useState<PlanningData>({
    frequency: 'monthly',
    week_of_month: 1,
    day_of_week: 'monday',
    time: '09:00',
    dtstart: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [existingPreventives, setExistingPreventives] = useState<ExistingDemande[]>([]);
  const [checkingPreventive, setCheckingPreventive] = useState(false);
  const [nextOccurrences, setNextOccurrences] = useState<Date[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const today = new Date().toISOString().split('T')[0];

  const { clients, loading: loadingClients } = useClients();
  const { machines, filteredMachines, setFilteredMachines, loading: loadingMachines } = useMachines();
  const { gammes, filteredGammes, setFilteredGammes, loading: loadingGammes } = useGammes();

  useEffect(() => {
    if (selectedClientId) {
      const filtered = machines.filter(m => m.client_id === selectedClientId);
      setFilteredMachines(filtered);
      const validMachineIds = demandeData.machine_ids.filter(mid =>
        filtered.some(m => m.id === mid)
      );
      if (validMachineIds.length !== demandeData.machine_ids.length) {
        setDemandeData({ ...demandeData, machine_ids: validMachineIds });
      }
    } else {
      setFilteredMachines(machines);
    }
  }, [selectedClientId, machines]);

  useEffect(() => {
    if (demandeData.machine_ids.length > 0 && demandeData.type_intervention === 'preventive') {
      checkExistingPreventives(demandeData.machine_ids);
    } else {
      setExistingPreventives([]);
    }
  }, [demandeData.machine_ids, demandeData.type_intervention]);

  useEffect(() => {
    if (demandeData.type_intervention === 'preventive') {
      generateNextOccurrences();
    }
  }, [planningData, demandeData.type_intervention]);

  async function checkExistingPreventives(machineIds: string[]) {
    setCheckingPreventive(true);
    const { data, error } = await supabase
      .from('demande_intervention')
      .select('*')
      .in('machine_id', machineIds)
      .eq('type_intervention', 'preventive')
      .neq('statut', 'annulée');

    setExistingPreventives(data && !error ? data : []);
    setCheckingPreventive(false);
  }

  async function handleDeletePreventive(demandeId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande préventive ?')) return;

    setDeletingIds(prev => new Set(prev).add(demandeId));
    
    const { error } = await supabase
      .from('demande_intervention')
      .update({ statut: 'annulée' })
      .eq('id', demandeId);

    if (error) {
      alert('Erreur lors de la suppression de la demande');
    } else {
      setExistingPreventives(prev => prev.filter(d => d.id !== demandeId));
    }
    
    setDeletingIds(prev => {
      const next = new Set(prev);
      next.delete(demandeId);
      return next;
    });
  }

  function generateRRule(): string {
    const weekdayMap: Record<string, Weekday> = {
      monday: RRule.MO,
      tuesday: RRule.TU,
      wednesday: RRule.WE,
      thursday: RRule.TH,
      friday: RRule.FR,
      saturday: RRule.SA,
      sunday: RRule.SU,
    };

    const weekday = weekdayMap[planningData.day_of_week];
    const weekNumber = planningData.week_of_month;

    const dtstart = new Date(planningData.dtstart);
    if (planningData.time) {
      const [h, m] = planningData.time.split(':').map(Number);
      dtstart.setHours(h, m, 0, 0);
    }

    let interval = 1;
    switch (planningData.frequency) {
      case 'quarterly':
        interval = 3;
        break;
      case 'biannual':
        interval = 6;
        break;
      case 'annual':
        interval = 12;
        break;
    }

    const rule = new RRule({
      freq: RRule.MONTHLY,
      interval,
      byweekday: [weekday.nth(weekNumber)],
      dtstart,
    });

    return rule.toString();
  }

  function generateNextOccurrences() {
    try {
      const rruleString = generateRRule();
      const rule = RRule.fromString(rruleString);
      const occurrences = rule.all((date, i) => i < 5);
      setNextOccurrences(occurrences);
    } catch (error) {
      console.error('Erreur lors de la génération des occurrences:', error);
      setNextOccurrences([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (demandeData.machine_ids.length === 0) {
      return alert('Veuillez sélectionner au moins une machine.');
    }
    
    if (!demandeData.label || demandeData.label.trim() === '') {
      return alert('Veuillez saisir un libellé pour la demande.');
    }

    if (demandeData.type_intervention === 'preventive' && existingPreventives.length > 0) {
      return alert('Des demandes préventives existent déjà pour certaines machines. Veuillez les supprimer avant de continuer.');
    }

    setSubmitting(true);
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id || '';

    try {
      if (demandeData.type_intervention === 'corrective') {
        const demandesInsert = demandeData.machine_ids.map(machineId => ({
          machine_id: machineId,
          type_intervention: 'corrective',
          description: demandeData.description,
          label: demandeData.label,
          urgence: demandeData.urgence,
          statut: 'en attente',
          created_by: userId,
          date_demande: new Date().toISOString(),
        }));

        const { error: demandeError } = await supabase
          .from('demande_intervention')
          .insert(demandesInsert);

        if (demandeError) {
          throw new Error('Erreur lors de la création des demandes correctives.');
        }

        alert('Demandes correctives créées avec succès !');
        navigate('/admin/demandes');
      } else {
        const rruleString = generateRRule();
        const dtstart = new Date(planningData.dtstart);
        if (planningData.time) {
          const [h, m] = planningData.time.split(':').map(Number);
          dtstart.setHours(h, m, 0, 0);
        }

        for (const machineId of demandeData.machine_ids) {
          const { data: demandeInserted, error: demandeError } = await supabase
            .from('demande_intervention')
            .insert({
              machine_id: machineId,
              type_intervention: 'preventive',
              description: demandeData.description,
              label: demandeData.label,
              urgence: 'faible',
              statut: 'en attente',
              created_by: userId,
            })
            .select()
            .single();

          if (demandeError || !demandeInserted) {
            throw new Error('Erreur lors de la création de la demande préventive.');
          }

          const planningInsert: any = {
  id: crypto.randomUUID(),
  machine_id: machineId,
  demande_id: demandeInserted.id,
  rrule: rruleString,
  dtstart: dtstart.toISOString(),
  week_of_month: planningData.week_of_month,
  day_of_week: planningData.day_of_week,
  frequency: planningData.frequency, // <- ajouté ici
  created_by: userId,
  created_at: new Date().toISOString(),
};


          const { error: planningError } = await supabase
            .from('maintenance_planning')
            .insert(planningInsert);

          if (planningError) {
            throw new Error('Erreur lors de la création de la planification.');
          }
        }

        alert('Planifications préventives créées avec succès !');
        navigate('/admin/demandes');
      }
    } catch (error: any) {
      alert(error.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  }

 const frequencyLabels: Record<FrequencyType, string> = {
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  biannual: 'Semestriel',
  annual: 'Annuel',
};


  const dayLabels: Record<string, string> = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200">
        <div className="bg-gradient-to-r from-[#f15c00] to-orange-600 px-6 py-5">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
                       Nouveau Plan de Maintenance
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client & Machines */}
          {!machine_id && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Client *
                </label>
                <ClientSearchableSelect
                  clients={clients}
                  value={selectedClientId}
                  onChange={setSelectedClientId}
                  placeholder="Sélectionner un client..."
                />
              </div>

              {selectedClientId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Machines * ({demandeData.machine_ids.length} sélectionnée(s))
                  </label>
                  <MachineMultiSelect
                    machines={filteredMachines}
                    selectedIds={demandeData.machine_ids}
                    onChange={(ids) => setDemandeData({ ...demandeData, machine_ids: ids })}
                  />
                </div>
              )}
            </>
          )}

 {/* Gamme Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Gamme de maintenance <span className="text-red-500">*</span>
            </label>
            <select

              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Sélectionnez une gamme</option>
              {gammes.map(gamme => (
                <option key={gamme.id} value={gamme.id}>
                  {gamme.nom} ({gamme.type})
                </option>
              ))}
            </select>
            {/* {errors.gamme_id && (
              <p className="mt-1 text-sm text-red-600">{errors.gamme_id.message}</p>
            )} */}
          </div>


    
          {/* Bouton soumission */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/demandes')}
              className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || existingPreventives.length > 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#f15c00] to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Créer la demande
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}