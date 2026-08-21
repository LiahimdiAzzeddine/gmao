// FactureBLInfo.tsx
import { useState, useEffect } from 'react';
import { FileText, Package, Calendar, Clock, DollarSign, Edit2, Save, X, MapPin, Plus, BadgeDollarSign, ShoppingCart, Trash2, Pencil, CreditCard, Truck, Users } from 'lucide-react';
import { BonLivraison, Chantier, Devis, Facture } from '../../types/devis';
import { supabase } from '../../lib/supabase';
import { CreateChantierButton } from './CreateChantierButton';
import { CreateEditAchatModal } from './CreateAchatModal';

interface Achat {
  type_depense: string;
  id: number;
  chantier_id: number;
  fournisseur_id: number;
  date_achat: string;
  designation: string;
  quantite: number;
  prix_unitaire: number;
  total_ht: number;
  reference: string | null;
  statut: string;
  created_at: string;
  fournisseur_libre:string;
  methode_paiement:string;
  fournisseurs?: {
    societe: string;
  };
}

interface FactureBLInfoProps {
  devis_id: number;
  facture?: Facture | null;
  bonLivraison?: BonLivraison | null;
  devis?: Devis | null;
  chantier?: Chantier | null;
  total?: number;
  onUpdate?: () => void;
}

export default function FactureBLInfo({ devis_id, devis, facture, bonLivraison, chantier, total, onUpdate }: FactureBLInfoProps) {
  const [editingFacture, setEditingFacture] = useState(false);
  const [editingBL, setEditingBL] = useState(false);
  const [showCreateAchatModal, setShowCreateAchatModal] = useState(false);
  const [selectedAchat, setSelectedAchat] = useState<Achat | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [achats, setAchats] = useState<Achat[]>([]);
  const [loadingAchats, setLoadingAchats] = useState(false);

  // États pour les formulaires d'édition
  const [factureForm, setFactureForm] = useState({
    numero_facture: facture?.numero_facture || '',
    date_facture: facture?.date_facture || '',
    date_echeance: facture?.date_echeance || '',
    methode_paiement: facture?.methode_paiement || ''
  });

  const [blForm, setBlForm] = useState({
    numero_bl: bonLivraison?.numero_bl || '',
    numero_commande: bonLivraison?.numero_commande || '',
    commentaire: bonLivraison?.commentaire || ''
  });

  const [chantierForm, setChantierForm] = useState({
    chantier: chantier?.chantier || ''
  });

  // Charger les achats du chantier
  useEffect(() => {
    if (chantier?.code) {
      loadAchats();
    }
  }, [chantier?.code]);

  const loadAchats = async () => {
    if (!chantier?.code) return;

    setLoadingAchats(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('achats')
        .select(`
          *,
          fournisseurs (
            societe
          )
        `)
        .eq('chantier_code', chantier.code)
        .order('date_achat', { ascending: false });

      if (fetchError) throw fetchError;
      setAchats(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des achats:', err);
    } finally {
      setLoadingAchats(false);
    }
  };

  const handleDeleteAchat = async (achatId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet achat ?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('achats')
        .delete()
        .eq('id', achatId);

      if (deleteError) throw deleteError;

      // Recharger les achats
      loadAchats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const getTotalAchats = () => {
    return achats.reduce((sum, achat) => sum + parseFloat(achat.total_ht.toString()), 0);
  };

  const getStatutBadgeClass = (statut: string) => {
    switch (statut) {
      case 'valide':
        return 'bg-green-100 text-green-700';
      case 'livre':
        return 'bg-blue-100 text-blue-700';
      case 'annule':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
// Fonction pour obtenir le label du type
const getTypeLabel = (type: string) => {
  switch (type) {
    case 'fourniture':
      return 'Fourniture';
    case 'transport':
      return 'Transport';
    case 'main_oeuvre':
      return 'Main d\'œuvre';
    case 'transit':
      return 'transitaire';
    default:
      return type;
  }
};

// Fonction pour obtenir la couleur du badge de type
const getTypeBadgeClass = (type: string) => {
  switch (type) {
    case 'fourniture':
      return 'bg-blue-100 text-blue-700';
    case 'transport':
      return 'bg-green-100 text-green-700';
    case 'main_oeuvre':
      return 'bg-orange-100 text-orange-700';
    case 'transit':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

  const getJoursRestants = (dateEcheance: string | null) => {
    if (!dateEcheance) return null;

    const aujourdhui = new Date();
    const echeance = new Date(dateEcheance);
    const diffTime = echeance.getTime() - aujourdhui.getTime();
    const diffJours = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffJours;
  };

  const handleUpdateFacture = async () => {
    if (!facture) return;

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('factures')
        .update({
          numero_facture: factureForm.numero_facture,
          date_facture: factureForm.date_facture,
          date_echeance: factureForm.date_echeance || null,
          methode_paiement: factureForm.methode_paiement || null
        })
        .eq('id', facture.id);

      if (updateError) throw updateError;

      setEditingFacture(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBL = async () => {
    if (!bonLivraison) return;

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('bons_livraison')
        .update({
          numero_bl: blForm.numero_bl,
          numero_commande: blForm.numero_commande || null,
          commentaire: blForm.commentaire || null
        })
        .eq('id', bonLivraison.id);

      if (updateError) throw updateError;

      setEditingBL(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };
  const getTypeIcon = (type: string) => {
  switch (type) {
    case 'fourniture':
      return <Package className="w-4 h-4" />;
    case 'transport':
      return <Truck className="w-4 h-4" />;
    case 'main_oeuvre':
      return <Users className="w-4 h-4" />;
    case 'transit':
      return <FileText className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
};



  if (!facture && !bonLivraison && !chantier) {
    return (
      <>
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mt-6">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium mb-4">Aucune information disponible</p>
          {devis?.statut === 'accepte' && (
          <div className='wi-full flex flex-row justify-center items-center'>
            <CreateChantierButton
              devis_id={devis_id}
              onSuccess={() => {
                if (onUpdate) onUpdate();
              }}
            />
          </div>)}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4 pt-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

  {/* Section Chantier */}
      {chantier && (
        <div className="bg-white border border-purple-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Chantier</h3>
                  <p className="text-purple-100 text-sm">{chantier.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Bouton pour ajouter un achat */}
                <button
                  onClick={() => setShowCreateAchatModal(true)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Ajouter un achat"
                >
                  <ShoppingCart className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <BadgeDollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium">Budget</p>
                  <p className="text-gray-900 font-semibold">
                    {total ? `${total.toFixed(2)} MAD` : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium">Description</p>
                  <p className="text-gray-900 font-semibold">
                    {devis?.designation || 'Aucune description'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Créé le</p>
                  <p className="text-gray-900 font-semibold">
                    {formatDate(chantier.created_at)}
                  </p>
                </div>
              </div>

              {/* Section Achats */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">Achats du chantier</h4>
                    <span className="text-sm text-gray-500">
                      ({achats.length})
                    </span>
                  </div>
                  {achats.length > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total dépensé</p>
                      <p className="text-lg font-bold text-purple-600">
                        {getTotalAchats().toFixed(2)} MAD
                      </p>
                    </div>
                  )}
                </div>

                {loadingAchats ? (
                  <div className="text-center py-8 text-gray-500">
                    Chargement des achats...
                  </div>
                ) : achats.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <ShoppingCart className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Aucun achat enregistré</p>
                    <button
                      onClick={() => setShowCreateAchatModal(true)}
                      className="mt-3 text-purple-600 text-sm font-medium hover:text-purple-700"
                    >
                      Ajouter le premier achat
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
  {achats.map((achat) => (
    <div
      key={achat.id}
      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {/* Badge du type de dépense */}
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getTypeBadgeClass(
                    achat.type_depense || 'fourniture'
                  )}`}
                >
                  {getTypeIcon(achat.type_depense || 'fourniture')}
                  {getTypeLabel(achat.type_depense || 'fourniture')}
                </span>
                
                {/* Badge du statut */}
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatutBadgeClass(
                    achat.statut
                  )}`}
                >
                  {achat.statut}
                </span>
              </div>
              
              <p className="font-medium text-gray-900 truncate">
                {achat.designation}
              </p>
              
              {/* Affichage du fournisseur ou de l'ouvrier selon le type */}
              <p className="text-sm text-gray-600">
                {achat.type_depense === 'main_oeuvre' 
                  ? `Ouvrier: ${achat.fournisseur_libre || 'Non renseigné'}`
                  : (achat.fournisseur_libre || achat.fournisseurs?.societe || 'Fournisseur inconnu')
                }
              </p>
            </div>
          </div>

          {/* Grille d'informations adaptée selon le type */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Date</p>
              <p className="font-medium text-gray-900">
                {formatDate(achat.date_achat)}
              </p>
            </div>
            
            {/* Afficher la quantité uniquement pour les fournitures */}
         
            
            {/* Prix unitaire pour fournitures, Montant pour les autres */}
       
              <div className={achat.type_depense === 'fourniture' ? '' : 'col-span-2'}>
                <p className="text-gray-500 text-xs">Montant</p>
                <p className="font-medium text-gray-900">
                  {parseFloat(achat.prix_unitaire.toString()).toFixed(2)} MAD
                </p>
              </div>
          
            
            <div>
              <p className="text-gray-500 text-xs">Total HT</p>
              <p className="font-bold text-purple-600">
                {parseFloat(achat.total_ht.toString()).toFixed(2)} MAD
              </p>
            </div>
          </div>

          {/* Informations additionnelles */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {achat.reference && (
              <span>Réf: {achat.reference}</span>
            )}
            {achat.methode_paiement && (
              <span className="flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                {achat.methode_paiement}
              </span>
            )}
          </div>
        </div>
        
        {/* Boutons d'action */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedAchat(achat);
              setIsEditOpen(true);
            }}
            className="p-2 hover:bg-blue-100 rounded-lg transition-colors group"
            title="Modifier la dépense"
          >
            <Pencil className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
          </button>
          <button
            onClick={() => handleDeleteAchat(achat.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            title="Supprimer la dépense"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  ))}
</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Facture */}
      {facture && (
        <div className="bg-white border border-orange-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Facture</h3>
                  <p className="text-orange-100 text-sm">
                    {facture.numero_facture || 'Non numérotée'}
                  </p>
                </div>
              </div>
  {!editingFacture && (
                <button
                  onClick={() => setEditingFacture(true)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <Edit2 className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {editingFacture ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de facture
                  </label>
                  <input
                    type="text"
                    value={factureForm.numero_facture}
                    disabled={true}
                    onChange={(e) => setFactureForm({ ...factureForm, numero_facture: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de facture
                    </label>
                    <input
                      type="date"
                      value={factureForm.date_facture}
                      onChange={(e) => setFactureForm({ ...factureForm, date_facture: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date d'échéance
                    </label>
                    <input
                      type="date"
                      value={factureForm.date_echeance}
                      onChange={(e) => setFactureForm({ ...factureForm, date_echeance: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Méthode de paiement
                  </label>
                  <input
                    type="text"
                    value={factureForm.methode_paiement}
                    onChange={(e) => setFactureForm({ ...factureForm, methode_paiement: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Virement, Chèque, Espèces..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateFacture}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingFacture(false);
                      setFactureForm({
                        numero_facture: facture.numero_facture || '',
                        date_facture: facture.date_facture || '',
                        date_echeance: facture.date_echeance || '',
                        methode_paiement: facture.methode_paiement || ''
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Date de facture</p>
                    <p className="text-gray-900 font-semibold">
                      {formatDate(facture.date_facture)}
                    </p>
                  </div>
                </div>

                {facture.date_echeance && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Date d'échéance</p>
                      <p className="text-gray-900 font-semibold">
                        {formatDate(facture.date_echeance)}
                      </p>
                      {facture.statut !== 'payee' && facture.statut !== 'annulee' && (() => {
                        const jours = getJoursRestants(facture.date_echeance);
                        if (jours !== null) {
                          return (
                            <p className={`text-xs mt-1 font-medium ${jours < 0
                              ? 'text-red-600'
                              : jours <= 7
                                ? 'text-orange-600'
                                : 'text-green-600'
                              }`}>
                              {jours < 0
                                ? `En retard de ${Math.abs(jours)} jour(s)`
                                : jours === 0
                                  ? 'Échéance aujourd\'hui'
                                  : `${jours} jour(s) restant(s)`
                              }
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Créée le</p>
                    <p className="text-gray-900 font-semibold">
                      {formatDate(facture.created_at)}
                    </p>
                  </div>
                </div>

                {facture.methode_paiement && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <DollarSign className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Mode de paiement</p>
                      <p className="text-gray-900 font-semibold">
                        {facture.methode_paiement}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section Bon de Livraison */}
      {bonLivraison && (
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Bon de Livraison</h3>
                  <p className="text-blue-100 text-sm">
                    {bonLivraison.numero_bl || 'Non numéroté'}
                  </p>
                </div>
              </div>
              {!editingBL && (
                <button
                  onClick={() => setEditingBL(true)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <Edit2 className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {editingBL ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro BL
                  </label>
                  <input
                    type="text"
                    disabled={true}
                    value={blForm.numero_bl}
                    onChange={(e) => setBlForm({ ...blForm, numero_bl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de commande
                  </label>
                  <input
                    type="text"
                    value={blForm.numero_commande}
                    onChange={(e) => setBlForm({ ...blForm, numero_commande: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commentaire / Réserve 
                  </label>
                  <textarea
                    value={blForm.commentaire}
                    onChange={(e) => setBlForm({ ...blForm, commentaire: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Commentaire sur la livraison..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateBL}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingBL(false);
                      setBlForm({
                        numero_bl: bonLivraison.numero_bl || '',
                        numero_commande: bonLivraison.numero_commande || '',
                        commentaire: bonLivraison.commentaire || ''
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Code chantier</p>
                      <p className="text-gray-900 font-semibold">
                        {bonLivraison.chantier_code}
                      </p>
                    </div>
                  </div>

                  {bonLivraison.numero_commande && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">N° Commande</p>
                        <p className="text-gray-900 font-semibold">
                          {bonLivraison.numero_commande}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Créé le</p>
                      <p className="text-gray-900 font-semibold">
                        {formatDate(bonLivraison.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {bonLivraison.commentaire && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium mb-2">Commentaire</p>
                    <p className="text-gray-700">{bonLivraison.commentaire}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal pour créer un achat */}
      {chantier && (
        <>
          <CreateEditAchatModal
            isOpen={showCreateAchatModal}
            onClose={() => setShowCreateAchatModal(false)}
            onSuccess={() => {
              loadAchats(); // Recharger les achats
              if (onUpdate) onUpdate();
            }}
            chantierCode={chantier.code}
          />
          {selectedAchat&&(
            <CreateEditAchatModal
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            onSuccess={() => {
              loadAchats(); // Recharger les achats
              if (onUpdate) onUpdate();
            }}
            chantierCode={chantier.code}
            achatToEdit={selectedAchat}
          />
          )}
          </>
      )}


    </div>
  );
}