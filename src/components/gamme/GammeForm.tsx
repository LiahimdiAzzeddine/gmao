import { FormEvent, useEffect, useState } from 'react';
import { AlertCircle, Save, X } from 'lucide-react';
import { createGamme, updateGamme } from '../../hooks/useGammes';
import { GammeWithEtapes } from '../../types/gammes';

interface GammeFormProps {
  gamme: GammeWithEtapes | null;
  onClose: () => void;
  onSuccess: () => void;
}

type GammeType = 'préventive' | 'corrective';

export default function GammeForm({ gamme, onClose, onSuccess }: GammeFormProps) {
  const [nom, setNom] = useState(gamme?.nom || '');
  const [description, setDescription] = useState(gamme?.description || '');
  const [type, setType] = useState<GammeType>(gamme?.type || 'préventive');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const isEditing = Boolean(gamme);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, submitting]);

  function validateForm() {
    const nextErrors: Record<string, string> = {};
    if (!nom.trim()) nextErrors.nom = 'Le nom est requis.';
    else if (nom.trim().length < 3) nextErrors.nom = 'Le nom doit contenir au moins 3 caractères.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setErrors({});
    try {
      const payload = { nom: nom.trim(), description: description.trim() || null, type };
      if (gamme) await updateGamme(gamme.id, payload);
      else await createGamme(payload);
      onSuccess();
    } catch (error) {
      console.error('Error saving gamme:', error);
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setErrors({ submit: `Impossible d’enregistrer la gamme. ${message}` });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gamme-form-title"
      onMouseDown={(event) => event.target === event.currentTarget && !submitting && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-700 px-5 py-4 text-white sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">Configuration</p>
            <h2 id="gamme-form-title" className="mt-1 text-xl font-black sm:text-2xl">
              {isEditing ? 'Modifier la gamme' : 'Nouvelle gamme'}
            </h2>
            <p className="mt-1 text-sm text-slate-300">Définissez le modèle avant d’ajouter ses étapes.</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition hover:bg-white/15 disabled:opacity-50" aria-label="Fermer">
            <X size={21} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            {errors.submit && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
                <AlertCircle className="mt-0.5 flex-shrink-0 text-red-600" size={19} />
                <p>{errors.submit}</p>
              </div>
            )}

            <div>
              <label htmlFor="nom" className="mb-2 block text-sm font-bold text-slate-700">Nom de la gamme <span className="text-red-500">*</span></label>
              <input
                id="nom"
                autoFocus
                maxLength={120}
                value={nom}
                onChange={(event) => {
                  setNom(event.target.value);
                  if (errors.nom) setErrors((current) => ({ ...current, nom: '' }));
                }}
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#f15c00] focus:ring-4 focus:ring-orange-100 ${errors.nom ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
                placeholder="Ex. Contrôle mensuel des armoires électriques"
                aria-invalid={Boolean(errors.nom)}
              />
              {errors.nom && <p className="mt-1.5 text-sm text-red-600">{errors.nom}</p>}
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-bold text-slate-700">Type de maintenance</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([
                  ['préventive', 'Préventive', 'Opérations planifiées et répétitives'],
                  ['corrective', 'Corrective', 'Opérations déclenchées après un défaut'],
                ] as const).map(([value, label, help]) => (
                  <label key={value} className={`cursor-pointer rounded-xl border p-4 transition ${type === value ? 'border-[#f15c00] bg-orange-50 ring-2 ring-orange-100' : 'border-slate-200 hover:border-slate-300'}`}>
                    <span className="flex items-start gap-3">
                      <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} className="mt-1 accent-[#f15c00]" />
                      <span>
                        <span className="block text-sm font-bold text-slate-800">{label}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{help}</span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="description" className="text-sm font-bold text-slate-700">Description</label>
                <span className="text-xs text-slate-400">{description.length}/500</span>
              </div>
              <textarea id="description" value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} rows={4} className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#f15c00] focus:ring-4 focus:ring-orange-100" placeholder="Objectif, périmètre et conditions particulières de cette gamme…" />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-white disabled:opacity-50">Annuler</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ee6b1a] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#d95708] disabled:cursor-not-allowed disabled:opacity-60">
              <Save size={18} className={submitting ? 'animate-pulse' : ''} />
              {submitting ? 'Enregistrement…' : isEditing ? 'Enregistrer les modifications' : 'Créer la gamme'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
