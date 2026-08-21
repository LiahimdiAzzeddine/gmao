import { useState } from 'react';
import { AlertTriangle, Wrench, Info, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import PlanActionValidationModal, { PlanActionFormData } from './PlanActionValidationModal';

interface EtapeCheckee {
  etape_id: string;
  checked: boolean;
  commentaire?: string;
  statut: 'conforme' | 'non-conforme' | 'reporté';
  ordre?: number;
  description?: string;
}

interface CorrectifModalProps {
  etapesNonConformes: EtapeCheckee[];
  ordreOriginal: {
    id: string;
    machine: { nom: string; lot?: { nom?: string | null; code?: string | null } | null };
    plans_maintenance?: { gamme: { nom: string } };
  };
  onConfirm: (dateProgrammee: string, priorite: string, observations: string, planAction: PlanActionFormData) => Promise<void>;
  onCancel: () => void;
  onValidateWithoutOT?: () => void;
}

export default function CorrectifModal({
  etapesNonConformes,
  ordreOriginal,
  onConfirm,
  onCancel,
  onValidateWithoutOT
}: CorrectifModalProps) {
  const [dateProgrammee, setDateProgrammee] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [priorite, setPriorite] = useState('haute');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPlanActionModal, setShowPlanActionModal] = useState(false);

  const handleConfirm = async () => {
    if (!dateProgrammee) return;

    setShowPlanActionModal(true);
  };

  const handlePlanActionConfirm = async (planAction: PlanActionFormData) => {
    setLoading(true);
    try {
      await onConfirm(dateProgrammee, priorite, observations, planAction);
    } catch (error) {
      console.error('Erreur lors de la création de l\'OT correctif:', error);
    } finally {
      setLoading(false);
      setShowPlanActionModal(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 sm:p-6 text-white rounded-t-2xl flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg flex-shrink-0">
                <Wrench size={24} className="sm:w-7 sm:h-7" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">OT Correctif nécessaire</h2>
                <p className="text-red-100 text-xs sm:text-sm mt-1">
                  {etapesNonConformes.length} non-conformité{etapesNonConformes.length > 1 ? 's' : ''} détectée{etapesNonConformes.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors flex-shrink-0"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Informations OT parent */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 sm:p-4">
            <h3 className="font-bold text-blue-900 mb-2 text-sm sm:text-base">Machine & Gamme</h3>
            <div className="text-xs sm:text-sm text-blue-800 space-y-1">
              <p>• Machine: <span className="font-semibold">{ordreOriginal.machine.nom}</span></p>
              {ordreOriginal.plans_maintenance?.gamme && (
                <p>• Gamme: <span className="font-semibold">{ordreOriginal.plans_maintenance.gamme.nom}</span></p>
              )}
            </div>
          </div>

          {/* Liste des non-conformités */}
          <div>
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
              <AlertTriangle size={18} className="text-red-600" />
              Non-conformités à traiter
            </h3>
            <div className="space-y-2">
              {etapesNonConformes.map((etape, index) => (
                <div key={index} className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="bg-red-400 text-red-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm sm:text-base">
                        {etape.ordre ? `Étape ${etape.ordre}: ` : ''}{etape.description || 'Étape'}
                      </p>
                      {etape.commentaire && (
                        <p className="text-xs sm:text-sm text-slate-600 mt-1 italic break-words">
                          💬 {etape.commentaire}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formulaire OT correctif */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-900 mb-2">
                Priorité <span className="text-red-500">*</span>
              </label>
              <select
                value={priorite}
                onChange={(e) => setPriorite(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                disabled={loading}
              >
                <option value="faible">Faible</option>
                <option value="moyenne">Moyenne</option>
                <option value="haute">Haute</option>
                <option value="critique">Critique</option>
              </select>
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-900 mb-2">
                Date d'intervention <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dateProgrammee}
                onChange={(e) => setDateProgrammee(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-900 mb-2">
                Observations (optionnel)
              </label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Instructions particulières..."
                rows={3}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                disabled={loading}
              />
            </div>
          </div>

          {/* Informations */}
          <div className="bg-slate-100 border-2 border-slate-300 rounded-xl p-3 sm:p-4">
            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-sm sm:text-base">
              <Info size={16} />
              Ce qui va se passer
            </h4>
            <ul className="text-xs sm:text-sm text-slate-700 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-green-600 flex-shrink-0">✓</span>
                <span>L'intervention sera validée</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 flex-shrink-0">✓</span>
                <span>L'OT parent sera clôturé avec anomalie</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 flex-shrink-0">✓</span>
                <span>Un OT correctif sera créé</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 border-t-2 border-slate-200 rounded-b-2xl flex-shrink-0">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 text-slate-700 hover:bg-slate-200 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm sm:text-base order-1 sm:order-none"
          >
            Annuler
          </button>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                if (onValidateWithoutOT) {
                  onValidateWithoutOT();
                } else {
                  onCancel();
                }
              }}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm sm:text-base"
            >
              Valider sans OT
            </button>
            
            <button
              onClick={handleConfirm}
              disabled={loading || !dateProgrammee}
              className="px-4 sm:px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Création...</span>
                </>
              ) : (
                <>
                  <Wrench size={16} />
                  <span>Créer OT correctif</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    {showPlanActionModal && (
      <PlanActionValidationModal
        machineName={ordreOriginal.machine.nom}
        lotName={ordreOriginal.machine.lot?.nom || ordreOriginal.machine.lot?.code}
        showClosureFields={false}
        onConfirm={handlePlanActionConfirm}
        onCancel={() => setShowPlanActionModal(false)}
      />
    )}
    </>
  );
}
