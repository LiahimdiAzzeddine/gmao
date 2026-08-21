import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Receipt } from 'lucide-react';
import { useContractPeriods, ContractPeriod, CreateContractPeriodData } from '../../hooks/useContractPeriods';

interface ContractPeriodModalProps {
  contractId: number;
  period?: ContractPeriod | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ContractPeriodModal: React.FC<ContractPeriodModalProps> = ({
  contractId,
  period,
  onClose,
  onSuccess
}) => {
  const { createPeriod, updatePeriod, updateFactureDates } = useContractPeriods();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<CreateContractPeriodData>({
    contract_id: contractId,
    periode_debut: '',
    periode_fin: '',
    montant: 0,
    statut: 'en_attente',
    payment_mode: ''
  });

  const [factureData, setFactureData] = useState({
    date_facture: '',
    date_echeance: ''
  });

  const statutOptions = [
    { value: 'en_attente', label: 'En attente' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'facture', label: 'Facturé' },
    { value: 'payee', label: 'Payée' },
    { value: 'annulee', label: 'Annulée' }
  ];

  useEffect(() => {
    if (period) {
      setFormData({
        contract_id: period.contract_id,
        periode_debut: period.periode_debut,
        periode_fin: period.periode_fin,
        montant: period.montant,
        statut: period.statut,
        payment_mode: period.payment_mode || ''
      });

      // Charger les données de facture si elles existent
      if (period.facture) {
        setFactureData({
          date_facture: period.facture.date_facture,
          date_echeance: period.facture.date_echeance
        });
      } else {
        setFactureData({
          date_facture: '',
          date_echeance: ''
        });
      }
    }
  }, [period]);

  const validateForm = () => {
    if (!formData.periode_debut) {
      setError('La date de début est obligatoire');
      return false;
    }

    if (!formData.periode_fin) {
      setError('La date de fin est obligatoire');
      return false;
    }

    if (new Date(formData.periode_debut) >= new Date(formData.periode_fin)) {
      setError('La date de fin doit être postérieure à la date de début');
      return false;
    }

    if (formData.montant <= 0) {
      setError('Le montant doit être supérieur à 0');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      let success = false;

      if (period) {
        const result = await updatePeriod({ ...formData, id: period.id });
        success = !!result;

        // Si la période a une facture et que les dates de facture ont été modifiées, les mettre à jour
        if (success && period.facture && (factureData.date_facture || factureData.date_echeance)) {
          const factureSuccess = await updateFactureDates(
            period.facture.id,
            factureData.date_facture || period.facture.date_facture,
            factureData.date_echeance || period.facture.date_echeance
          );
          
          if (!factureSuccess) {
            setError('Période mise à jour mais erreur lors de la mise à jour des dates de facture');
            setLoading(false);
            return;
          }
        }
      } else {
        const result = await createPeriod(formData);
        success = !!result;
      }

      if (success) {
        onSuccess();
      } else {
        setError('Erreur lors de la sauvegarde de la période');
      }
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      setError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {period ? 'Modifier la période' : 'Nouvelle période'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {period ? 'Modifiez les informations de cette période' : 'Créez une nouvelle période pour ce contrat'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

          {/* Message d'information pour les périodes auto-générées */}
          {!period && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-blue-600" size={20} />
                <p className="text-blue-600 font-medium">Information</p>
              </div>
              <p className="text-blue-600 mt-1 text-sm">
                Les périodes sont normalement générées automatiquement. Cette création manuelle est réservée aux cas exceptionnels.
              </p>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début *
              </label>
              <input
                type="date"
                value={formData.periode_debut}
                onChange={(e) => setFormData(prev => ({ ...prev, periode_debut: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin *
              </label>
              <input
                type="date"
                value={formData.periode_fin}
                onChange={(e) => setFormData(prev => ({ ...prev, periode_fin: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Montant et Statut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant (MAD) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.montant}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  montant: parseFloat(e.target.value) || 0 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
              {formData.montant > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  Équivalent : {formatCurrency(formData.montant)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut *
              </label>
              <select
                value={formData.statut}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  statut: e.target.value as 'en_attente' | 'en_cours' | 'facture' | 'payee' | 'annulee' 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                {statutOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode de paiement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mode de paiement
            </label>
            <input
              type="text"
              value={formData.payment_mode || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                payment_mode: e.target.value 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Ex: Virement bancaire, Chèque, Espèces..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Optionnel - Spécifiez le mode de paiement prévu pour cette période
            </p>
          </div>

          {/* Dates de facturation - Affichées seulement si la période a une facture */}
          {period?.facture && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
                <Receipt size={16} />
                Dates de facturation
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de facture
                  </label>
                  <input
                    type="date"
                    value={factureData.date_facture}
                    onChange={(e) => setFactureData(prev => ({ ...prev, date_facture: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Date actuelle : {period.facture.date_facture ? new Date(period.facture.date_facture).toLocaleDateString('fr-FR') : 'Non définie'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    value={factureData.date_echeance}
                    onChange={(e) => setFactureData(prev => ({ ...prev, date_echeance: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Date actuelle : {period.facture.date_echeance ? new Date(period.facture.date_echeance).toLocaleDateString('fr-FR') : 'Non définie'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Laissez vide pour conserver les dates actuelles
              </p>
            </div>
          )}

          {/* Informations supplémentaires */}
          {formData.periode_debut && formData.periode_fin && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Résumé de la période</h4>
              <div className="text-sm text-gray-700 space-y-2">
                <div>
                  <strong>Durée :</strong> {
                    Math.ceil(
                      (new Date(formData.periode_fin).getTime() - new Date(formData.periode_debut).getTime()) 
                      / (1000 * 60 * 60 * 24)
                    )
                  } jours
                </div>
                <div>
                  <strong>Période :</strong> Du {new Date(formData.periode_debut).toLocaleDateString('fr-FR')} 
                  au {new Date(formData.periode_fin).toLocaleDateString('fr-FR')}
                </div>
                {formData.montant > 0 && (
                  <div>
                    <strong>Montant :</strong> {formatCurrency(formData.montant)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Boutons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              <Save size={16} />
              {loading ? 'Sauvegarde...' : (period ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContractPeriodModal;