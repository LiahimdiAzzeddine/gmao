
import { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { Site } from '../../types/posteTechnique';
import { supabase } from '../../lib/supabase';



type SitePopupProps = {
  isOpen: boolean;
  onClose: () => void;
  onSiteCreated: (site: Site) => void;
};

export default function SitePopup({ isOpen, onClose, onSiteCreated }: SitePopupProps) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
  });

  const handleSubmit = async () => {
    setCreating(true);
    setError('');

    try {
      // Validation
      if (!formData.code.trim() || !formData.nom.trim()) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      const { data: newSite, error } = await supabase
        .from('sites')
        .insert({
          code: formData.code.trim(),
          nom: formData.nom.trim(),
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ce code de site existe déjà');
        }
        throw error;
      }

     

      // Callback pour informer le parent
      onSiteCreated(newSite);

      // Réinitialiser et fermer
      setFormData({ code: '', nom: '' });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du site');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setFormData({ code: '', nom: '' });
    setError('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !creating) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#fff3e0] to-[#ffe0b2] px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Plus size={24} className="text-[#ee6b1a]" />
            Nouveau Site
          </h2>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-700 transition-colors p-1 hover:bg-white hover:bg-opacity-50 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Code du site <span className="text-red-500">*</span>
            </label>
       <input
  type="text"
  value={formData.code}
  onChange={(e) =>
    setFormData({ ...formData, code: e.target.value.toUpperCase() })
  }
  onKeyPress={handleKeyPress}
  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all"
  placeholder="Ex: SITE_A"
  disabled={creating}
/>

          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nom du site <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all"
              placeholder="Ex: Site Principal"
              disabled={creating}
            />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={creating}
              className="flex-1 px-6 py-2.5 bg-gradient-to-r from-[#ee6b1a] to-[#f57c00] text-white rounded-lg hover:from-[#f15c00] hover:to-[#ff8800] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Créer le site
                </>
              )}
            </button>
            <button
              onClick={handleClose}
              disabled={creating}
              className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50 font-medium"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}