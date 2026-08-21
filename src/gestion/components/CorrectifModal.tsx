import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useContractCorrectifs, ContractCorrectif } from '../../hooks/useContractCorrectifs';

interface CorrectifModalProps {
  periodId: number;
  correctif?: ContractCorrectif | null;
  onClose: () => void;
  onSave: () => void;
}

const CorrectifModal: React.FC<CorrectifModalProps> = ({ 
  periodId, 
  correctif, 
  onClose, 
  onSave 
}) => {
  const { createCorrectif, updateCorrectif } = useContractCorrectifs(periodId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState({
    description: '',
    prix_unitaire: 0,
    quantite: 1
  });

  useEffect(() => {
    if (correctif) {
      setFormData({
        description: correctif.description,
        prix_unitaire: correctif.prix_unitaire,
        quantite: correctif.quantite
      });
    }
  }, [correctif]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      setError('La description est obligatoire');
      return;
    }

    if (formData.prix_unitaire <= 0) {
      setError('Le prix unitaire doit être supérieur à 0');
      return;
    }

    if (formData.quantite <= 0) {
      setError('La quantité doit être supérieure à 0');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (correctif) {
        await updateCorrectif({
          id: correctif.id,
          ...formData
        });
      } else {
        await createCorrectif({
          contract_period_id: periodId,
          ...formData
        });
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      setError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const total = formData.prix_unitaire * formData.quantite;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {correctif ? 'Modifier le travail correctif' : 'Nouveau travail correctif'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Affichage des erreurs */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-red-600" size={20} />
                <p className="text-red-600 font-medium">Erreur</p>
              </div>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description du travail *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Description détaillée du travail correctif"
              required
            />
          </div>

          {/* Prix unitaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prix unitaire (MAD) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.prix_unitaire || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                prix_unitaire: e.target.value ? parseFloat(e.target.value) : 0 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>

          {/* Quantité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantité *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.quantite || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                quantite: e.target.value ? parseFloat(e.target.value) : 1 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="1"
              required
            />
          </div>

          {/* Total calculé */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total :</span>
              <span className="text-lg font-bold text-gray-900">
                {total.toLocaleString('fr-FR', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} MAD
              </span>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              <Save size={16} />
              {loading ? 'Sauvegarde...' : (correctif ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CorrectifModal;