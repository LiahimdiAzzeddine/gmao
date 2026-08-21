import { useState, FormEvent } from 'react';
import { GammeWithEtapes } from '../../types/gammes';
import { createGamme, updateGamme } from '../../hooks/useGammes';
import { X, Save, AlertCircle } from 'lucide-react';

interface GammeFormProps {
  gamme: GammeWithEtapes | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GammeForm({ gamme, onClose, onSuccess }: GammeFormProps) {
  const [nom, setNom] = useState(gamme?.nom || '');
  const [description, setDescription] = useState(gamme?.description || '');
  const [type, setType] = useState<'préventive' | 'corrective'>(gamme?.type || 'préventive');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!gamme;

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    } else if (nom.trim().length < 3) {
      newErrors.nom = 'Le nom doit contenir au moins 3 caractères';
    }

    if (!type) {
      newErrors.type = 'Le type est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const gammeData = {
        nom: nom.trim(),
        description: description.trim() || null,
        type,
      };

      if (isEditing) {
        await updateGamme(gamme.id, gammeData);
      } else {
        await createGamme(gammeData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving gamme:', error);
      setErrors({ submit: 'Erreur lors de la sauvegarde de la gamme' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {isEditing ? 'Modifier la gamme' : 'Nouvelle gamme'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-red-800 text-sm">{errors.submit}</p>
              </div>
            )}

            <div>
              <label htmlFor="nom" className="block text-sm font-semibold text-slate-700 mb-2">
                Nom de la gamme <span className="text-red-500">*</span>
              </label>
              <input
                id="nom"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.nom ? 'border-red-300 bg-red-50' : 'border-slate-300'
                }`}
                placeholder="Ex: Maintenance préventive mensuelle"
              />
              {errors.nom && <p className="text-red-600 text-sm mt-1">{errors.nom}</p>}
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Décrivez les objectifs et le contexte de cette gamme de maintenance..."
              />
              <p className="text-slate-500 text-xs mt-1">Optionnel</p>
            </div>
{/* 
            <div>
              <label htmlFor="type" className="block text-sm font-semibold text-slate-700 mb-2">
                Type de maintenance <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    type === 'préventive'
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value="préventive"
                    checked={type === 'préventive'}
                    onChange={(e) => setType(e.target.value as 'préventive' | 'corrective')}
                    className="w-4 h-4 text-green-600"
                  />
                  <div>
                    <div className="font-semibold text-slate-800">Préventive</div>
                    <div className="text-xs text-slate-600">Maintenance planifiée</div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    type === 'corrective'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value="corrective"
                    checked={type === 'corrective'}
                    onChange={(e) => setType(e.target.value as 'préventive' | 'corrective')}
                    className="w-4 h-4 text-orange-600"
                  />
                  <div>
                    <div className="font-semibold text-slate-800">Corrective</div>
                    <div className="text-xs text-slate-600">Réparation et dépannage</div>
                  </div>
                </label>
              </div>
              {errors.type && <p className="text-red-600 text-sm mt-1">{errors.type}</p>}
            </div> */}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-[#ee6b1a] text-white rounded-lg hover:bg-[#f15c00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {submitting ? 'Enregistrement...' : isEditing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
