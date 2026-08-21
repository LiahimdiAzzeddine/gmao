import React, { useState } from 'react';
import {
  Calendar,
  Euro,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  FileText,
  Receipt,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Wrench,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useContractPeriods, ContractPeriod } from '../../hooks/useContractPeriods';
import { useContracts } from '../../hooks/useContracts';
import { handleGenerateContractBL, createContractBLData } from '../../utils/generateContractBLPdf';
import { handleGenerateContractFacture, createContractFactureData } from '../../utils/generateContractFacturePdf';
import { supabaseGes } from '../../lib/supagestion';
import ContractPeriodModal from './ContractPeriodModal';
import CorrectifModal from './CorrectifModal';
import PeriodCorrectifsView from './PeriodCorrectifsView';

interface ContractPeriodsViewProps {
  contractId: number;
  contractName: string;
  contractData?: any; // Données complètes du contrat
  onBack?: () => void;
}

const ContractPeriodsView: React.FC<ContractPeriodsViewProps> = ({
  contractId,
  contractName,
  contractData,
  onBack
}) => {
  const { periods, loading, error, deletePeriod, updatePeriodStatus, refetch } = useContractPeriods(contractId);
  const { renewContract } = useContracts();
  const [showModal, setShowModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<ContractPeriod | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState<ContractPeriod | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    date_facture: '',
    date_echeance: '',
    notes: ''
  });
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewMessage, setRenewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedPeriods, setExpandedPeriods] = useState<Set<number>>(new Set());
  const [showCorrectifModal, setShowCorrectifModal] = useState(false);
  const [selectedCorrectif, setSelectedCorrectif] = useState<any>(null);
  const [selectedPeriodForCorrectif, setSelectedPeriodForCorrectif] = useState<number | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getStatusConfig = (statut: string) => {
    const configs = {
      'en_attente': {
        label: 'En attente',
        icon: Clock,
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200',
        badgeColor: 'bg-yellow-100 text-yellow-800'
      },
      'en_cours': {
        label: 'En cours',
        icon: Clock,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200',
        badgeColor: 'bg-blue-100 text-blue-800'
      },
      'facture': {
        label: 'Facturé',
        icon: Receipt,
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-800',
        borderColor: 'border-purple-200',
        badgeColor: 'bg-purple-100 text-purple-800'
      },
      'payee': {
        label: 'Payée',
        icon: CheckCircle,
        bgColor: 'bg-green-50',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
        badgeColor: 'bg-green-100 text-green-800'
      },
      'annulee': {
        label: 'Annulée',
        icon: XCircle,
        bgColor: 'bg-red-50',
        textColor: 'text-red-800',
        borderColor: 'border-red-200',
        badgeColor: 'bg-red-100 text-red-800'
      }
    };
    return configs[statut as keyof typeof configs] || configs.en_attente;
  };

  const handleEdit = (period: ContractPeriod) => {
    setSelectedPeriod(period);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const success = await deletePeriod(id);
    if (success) {
      setShowDeleteConfirm(null);
    }
  };

  const handleStatusChange = async (id: number, newStatus: 'en_attente' | 'en_cours' | 'facture' | 'payee' | 'annulee') => {
    await updatePeriodStatus(id, newStatus);
  };

  const togglePeriodExpansion = (periodId: number) => {
    setExpandedPeriods(prev => {
      const newSet = new Set(prev);
      if (newSet.has(periodId)) {
        newSet.delete(periodId);
      } else {
        newSet.add(periodId);
      }
      return newSet;
    });
  };

  const handleAddCorrectif = (periodId: number) => {
    setSelectedPeriodForCorrectif(periodId);
    setSelectedCorrectif(null);
    setShowCorrectifModal(true);
  };

  const handleEditCorrectif = (correctif: any) => {
    setSelectedPeriodForCorrectif(correctif.contract_period_id);
    setSelectedCorrectif(correctif);
    setShowCorrectifModal(true);
  };

  const handleGenerateInvoice = async (period: ContractPeriod) => {
    try {
      // Vérifier si la période a déjà une facture associée
      if (!(period as any).facture_id) {
        // Réinitialiser le formulaire et afficher le modal de confirmation pour créer une facture
        setInvoiceForm({ date_facture: '', date_echeance: '', notes: '' });
        setShowCreateInvoiceModal(period);
        return;
      }

      // Procéder directement à la génération si la facture existe déjà
      await generateInvoicePDF(period);
    } catch (error) {
      console.error('Erreur lors de la génération de la facture:', error);
      alert('Erreur lors de la génération de la facture. Veuillez réessayer.');
    }
  };

  const handleCreateInvoiceAndGenerate = async (period: ContractPeriod) => {
    try {
      // Créer une nouvelle facture dans la base de données
      const { data: newFacture, error: factureError } = await supabaseGes
        .from('factures')
        .insert([{
          date_facture: invoiceForm.date_facture || new Date().toISOString().split('T')[0],
          date_echeance: invoiceForm.date_echeance || period.periode_fin,
          statut: 'brouillon'
          // Note: methode_paiement n'est plus stockée ici, on utilise celle de la période
        }])
        .select()
        .single();

      if (factureError) {
        console.error('Erreur lors de la création de la facture:', factureError);
        alert('Erreur lors de la création de la facture. Veuillez réessayer.');
        return;
      }

      // Associer la facture à la période ET changer le statut à "facture"
      const { error: updateError } = await supabaseGes
        .from('contract_periods')
        .update({ 
          facture_id: newFacture.id,
          statut: 'facture',
          updated_at: new Date().toISOString()
        })
        .eq('id', period.id);

      if (updateError) {
        console.error('Erreur lors de l\'association de la facture à la période:', updateError);
        alert('Erreur lors de l\'association de la facture. Veuillez réessayer.');
        return;
      }

      // Mettre à jour la période localement avec le nouvel ID de facture et le nouveau statut
      (period as any).facture_id = newFacture.id;
      period.statut = 'facture';
      
      // Recharger les données pour refléter les changements
      await refetch();
      
      // Fermer le modal et réinitialiser le formulaire
      setShowCreateInvoiceModal(null);
      setInvoiceForm({ date_facture: '', date_echeance: '', notes: '' });
      
      // Afficher un message de succès avec le numéro de facture généré
      alert(`Facture créée avec succès. Le statut de la période a été changé à "Facturé".`);
      
      // Procéder à la génération du PDF
      await generateInvoicePDF(period);
    } catch (error) {
      console.error('Erreur lors de la création de la facture:', error);
      alert('Erreur lors de la création de la facture. Veuillez réessayer.');
    }
  };

  const generateInvoicePDF = async (period: ContractPeriod) => {
    // Si on n'a pas les données complètes du contrat, on utilise les données minimales
    const contract = contractData || {
      id: contractId,
      nom: contractName,
      chantier_code: `CH-${contractId}`,
      client: {
        id: 0,
        client: 'Client non spécifié'
      },
      contact: undefined,
      emetteur: undefined
    };

    // Récupérer les travaux correctifs pour cette période
    const { data: correctifs } = await supabaseGes
      .from('contract_period_correctifs')
      .select('*')
      .eq('contract_period_id', period.id);

    // Récupérer les données de la facture si elle existe
    let factureData = null;
    if ((period as any).facture_id) {
      const { data: facture } = await supabaseGes
        .from('factures')
        .select('*')
        .eq('id', (period as any).facture_id)
        .single();
      
      factureData = facture;
    }

    const contractFactureData = createContractFactureData(
      period,
      contract,
      undefined, // Utiliser les services par défaut avec désignation automatique
      correctifs || [], // Passer les correctifs
      factureData, // Passer les données de la facture
      20, // TVA 20%
      invoiceForm.notes || `Facture générée pour la période du ${formatDate(period.periode_debut)} au ${formatDate(period.periode_fin)}`
    );

    await handleGenerateContractFacture(contractFactureData);
  };

  const handleGenerateBL = async (period: ContractPeriod) => {
    try {
      // Si on n'a pas les données complètes du contrat, on utilise les données minimales
      const contract = contractData || {
        id: contractId,
        nom: contractName,
        chantier_code: `CH-${contractId}`,
        client: {
          id: 0,
          client: 'Client non spécifié'
        },
        contact: undefined,
        emetteur: undefined
      };

      // Utiliser la description du contrat comme service principal
      const services = contract.description ? [contract.description] : [];

      // Récupérer les travaux correctifs pour cette période
      const { data: correctifs } = await supabaseGes
        .from('contract_period_correctifs')
        .select('*')
        .eq('contract_period_id', period.id);

      const blData = createContractBLData(
        period,
        contract,
        services,
        correctifs || [],
        `BL généré pour la période du ${formatDate(period.periode_debut)} au ${formatDate(period.periode_fin)}`
      );

      await handleGenerateContractBL(blData);
    } catch (error) {
      console.error('Erreur lors de la génération du BL:', error);
      alert('Erreur lors de la génération du BL. Veuillez réessayer.');
    }
  };

  const handleRenewContract = async () => {
    setRenewLoading(true);
    setRenewMessage(null);

    try {
      const result = await renewContract(contractId);
      
      if (result.success) {
        setRenewMessage({ type: 'success', text: result.message });
        // Le hook rechargera automatiquement les périodes
      } else {
        setRenewMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setRenewMessage({ 
        type: 'error', 
        text: 'Erreur lors du renouvellement du contrat' 
      });
    } finally {
      setRenewLoading(false);
    }
  };

  const isContractExpired = () => {
    if (!contractData?.date_fin) return false;
    const today = new Date();
    const contractEndDate = new Date(contractData.date_fin);
    return contractEndDate < today;
  };

  const getTotalAmount = () => {
    return periods.reduce((total, period) => total + period.montant, 0);
  };

  const getStatusCounts = () => {
    return periods.reduce((counts, period) => {
      counts[period.statut] = (counts[period.statut] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  };

  const getActivePeriods = () => {
    return periods.filter(period => isPeriodActive(period));
  };

  const isPeriodActive = (period: ContractPeriod) => {
    const today = new Date();
    const startDate = new Date(period.periode_debut);
    const endDate = new Date(period.periode_fin);
    
    // Une période est active si la date d'aujourd'hui est entre le début et la fin
    return today >= startDate && today <= endDate;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-[#f15c00]/20 border-t-[#f15c00] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-[#f15c00]" />
                </div>
              </div>
              <p className="text-slate-600 font-medium">Chargement des périodes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border-l-4 border-red-400 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur de chargement</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusCounts = getStatusCounts();
  const activePeriods = getActivePeriods();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
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
                <AlertCircle size={20} />
              )}
              <span className="font-medium">{renewMessage.text}</span>
            </div>
          </div>
        )}

        {/* Header avec gradient moderne */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-[#f15c00] to-[#ee6b1a] rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                <div>
                  <h1 className="text-3xl font-bold mb-2">Périodes du contrat</h1>
                  <p className="text-orange-100 text-lg font-medium">{contractName}</p>
                  <p className="text-orange-200 text-sm mt-1">
                    Les périodes sont générées automatiquement selon la facturation du contrat
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Bouton de renouvellement si le contrat est expiré */}
                {isContractExpired() && (
                  <button
                    onClick={handleRenewContract}
                    disabled={renewLoading}
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-3 rounded-lg hover:bg-white/30 transition-all disabled:opacity-50 font-medium border border-white/30"
                    title="Renouveler le contrat expiré"
                  >
                    <RefreshCw size={20} className={renewLoading ? 'animate-spin' : ''} />
                    {renewLoading ? 'Renouvellement...' : 'Renouveler contrat'}
                  </button>
                )}
                
                <div className="hidden md:flex items-center space-x-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                    <Calendar className="w-8 h-8" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total périodes</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{periods.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Périodes actives</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{activePeriods.length}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl">
                <Clock className="w-8 h-8 text-[#f15c00]" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">En attente</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{statusCounts.en_attente || 0}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-xl">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Payées</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{statusCounts.payee || 0}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Card du montant total - plus large */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow md:col-span-2 lg:col-span-1 xl:col-span-1">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-600 text-sm font-medium">Montant total</p>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Euro className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-800 break-words">
                {formatCurrency(getTotalAmount())}
              </div>
            </div>
          </div>
        </div>

        {/* Liste des périodes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {periods.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-4 bg-slate-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Calendar className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune période générée</h3>
              <p className="text-slate-500 mb-2 max-w-md mx-auto">
                Les périodes seront générées automatiquement lors de la création du contrat selon sa facturation.
              </p>
              <p className="text-slate-400 text-sm">
                Vous pouvez créer une période manuellement si nécessaire.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                      Période
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                      Montant
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                      Statut
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">
                      Facture
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {periods.map((period) => {
                    const statusConfig = getStatusConfig(period.statut);
                    const isActive = isPeriodActive(period);
                    const isExpanded = expandedPeriods.has(period.id);

                    return (
                      <React.Fragment key={period.id}>
                        <tr 
                          className={`hover:bg-slate-50 transition-colors ${
                            isActive 
                              ? 'border-l-4 border-l-[#f15c00] bg-orange-50' 
                              : ''
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <button
                                onClick={() => togglePeriodExpansion(period.id)}
                                className="mr-3 p-2 hover:bg-slate-200 rounded-lg transition-all"
                                title="Voir les travaux correctifs"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="text-slate-400" size={16} />
                                ) : (
                                  <ChevronRight className="text-slate-400" size={16} />
                                )}
                              </button>
                              <div className={`p-2 rounded-lg mr-3 ${
                                isActive ? 'bg-[#f15c00]/10' : 'bg-slate-100'
                              }`}>
                                <Calendar className={`${
                                  isActive ? 'text-[#f15c00]' : 'text-slate-600'
                                }`} size={20} />
                              </div>
                              <div>
                                <div className={`text-sm font-semibold ${
                                  isActive ? 'text-[#f15c00]' : 'text-slate-900'
                                }`}>
                                  Du {formatDate(period.periode_debut)}
                                  {isActive && (
                                    <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#f15c00] text-white">
                                      Période active
                                    </span>
                                  )}
                                </div>
                                <div className={`text-sm ${
                                  isActive ? 'text-orange-700' : 'text-slate-500'
                                }`}>
                                  Au {formatDate(period.periode_fin)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`p-2 rounded-lg mr-3 ${
                                isActive ? 'bg-[#f15c00]/10' : 'bg-slate-100'
                              }`}>
                                <Euro className={`${
                                  isActive ? 'text-[#f15c00]' : 'text-slate-600'
                                }`} size={16} />
                              </div>
                              <span className={`text-sm font-semibold ${
                                isActive ? 'text-[#f15c00]' : 'text-slate-900'
                              }`}>
                                {formatCurrency(period.montant)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={period.statut}
                              onChange={(e) => handleStatusChange(period.id, e.target.value as 'en_attente' | 'en_cours' | 'facture' | 'payee' | 'annulee')}
                              className={`text-xs font-semibold rounded-lg px-3 py-2 border-0 focus:ring-2 focus:ring-[#f15c00] ${statusConfig.badgeColor} transition-all`}
                            >
                              <option value="en_attente">En attente</option>
                              <option value="en_cours">En cours</option>
                              <option value="facture">Facturé</option>
                              <option value="payee">Payée</option>
                              <option value="annulee">Annulée</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {(period as any).facture_id ? (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                <CheckCircle className="mr-1.5" size={12} />
                                Créée
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                <XCircle className="mr-1.5" size={12} />
                                Aucune
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              {/* Bouton pour ajouter un travail correctif */}
                              <button
                                onClick={() => handleAddCorrectif(period.id)}
                                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-200"
                                title="Ajouter un travail correctif"
                              >
                                <Wrench size={16} />
                              </button>

                              {/* Génération de documents - seulement si pas annulée */}
                              {period.statut !== 'annulee' && (
                                <>
                                  <button
                                    onClick={() => handleGenerateInvoice(period)}
                                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-200"
                                    title="Générer facture"
                                  >
                                    <Receipt size={16} />
                                  </button>
                                  
                                  <button
                                    onClick={() => handleGenerateBL(period)}
                                    className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all border border-transparent hover:border-purple-200"
                                    title="Générer BL"
                                  >
                                    <FileText size={16} />
                                  </button>
                                </>
                              )}

                              {/* Actions CRUD Admin */}
                              <button
                                onClick={() => handleEdit(period)}
                                className="p-2 text-slate-600 hover:text-[#f15c00] hover:bg-orange-50 rounded-lg transition-all border border-transparent hover:border-orange-200"
                                title="Modifier la période"
                              >
                                <Edit size={16} />
                              </button>
                              
                              <button
                                onClick={() => setShowDeleteConfirm(period.id)}
                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-200"
                                title="Supprimer la période"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Ligne étendue pour les travaux correctifs */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 bg-slate-50">
                              <PeriodCorrectifsView
                                periodId={period.id}
                                onAddCorrectif={() => handleAddCorrectif(period.id)}
                                onEditCorrectif={handleEditCorrectif}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* Modal de création/édition */}
      {showModal && (
        <ContractPeriodModal
          contractId={contractId}
          period={selectedPeriod}
          onClose={() => {
            setShowModal(false);
            setSelectedPeriod(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setSelectedPeriod(null);
            // Recharger les données après modification
            refetch();
          }}
        />
      )}

      {/* Modal de création/édition des travaux correctifs */}
      {showCorrectifModal && selectedPeriodForCorrectif && (
        <CorrectifModal
          periodId={selectedPeriodForCorrectif}
          correctif={selectedCorrectif}
          onClose={() => {
            setShowCorrectifModal(false);
            setSelectedCorrectif(null);
            setSelectedPeriodForCorrectif(null);
          }}
          onSave={() => {
            // Callback vide, la sauvegarde est gérée dans le modal
          }}
        />
      )}

      {/* Modal de création de facture */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FileText className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Créer une facture
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Cette période n'a pas encore de facture associée
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-blue-600 mt-0.5" size={16} />
                    <div>
                      <p className="text-blue-800 text-sm font-medium">Information</p>
                      <p className="text-blue-700 text-sm mt-1">
                        Un numéro de facture sera automatiquement généré par le système.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-slate-600 mb-6 space-y-2">
                  <p><span className="font-medium">Période :</span> Du {formatDate(showCreateInvoiceModal.periode_debut)} au {formatDate(showCreateInvoiceModal.periode_fin)}</p>
                  <p><span className="font-medium">Montant :</span> {formatCurrency(showCreateInvoiceModal.montant)}</p>
                  <p><span className="font-medium">Mode de paiement :</span> {showCreateInvoiceModal.payment_mode || 'Non spécifié'}</p>
                </div>

                {/* Formulaire de saisie */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Date de facture *
                    </label>
                    <input
                      type="date"
                      value={invoiceForm.date_facture}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, date_facture: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Si vide, la date d'aujourd'hui sera utilisée
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Date d'échéance
                    </label>
                    <input
                      type="date"
                      value={invoiceForm.date_echeance}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, date_echeance: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all"
                      placeholder={`Par défaut: ${formatDate(showCreateInvoiceModal.periode_fin)}`}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Si vide, la date de fin de période sera utilisée ({formatDate(showCreateInvoiceModal.periode_fin)})
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notes (optionnel)
                    </label>
                    <textarea
                      value={invoiceForm.notes}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all"
                      rows={3}
                      placeholder="Notes additionnelles pour la facture..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateInvoiceModal(null);
                    setInvoiceForm({ date_facture: '', date_echeance: '', notes: '' });
                  }}
                  className="flex-1 px-4 py-3 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleCreateInvoiceAndGenerate(showCreateInvoiceModal)}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all flex items-center justify-center gap-2"
                >
                  <FileText size={16} />
                  Créer et générer
                </button>
              </div>
            </div>
          </div>
        </div>
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
              <p className="text-slate-600 mb-4">
                Êtes-vous sûr de vouloir supprimer cette période ?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-yellow-800 text-sm">
                  <span className="font-medium">Attention :</span> La suppression d'une période générée automatiquement peut affecter la cohérence du contrat.
                </p>
              </div>
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

export default ContractPeriodsView;