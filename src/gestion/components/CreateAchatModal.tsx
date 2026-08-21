// CreateEditAchatModal.tsx
import { useState, useEffect } from 'react';
import { ShoppingCart, Save, X, Package, CreditCard, Truck, Users, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Fournisseur {
  id: number;
  societe: string;
}

interface Achat {
  id: number;
  fournisseur_id: number | null;
  fournisseur_libre?: string;
  date_achat: string;
  designation: string;
  quantite: number;
  prix_unitaire: number;
  reference?: string;
  statut: string;
  methode_paiement?: string;
  type_depense?: string;
}

interface CreateEditAchatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chantierCode: string;
  achatToEdit?: Achat | null | any; 
}

export function CreateEditAchatModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  chantierCode,
  achatToEdit 
}: CreateEditAchatModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingFournisseurs, setLoadingFournisseurs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [isAutreFournisseur, setIsAutreFournisseur] = useState(false);

  const isEditMode = !!achatToEdit;

  const [achatForm, setAchatForm] = useState({
    type_depense: 'fourniture',
     fournisseur_id: 'autre', 
    fournisseur_libre: '',
    date_achat: new Date().toISOString().split('T')[0],
    designation: '',
    quantite: '',
    prix_unitaire: '',
    reference: '',
    statut: 'brouillon',
    methode_paiement: 'espece'
  });

  // Charger les fournisseurs et initialiser le formulaire
  useEffect(() => {
    if (isOpen) {
      loadFournisseurs();
      
      if (achatToEdit) {
        const isAutre = !achatToEdit.fournisseur_id && achatToEdit.fournisseur_libre;
        setIsAutreFournisseur(isAutre);
        
        setAchatForm({
          type_depense: achatToEdit.type_depense || 'fourniture',
          fournisseur_id: achatToEdit.fournisseur_id ? achatToEdit.fournisseur_id.toString() : 'autre',
          fournisseur_libre: achatToEdit.fournisseur_libre || '',
          date_achat: achatToEdit.date_achat,
          designation: achatToEdit.designation,
          quantite: achatToEdit.quantite.toString(),
          prix_unitaire: achatToEdit.prix_unitaire.toString(),
          reference: achatToEdit.reference || '',
          statut: achatToEdit.statut,
          methode_paiement: achatToEdit.methode_paiement || 'espece'
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, achatToEdit]);

  const loadFournisseurs = async () => {
    setLoadingFournisseurs(true);
    try {
      const { data, error } = await supabase
        .from('fournisseurs')
        .select('*')
        .order('societe', { ascending: true });

      if (error) throw error;
      setFournisseurs(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des fournisseurs:', err);
      setError('Impossible de charger la liste des fournisseurs');
    } finally {
      setLoadingFournisseurs(false);
    }
  };

  const resetForm = () => {
    setAchatForm({
      type_depense: 'fourniture',
      fournisseur_id: 'autre',
      fournisseur_libre: '',
      date_achat: new Date().toISOString().split('T')[0],
      designation: '',
      quantite: '',
      prix_unitaire: '',
      reference: '',
      statut: 'brouillon',
      methode_paiement: 'espece'
    });
    setIsAutreFournisseur(true);
  };

  const handleFournisseurChange = (value: string) => {
    if (value === 'autre') {
      setIsAutreFournisseur(true);
      setAchatForm({ ...achatForm, fournisseur_id: 'autre', fournisseur_libre: '' });
    } else {
      setIsAutreFournisseur(false);
      setAchatForm({ ...achatForm, fournisseur_id: value, fournisseur_libre: '' });
    }
  };

  const calculateTotal = () => {
    const quantite = parseFloat(achatForm.quantite) || 0;
    const prixUnitaire = parseFloat(achatForm.prix_unitaire) || 0;
    return (quantite * prixUnitaire).toFixed(2);
  };

  const validateForm = () => {
    if (!achatForm.type_depense) {
      setError('Veuillez sélectionner un type de dépense');
      return false;
    }
    
    // Pour main d'œuvre, le nom de l'ouvrier est requis
    if (achatForm.type_depense === 'main_oeuvre') {
      if (!achatForm.fournisseur_libre || !achatForm.fournisseur_libre.trim()) {
        setError('Veuillez saisir le nom de l\'ouvrier');
        return false;
      }
    }
    
    // Pour les fournitures, transport et transit, le fournisseur est requis
    if (['fourniture', 'transport', 'transit'].includes(achatForm.type_depense)) {
      if (!achatForm.fournisseur_id) {
        setError('Veuillez sélectionner un fournisseur');
        return false;
      }
      if (isAutreFournisseur && !achatForm.fournisseur_libre.trim()) {
        setError('Veuillez saisir le nom du fournisseur');
        return false;
      }
    }
    
    
    // Pour les fournitures, quantité et prix unitaire sont requis
    if (achatForm.type_depense === 'fourniture') {
      if (!achatForm.quantite || parseFloat(achatForm.quantite) <= 0) {
        setError('Veuillez saisir une quantité valide');
        return false;
      }
      if (!achatForm.prix_unitaire || parseFloat(achatForm.prix_unitaire) < 0) {
        setError('Veuillez saisir un prix unitaire valide');
        return false;
      }
    } else {
      // Pour les autres types, au moins le prix unitaire est requis
      if (!achatForm.prix_unitaire || parseFloat(achatForm.prix_unitaire) < 0) {
        setError('Veuillez saisir un montant valide');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const totalHT = parseFloat(calculateTotal());
      
      // Déterminer les valeurs de fournisseur selon le type
      let fournisseurId = null;
      let fournisseurLibre = null;
      
      if (achatForm.type_depense === 'main_oeuvre') {
        // Pour main d'œuvre, toujours utiliser fournisseur_libre
        fournisseurLibre = achatForm.fournisseur_libre;
      } else {
        // Pour les autres types (fourniture, transport, transit)
        if (isAutreFournisseur) {
          fournisseurLibre = achatForm.fournisseur_libre;
        } else {
          fournisseurId = achatForm.fournisseur_id ? parseInt(achatForm.fournisseur_id) : null;
        }
      }
      
      const achatData = {
        chantier_code: chantierCode,
        type_depense: achatForm.type_depense,
        fournisseur_id: fournisseurId,
        fournisseur_libre: fournisseurLibre,
        date_achat: achatForm.date_achat,
        designation: achatForm.designation,
        quantite: achatForm.type_depense === 'fourniture' ? parseFloat(achatForm.quantite) : 1,
        prix_unitaire: parseFloat(achatForm.prix_unitaire),
        total_ht: totalHT,
        reference: achatForm.reference || null,
        statut: achatForm.statut,
        methode_paiement: achatForm.methode_paiement
      };

      if (isEditMode && achatToEdit) {
        const { error: updateError } = await supabase
          .from('achats')
          .update(achatData)
          .eq('id', achatToEdit.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('achats')
          .insert(achatData);

        if (insertError) throw insertError;
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error 
          ? err.message 
          : `Erreur lors de ${isEditMode ? 'la modification' : 'la création'} de l'achat`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    setError(null);
    onClose();
  };

  const getTypeIcon = () => {
    switch (achatForm.type_depense) {
      case 'fourniture':
        return <Package className="w-5 h-5" />;
      case 'transport':
        return <Truck className="w-5 h-5" />;
      case 'main_oeuvre':
        return <Users className="w-5 h-5" />;
      case 'transit':
        return <FileText className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 rounded-t-xl sticky top-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg">
                {isEditMode ? 'Modifier la Dépense' : 'Nouvelle Dépense'}
              </h3>
              <p className="text-blue-100 text-sm">Chantier: {chantierCode}</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Type de dépense */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de dépense *
            </label>
            <select
              value={achatForm.type_depense}
              onChange={(e) => setAchatForm({ ...achatForm, type_depense: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="fourniture">Fourniture</option>
              <option value="transport">Transport</option>
              <option value="main_oeuvre">Main d'œuvre</option>
              <option value="transit">transitaire</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fournisseur - Affiché pour fourniture, transport, transit */}
            {['fourniture', 'transport', 'transit'].includes(achatForm.type_depense) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fournisseur *
                </label>
                <select
                  value={achatForm.fournisseur_id}
                  onChange={(e) => handleFournisseurChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loadingFournisseurs}
                >
                
                  <option value="autre" defaultChecked>{loadingFournisseurs ? 'Chargement...' : 'Autre (saisie libre)'}</option>
                  {fournisseurs.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.societe}
                    </option>
                  ))}
                 
                </select>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date {achatForm.type_depense === 'main_oeuvre' ? 'de prestation' : 'd\'achat'} *
              </label>
              <input
                type="date"
                value={achatForm.date_achat}
                onChange={(e) => setAchatForm({ ...achatForm, date_achat: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Fournisseur libre */}
          {isAutreFournisseur && ['fourniture', 'transport', 'transit'].includes(achatForm.type_depense) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {achatForm.type_depense === 'transport' ? 'Nom du transporteur *' : 'Nom du fournisseur *'}
              </label>
              <input
                type="text"
                value={achatForm.fournisseur_libre}
                onChange={(e) => setAchatForm({ ...achatForm, fournisseur_libre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nom du fournisseur..."
              />
            </div>
          )}

          {/* Nom de l'ouvrier pour main d'œuvre */}
          {achatForm.type_depense === 'main_oeuvre' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'ouvrier *
              </label>
              <input
                type="text"
                value={achatForm.fournisseur_libre}
                onChange={(e) => setAchatForm({ ...achatForm, fournisseur_libre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nom et prénom..."
              />
            </div>
          )}

          {/* Désignation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {achatForm.type_depense === 'main_oeuvre' ? 'Description du travail' : 'Désignation'}
            </label>
            <textarea
              value={achatForm.designation}
              onChange={(e) => setAchatForm({ ...achatForm, designation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder={
                achatForm.type_depense === 'main_oeuvre' 
                  ? 'Description du travail effectué...' 
                  : "Description de l'achat..."
              }
            />
          </div>

          {/* Champs spécifiques selon le type */}
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant total (MAD) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={achatForm.prix_unitaire}
                onChange={(e) => {
                  setAchatForm({ 
                    ...achatForm, 
                    prix_unitaire: e.target.value,
                    quantite: '1'
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

          {/* Total HT calculé */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getTypeIcon()}
                <span className="text-sm font-medium text-gray-700">Total HT</span>
              </div>
              <span className="text-xl font-bold text-blue-600">
                {calculateTotal()} MAD
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Référence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Référence
              </label>
              <input
                type="text"
                value={achatForm.reference}
                onChange={(e) => setAchatForm({ ...achatForm, reference: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Référence interne..."
              />
            </div>

            {/* Méthode de paiement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Méthode de paiement
              </label>
              <select
                value={achatForm.methode_paiement}
                onChange={(e) => setAchatForm({ ...achatForm, methode_paiement: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="espece">Espèce</option>
                <option value="cheque">Chèque</option>
                <option value="virement">Virement</option>
                <option value="carte">Carte bancaire</option>
                <option value="traite">Traite</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>

          {/* Statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={achatForm.statut}
              onChange={(e) => setAchatForm({ ...achatForm, statut: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="brouillon">Brouillon</option>
              <option value="valide">Validé</option>
              <option value="livre">Livré</option>
              <option value="annule">Annulé</option>
            </select>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              {loading 
                ? (isEditMode ? 'Modification...' : 'Création...') 
                : (isEditMode ? 'Modifier la dépense' : 'Créer la dépense')
              }
            </button>
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}