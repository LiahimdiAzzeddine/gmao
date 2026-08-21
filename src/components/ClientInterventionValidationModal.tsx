import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MessageSquare, X } from 'lucide-react';

export type ClientValidationIntervention = {
  id: string;
  client_valide: boolean;
  commentaire_client: string | null;
  title?: string;
  subtitle?: string;
};

interface ClientInterventionValidationModalProps {
  intervention: ClientValidationIntervention | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (interventionId: string, commentaireClient: string) => Promise<void>;
}

export default function ClientInterventionValidationModal({
  intervention,
  isOpen,
  isSaving,
  onClose,
  onConfirm,
}: ClientInterventionValidationModalProps) {
  const [commentaireClient, setCommentaireClient] = useState('');

  useEffect(() => {
    setCommentaireClient(intervention?.commentaire_client || '');
  }, [intervention?.id, intervention?.commentaire_client]);

  if (!isOpen || !intervention) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (intervention.client_valide) {
      onClose();
      return;
    }

    await onConfirm(intervention.id, commentaireClient);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Validation client</h2>
              <p className="mt-1 text-sm text-slate-600">
                {intervention.title || `Intervention #${intervention.id.slice(0, 8)}`}
              </p>
              {intervention.subtitle && (
                <p className="mt-0.5 text-xs text-slate-500">{intervention.subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          {intervention.client_valide ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircle2 size={16} />
                Deja validee par le client
              </div>
              {intervention.commentaire_client && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-emerald-900">
                  {intervention.commentaire_client}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <MessageSquare size={16} className="text-slate-500" />
                Commentaire client
              </label>
              <textarea
                value={commentaireClient}
                onChange={(event) => setCommentaireClient(event.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="Laissez un commentaire avant de valider l'intervention..."
                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500">{commentaireClient.length}/1000 caracteres</p>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Fermer
            </button>
            {!intervention.client_valide && (
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {isSaving ? 'Validation...' : 'Valider'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
