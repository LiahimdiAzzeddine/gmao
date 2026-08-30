import { FormEvent, useEffect, useState } from 'react';
import { AlertCircle, Save, ShieldCheck, X } from 'lucide-react';
import { createEtape, updateEtape } from '../../hooks/useGammes';
import { EtapeGamme } from '../../types/gammes';

interface EtapeFormProps {
  gammeId: string;
  etape: EtapeGamme | null;
  nextOrdre: number;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

export default function EtapeForm({ gammeId, etape, nextOrdre, onClose, onSuccess }: EtapeFormProps) {
  const [description, setDescription] = useState(etape?.description || '');
  const [dureeEstimee, setDureeEstimee] = useState(etape?.duree_estimee?.toString() || '');
  const [outil, setOutil] = useState(etape?.outil || '');
  const [piece, setPiece] = useState(etape?.piece || '');
  const [consigneSecurite, setConsigneSecurite] = useState(etape?.consigne_securite || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const isEditing = Boolean(etape);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, submitting]);

  function validateForm() {
    const nextErrors: Record<string, string> = {};
    const duration = Number(dureeEstimee);
    if (!description.trim()) nextErrors.description = 'La description est requise.';
    else if (description.trim().length < 5) nextErrors.description = 'Décrivez l’étape avec au moins 5 caractères.';
    if (dureeEstimee && (!Number.isInteger(duration) || duration <= 0 || duration > 1440)) {
      nextErrors.dureeEstimee = 'Saisissez un nombre entier entre 1 et 1 440 minutes.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setErrors({});
    try {
      const payload = {
        gamme_id: gammeId,
        ordre: etape?.ordre ?? nextOrdre,
        description: description.trim(),
        duree_estimee: dureeEstimee ? Number(dureeEstimee) : null,
        outil: outil.trim() || null,
        piece: piece.trim() || null,
        consigne_securite: consigneSecurite.trim() || null,
      };
      if (etape) await updateEtape(etape.id, payload);
      else await createEtape(payload);
      await onSuccess();
    } catch (error) {
      console.error('Error saving etape:', error);
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setErrors({ submit: `Impossible d’enregistrer l’étape. ${message}` });
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#f15c00] focus:ring-4 focus:ring-orange-100';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="etape-form-title"
      onMouseDown={(event) => event.target === event.currentTarget && !submitting && onClose()}
    >
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-[#d95708] to-[#f98440] px-5 py-4 text-white sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-100">Étape {etape?.ordre ?? nextOrdre}</p>
            <h2 id="etape-form-title" className="mt-1 text-xl font-black sm:text-2xl">{isEditing ? 'Modifier l’étape' : 'Ajouter une étape'}</h2>
            <p className="mt-1 text-sm text-orange-50">Précisez l’action, les moyens et les règles de sécurité.</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition hover:bg-white/20 disabled:opacity-50" aria-label="Fermer">
            <X size={21} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            {errors.submit && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
                <AlertCircle className="mt-0.5 flex-shrink-0 text-red-600" size={19} />
                <p>{errors.submit}</p>
              </div>
            )}

            <div>
              <label htmlFor="etape-description" className="mb-2 block text-sm font-bold text-slate-700">Action à réaliser <span className="text-red-500">*</span></label>
              <textarea
                id="etape-description"
                autoFocus
                value={description}
                maxLength={1000}
                onChange={(event) => {
                  setDescription(event.target.value);
                  if (errors.description) setErrors((current) => ({ ...current, description: '' }));
                }}
                rows={3}
                className={`${inputClass} resize-none ${errors.description ? 'border-red-300 bg-red-50' : ''}`}
                placeholder="Ex. Vérifier le niveau d’huile et compléter si nécessaire"
                aria-invalid={Boolean(errors.description)}
              />
              {errors.description && <p className="mt-1.5 text-sm text-red-600">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="duree-estimee" className="mb-2 block text-sm font-bold text-slate-700">Durée estimée</label>
                <div className="relative">
                  <input id="duree-estimee" type="number" min="1" max="1440" step="1" value={dureeEstimee} onChange={(event) => setDureeEstimee(event.target.value)} className={`${inputClass} pr-20 ${errors.dureeEstimee ? 'border-red-300 bg-red-50' : ''}`} placeholder="15" />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">minutes</span>
                </div>
                {errors.dureeEstimee && <p className="mt-1.5 text-sm text-red-600">{errors.dureeEstimee}</p>}
              </div>
              <div>
                <label htmlFor="outil" className="mb-2 block text-sm font-bold text-slate-700">Outil nécessaire</label>
                <input id="outil" value={outil} maxLength={255} onChange={(event) => setOutil(event.target.value)} className={inputClass} placeholder="Ex. Clé à molette 12 mm" />
              </div>
            </div>

            <div>
              <label htmlFor="piece" className="mb-2 block text-sm font-bold text-slate-700">Pièce ou consommable</label>
              <input id="piece" value={piece} maxLength={255} onChange={(event) => setPiece(event.target.value)} className={inputClass} placeholder="Ex. Filtre à huile réf. XYZ123" />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <label htmlFor="consigne-securite" className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                <ShieldCheck size={18} className="text-amber-600" /> Consigne de sécurité
              </label>
              <textarea id="consigne-securite" value={consigneSecurite} maxLength={1000} onChange={(event) => setConsigneSecurite(event.target.value)} rows={3} className={`${inputClass} resize-none bg-white`} placeholder="Ex. Consigner la machine et porter les EPI adaptés" />
              <p className="mt-1.5 text-xs text-amber-800">Facultatif, mais recommandé pour sécuriser l’intervention.</p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-white disabled:opacity-50">Annuler</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ee6b1a] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#d95708] disabled:cursor-not-allowed disabled:opacity-60">
              <Save size={18} className={submitting ? 'animate-pulse' : ''} />
              {submitting ? 'Enregistrement…' : isEditing ? 'Enregistrer les modifications' : 'Ajouter l’étape'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
