import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, Machine } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FailureModePicker } from './Ui/FailureModePicker';

interface DemandeModalProps {
  machine?: Machine | null;
  allowMachineSelection?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type InterventionType = 'corrective' | 'preventive';

export default function DemandeModal({ machine = null, allowMachineSelection = false, onClose, onSuccess }: DemandeModalProps) {
  const { profile, client } = useAuth();
  const [machines, setMachines] = useState<Array<Pick<Machine, 'id' | 'nom' | 'modele'>>>([]);
  const [selectedMachineId, setSelectedMachineId] = useState(machine?.id || '');
  const [demandeForm, setDemandeForm] = useState({
    description: '',
    urgence: 'moyenne' as 'faible' | 'moyenne' | 'élevée',
    label: '',
    cause: '',
    type_intervention: 'corrective' as InterventionType,
  });
  const [selectedFailureModeIds, setSelectedFailureModeIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!allowMachineSelection || !client?.id) return;

    let active = true;
    supabase
      .from('machines')
      .select('id, nom, modele')
      .eq('client_id', client.id)
      .order('nom')
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Erreur chargement machines client:', error);
          return;
        }
        setMachines(data || []);
      });

    return () => {
      active = false;
    };
  }, [allowMachineSelection, client?.id]);

  async function handleSubmitDemande(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    try {
      setSubmitting(true);

      if (selectedMachineId) {
        const { data: existingRequest, error: existingError } = await supabase
          .from('demande_intervention')
          .select('id')
          .eq('machine_id', selectedMachineId)
          .eq('type_intervention', demandeForm.type_intervention)
          .eq('statut', 'en attente')
          .maybeSingle();

        if (existingError) throw existingError;
        if (existingRequest) {
          const typeLabel = demandeForm.type_intervention === 'preventive' ? 'préventive' : 'corrective';
          alert(`Une demande ${typeLabel} est déjà en attente pour cette machine.`);
          onClose();
          onSuccess();
          return;
        }
      }

      const description = [
        demandeForm.description,
        demandeForm.cause ? `Cause signalée : ${demandeForm.cause}` : '',
      ].filter(Boolean).join('\n');

      const demandePayload = {
        machine_id: selectedMachineId || null,
        ...(selectedMachineId ? {} : { client_id: client?.id || null }),
        type_intervention: demandeForm.type_intervention,
        urgence: demandeForm.urgence,
        label: demandeForm.label || 'Problème signalé',
        description,
        statut: 'en attente',
        created_by: profile.id,
        date_demande: new Date().toISOString(),
        failure_mode_id: demandeForm.type_intervention === 'corrective'
          ? selectedFailureModeIds[0] || null
          : null,
      };

      const { error: demandeError } = await supabase
        .from('demande_intervention')
        .insert(demandePayload);

      if (demandeError) throw demandeError;

      toast.success('Votre demande a été envoyée avec succès.', {
        duration: 4000,
      });

      setDemandeForm({ 
        description: '', 
        urgence: 'moyenne', 
        label: '',
        cause: '',
        type_intervention: 'corrective'
      });
      setSelectedFailureModeIds([]);

      onClose();
      onSuccess();
    } catch (err) {
      console.error('Erreur création demande:', err);
      const message = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String(err.message)
          : 'Erreur lors de l’envoi de la demande';
      alert(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">
            Signaler un problème
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmitDemande}>
          <div className="space-y-4">
            {allowMachineSelection && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Machine concernée
                </label>
                <select
                  value={selectedMachineId}
                  onChange={(event) => setSelectedMachineId(event.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-slate-100"
                >
                  <option value="">Sans machine</option>
                  {machines.map((clientMachine) => (
                    <option key={clientMachine.id} value={clientMachine.id}>
                      {clientMachine.nom}{clientMachine.modele ? ` — ${clientMachine.modele}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Choisissez « Sans machine » si le problème concerne le site ou si l’équipement n’est pas encore identifié.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={demandeForm.label}
                onChange={(e) => setDemandeForm({ ...demandeForm, label: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Ex: A1, Vérif 01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type d'intervention *
              </label>
              <select
                value={demandeForm.type_intervention}
                onChange={(e) =>
                  {
                    const typeIntervention = e.target.value as InterventionType;
                    setDemandeForm({
                      ...demandeForm,
                      type_intervention: typeIntervention,
                    });
                    if (typeIntervention !== 'corrective') setSelectedFailureModeIds([]);
                  }
                }
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="corrective">Corrective</option>
                <option value="preventive">Préventive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cause du problème
              </label>
              <input
                type="text"
                value={demandeForm.cause}
                onChange={(e) => setDemandeForm({ ...demandeForm, cause: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Ex: Panne électrique, Fuite, Bruit anormal..."
              />
            </div>

            {demandeForm.type_intervention === 'corrective' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-800">
                  Classification de la défaillance
                </h4>
                <FailureModePicker
                  value={selectedFailureModeIds}
                  onChange={setSelectedFailureModeIds}
                  disabled={submitting}
                />
                <p className="mt-3 text-xs text-slate-500">
                  Cette classification est facultative et pourra être confirmée après le diagnostic.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description du problème *
              </label>
              <textarea
                value={demandeForm.description}
                onChange={(e) =>
                  setDemandeForm({ ...demandeForm, description: e.target.value })
                }
                required
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Décrivez le problème rencontré en détail..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Niveau d'urgence *
              </label>
              <select
                value={demandeForm.urgence}
                onChange={(e) =>
                  setDemandeForm({
                    ...demandeForm,
                    urgence: e.target.value as 'faible' | 'moyenne' | 'élevée',
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="faible">🟢 Faible - Peut attendre</option>
                <option value="moyenne">🟡 Moyenne - À traiter rapidement</option>
                <option value="élevée">🔴 Élevée - Urgent</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Envoi...' : 'Envoyer la demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
