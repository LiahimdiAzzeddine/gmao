import { useState } from 'react';
import { AlertTriangle, Calendar, ClipboardList, Info, Loader2, X } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EtapeCheckee {
  etape_id: string;
  checked: boolean;
  commentaire?: string;
  statut: 'conforme' | 'non-conforme' | 'reporté';
}

interface EtapeGamme {
  id: string;
  ordre: number;
  description: string;
  duree_estimee?: number;
  outil?: string;
  piece?: string;
}

interface ReplanificationModalProps {
  etapesReportees: EtapeCheckee[];
  etapesGammeDetails: EtapeGamme[];
  ordreOriginal: {
    id: string;
    machine: { nom: string };
    plans_maintenance?: { gamme: { nom: string } };
  };
  onConfirm: (date: Date, raison: string) => Promise<void>;
  onCancel: () => void;
  onValidateWithoutOT?: () => void;
}

export default function ReplanificationModal({
  etapesReportees,
  etapesGammeDetails,
  ordreOriginal,
  onConfirm,
  onCancel,
  onValidateWithoutOT
}: ReplanificationModalProps) {
  const [dateReplanification, setDateReplanification] = useState<string>(
    format(addDays(new Date(), 7), 'yyyy-MM-dd')
  );
  const [raisonReport, setRaisonReport] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!dateReplanification) return;

    setLoading(true);
    try {
      await onConfirm(new Date(dateReplanification), raisonReport);
    } catch (error) {
      console.error('Erreur lors de la replanification:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 sm:p-6 text-white rounded-t-2xl flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg flex-shrink-0">
                <AlertTriangle size={24} className="sm:w-7 sm:h-7" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Replanification nécessaire</h2>
                <p className="text-orange-100 text-xs sm:text-sm mt-1">
                  {etapesReportees.length} étape{etapesReportees.length > 1 ? 's' : ''} reportée{etapesReportees.length > 1 ? 's' : ''}
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

          {/* Liste des étapes reportées */}
          <div>
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
              <ClipboardList size={18} />
              Étapes à replanifier
            </h3>
            <div className="space-y-2">
              {etapesReportees.map((etapeCheckee, index) => {
                const etapeDetail = etapesGammeDetails.find(e => e.id === etapeCheckee.etape_id);
                if (!etapeDetail) return null;

                return (
                  <div key={etapeDetail.id} className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="bg-yellow-400 text-yellow-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm sm:text-base">{etapeDetail.description}</p>
                        {etapeCheckee.commentaire && (
                          <p className="text-xs sm:text-sm text-slate-600 mt-1 italic break-words">
                            💬 {etapeCheckee.commentaire}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Date de replanification */}
          <div>
            <label className="block text-sm sm:text-base font-bold text-slate-900 mb-2">
              Date de replanification <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dateReplanification}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setDateReplanification(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          {/* Raison du report */}
          <div>
            <label className="block text-sm sm:text-base font-bold text-slate-900 mb-2">
              Raison du report (optionnel)
            </label>
            <textarea
              value={raisonReport}
              onChange={(e) => setRaisonReport(e.target.value)}
              placeholder="Ex: Pièce manquante, intervention trop longue..."
              rows={3}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
            />
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
                <span>Un nouvel OT préventif sera créé</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 flex-shrink-0">✓</span>
                <span>Seules les étapes reportées seront à refaire</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 flex-shrink-0">✓</span>
                <span>L'OT parent sera clôturé avec anomalie</span>
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
              disabled={loading || !dateReplanification}
              className="px-4 sm:px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Création...</span>
                </>
              ) : (
                <>
                  <Calendar size={16} />
                  <span>Créer OT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
