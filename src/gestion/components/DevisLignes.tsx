import { Plus, Trash2, Package, AlertCircle, GripVertical } from 'lucide-react';
import React, { useState } from 'react';

// Types
interface Ligne {
  materiel: string;
  type: string;
  unite: string;
  quantite: string;
  prix: string;
}

interface Monetaire {
  id: string;
  symbol: string;
}

interface Props {
  monetaires: Monetaire[];
  formData: any;
  lignes: Ligne[];
  addLigne: (type?: string) => void;
  updateLigne: (idx: number, field: keyof Ligne, value: string) => void;
  removeLigne: (idx: number) => void;
  calculateTotal: () => number;
  reorderLignes?: (startIdx: number, endIdx: number) => void;
}

interface ValidationErrors {
  [key: number]: {
    materiel?: string;
    type?: string;
    unite?: string;
    quantite?: string;
    prix?: string;
  };
}

export default function DevisLignes({
  lignes,
  addLigne,
  updateLigne,
  removeLigne,
  calculateTotal,
  monetaires,
  formData,
  reorderLignes,
}: Props) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{[key: number]: {[field: string]: boolean}}>({});
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

  // Validation d'une ligne
  const validateLigne = (ligne: Ligne, idx: number): boolean => {
    const newErrors: ValidationErrors[number] = {};
    let isValid = true;

    if (!ligne.materiel || ligne.materiel.trim() === '') {
      newErrors.materiel = 'Le matériel/service est requis';
      isValid = false;
    } else if (ligne.materiel.length < 3) {
      newErrors.materiel = 'Minimum 3 caractères';
      isValid = false;
    } else if (ligne.materiel.length > 200) {
      newErrors.materiel = 'Maximum 200 caractères';
      isValid = false;
    }

    const quantite = parseFloat(ligne.quantite);
    if (!ligne.quantite || ligne.quantite === '') {
      isValid = true;
    } else if (isNaN(quantite)) {
      newErrors.quantite = 'Quantité invalide';
      isValid = false;
    } else if (quantite <= 0) {
      newErrors.quantite = 'Doit être > 0';
      isValid = false;
    } else if (quantite > 999999) {
      newErrors.quantite = 'Quantité trop élevée';
      isValid = false;
    }

    const prix = parseFloat(ligne.prix);
    if (!ligne.prix || ligne.prix === '') {
      isValid = true;
    } else if (isNaN(prix)) {
      newErrors.prix = 'Prix invalide';
      isValid = false;
    } else if (prix < -9999999 || prix > 9999999) {
      newErrors.prix = 'Valeur hors limites';
      isValid = false;
    }

    setErrors(prev => ({
      ...prev,
      [idx]: newErrors
    }));

    return isValid;
  };

  const handleUpdate = (idx: number, field: keyof Ligne, value: string) => {
    updateLigne(idx, field, value);
    
    setTouched(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [field]: true
      }
    }));

    setTimeout(() => {
      validateLigne(lignes[idx], idx);
    }, 0);
  };

  const handleBlur = (idx: number, field: keyof Ligne) => {
    setTouched(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [field]: true
      }
    }));
    validateLigne(lignes[idx], idx);
  };

  const shouldShowError = (idx: number, field: string): boolean => {
    const typedField = field as keyof Ligne;
    return !!(touched[idx]?.[field] && errors[idx]?.[typedField]);
  };

  const lignesMateriels = lignes.filter(l => l.type === 'materiel');
  const lignesMainOeuvre = lignes.filter(l => l.type === "main d'oeuvre");

  const handleAddLigneWithType = (type: 'materiel' | "main d'oeuvre") => {
    if (lignes.length === 0) {
      addLigne(type);
      return;
    }

    let allValid = true;
    lignes.forEach((ligne, idx) => {
      if (!validateLigne(ligne, idx)) {
        allValid = false;
      }
      setTouched(prev => ({
        ...prev,
        [idx]: {
          materiel: true,
          type: true,
          unite: true,
          quantite: true,
          prix: true
        }
      }));
    });

    if (allValid) {
      addLigne(type);
    }
  };

  const getErrorCount = (idx: number): number => {
    return Object.keys(errors[idx] || {}).length;
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedItem(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedItem !== null && draggedItem !== idx) {
      // Vérifier que c'est le même type avant de permettre le drop
      const draggedLigne = lignes[draggedItem];
      const targetLigne = lignes[idx];
      
      if (draggedLigne.type === targetLigne.type) {
        setDragOverItem(idx);
      }
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedItem !== null && draggedItem !== dropIdx && reorderLignes) {
      // Vérifier que les deux lignes sont du même type
      const draggedLigne = lignes[draggedItem];
      const targetLigne = lignes[dropIdx];
      
      if (draggedLigne.type === targetLigne.type) {
        reorderLignes(draggedItem, dropIdx);
      }
    }
    
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const renderTableRow = (ligne: Ligne, displayIdx: number, idx: number, type: 'materiel' | 'mainoeuvre') => {
    const total = (parseFloat(ligne.quantite) || 0) * (parseFloat(ligne.prix) || 0);
    const hasErrors = getErrorCount(idx) > 0;
    const isDragging = draggedItem === idx;
    const isOver = dragOverItem === idx;
    const colorScheme = type === 'materiel' ? 'orange' : 'blue';

    return (
      <tr
        key={idx}
        draggable
        onDragStart={(e) => handleDragStart(e, idx)}
        onDragOver={(e) => handleDragOver(e, idx)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, idx)}
        onDragEnd={handleDragEnd}
        className={`
          hover:bg-${colorScheme}-50 transition-colors cursor-move
          ${hasErrors && touched[idx] ? 'bg-red-50' : ''}
          ${isDragging ? 'opacity-50' : ''}
          ${isOver ? `border-t-2 border-${colorScheme}-500` : ''}
        `}
      >
        <td className="px-4 py-3 text-sm font-medium">
          <div className="flex items-center gap-1">
            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing" />
            <span className="text-gray-500">{displayIdx + 1}</span>
            {hasErrors && touched[idx] && (
              <div title={`${getErrorCount(idx)} erreur(s)`}>
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
            )}
          </div>
        </td>

        <td className="px-4 py-3">
          <textarea
            value={ligne.materiel}
            onChange={(e) => handleUpdate(idx, 'materiel', e.target.value)}
            onBlur={() => handleBlur(idx, 'materiel')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${colorScheme}-500 focus:border-transparent text-sm ${
              shouldShowError(idx, 'materiel') ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder={type === 'materiel' ? "Description du matériel..." : "Description du travail..."}
            maxLength={200}
          />
          {shouldShowError(idx, 'materiel') && (
            <p className="mt-1 text-xs text-red-600">{errors[idx]?.materiel}</p>
          )}
        </td>

        {type === 'materiel' && (
          <td className="px-4 py-3">
            <input
              type="text"
              value={ligne.unite}
              onChange={(e) => handleUpdate(idx, 'unite', e.target.value)}
              onBlur={() => handleBlur(idx, 'unite')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm ${
                shouldShowError(idx, 'unite') ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="kg, ml..."
              maxLength={10}
            />
            {shouldShowError(idx, 'unite') && (
              <p className="mt-1 text-xs text-red-600">{errors[idx]?.unite}</p>
            )}
          </td>
        )}

        <td className="px-4 py-3">
          <input
            type="number"
            value={ligne.quantite}
            onChange={(e) => handleUpdate(idx, 'quantite', e.target.value)}
            onBlur={() => handleBlur(idx, 'quantite')}
            min="0"
            step="1"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${colorScheme}-500 focus:border-transparent text-sm text-right ${
              shouldShowError(idx, 'quantite') ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
          />
          {shouldShowError(idx, 'quantite') && (
            <p className="mt-1 text-xs text-red-600">{errors[idx]?.quantite}</p>
          )}
        </td>

        <td className="px-4 py-3">
          <input
            type="number"
            step="0.01"
            value={ligne.prix}
            onChange={(e) => handleUpdate(idx, 'prix', e.target.value)}
            onBlur={() => handleBlur(idx, 'prix')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${colorScheme}-500 focus:border-transparent text-sm text-right ${
              shouldShowError(idx, 'prix') ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
          />
          {shouldShowError(idx, 'prix') && (
            <p className="mt-1 text-xs text-red-600">{errors[idx]?.prix}</p>
          )}
        </td>

        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
          {total.toFixed(2)} Dhs
        </td>

        <td className="px-4 py-3 text-center">
          <button
            onClick={() => removeLigne(idx)}
            type="button"
            className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer cette ligne"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Section Matériels */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            Matériels
          </h3>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full">
            <thead className="bg-orange-100 border-b-2 border-orange-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-8">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Description <span className="text-red-500">*</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                  Unité <span className="text-red-500">*</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                  Quantité <span className="text-red-500">*</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                  P.U <span className="text-red-500">*</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">Total</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-16">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {lignesMateriels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">
                    Aucun matériel ajouté
                  </td>
                </tr>
              ) : (
                lignesMateriels.map((ligne, materielIdx) => {
                  const idx = lignes.indexOf(ligne);
                  return renderTableRow(ligne, materielIdx, idx, 'materiel');
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bouton Ajouter matériel en bas de la table */}
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => handleAddLigneWithType('materiel')}
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Ajouter un matériel
          </button>
        </div>
      </div>

      {/* Section Main d'Œuvre */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Main d'Œuvre
          </h3>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full">
            <thead className="bg-blue-100 border-b-2 border-blue-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-8">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Description <span className="text-red-500">*</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                  Quantité <span className="text-red-500">*</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                  P.U <span className="text-red-500">*</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">Total</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-16">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {lignesMainOeuvre.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                    Aucune main d'œuvre ajoutée
                  </td>
                </tr>
              ) : (
                lignesMainOeuvre.map((ligne, mainOeuvreIdx) => {
                  const idx = lignes.indexOf(ligne);
                  return renderTableRow(ligne, mainOeuvreIdx, idx, 'mainoeuvre');
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bouton Ajouter main d'œuvre en bas de la table */}
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => handleAddLigneWithType("main d'oeuvre")}
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Ajouter main d'œuvre
          </button>
        </div>
      </div>

      {/* Total général */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-6">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Total général (HT)</span>
          <span className="text-2xl font-bold text-orange-600">
            {calculateTotal().toFixed(2)} {formData.monetaire_id ? monetaires.find(m => m.id === formData.monetaire_id)?.symbol || '' : ''}
          </span>
        </div>
      </div>

      {/* Message d'aide */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">💡 Astuce :</span> Les champs marqués d'un <span className="text-red-500">*</span> sont obligatoires. 
          Glissez-déposez les lignes pour réorganiser l'ordre.
        </p>
      </div>
    </div>
  );
}