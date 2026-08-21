import React from 'react';
import { Plus, Edit, Trash2, Wrench } from 'lucide-react';
import { useContractCorrectifs } from '../../hooks/useContractCorrectifs';

interface PeriodCorrectifsViewProps {
  periodId: number;
  onAddCorrectif: () => void;
  onEditCorrectif: (correctif: any) => void;
}

const PeriodCorrectifsView: React.FC<PeriodCorrectifsViewProps> = ({
  periodId,
  onAddCorrectif,
  onEditCorrectif
}) => {
  const { correctifs, loading, deleteCorrectif, getTotalCorrectifs } = useContractCorrectifs(periodId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce travail correctif ?')) {
      await deleteCorrectif(id);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-l-blue-500">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wrench className="text-blue-600" size={16} />
          <h4 className="font-medium text-gray-900">Travaux Correctifs</h4>
          {correctifs.length > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {correctifs.length}
            </span>
          )}
        </div>
        <button
          onClick={onAddCorrectif}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
        >
          <Plus size={14} />
          Ajouter
        </button>
      </div>

      {correctifs.length === 0 ? (
        <p className="text-gray-500 text-sm italic">Aucun travail correctif pour cette période</p>
      ) : (
        <>
          <div className="space-y-2 mb-3">
            {correctifs.map((correctif) => (
              <div key={correctif.id} className="bg-white p-3 rounded border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {correctif.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>Qté: {correctif.quantite}</span>
                      <span>Prix unitaire: {formatCurrency(correctif.prix_unitaire)}</span>
                      <span className="font-medium text-gray-900">
                        Total: {formatCurrency(correctif.total)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => onEditCorrectif(correctif)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Modifier"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(correctif.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t pt-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-700">Total des correctifs:</span>
              <span className="font-bold text-blue-600">
                {formatCurrency(getTotalCorrectifs())}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PeriodCorrectifsView;