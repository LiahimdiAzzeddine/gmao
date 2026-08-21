import { useState, FormEvent } from 'react';
import { EtapeGamme } from '../../types/gammes';
import { createEtape, updateEtape } from '../../hooks/useGammes';
import { X, Save, AlertCircle } from 'lucide-react';

interface EtapeFormProps {
  gammeId: string;
  etape: EtapeGamme | null;
  nextOrdre: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EtapeForm({
  gammeId,
  etape,
  nextOrdre,
  onClose,
  onSuccess,
}: EtapeFormProps) {
  const [description, setDescription] = useState(etape?.description || '');
  const [dureeEstimee, setDureeEstimee] = useState(etape?.duree_estimee?.toString() || '');
  const [outil, setOutil] = useState(etape?.outil || '');
  const [piece, setPiece] = useState(etape?.piece || '');
  const [consigneSecurite, setConsigneSecurite] = useState(etape?.consigne_securite || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!etape;

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!description.trim()) {
      newErrors.description = 'La description est requise';
    } else if (description.trim().length < 10) {
      newErrors.description = 'La description doit contenir au moins 10 caractères';
    }

    if (dureeEstimee && isNaN(Number(dureeEstimee))) {
      newErrors.dureeEstimee = 'La durée doit être un nombre';
    } else if (dureeEstimee && Number(dureeEstimee) <= 0) {
      newErrors.dureeEstimee = 'La durée doit être supérieure à 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const etapeData = {
        gamme_id: gammeId,
        ordre: isEditing ? etape.ordre : nextOrdre,
        description: description.trim(),
        duree_estimee: dureeEstimee ? Number(dureeEstimee) : null,
        outil: outil.trim() || null,
        piece: piece.trim() || null,
        consigne_securite: consigneSecurite.trim() || null,
      };

      if (isEditing) {
        await updateEtape(etape.id, etapeData);
      } else {
        await createEtape(etapeData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving etape:', error);
      setErrors({ submit: 'Erreur lors de la sauvegarde de l\'étape' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-[#ee6b1a] to-[#f15c00] text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {isEditing ? 'Modifier l\'étape' : 'Nouvelle étape'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#d94f00] rounded-lg transition-colors"
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
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Description de l'étape <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  errors.description ? 'border-red-300 bg-red-50' : 'border-slate-300'
                }`}
                placeholder="Ex: Vérifier le niveau d'huile et compléter si nécessaire"
              />
              {errors.description && (
                <p className="text-red-600 text-sm mt-1">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="dureeEstimee"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Durée estimée (minutes)
                </label>
                <input
                  id="dureeEstimee"
                  type="number"
                  min="0"
                  step="1"
                  value={dureeEstimee}
                  onChange={(e) => setDureeEstimee(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.dureeEstimee ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                  placeholder="Ex: 15"
                />
                {errors.dureeEstimee && (
                  <p className="text-red-600 text-sm mt-1">{errors.dureeEstimee}</p>
                )}
                <p className="text-slate-500 text-xs mt-1">Optionnel</p>
              </div>

              <div>
                <label htmlFor="outil" className="block text-sm font-semibold text-slate-700 mb-2">
                  Outil nécessaire
                </label>
                <input
                  id="outil"
                  type="text"
                  value={outil}
                  onChange={(e) => setOutil(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Clé à molette 12mm"
                />
                <p className="text-slate-500 text-xs mt-1">Optionnel</p>
              </div>
            </div>

            <div>
              <label htmlFor="piece" className="block text-sm font-semibold text-slate-700 mb-2">
                Pièce de rechange
              </label>
              <input
                id="piece"
                type="text"
                value={piece}
                onChange={(e) => setPiece(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Filtre à huile réf. XYZ123"
              />
              <p className="text-slate-500 text-xs mt-1">Optionnel</p>
            </div>

            <div>
              <label
                htmlFor="consigneSecurite"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Consignes de sécurité
              </label>
              <textarea
                id="consigneSecurite"
                value={consigneSecurite}
                onChange={(e) => setConsigneSecurite(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Ex: Porter des gants de protection et s'assurer que la machine est éteinte"
              />
              <p className="text-slate-500 text-xs mt-1">Optionnel mais recommandé</p>
            </div>
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
