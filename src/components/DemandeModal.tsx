import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase, Machine } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DemandeModalProps {
  machine: Machine;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DemandeModal({ machine, onClose, onSuccess }: DemandeModalProps) {
  const { profile } = useAuth();
  const [demandeForm, setDemandeForm] = useState({
    description: '',
    urgence: 'moyenne' as 'faible' | 'moyenne' | 'élevée',
    label: '',
    cause: '',
    type_intervention: 'réparation' as string,
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmitDemande(e: React.FormEvent) {
    e.preventDefault();
    if (!machine || !profile) return;

    try {
      setSubmitting(true);

      const { data: existingRequest, error: existingError } = await supabase
        .from('demande_intervention')
        .select('id')
        .eq('machine_id', machine.id)
        .eq('type_intervention', 'corrective')
        .eq('statut', 'en attente')
        .maybeSingle();

      if (existingError) throw existingError;
      if (existingRequest) throw new Error('Une demande est déjà en attente pour cette machine.');

      const description = [
        demandeForm.description,
        demandeForm.cause ? `Cause signalée : ${demandeForm.cause}` : '',
        `Type demandé : ${demandeForm.type_intervention}`,
      ].filter(Boolean).join('\n');

      const { error: demandeError } = await supabase
        .from('demande_intervention')
        .insert({
          machine_id: machine.id,
          type_intervention: 'corrective',
          urgence: demandeForm.urgence,
          label: demandeForm.label || 'Problème signalé',
          description,
          statut: 'en attente',
          created_by: profile.id,
          date_demande: new Date().toISOString(),
        });

      if (demandeError) throw demandeError;

      setSuccessMessage('Demande envoyée avec succès. Elle sera examinée par un administrateur.');
      setDemandeForm({ 
        description: '', 
        urgence: 'moyenne', 
        label: '',
        cause: '',
        type_intervention: 'réparation'
      });
      
      // Afficher le message pendant 3 secondes avant de fermer
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
        onSuccess();
      }, 3000);
    } catch (err) {
      console.error('Erreur création demande:', err);
      alert(err instanceof Error ? err.message : 'Erreur lors de l’envoi de la demande');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
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
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">{successMessage}</p>
            </div>
          )}
          
          <div className="space-y-4">
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
                  setDemandeForm({ ...demandeForm, type_intervention: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="réparation">Réparation</option>
                <option value="dépannage">Dépannage</option>
                <option value="remplacement">Remplacement de pièce</option>
                <option value="diagnostic">Diagnostic</option>
                <option value="autre">Autre</option>
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
