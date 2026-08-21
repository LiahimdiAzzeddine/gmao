import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  FileText,
  Building2,
  User,
  Calendar,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  X
} from 'lucide-react';
import { useContracts } from '../../hooks/useContracts';
import { ContractFilters } from '../../types/contracts';
import { getStatutColor } from '../../utils/gestionMethode';
import ContractModal from './ContractModal';
import ContractPeriodsView from './ContractPeriodsView';

const ContractsTable: React.FC = () => {
  const { contracts, loading, error, fetchContracts, deleteContract, renewContract } = useContracts();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [renewingContract, setRenewingContract] = useState<number | null>(null);
  const [renewMessage, setRenewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPeriodsView, setShowPeriodsView] = useState<{ contractId: number; contractName: string; contractData?: any } | null>(null);

  const statutOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'brouillon', label: 'Brouillon' },
    { value: 'actif', label: 'Actif' },
    { value: 'suspendu', label: 'Suspendu' },
    { value: 'termine', label: 'Terminé' },
    { value: 'annule', label: 'Annulé' }
  ];

  const getStatutLabel = (statut: string) => {
    const option = statutOptions.find(opt => opt.value === statut);
    return option?.label || statut;
  };

  // Fonction de recherche avec debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const filters: ContractFilters = {};
      if (searchTerm.trim()) filters.search = searchTerm.trim();
      if (statusFilter) filters.statut = statusFilter;
      
      fetchContracts(filters);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]); // Retirer fetchContracts des dépendances

  const handleEdit = (contract: any) => {
    setSelectedContract(contract);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const success = await deleteContract(id);
    if (success) {
      setShowDeleteConfirm(null);
    }
  };

  const handleRenewContract = async (contractId: number) => {
    setRenewingContract(contractId);
    setRenewMessage(null);
    
    const result = await renewContract(contractId);
    
    setRenewingContract(null);
    setRenewMessage({
      type: result.success ? 'success' : 'error',
      text: result.message
    });

    // Masquer le message après 5 secondes
    setTimeout(() => {
      setRenewMessage(null);
    }, 5000);
  };

  const isContractExpired = (contract: any) => {
    if (!contract.date_fin) return false;
    const today = new Date();
    const endDate = new Date(contract.date_fin);
    return endDate < today;
  };

  const handleViewPeriods = (contract: any) => {
    setShowPeriodsView({
      contractId: contract.id,
      contractName: contract.nom,
      contractData: contract
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getFacturationLabel = (facturation: string | null | undefined) => {
    const labels: Record<string, string> = {
      'mensuelle': 'Mensuel',
      'trimestrielle': 'Trimestriel',
      'annuelle': 'Annuel'
    };
    return facturation ? labels[facturation] || facturation : '';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Si on affiche la vue des périodes, on retourne ce composant
  if (showPeriodsView) {
    return (
      <ContractPeriodsView
        contractId={showPeriodsView.contractId}
        contractName={showPeriodsView.contractName}
        contractData={showPeriodsView.contractData}
        onBack={() => setShowPeriodsView(null)}
      />
    );
  }

  // Gestion des erreurs spécifiques
  const isTableNotFound = error?.includes('relation "contracts" does not exist') || 
                          error?.includes('table "contracts" does not exist') ||
                          error?.includes('42P01');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full px-4 md:px-6 py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-[#f15c00]/20 border-t-[#f15c00] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#f15c00]" />
                </div>
              </div>
              <p className="text-slate-600 font-medium">Chargement des contrats...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isTableNotFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full px-4 md:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-[#f15c00] to-[#ee6b1a] rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Gestion des Contrats</h1>
                  <p className="text-orange-100">
                    Gérez vos contrats clients et leurs chantiers associés
                  </p>
                </div>
                <div className="hidden md:flex items-center space-x-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                    <FileText className="w-8 h-8" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <AlertCircle className="text-yellow-600" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-800 mb-3">
                  Table des contrats non trouvée
                </h3>
                <p className="text-yellow-700 mb-4">
                  La table "contracts" n'existe pas encore dans votre base de données. 
                  Vous devez d'abord créer cette table pour utiliser la gestion des contrats.
                </p>
                <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-200">
                  <p className="text-sm font-semibold text-yellow-800 mb-3">SQL à exécuter dans Supabase :</p>
                  <pre className="text-xs text-yellow-700 whitespace-pre-wrap bg-white p-3 rounded border border-yellow-200 overflow-x-auto">
{`CREATE TABLE public.contracts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom text NOT NULL,
  description text,
  client_id bigint NOT NULL,
  chantier_code text NOT NULL,
  statut text NOT NULL CHECK (statut IN ('brouillon', 'actif', 'suspendu', 'termine', 'annule')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contracts_client_fkey FOREIGN KEY (client_id) REFERENCES public.clients_devis(id) ON DELETE RESTRICT,
  CONSTRAINT contracts_chantier_fkey FOREIGN KEY (chantier_code) REFERENCES public.chantiers(code) ON DELETE RESTRICT
);`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full px-4 md:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-[#f15c00] to-[#ee6b1a] rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Gestion des Contrats</h1>
                  <p className="text-orange-100">
                    Gérez vos contrats clients et leurs chantiers associés
                  </p>
                </div>
                <div className="hidden md:flex items-center space-x-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                    <FileText className="w-8 h-8" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border-l-4 border-red-400 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur de chargement</h3>
                <p className="text-red-700 mb-4">{error}</p>
                <button
                  onClick={() => fetchContracts()}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  <RefreshCw size={16} />
                  Réessayer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full px-4 md:px-6 py-8">
        {/* Header avec gradient moderne */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-[#f15c00] to-[#ee6b1a] rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Gestion des Contrats</h1>
                <p className="text-orange-100">
                  Gérez vos contrats clients et leurs chantiers associés
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <FileText className="w-8 h-8" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {statutOptions.slice(1).map(status => {
            const count = contracts.filter(c => c.statut === status.value).length;
            const colors = getStatutColor(status.value);
            
            return (
              <div key={status.value} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">{status.label}</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{count}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${colors.bg.replace('bg-', 'bg-').replace('-100', '-50')}`}>
                    <FileText className={`w-8 h-8 ${colors.text}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message de renouvellement */}
        {renewMessage && (
          <div className={`mb-6 p-4 rounded-xl border-l-4 shadow-sm ${
            renewMessage.type === 'success' 
              ? 'bg-green-50 border-green-400 text-green-800' 
              : 'bg-red-50 border-red-400 text-red-800'
          }`}>
            <div className="flex items-center gap-3">
              {renewMessage.type === 'success' ? (
                <CheckCircle size={20} />
              ) : (
                <XCircle size={20} />
              )}
              <span className="font-medium">{renewMessage.text}</span>
            </div>
          </div>
        )}

        {/* Barre de recherche et filtres */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Barre de recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher par nom ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all bg-slate-50 focus:bg-white"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filtres et actions */}
            <div className="flex gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent appearance-none bg-white min-w-[180px]"
                >
                  {statutOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setSelectedContract(null);
                  setShowModal(true);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-[#f15c00] to-[#ee6b1a] text-white px-6 py-3 rounded-lg hover:from-[#ee6b1a] hover:to-[#d14d00] transition-all font-medium shadow-sm hover:shadow-md"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Nouveau Contrat</span>
              </button>
            </div>
          </div>

          {/* Compteur de résultats */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{contracts.length}</span> contrat{contracts.length > 1 ? 's' : ''} trouvé{contracts.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                    Contrat
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                    N° Commande
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                    Client & Contact
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                    Émetteur
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                    Code Chantier
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                    Période & Montants
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                    Date création
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {contracts.map((contract) => {
                  const colors = getStatutColor(contract.statut);
                  const isExpired = isContractExpired(contract);
                  
                  return (
                    <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-[#f15c00]/10 rounded-lg mr-3">
                            <FileText className="text-[#f15c00]" size={20} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {contract.nom}
                            </div>
                            {contract.description && (
                              <div className="text-sm text-slate-500 truncate max-w-xs">
                                {contract.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {contract.numero_commande ? (
                            <span className="font-mono bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-blue-200">
                              {contract.numero_commande}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-sm">Non défini</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-slate-100 rounded-lg mr-3">
                            <User className="text-slate-600" size={16} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {contract.client?.client || 'Client inconnu'}
                            </div>
                            {contract.contact && (
                              <div className="text-xs text-slate-500">
                                Contact: {contract.contact.nom}
                                {contract.contact.tel && ` - ${contract.contact.tel}`}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-slate-100 rounded-lg mr-3">
                            <Send className="text-slate-600" size={16} />
                          </div>
                          <div className="text-sm font-medium text-slate-900">
                            {contract.emetteur?.nom || (
                              <span className="text-slate-400 italic">Non défini</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-slate-100 rounded-lg mr-3">
                            <Building2 className="text-slate-600" size={16} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                              {contract.chantier_code}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Généré automatiquement
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm space-y-2">
                          {/* Période du contrat */}
                          {contract.date_debut && (
                            <div className="text-slate-700">
                              <span className="font-medium">Du:</span> {formatDate(contract.date_debut)}
                            </div>
                          )}
                          {contract.date_fin && (
                            <div className={`${isExpired ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                              <span className="font-medium">Au:</span> {formatDate(contract.date_fin)}
                              {isExpired && (
                                <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                                  Expiré
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Montants */}
                          <div className="pt-2 border-t border-slate-100">
                            {contract.forfaitaire && (
                              <div className="text-xs text-blue-600 mb-1">
                                <span className="font-medium">Forfait:</span> {formatCurrency(contract.forfaitaire)}
                                <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{contract.ht_ttc || 'HT'}</span>
                              </div>
                            )}
                            {contract.montant_periode && (
                              <div className="text-xs text-green-600">
                                <span className="font-medium">Période:</span> {formatCurrency(contract.montant_periode)}
                                <span className="ml-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{contract.ht_ttc || 'HT'}</span>
                                {contract.facturation && (
                                  <span className="text-slate-500"> / {getFacturationLabel(contract.facturation)}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                          {getStatutLabel(contract.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-slate-700">
                          <Calendar className="text-slate-400 mr-2" size={16} />
                          {formatDate(contract.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewPeriods(contract)}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-200"
                            title="Voir les périodes"
                          >
                            <Eye size={16} />
                          </button>
                          {isExpired && contract.statut === 'actif' && (
                            <button
                              onClick={() => handleRenewContract(contract.id)}
                              disabled={renewingContract === contract.id}
                              className="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all border border-transparent hover:border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Renouveler le contrat"
                            >
                              {renewingContract === contract.id ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <RefreshCw size={16} />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(contract)}
                            className="p-2 text-slate-600 hover:text-[#f15c00] hover:bg-orange-50 rounded-lg transition-all border border-transparent hover:border-orange-200"
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(contract.id)}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-200"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {contracts.length === 0 && (
            <div className="text-center py-16">
              <div className="p-4 bg-slate-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun contrat</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                {searchTerm || statusFilter !== '' 
                  ? 'Aucun contrat ne correspond à vos critères de recherche.'
                  : 'Commencez par créer votre premier contrat.'
                }
              </p>
              {!searchTerm && statusFilter === '' && (
                <button
                  onClick={() => {
                    setSelectedContract(null);
                    setShowModal(true);
                  }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#f15c00] to-[#ee6b1a] text-white px-6 py-3 rounded-lg hover:from-[#ee6b1a] hover:to-[#d14d00] transition-all font-medium shadow-sm hover:shadow-md"
                >
                  <Plus size={20} />
                  Créer le premier contrat
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal de création/édition */}
        {showModal && (
          <ContractModal
            contract={selectedContract}
            onClose={() => {
              setShowModal(false);
              setSelectedContract(null);
            }}
            onSuccess={() => {
              setShowModal(false);
              setSelectedContract(null);
              fetchContracts();
            }}
          />
        )}

        {/* Confirmation de suppression */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Confirmer la suppression
                    </h3>
                    <p className="text-slate-600 text-sm">
                      Cette action est irréversible
                    </p>
                  </div>
                </div>
                <p className="text-slate-600 mb-6">
                  Êtes-vous sûr de vouloir supprimer ce contrat ? Toutes les données associées seront perdues.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-4 py-3 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteConfirm)}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-all"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractsTable;