import React, { useState } from 'react';
import { Plus, Trash2, Info, ChevronDown, Copy, Upload, Check, X } from 'lucide-react';

interface ActionPreventive {
  id: string;
  machine_id: string;
  action: string;
  description: string;
  label: string;
  statut: string;
  created_at: string;
  updated_at: string;
}

interface ActionsPreventivesProps {
  actionsPreventives: ActionPreventive[];
  setActionsPreventives: React.Dispatch<React.SetStateAction<ActionPreventive[]>>;
}

const ActionsPreventives: React.FC<ActionsPreventivesProps> = ({
  actionsPreventives,
  setActionsPreventives
}) => {
  const [openActionIndex, setOpenActionIndex] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [importError, setImportError] = useState('');
  const [copied, setCopied] = useState(false);

  // Fonction pour copier les actions au format JSON
  const handleCopyJSON = () => {
    const exportData = actionsPreventives.map(action => ({
      action: action.action,
      description: action.description,
      label: action.label
    }));
    
    const jsonString = JSON.stringify(exportData, null, 2);
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fonction pour importer les actions depuis JSON
  const handleImportJSON = () => {
    try {
      setImportError('');
      const parsed = JSON.parse(jsonInput);
      
      if (!Array.isArray(parsed)) {
        setImportError('Le JSON doit être un tableau d\'actions');
        return;
      }

      const newActions: ActionPreventive[] = parsed.map((item: any) => ({
        id: '',
        machine_id: '',
        action: item.action || '',
        description: item.description || '',
        label: item.label || '',
        statut: 'à valider',
        created_at: '',
        updated_at: ''
      }));

      setActionsPreventives([...actionsPreventives, ...newActions]);
      setShowImportModal(false);
      setJsonInput('');
    } catch (error) {
      setImportError('JSON invalide. Veuillez vérifier le format.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Actions Préventives</h2>
            <p className="text-xs text-slate-600 mt-0.5">Définissez les tâches de maintenance préventive</p>
          </div>
          <div className="flex items-center gap-2">
            {actionsPreventives.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleCopyJSON}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                  title="Copier au format JSON"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copié !' : 'Copier'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm"
                  title="Importer depuis JSON"
                >
                  <Upload size={16} />
                  Importer
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setActionsPreventives([...actionsPreventives, {
                  action: '', description: '', label: '',
                  id: '',
                  machine_id: '',
                  statut: 'à valider',
                  created_at: '',
                  updated_at: ''
                }]);
                setOpenActionIndex(actionsPreventives.length);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Plus size={16} />
              Ajouter
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {actionsPreventives.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
            <Info size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">Aucune action préventive définie</p>
            <p className="text-sm text-slate-500 mt-1">Cliquez sur "Ajouter" pour créer une action</p>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm mx-auto"
            >
              <Upload size={16} />
              Importer depuis JSON
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {[...actionsPreventives].reverse().map((action: ActionPreventive, reverseIndex: number) => {
              const index = actionsPreventives.length - 1 - reverseIndex;
              const isOpen = openActionIndex === index;
              
              return (
                <div key={index} className="relative bg-gradient-to-r from-slate-50 to-white rounded-lg border border-slate-200 hover:border-green-300 transition-all">
                  <div 
                    className="flex items-center justify-between p-5 cursor-pointer"
                    onClick={() => setOpenActionIndex(isOpen ? null : index)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">
                          {action.action || 'Nouvelle action'}
                        </p>
                        {action.label && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Label: {action.label}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          const updated = actionsPreventives.filter((_, i) => i !== index);
                          setActionsPreventives(updated);
                          if (openActionIndex === index) setOpenActionIndex(null);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                      <ChevronDown 
                        size={20} 
                        className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-5 space-y-4 border-t border-slate-200 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1.5">
                            Action <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={action.action}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const updated = [...actionsPreventives];
                              updated[index].action = e.target.value;
                              setActionsPreventives(updated);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm"
                            placeholder="Ex: Vérifier le niveau d'huile"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1.5">
                            Label
                          </label>
                          <input
                            type="text"
                            value={action.label || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const updated = [...actionsPreventives];
                              updated[index].label = e.target.value;
                              setActionsPreventives(updated);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm"
                            placeholder="Ex: A1, Vérif 01"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          Description
                        </label>
                        <textarea
                          value={action.description}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                            const updated = [...actionsPreventives];
                            updated[index].description = e.target.value;
                            setActionsPreventives(updated);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm resize-none"
                          rows={2}
                          placeholder="Description détaillée de l'action..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal d'import */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Importer des Actions Préventives</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setJsonInput('');
                  setImportError('');
                }}
                className="p-1 hover:bg-slate-200 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Collez le JSON des actions préventives
                </label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm font-mono"
                  rows={12}
                  placeholder={`[\n  {\n    "action": "Vérifier le niveau d'huile",\n    "description": "Contrôler le niveau...",\n    "label": "A1"\n  },\n  {\n    "action": "Nettoyer les filtres",\n    "description": "Nettoyer tous les filtres...",\n    "label": "A2"\n  }\n]`}
                />
              </div>

              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <X size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{importError}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Format attendu :</strong> Un tableau JSON contenant des objets avec les champs "action", "description" et "label".
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setJsonInput('');
                  setImportError('');
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleImportJSON}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Importer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionsPreventives;