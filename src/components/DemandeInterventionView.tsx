import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase, DemandeIntervention, MaintenancePlanning } from '../lib/supabase';
import { Calendar, AlertCircle } from 'lucide-react';
import { RRule } from 'rrule';
import { MaintenanceCalendar } from './Ui/MaintenanceCalendar';

export default function DemandeInterventionView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [demandeData, setDemandeData] = useState<DemandeIntervention | null>(null);
  const [planningData, setPlanningData] = useState<MaintenancePlanning[]>([]);
  const [nextOccurrences, setNextOccurrences] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function loadDemande() {
      setLoading(true);

      // 1. Charger la demande
      const { data: demande, error: demandeError } = await supabase
        .from('demande_intervention')
        .select('*')
        .eq('id', id)
        .single();

      if (demandeError) {
        console.error(demandeError);
        setLoading(false);
        return;
      }

      setDemandeData(demande);

      // 2. Charger la planification associée
      const { data: planning, error: planningError } = await supabase
        .from('maintenance_planning')
        .select('*')
        .eq('demande_id', id);

      if (planningError) {
        console.error(planningError);
      } else if (planning) {
        setPlanningData(planning);

        // 3. Générer les prochaines occurrences
        const allOccurrences: Date[] = [];
        for (const p of planning) {
          try {
            const rule = RRule.fromString(p.rrule);
            const dates = rule.all((date, i) => i < 5); // 5 prochaines occurrences
            allOccurrences.push(...dates);
          } catch (err) {
            console.error('Erreur génération RRULE', err);
          }
        }
        setNextOccurrences(allOccurrences);
      }

      setLoading(false);
    }

    loadDemande();
  }, [id]);

  if (loading) return <div>Chargement...</div>;
  if (!demandeData) return <div>Demande non trouvée</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 space-y-6">

        {/* Label */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Label</label>
          <input
            type="text"
            value={demandeData.label || ''}
            readOnly
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg bg-slate-50 cursor-not-allowed"
          />
        </div>

        {/* Type d'intervention */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Type d'intervention</label>
          <div className="grid grid-cols-2 gap-3">
            {['preventive', 'corrective'].map(type => (
              <div
                key={type}
                className={`p-4 rounded-lg border-2 transition-all cursor-not-allowed ${
                  demandeData.type_intervention === type
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {type === 'preventive' ? <Calendar className="w-5 h-5 mx-auto mb-2" /> : <AlertCircle className="w-5 h-5 mx-auto mb-2" />}
                <div className="font-medium capitalize w-full text-center">{type}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Description détaillée</label>
          <textarea
            value={demandeData.description}
            readOnly
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg bg-slate-50 cursor-not-allowed"
            rows={4}
          />
        </div>

        {/* Prochaines interventions (si préventive) */}
        {demandeData.type_intervention === 'preventive' && nextOccurrences.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Prochaines interventions planifiées
            </h4>
            <MaintenanceCalendar nextOccurrences={nextOccurrences} label={demandeData.label || ''} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate('/admin/demandes')}
            className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
          >
            Retour
          </button>
          <button
            type="button"
            onClick={() => navigate(`/admin/demandes/edit/${demandeData.id}`)}
            className="px-6 py-3 border-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-semibold shadow-md transition-all"
          >
            Modifier
          </button>
        </div>

      </div>
    </div>
  );
}
