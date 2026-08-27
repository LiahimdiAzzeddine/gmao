import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase, DemandeData, ExistingDemande, PlanningData, FrequencyType } from '../lib/supabase';
import {  Wrench, CheckCircle2, AlertTriangle, Trash2, Calendar, Loader2 } from 'lucide-react';
import { RRule, Weekday } from 'rrule';
import { MaintenanceCalendar } from './Ui/MaintenanceCalendar';

export default function DemandeInterventionEdit() {
  const navigate = useNavigate();
  const { id } = useParams(); // id de la demande à éditer

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [demandeData, setDemandeData] = useState<DemandeData | null>(null);
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingPreventives, setExistingPreventives] = useState<ExistingDemande[]>([]);
  const [checkingPreventive, setCheckingPreventive] = useState(false);
  const [nextOccurrences, setNextOccurrences] = useState<Date[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const today = new Date().toISOString().split('T')[0];


  // Charger la demande existante
  useEffect(() => {
    if (!id) return;
    async function loadDemande() {
      const { data, error } = await supabase
        .from('demande_intervention')
        .select('*, planning:maintenance_planning(*)')
        .eq('id', id)
        .single();

      if (error) {
        alert('Erreur lors du chargement de la demande.');
        setLoading(false);
        return;
      }

      setDemandeData({
        machine_ids: [data.machine_id],
        type_intervention: data.type_intervention,
        urgence: data.urgence,
        label: data.label || '',
        description: data.description || '',
        planning: undefined,
      });

      setSelectedClientId(data.client_id || '');

      if (data.planning && data.planning.length > 0) {
        const plan = data.planning[0];
        setPlanningData({
          frequency: plan.frequency || 'monthly',
          week_of_month: plan.week_of_month || 1,
          day_of_week: plan.day_of_week || 'monday',
          time: plan.time || '09:00',
          dtstart: plan.dtstart?.split('T')[0] || today,
        });
      } else if (data.type_intervention === 'preventive') {
        setPlanningData({
          frequency: 'monthly',
          week_of_month: 1,
          day_of_week: 'monday',
          time: '09:00',
          dtstart: today,
        });
      }

      setLoading(false);
    }
    loadDemande();
  }, [id, today]);

  // Vérification des demandes préventives existantes
  useEffect(() => {
    if (demandeData?.machine_ids.length && demandeData.type_intervention === 'preventive') {
      checkExistingPreventives(demandeData.machine_ids);
    } else {
      setExistingPreventives([]);
    }
  }, [demandeData?.type_intervention, demandeData?.machine_ids.join(','), id]);

  async function checkExistingPreventives(machineIds: string[]) {
    setCheckingPreventive(true);
    const { data, error } = await supabase
      .from('demande_intervention')
      .select('*')
      .in('machine_id', machineIds)
      .eq('type_intervention', 'preventive')
      .neq('statut', 'annulée')
      .neq('id', id); // exclure la demande actuelle

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

    if (!error) {
      setExistingPreventives(prev => prev.filter(d => d.id !== demandeId));
    }

    setDeletingIds(prev => {
      const next = new Set(prev);
      next.delete(demandeId);
      return next;
    });
  }

function generateRRule(): string {
  if (!planningData) return '';
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
  const dtstart = new Date(planningData.dtstart);
  if (planningData.time) {
    const [h, m] = planningData.time.split(':').map(Number);
    dtstart.setHours(h, m, 0, 0);
  }

  let rule: RRule;

  if (planningData.frequency === 'fortnightly') {
    rule = new RRule({
      freq: RRule.WEEKLY,
      interval: 2,
      byweekday: weekday,
      dtstart,
    });
  } else {
    let interval = 1;
    switch (planningData.frequency) {
      case 'quarterly': interval = 3; break;
      case 'biannual': interval = 6; break;
      case 'annual': interval = 12; break;
      default: interval = 1;
    }
    rule = new RRule({
      freq: RRule.MONTHLY,
      interval,
      byweekday: [weekday.nth(planningData.week_of_month)],
      dtstart,
    });
  }

  return rule.toString();
}

  function generateNextOccurrences() {
    if (!planningData) return;
    try {
      const rruleString = generateRRule();
      const rule = RRule.fromString(rruleString);
      const occurrences = rule.all((date, i) => i < 5);
      setNextOccurrences(occurrences);
    } catch {
      setNextOccurrences([]);
    }
  }

  useEffect(() => {
    if (demandeData?.type_intervention === 'preventive') {
      generateNextOccurrences();
    }
  }, [planningData, demandeData?.type_intervention]);

  function handleTypeChange(type: DemandeData['type_intervention']) {
    if (!demandeData) return;

    setDemandeData({ ...demandeData, type_intervention: type });

    if (type === 'preventive' && !planningData) {
      setPlanningData({
        frequency: 'monthly',
        week_of_month: 1,
        day_of_week: 'monday',
        time: '09:00',
        dtstart: today,
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!demandeData) return;

    if (!demandeData.label.trim()) return alert('Veuillez saisir un libellé.');
    if (demandeData.type_intervention === 'preventive' && existingPreventives.length > 0) {
      return alert('Des demandes préventives existent déjà pour certaines machines.');
    }

    setSubmitting(true);
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id || '';

    try {
      // Mise à jour de la demande
      const updateObj: any = {
        label: demandeData.label,
        description: demandeData.description,
        type_intervention: demandeData.type_intervention,
      };

      if (demandeData.type_intervention === 'corrective') {
        updateObj.urgence = demandeData.urgence;
      }

      const { error: demandeError } = await supabase
        .from('demande_intervention')
        .update(updateObj)
        .eq('id', id);

      if (demandeError) throw demandeError;

      // Mise à jour planning si préventive
      if (demandeData.type_intervention === 'preventive' && planningData) {
        const rruleString = generateRRule();
        const { error: planningError } = await supabase
          .from('maintenance_planning')
          .upsert({
            demande_id: id,
            machine_id: demandeData.machine_ids[0],
            created_by: userId || null,
            frequency: planningData.frequency,
            week_of_month: planningData.week_of_month,
            day_of_week: planningData.day_of_week,
            time: planningData.time,
            dtstart: planningData.dtstart,
            rrule: rruleString,
          }, { onConflict: 'demande_id' });

        if (planningError) throw planningError;
      } else if (demandeData.type_intervention === 'corrective') {
        const { error: planningDeleteError } = await supabase
          .from('maintenance_planning')
          .delete()
          .eq('demande_id', id);

        if (planningDeleteError) throw planningDeleteError;
      }

      alert('Demande mise à jour avec succès !');
      navigate('/admin/demandes');
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la mise à jour.');
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

  if (loading) return <div>Chargement...</div>;
  if (!demandeData) return <div>Demande non trouvée</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200">
        <div className="bg-gradient-to-r from-[#f15c00] to-orange-600 px-6 py-5">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Édition de la demande
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Machines
            </label>
            <input
              type="text"
              value={demandeData.machine_ids.join(', ')}
              readOnly
              className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 cursor-not-allowed"
            />
          </div>

          {/* Libellé */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Libellé *
            </label>
            <input
              type="text"
              value={demandeData.label}
              onChange={(e) => setDemandeData({ ...demandeData, label: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          {/* Type d'intervention */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Type d'intervention
            </label>
            <select
              value={demandeData.type_intervention}
              onChange={(e) => handleTypeChange(e.target.value as DemandeData['type_intervention'])}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="corrective">Corrective</option>
              <option value="preventive">Préventive</option>
            </select>
          </div>

          {/* Urgence (corrective only) */}
          {demandeData.type_intervention === 'corrective' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Urgence
              </label>
              <select
                value={demandeData.urgence}
                onChange={(e) => setDemandeData({ ...demandeData, urgence: e.target.value as any })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="faible">Faible</option>
                <option value="moyenne">Moyenne</option>
                <option value="élevée">Élevée</option>
              </select>
            </div>
          )}

          {/* Planning préventive */}
          {demandeData.type_intervention === 'preventive' && planningData && (
            <div className="bg-slate-50 p-6 rounded-lg space-y-4 border border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Planification de la maintenance
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fréquence</label>
                  <select
                    value={planningData.frequency}
                    onChange={(e) =>
                      setPlanningData({ ...planningData, frequency: e.target.value as FrequencyType })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {Object.entries(frequencyLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Semaine du mois</label>
                  <select
                    value={planningData.week_of_month}
                    onChange={(e) =>
                      setPlanningData({ ...planningData, week_of_month: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value={1}>1ère semaine</option>
                    <option value={2}>2ème semaine</option>
                    <option value={3}>3ème semaine</option>
                    <option value={4}>4ème semaine</option>
                    <option value={-1}>Dernière semaine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Jour de la semaine</label>
                  <select
                    value={planningData.day_of_week}
                    onChange={(e) =>
                      setPlanningData({ ...planningData, day_of_week: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {Object.entries(dayLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Heure d'intervention</label>
                  <input
                    type="time"
                    value={planningData.time}
                    onChange={(e) => setPlanningData({ ...planningData, time: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date de début</label>
                  <input
                    type="date"
                    value={planningData.dtstart}
                    min={today}
                    onChange={(e) => setPlanningData({ ...planningData, dtstart: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <MaintenanceCalendar nextOccurrences={nextOccurrences} label={demandeData.label} />
            </div>
          )}

          {/* Alertes demandes préventives existantes */}
          {checkingPreventive && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-800">
                Vérification des demandes préventives existantes...
              </span>
            </div>
          )}

          {existingPreventives.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-1">Demandes préventives existantes</h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    Les machines suivantes ont déjà des demandes préventives actives.
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {existingPreventives.map(demande => (
                  <li key={demande.id} className="bg-white p-3 rounded border border-yellow-200 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{demande.label || 'Sans libellé'}</p>
                      <p className="text-sm text-slate-600">{demande.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePreventive(demande.id)}
                      disabled={deletingIds.has(demande.id)}
                      className="ml-4 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {deletingIds.has(demande.id) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Suppression...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span className="text-sm">Supprimer</span>
                        </>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description détaillée *
            </label>
            <textarea
              value={demandeData.description}
              onChange={(e) => setDemandeData({ ...demandeData, description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent min-h-[120px]"
              required
            />
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
                  Mise à jour en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Mettre à jour
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
