import { useState } from 'react';
import { GammeWithEtapes, EtapeGamme } from '../../types/gammes';
import { deleteEtape, reorderEtapes } from '../../hooks/useGammes';
import {
  X,
  Clock,
  Wrench,
  Package,
  AlertTriangle,
  Edit,
  Trash2,
  Plus,
  GripVertical,
} from 'lucide-react';
import EtapeForm from './EtapeForm';

interface GammeDetailProps {
  gamme: GammeWithEtapes;
  onClose: () => void;
  onUpdate: () => void;
}

export default function GammeDetail({ gamme, onClose, onUpdate }: GammeDetailProps) {
  const [etapes, setEtapes] = useState(gamme.etapes);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingEtape, setEditingEtape] = useState<EtapeGamme | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  function calculateTotalDuration() {
    return etapes.reduce((total, etape) => total + (etape.duree_estimee || 0), 0);
  }

  function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }

  async function handleDeleteEtape(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette étape ?')) return;

    try {
      await deleteEtape(id);
      onUpdate();
    } catch (error) {
      console.error('Error deleting etape:', error);
      alert('Erreur lors de la suppression de l\'étape');
    }
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newEtapes = [...etapes];
    const draggedItem = newEtapes[draggedIndex];
    newEtapes.splice(draggedIndex, 1);
    newEtapes.splice(index, 0, draggedItem);

    setEtapes(newEtapes);
    setDraggedIndex(index);
  }

  async function handleDragEnd() {
    if (draggedIndex === null) return;

    const updatedEtapes = etapes.map((etape, index) => ({
      id: etape.id,
      ordre: index + 1,
    }));

    try {
      await reorderEtapes(updatedEtapes);
      setDraggedIndex(null);
      onUpdate();
    } catch (error) {
      console.error('Error reordering etapes:', error);
      alert('Erreur lors du réordonnancement des étapes');
      setEtapes(gamme.etapes);
      setDraggedIndex(null);
    }
  }

  const handleFormSuccess = () => {
    setShowCreateForm(false);
    setEditingEtape(null);
    onUpdate();
  };

  const totalDuration = calculateTotalDuration();

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{gamme.nom}</h2>
              <p className="text-slate-200 text-sm mt-1">
                {gamme.description || 'Aucune description'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="px-6 py-4 border-b border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <Wrench size={16} />
                  <span className="text-sm font-medium">Type</span>
                </div>
                <p className="text-lg font-semibold text-slate-800 capitalize">{gamme.type}</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <Clock size={16} />
                  <span className="text-sm font-medium">Durée totale</span>
                </div>
                <p className="text-lg font-semibold text-slate-800">
                  {totalDuration > 0 ? formatDuration(totalDuration) : '-'}
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <Package size={16} />
                  <span className="text-sm font-medium">Nombre d'étapes</span>
                </div>
                <p className="text-lg font-semibold text-slate-800">
                  {etapes.length} étape{etapes.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-800">Étapes de maintenance</h3>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 bg-[#ee6b1a] text-white px-4 py-2 rounded-lg hover:bg-[#f15c00] transition-colors text-sm"
            >
              <Plus size={16} />
              Ajouter une étape
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {etapes.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">Aucune étape définie</p>
                <p className="text-slate-500 text-sm mt-1">
                  Cliquez sur "Ajouter une étape" pour commencer
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {etapes.map((etape, index) => (
                  <div
                    key={etape.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white border-2 border-slate-200 rounded-lg p-4 transition-all hover:shadow-md cursor-move ${
                      draggedIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-1">
                        <GripVertical className="text-slate-400" size={20} />
                      </div>

                      <div className="flex-shrink-0 w-8 h-8 bg-[#ee6b1a] text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 font-medium mb-2">{etape.description}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {etape.duree_estimee && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Clock size={14} />
                              <span>{formatDuration(etape.duree_estimee)}</span>
                            </div>
                          )}

                          {etape.outil && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Wrench size={14} />
                              <span>{etape.outil}</span>
                            </div>
                          )}

                          {etape.piece && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Package size={14} />
                              <span>{etape.piece}</span>
                            </div>
                          )}

                          {etape.consigne_securite && (
                            <div className="flex items-start gap-2 text-orange-600 sm:col-span-2">
                              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                              <span className="text-xs">{etape.consigne_securite}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex items-start gap-2">
                        <button
                          onClick={() => setEditingEtape(etape)}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteEtape(etape.id)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>

      {(showCreateForm || editingEtape) && (
        <EtapeForm
          gammeId={gamme.id}
          etape={editingEtape}
          nextOrdre={etapes.length + 1}
          onClose={() => {
            setShowCreateForm(false);
            setEditingEtape(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  );
}
