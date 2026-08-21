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

      // Mapper l'urgence vers la priorité
      const prioriteMap = {
        'faible': 'faible',
        'moyenne': 'moyenne',
        'élevée': 'haute'
      };

      // Créer directement un ordre de travail correctif
      const { data: otData, error: otError } = await supabase
        .from('ordres_travail')
        .insert({
          machine_id: machine.id,
          type: 'correctif',
          date_programmee: new Date().toISOString(),
          statut: 'prévu',
          priorite: prioriteMap[demandeForm.urgence],
          cause: demandeForm.cause || null,
          type_intervention: demandeForm.type_intervention,
          observations: `${demandeForm.label ? `[${demandeForm.label}] ` : ''}${demandeForm.description}\n\nUrgence: ${demandeForm.urgence}\nCause: ${demandeForm.cause || 'Non spécifiée'}\nType: ${demandeForm.type_intervention}\nSignalé par: ${profile.nom || profile.email}`,
        })
        .select()
        .single();

      if (otError) {
        console.error('Erreur création OT:', otError);
        throw otError;
      }

      setSuccessMessage(`Problème signalé avec succès ! Un ordre de travail correctif (OT #${otData?.numot || 'N/A'}) a été créé.`);
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
      console.error('Erreur création ordre de travail:', err);
      alert('Erreur lors de la création de l\'ordre de travail');
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