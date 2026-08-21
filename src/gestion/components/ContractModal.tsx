import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { CreateContractData } from '../../types/contracts';
import { useContracts } from '../../hooks/useContracts';
import { supabaseGes } from '../../lib/supagestion';

interface ContractModalProps {
  contract?: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface Client {
  id: number;
  client: string;
  ice?: string;
}

interface Emetteur {
  id: number;
  nom: string;
  telephone?: string;
  portable?: string;
  email?: string;
  adresse?: string;
}

interface Contact {
  num_contact: number;
  nom: string;
  adresse?: string;
  tel?: string;
  adresse_facturation?: string;
  email?: string;
}

const ContractModal: React.FC<ContractModalProps> = ({ contract, onClose, onSuccess }) => {
  const { createContract, updateContract } = useContracts();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clientContacts, setClientContacts] = useState<Contact[]>([]);
  const [emetteurs, setEmetteurs] = useState<Emetteur[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingEmetteurs, setLoadingEmetteurs] = useState(true);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<CreateContractData>({
    nom: '',
    description: '',
    client_id: 0,
    contact_id: undefined,
    numero_commande: '',
    emetteur_id: undefined,
    statut: 'brouillon',
    ht_ttc: 'HT',
    date_debut: '',
    date_fin: '',
    forfaitaire: undefined,
    montant_periode: undefined,
    facturation: undefined
  });

  const statutOptions = [
    { value: 'brouillon', label: 'Brouillon' },
    { value: 'actif', label: 'Actif' },
    { value: 'suspendu', label: 'Suspendu' },
    { value: 'termine', label: 'Terminé' },
    { value: 'annule', label: 'Annulé' }
  ];

  const htTtcOptions = [
    { value: 'HT', label: 'HT (Hors Taxes)' },
    { value: 'TTC', label: 'TTC (Toutes Taxes Comprises)' }
  ];

  const facturationOptions = [
    { value: '', label: 'Sélectionner une facturation' },
    { value: 'mensuelle', label: 'Mensuelle' },
    { value: 'trimestrielle', label: 'Trimestrielle' },
    { value: 'annuelle', label: 'Annuelle' }
  ];

  useEffect(() => {
    if (contract) {
      setFormData({
        nom: contract.nom,
        description: contract.description || '',
        client_id: contract.client_id,
        contact_id: contract.contact_id || undefined,
        numero_commande: contract.numero_commande || '',
        emetteur_id: contract.emetteur_id || undefined,
        statut: contract.statut,
        ht_ttc: contract.ht_ttc || 'HT',
        date_debut: contract.date_debut || '',
        date_fin: contract.date_fin || '',
        forfaitaire: contract.forfaitaire || undefined,
        montant_periode: contract.montant_periode || undefined,
        facturation: contract.facturation || undefined
      });
      
      // Charger les contacts du client si un contrat est en cours d'édition
      if (contract.client_id) {
        loadClientContacts(contract.client_id);
      }
    }
  }, [contract]);

  useEffect(() => {
    loadClients();
    loadEmetteurs();
    loadAllContacts();
  }, []);

  // Fonction pour calculer le montant forfaitaire
  const calculateForfaitaire = (montantPeriode: number, facturation: string, dateDebut: string, dateFin: string) => {
    if (!montantPeriode || !facturation || !dateDebut || !dateFin) return 0;

    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    const diffTime = Math.abs(fin.getTime() - debut.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let periodesParAn = 0;
    switch (facturation) {
      case 'mensuelle':
        periodesParAn = 12;
        break;
      case 'trimestrielle':
        periodesParAn = 4;
        break;
      case 'annuelle':
        periodesParAn = 1;
        break;
      default:
        return 0;
    }

    const annees = diffDays / 365;
    const totalPeriodes = Math.ceil(annees * periodesParAn);
    return montantPeriode * totalPeriodes;
  };

  // Effet pour calculer automatiquement le forfaitaire
  useEffect(() => {
    if (formData.montant_periode && formData.facturation && formData.date_debut && formData.date_fin) {
      const forfaitaire = calculateForfaitaire(
        formData.montant_periode,
        formData.facturation,
        formData.date_debut,
        formData.date_fin
      );
      setFormData(prev => ({ ...prev, forfaitaire }));
    }
  }, [formData.montant_periode, formData.facturation, formData.date_debut, formData.date_fin]);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const { data, error } = await supabaseGes
        .from('clients_devis')
        .select('id, client, ice')
        .order('client');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      setError('Erreur lors du chargement des clients');
    } finally {
      setLoadingClients(false);
    }
  };

  const loadEmetteurs = async () => {
    try {
      setLoadingEmetteurs(true);
      const { data, error } = await supabaseGes
        .from('emetteurs')
        .select('id, nom, telephone, portable, email, adresse')
        .order('nom');

      if (error) throw error;
      setEmetteurs(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des émetteurs:', error);
      setError('Erreur lors du chargement des émetteurs');
    } finally {
      setLoadingEmetteurs(false);
    }
  };

  const loadAllContacts = async () => {
    try {
      const { data, error } = await supabaseGes
        .from('contacts')
        .select('num_contact, nom, adresse, tel, adresse_facturation, email')
        .order('nom');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
    }
  };

  const loadClientContacts = async (clientId: number) => {
    try {
      setLoadingContacts(true);
      // Charger les contacts du client spécifique
      const { data, error } = await supabaseGes
        .from('contacts')
        .select('num_contact, nom, adresse, tel, adresse_facturation, email')
        .eq('client_id', clientId)
        .order('nom');

      if (error) throw error;
      setClientContacts(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts du client:', error);
      setClientContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Effet pour charger les contacts quand le client change
  useEffect(() => {
    if (formData.client_id && formData.client_id !== 0) {
      loadClientContacts(formData.client_id);
    } else {
      setClientContacts([]);
      setFormData(prev => ({ ...prev, contact_id: undefined }));
    }
  }, [formData.client_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom.trim()) {
      setError('Le nom du contrat est obligatoire');
      return;
    }

    if (!formData.client_id) {
      setError('Veuillez sélectionner un client');
      return;
    }

    if (!formData.date_debut) {
      setError('La date de début est obligatoire');
      return;
    }

    if (!formData.date_fin) {
      setError('La date de fin est obligatoire');
      return;
    }

    if (!formData.montant_periode) {
      setError('Le montant par période est obligatoire');
      return;
    }

    if (!formData.facturation) {
      setError('Le type de facturation est obligatoire');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let success = false;

      if (contract) {
        const result = await updateContract({ ...formData, id: contract.id });
        success = !!result;
      } else {
        const result = await createContract(formData);
        success = !!result;
      }

      if (success) {
        onSuccess();
      } else {
        setError('Erreur lors de la sauvegarde du contrat');
      }
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      setError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {contract ? 'Modifier le contrat' : 'Nouveau contrat'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
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

          {/* Nom du contrat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du contrat *
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Nom du contrat"
              required
            />
          </div>

          {/* Numéro de commande */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro de commande
            </label>
            <input
              type="text"
              value={formData.numero_commande || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, numero_commande: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Numéro de commande (optionnel)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Référence de commande client pour ce contrat
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Description du contrat"
            />
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client *
            </label>
            {loadingClients ? (
              <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>
            ) : (
              <select
                value={formData.client_id}
                onChange={(e) => setFormData(prev => ({ ...prev, client_id: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value={0}>Sélectionner un client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.client} {client.ice && `(ICE: ${client.ice})`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Contact Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Client
            </label>
            {loadingContacts ? (
              <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>
            ) : (
              <select
                value={formData.contact_id || 0}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  contact_id: e.target.value === '0' ? undefined : parseInt(e.target.value) 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                disabled={!formData.client_id || formData.client_id === 0}
              >
                <option value={0}>Sélectionner un contact (optionnel)</option>
                {clientContacts.map(contact => (
                  <option key={contact.num_contact} value={contact.num_contact}>
                    {contact.nom}
                    {contact.tel && ` - ${contact.tel}`}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {!formData.client_id || formData.client_id === 0 
                ? 'Sélectionnez d\'abord un client pour voir ses contacts'
                : 'Contact principal pour ce contrat (utilisé dans les documents)'
              }
            </p>
          </div>

          {/* Émetteur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Émetteur (Expéditeur)
            </label>
            {loadingEmetteurs ? (
              <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>
            ) : (
              <select
                value={formData.emetteur_id || 0}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  emetteur_id: e.target.value === '0' ? undefined : parseInt(e.target.value) 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={0}>Sélectionner un émetteur (optionnel)</option>
                {emetteurs.map(emetteur => (
                  <option key={emetteur.id} value={emetteur.id}>
                    {emetteur.nom}
                    {emetteur.telephone && ` - ${emetteur.telephone}`}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">
              L'émetteur sera utilisé pour les documents générés (factures, BL, etc.)
            </p>
          </div>

          {/* Statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut *
            </label>
            <select
              value={formData.statut}
              onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value as any }))}
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

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début *
              </label>
              <input
                type="date"
                value={formData.date_debut}
                onChange={(e) => setFormData(prev => ({ ...prev, date_debut: e.target.value }))}
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
                value={formData.date_fin}
                onChange={(e) => setFormData(prev => ({ ...prev, date_fin: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Type de facturation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de facturation *
            </label>
            <select
              value={formData.facturation || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                facturation: (e.target.value || undefined) as 'mensuelle' | 'trimestrielle' | 'annuelle' | undefined
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            >
              {facturationOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Détermine la fréquence de facturation et le calcul du montant forfaitaire
            </p>
          </div>

          {/* Type de montant (HT/TTC) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de montant *
            </label>
            <select
              value={formData.ht_ttc}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                ht_ttc: e.target.value as 'HT' | 'TTC'
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            >
              {htTtcOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Indique si les montants sont exprimés Hors Taxes ou Toutes Taxes Comprises
            </p>
          </div>

          {/* Montant par période */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Montant par période (MAD) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.montant_periode || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                montant_periode: e.target.value ? parseFloat(e.target.value) : undefined 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="0.00"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Montant facturé à chaque période selon le type de facturation
            </p>
          </div>

          {/* Montant forfaitaire (calculé automatiquement) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Montant forfaitaire total (calculé automatiquement)
            </label>
            <input
              type="text"
              value={formData.forfaitaire ? `${formData.forfaitaire.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD` : '0.00 MAD'}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Calculé automatiquement : montant par période × nombre de périodes sur la durée du contrat
            </p>
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
              {loading ? 'Sauvegarde...' : (contract ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContractModal;