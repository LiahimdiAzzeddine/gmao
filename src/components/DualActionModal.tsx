import { useState } from 'react';
import { AlertTriangle, Calendar, ClipboardList, Wrench, Info, Loader2, X } from 'lucide-react';
import { format, addDays } from 'date-fns';
import PlanActionValidationModal, { PlanActionFormData } from './PlanActionValidationModal';

interface EtapeCheckee {
  etape_id: string;
  checked: boolean;
  commentaire?: string;
  statut: 'conforme' | 'non-conforme' | 'reporté';
  ordre?: number;
  description?: string;
}

interface DualActionModalProps {
  etapesReportees: EtapeCheckee[];
  etapesNonConformes: EtapeCheckee[];
  ordreOriginal: {
    id: string;
    machine: { nom: string; lot?: { nom?: string | null; code?: string | null } | null };
    plans_maintenance?: { gamme: { nom: string } };
  };
  onConfirm: (
    dateReplanification: Date, 
    raisonReport: string,
    dateProgrammeeCorrectif: string,
    prioriteCorrectif: string,
    observationsCorrectif: string,
    planAction: PlanActionFormData | undefined,
    options: { creerReplanification: boolean; creerCorrectif: boolean }
  ) => Promise<void>;
  onCancel: () => void;
  onValidateWithoutOT?: () => void;
}

export default function DualActionModal({
  etapesReportees,
  etapesNonConformes,
  ordreOriginal,
  onConfirm,
  onCancel,
  onValidateWithoutOT
}: DualActionModalProps) {
  // États pour la replanification
  const [dateReplanification, setDateReplanification] = useState<string>(
    format(addDays(new Date(), 7), 'yyyy-MM-dd')
  );
  const [raisonReport, setRaisonReport] = useState('');

  // États pour l'OT correctif
  const [dateProgrammeeCorrectif, setDateProgrammeeCorrectif] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [prioriteCorrectif, setPrioriteCorrectif] = useState('haute');
  const [observationsCorrectif, setObservationsCorrectif] = useState('');

  // États pour la sélection des OT à créer
  const [creerReplanification, setCreerReplanification] = useState(true);
  const [creerCorrectif, setCreerCorrectif] = useState(true);

  const [loading, setLoading] = useState(false);
  const [showPlanActionModal, setShowPlanActionModal] = useState(false);

  const handleConfirm = async () => {
    // Vérifier qu'au moins un OT est sélectionné
    if (!creerReplanification && !creerCorrectif) {
      alert('⚠️ Veuillez sélectionner au moins un type d\'OT à créer');
      return;
    }

    // Vérifier les champs requis selon les OT sélectionnés
    if (creerReplanification && !dateReplanification) {
      alert('⚠️ La date de replanification est requise');
      return;
    }
    if (creerCorrectif && !dateProgrammeeCorrectif) {
      alert('⚠️ La date de l\'OT correctif est requise');
      return;
    }

    if (creerCorrectif) {
      setShowPlanActionModal(true);
      return;
    }

    setLoading(true);
    try {
      await onConfirm(
        new Date(dateReplanification),
        raisonReport,
        dateProgrammeeCorrectif,
        prioriteCorrectif,
        observationsCorrectif,
        undefined,
        { creerReplanification, creerCorrectif }
      );
    } catch (error) {
      console.error('Erreur lors de la création des OT:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour créer seulement l'OT de replanification
  const handlePlanActionConfirm = async (planAction: PlanActionFormData) => {
    setLoading(true);
    try {
      await onConfirm(
        new Date(dateReplanification),
        raisonReport,
        dateProgrammeeCorrectif,
        prioriteCorrectif,
        observationsCorrectif,
        planAction,
        { creerReplanification, creerCorrectif }
      );
    } catch (error) {
      console.error('Erreur lors de la création des OT:', error);
    } finally {
      setLoading(false);
      setShowPlanActionModal(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 p-4 sm:p-6 text-white rounded-t-2xl flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg flex-shrink-0">
                <AlertTriangle size={24} className="sm:w-7 sm:h-7" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Actions multiples requises</h2>
                <p className="text-orange-100 text-xs sm:text-sm mt-1">
                  2 OT distincts à créer
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

          {/* Message d'information */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-3 sm:p-4 rounded-lg">
            <div className="flex items-start gap-2 sm:gap-3">
              <Info className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-xs sm:text-sm text-amber-900">
                <p className="font-bold mb-1.5">Deux types de problèmes :</p>
                <ul className="space-y-1">
                  <li>• <strong>{etapesReportees.length} reportée(s)</strong> → OT Replanification</li>
                  <li>• <strong>{etapesNonConformes.length} non-conforme(s)</strong> → OT Correctif</li>
                </ul>
                <p className="mt-2 text-amber-800 font-semibold">
                  ⚠️ Sélectionnez les OT à créer ci-dessous
                </p>
              </div>
            </div>
          </div>

          {/* Sélection des OT à créer */}
          <div className="bg-slate-100 border-2 border-slate-300 rounded-xl p-3 sm:p-4">
            <h4 className="font-bold text-slate-900 mb-3 text-sm sm:text-base">
              Quels OT souhaitez-vous créer ?
            </h4>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={creerReplanification}
                  onChange={(e) => setCreerReplanification(e.target.checked)}
                  className="w-5 h-5 text-orange-600 border-2 border-slate-400 rounded focus:ring-2 focus:ring-orange-500 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1">
                  <span className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                    OT de Replanification (préventif)
                  </span>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Pour refaire les {etapesReportees.length} étape(s) reportée(s)
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={creerCorrectif}
                  onChange={(e) => setCreerCorrectif(e.target.checked)}
                  className="w-5 h-5 text-red-600 border-2 border-slate-400 rounded focus:ring-2 focus:ring-red-500 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1">
                  <span className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-red-600 transition-colors">
                    OT Correctif
                  </span>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Pour traiter les {etapesNonConformes.length} non-conformité(s)
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Section 1: Replanification */}
            <div className={`border-2 rounded-xl p-4 sm:p-5 transition-all ${
              creerReplanification 
                ? 'border-orange-300 bg-orange-50' 
                : 'border-slate-300 bg-slate-100 opacity-60'
            }`}>
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Calendar className={`flex-shrink-0 ${creerReplanification ? 'text-orange-600' : 'text-slate-400'}`} size={20} />
                <h3 className={`text-base sm:text-lg font-bold ${creerReplanification ? 'text-orange-900' : 'text-slate-500'}`}>
                  1. OT Replanification
                </h3>
              </div>

              {/* Liste des étapes reportées */}
              <div className="mb-3 sm:mb-4">
                <h4 className="text-xs sm:text-sm font-bold text-slate-700 mb-2">
                  Étapes ({etapesReportees.length})
                </h4>
                <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
                  {etapesReportees.map((etape, index) => (
                    <div key={index} className="bg-yellow-50 border border-yellow-300 rounded p-2 text-xs">
                      <p className="font-semibold text-slate-800">
                        {etape.ordre ? `${etape.ordre}. ` : ''}{etape.description || 'Étape'}
                      </p>
                      {etape.commentaire && (
                        <p className="text-slate-600 italic mt-1 break-words">💬 {etape.commentaire}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulaire replanification */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dateReplanification}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => setDateReplanification(e.target.value)}
                    disabled={!creerReplanification}
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-slate-200 disabled:cursor-not-allowed"
                    required={creerReplanification}
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1">
                    Raison (optionnel)
                  </label>
                  <textarea
                    value={raisonReport}
                    onChange={(e) => setRaisonReport(e.target.value)}
                    disabled={!creerReplanification}
                    placeholder="Ex: Pièce manquante..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none disabled:bg-slate-200 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: OT Correctif */}
            <div className={`border-2 rounded-xl p-4 sm:p-5 transition-all ${
              creerCorrectif 
                ? 'border-red-300 bg-red-50' 
                : 'border-slate-300 bg-slate-100 opacity-60'
            }`}>
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Wrench className={`flex-shrink-0 ${creerCorrectif ? 'text-red-600' : 'text-slate-400'}`} size={20} />
                <h3 className={`text-base sm:text-lg font-bold ${creerCorrectif ? 'text-red-900' : 'text-slate-500'}`}>
                  2. OT Correctif
                </h3>
              </div>

              {/* Liste des non-conformités */}
              <div className="mb-3 sm:mb-4">
                <h4 className="text-xs sm:text-sm font-bold text-slate-700 mb-2">
                  Non-conformités ({etapesNonConformes.length})
                </h4>
                <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
                  {etapesNonConformes.map((etape, index) => (
                    <div key={index} className="bg-red-100 border border-red-300 rounded p-2 text-xs">
                      <p className="font-semibold text-slate-800">
                        {etape.ordre ? `${etape.ordre}. ` : ''}{etape.description || 'Étape'}
                      </p>
                      {etape.commentaire && (
                        <p className="text-slate-600 italic mt-1 break-words">💬 {etape.commentaire}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulaire OT correctif */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1">
                    Priorité <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={prioriteCorrectif}
                    onChange={(e) => setPrioriteCorrectif(e.target.value)}
                    disabled={!creerCorrectif}
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-slate-200 disabled:cursor-not-allowed"
                  >
                    <option value="faible">Faible</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                    <option value="critique">Critique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dateProgrammeeCorrectif}
                    onChange={(e) => setDateProgrammeeCorrectif(e.target.value)}
                    disabled={!creerCorrectif}
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-slate-200 disabled:cursor-not-allowed"
                    required={creerCorrectif}
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1">
                    Observations (optionnel)
                  </label>
                  <textarea
                    value={observationsCorrectif}
                    onChange={(e) => setObservationsCorrectif(e.target.value)}
                    disabled={!creerCorrectif}
                    placeholder="Instructions..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none disabled:bg-slate-200 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Résumé */}
          <div className="bg-slate-100 border-2 border-slate-300 rounded-xl p-3 sm:p-4">
            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-sm sm:text-base">
              <ClipboardList size={16} />
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
              {creerReplanification && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 flex-shrink-0">✓</span>
                  <span><strong className="text-orange-700">OT Replanification</strong> sera créé</span>
                </li>
              )}
              {creerCorrectif && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 flex-shrink-0">✓</span>
                  <span><strong className="text-red-700">OT Correctif</strong> sera créé</span>
                </li>
              )}
              {!creerReplanification && !creerCorrectif && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 flex-shrink-0">⚠️</span>
                  <span className="text-amber-800 font-semibold">Aucun OT ne sera créé</span>
                </li>
              )}
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
              disabled={loading || (!creerReplanification && !creerCorrectif) || (creerReplanification && !dateReplanification) || (creerCorrectif && !dateProgrammeeCorrectif)}
              className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-orange-600 via-red-600 to-purple-600 hover:from-orange-700 hover:via-red-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Création...</span>
                </>
              ) : (
                <>
                  {creerReplanification && <Calendar size={16} />}
                  {creerCorrectif && <Wrench size={16} />}
                  <span className="hidden sm:inline">
                    {creerReplanification && creerCorrectif ? 'Créer les 2 OT' :
                     creerReplanification ? 'Créer OT Replanification' :
                     creerCorrectif ? 'Créer OT Correctif' :
                     'Sélectionner un OT'}
                  </span>
                  <span className="sm:hidden">
                    {creerReplanification && creerCorrectif ? 'Créer OT' :
                     creerReplanification ? 'Replanif.' :
                     creerCorrectif ? 'Correctif' :
                     'Sélectionner'}
                  </span>
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
