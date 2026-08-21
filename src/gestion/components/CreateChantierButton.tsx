// CreateChantierButton.tsx
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CreateChantierButtonProps {
  devis_id: number;
  onSuccess: () => void;
}

export function CreateChantierButton({ devis_id, onSuccess }: CreateChantierButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCreateChantier = async () => {
    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('chantiers')
        .insert({
          devis_id: devis_id,
        });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('devis')
        .update({ statut: 'en_cours' })
        .eq('id', devis_id);

      if (updateError) throw updateError;

      onSuccess();
    } catch (err) {
      console.error('Erreur lors de la création du chantier:', err);
      alert('Erreur lors de la création du chantier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreateChantier}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
    >
      <MapPin className="w-4 h-4" />
      {loading ? 'Création...' : 'Créer le chantier'}
    </button>
  );
}