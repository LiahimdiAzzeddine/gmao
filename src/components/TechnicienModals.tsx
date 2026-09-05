import React, { useState, useEffect } from 'react';
import { X, Mail, User, Lock, Loader2, Eye, EyeOff, Calendar, Wrench, AlertTriangle, Copy, Check } from 'lucide-react';
import { supabase, supabaseAnon } from '../lib/supabase';

interface Technicien {
  id: string;
  nom: string;
  email: string | null;
  password?: string | null;
  created_at: string;
  totalInterventions: number;
  interventionsEnCours: number;
}

interface AddTechnicienModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddTechnicienModal: React.FC<AddTechnicienModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setNom('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const emailTrimmed = email.trim();

      if (!emailTrimmed) {
        throw new Error("L'email est requis.");
      }

      if (!password || password.length < 6) {
        throw new Error("Mot de passe trop court (min. 6 caractères).");
      }

      const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
        email: emailTrimmed,
        password,
      });

      if (signUpError) {
        if (signUpError.message.includes("already") || signUpError.code === "user_already_exists") {
          throw new Error("Cet email est déjà utilisé.");
        }
        throw signUpError;
      }

      const userId = signUpData.user?.id;
      if (!userId) throw new Error("Impossible de récupérer l'ID utilisateur.");

      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        nom: nom,
        role: "technicien",
        email: emailTrimmed,
        password: password,
      });

      if (profileError) throw profileError;

      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Erreur lors de la création:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Ajouter un technicien</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nom complet
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 outline-none focus:border-[#f98440]/60 focus:ring-2 focus:ring-[#f98440]/15"
                placeholder="Jean Dupont"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 outline-none focus:border-[#f98440]/60 focus:ring-2 focus:ring-[#f98440]/15"
                placeholder="jean.dupont@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-12 outline-none focus:border-[#f98440]/60 focus:ring-2 focus:ring-[#f98440]/15"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Minimum 6 caractères</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#f98440] px-4 py-2.5 font-semibold text-white transition-colors hover:bg-[#e97435] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Création...
                </>
              ) : (
                'Créer le compte'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditTechnicienModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  technicien: Technicien | null;
}

export const EditTechnicienModal: React.FC<EditTechnicienModalProps> = ({ isOpen, onClose, onSuccess, technicien }) => {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (technicien) {
      setNom(technicien.nom);
      setEmail(technicien.email || '');
      setPassword('');
    }
  }, [technicien]);

  const resetForm = () => {
    setNom('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!technicien) return;

  setError(null);
  setLoading(true);

  try {
    const emailChanged = email !== technicien.email;
    const passwordChanged = password.length >= 6;

    // 1️⃣ Mise à jour du profil dans la table profiles
    const updateData: { nom: string; email?: string; password?: string } = { nom };
    if (emailChanged) updateData.email = email;
    if (passwordChanged) updateData.password = password;

    if (emailChanged || passwordChanged || nom !== technicien.nom) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', technicien.id);

      if (updateError) throw updateError;
    }

    // 2️⃣ Mise à jour des credentials via Edge Function (email / password)
    if (emailChanged || passwordChanged) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const authUpdateData: { userId: string; email?: string; password?: string } = {
        userId: technicien.id
      };
      if (emailChanged) authUpdateData.email = email;
      if (passwordChanged) authUpdateData.password = password;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-auth`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authUpdateData),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erreur API Edge Function: ${errText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la mise à jour des identifiants');
      }
    }

    // ✅ Succès
    onSuccess();
    handleClose();

  } catch (err) {
    console.error('Erreur lors de la mise à jour:', err);
    setError(err instanceof Error ? err.message : 'Une erreur est survenue');
  } finally {
    setLoading(false);
  }
};


  if (!isOpen || !technicien) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold text-slate-800">Modifier le technicien</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nom complet
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 outline-none focus:border-[#f98440]/60 focus:ring-2 focus:ring-[#f98440]/15"
                placeholder="Jean Dupont"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 outline-none focus:border-[#f98440]/60 focus:ring-2 focus:ring-[#f98440]/15"
                placeholder="jean.dupont@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-12 outline-none focus:border-[#f98440]/60 focus:ring-2 focus:ring-[#f98440]/15"
                placeholder="Laisser vide pour ne pas changer"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Optionnel - Minimum 6 caractères</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#f98440] px-4 py-2.5 font-semibold text-white transition-colors hover:bg-[#e97435] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Modification...
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ViewTechnicienModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicien: Technicien | null;
}

export const ViewTechnicienModal: React.FC<ViewTechnicienModalProps> = ({ isOpen, onClose, technicien }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedBoth, setCopiedBoth] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = async (text: string, type: 'email' | 'password' | 'both') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else if (type === 'password') {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      } else {
        setCopiedBoth(true);
        setTimeout(() => setCopiedBoth(false), 2000);
      }
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  const copyBothCredentials = () => {
    if (technicien?.email && technicien?.password) {
      const credentials = `email: ${technicien.email}; password: ${technicien.password}`;
      copyToClipboard(credentials, 'both');
    }
  };

  if (!isOpen || !technicien) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#f98440] px-5 py-4">
          <h2 className="text-base font-bold text-white">Profil du technicien</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/20"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#f98440] text-lg font-bold text-white">
              {technicien.nom.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-800 truncate">{technicien.nom}</h3>
              <p className="text-xs text-slate-500 truncate">ID: {technicien.id.slice(0, 8)}...</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-slate-50 rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Mail size={14} />
                  <span className="text-xs font-medium">Email</span>
                </div>
                {technicien.email && (
                  <button
                    onClick={() => copyToClipboard(technicien.email!, 'email')}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                    title="Copier l'email"
                  >
                    {copiedEmail ? (
                      <Check size={12} className="text-green-600" />
                    ) : (
                      <Copy size={12} className="text-slate-600" />
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-900 font-medium break-all">
                {technicien.email || 'Non renseigné'}
              </p>
            </div>

            {technicien.password && (
              <div className="bg-slate-50 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Lock size={14} />
                    <span className="text-xs font-medium">Mot de passe</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 hover:bg-slate-200 rounded transition-colors"
                      title={showPassword ? 'Masquer' : 'Afficher'}
                    >
                      {showPassword ? (
                        <EyeOff size={12} className="text-slate-600" />
                      ) : (
                        <Eye size={12} className="text-slate-600" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(technicien.password!, 'password')}
                      className="p-1 hover:bg-slate-200 rounded transition-colors"
                      title="Copier le mot de passe"
                    >
                      {copiedPassword ? (
                        <Check size={12} className="text-green-600" />
                      ) : (
                        <Copy size={12} className="text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-900 font-medium font-mono">
                  {showPassword ? technicien.password : '••••••••'}
                </p>
              </div>
            )}

            <div className="bg-slate-50 rounded p-2">
              <div className="flex items-center gap-1.5 text-slate-600 mb-1">
                <Calendar size={14} />
                <span className="text-xs font-medium">Membre depuis</span>
              </div>
              <p className="text-xs text-slate-900 font-medium">
                {formatDate(technicien.created_at)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[#f98440]">
                  <Wrench size={14} />
                  <span className="text-xs font-medium">Total</span>
                </div>
                <p className="text-lg font-bold text-slate-900">
                  {technicien.totalInterventions}
                </p>
                <p className="text-xs text-[#d96523]">interventions</p>
              </div>

              <div className="bg-green-50 rounded p-2 border border-green-200">
                <div className="flex items-center gap-1.5 text-green-600 mb-1">
                  <Wrench size={14} />
                  <span className="text-xs font-medium">En cours</span>
                </div>
                <p className="text-lg font-bold text-green-900">
                  {technicien.interventionsEnCours}
                </p>
                <p className="text-xs text-green-600">actives</p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {technicien.email && technicien.password && (
              <button
                onClick={copyBothCredentials}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#f98440] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e97435]"
              >
                {copiedBoth ? (
                  <>
                    <Check size={14} className="text-white" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copier email et mot de passe
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  technicien: Technicien | null;
  loading: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  technicien,
  loading
}) => {
  if (!isOpen || !technicien) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-center gap-3 rounded-t-xl">
          <div className="bg-red-100 p-2 rounded-lg">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-red-900">Confirmer la suppression</h2>
        </div>

        <div className="p-6">
          <p className="text-slate-700 mb-4">
            Êtes-vous sûr de vouloir supprimer le technicien <span className="font-bold">{technicien.nom}</span> ?
          </p>

          {technicien.totalInterventions > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-amber-800 text-sm">
                Ce technicien a <span className="font-bold">{technicien.totalInterventions} intervention(s)</span> associée(s).
                La suppression sera impossible s'il a des interventions actives.
              </p>
            </div>
          )}

          <p className="text-slate-600 text-sm mb-6">
            Cette action est irréversible.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
