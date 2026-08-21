import { useState, useRef, useEffect, useMemo } from "react";
import { X, Edit2, Trash2, Search, ChevronLeft, ChevronRight, FileText, Eye, FileOutput, Filter, RefreshCcw, Calendar, User, Building2, Hash, Clock, AlertCircle, CheckCircle2, XCircle, Loader2, TrendingUp, DollarSign, Users, BarChart3, Download, Plus } from "lucide-react";
import { PDFViewer } from '@react-pdf/renderer';
import { Client } from "../../lib/supabase";
import { Devis } from "../../types/devis";
import { DevisPDFPreview, handleGeneratePDF } from "../../utils/generateDeviPDF";
import { useNavigate } from "react-router-dom";
import { calculateTotalHT, calculateTotalTTC, formatNumber } from "../../utils/gestionMethode";
import ClientDevisStatsPopup from "./ClientDevisStatsPopup";
import { supabase } from "../../lib/supabase";
import { exportDevisToExcel } from "../../utils/exportExcel";

interface DevisTableUIProps {
  // Data
  clientsList: Client[];
  currentDevis: Devis[];
  totalCount: number;
  
  // Loading states
  loading: boolean;
  error: string;
  updatingStatus: number | null;
  
  // PDF Preview
  isPDFPreviewOpen: boolean;
  previewDevis: Devis | null;
  afficherTTC: boolean;
  
  // Filters and pagination
  searchTerm: string;
  filterClient: string;
  filterStatut: string;
  showFilters: boolean;
  selectedClient: Client | null;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  activeFiltersCount: number;
  
  // Actions
  setFilterClient: (client: string) => void;
  setFilterStatut: (statut: string) => void;
  setShowFilters: (show: boolean) => void;
  setSelectedClient: (client: Client | null) => void;
  setItemsPerPage: (items: number) => void;
  resetFilters: () => void;
  goToPage: (page: number) => void;
  goToPDFGeneratorPage: (id: number) => void;
  handleStatusChange: (id: number, newStatus: string) => void;
  reactiverDevis: (devisItem: any) => void;
  openPDFPreview: (devis: Devis) => void;
  closePDFPreview: () => void;
  handleDelete: (id: number, chantierCode?: string) => void;
  handleSearchChange: (term: string) => void;
  fetchAllFilteredDevis: () => Promise<Devis[]>;
}

export default function DevisTableUI({
  // Data
  clientsList,
  currentDevis,
  totalCount,
  
  // Loading states
  loading,
  error,
  updatingStatus,
  
  // PDF Preview
  isPDFPreviewOpen,
  previewDevis,
  afficherTTC,
  
  // Filters and pagination
  searchTerm,
  filterClient,
  filterStatut,
  showFilters,
  selectedClient,
  currentPage,
  itemsPerPage,
  totalPages,
  startIndex,
  endIndex,
  activeFiltersCount,
  
  // Actions
  setFilterClient,
  setFilterStatut,
  setShowFilters,
  setSelectedClient,
  setItemsPerPage,
  resetFilters,
  goToPage,
  goToPDFGeneratorPage,
  handleStatusChange,
  reactiverDevis,
  openPDFPreview,
  closePDFPreview,
  handleDelete,
  handleSearchChange,
  fetchAllFilteredDevis,
}: DevisTableUIProps) {
  const navigate = useNavigate();
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [exportingExcel, setExportingExcel] = useState(false);
  
  // Calcul des métriques
  const metrics = useMemo(() => {
    if (!currentDevis || currentDevis.length === 0) {
      return {
        totalValue: 0,
        averageValue: 0,
        statusCounts: {},
        clientsCount: 0,
        monthlyTrend: 0
      };
    }

    // Calcul de la valeur totale (seulement les devis payés de l'année actuelle)
    const currentYear = new Date().getFullYear();
    let totalValue = 0;
    let paidDevisCount = 0;
    
    currentDevis.forEach(devis => {
      // Vérifier si le devis est payé et dans l'année actuelle
      if (devis.statut === 'payé' && devis.date_paye) {
        const paymentDate = new Date(devis.date_paye);
        if (paymentDate.getFullYear() === currentYear) {
          const totalHT = calculateTotalHT(devis);
          totalValue += totalHT;
          paidDevisCount++;
        }
      }
    });

    // Calcul de la valeur moyenne (seulement les devis payés de l'année actuelle)
    const averageValue = paidDevisCount > 0 ? totalValue / paidDevisCount : 0;

    // Comptage par statut
    const statusCounts = currentDevis.reduce((counts, devis) => {
      counts[devis.statut] = (counts[devis.statut] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Nombre de clients uniques
    const uniqueClients = new Set(currentDevis.map(d => d.client_devis_id).filter(Boolean));
    const clientsCount = uniqueClients.size;

    // Tendance mensuelle (devis du mois en cours vs mois précédent)
    const currentMonth = new Date().getMonth();
    const currentYearForTrend = new Date().getFullYear();
    
    const currentMonthDevis = currentDevis.filter(d => {
      if (!d.date_devis) return false;
      const devisDate = new Date(d.date_devis);
      return devisDate.getMonth() === currentMonth && devisDate.getFullYear() === currentYearForTrend;
    });

    const previousMonthDevis = currentDevis.filter(d => {
      if (!d.date_devis) return false;
      const devisDate = new Date(d.date_devis);
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYearForTrend - 1 : currentYearForTrend;
      return devisDate.getMonth() === prevMonth && devisDate.getFullYear() === prevYear;
    });

    const monthlyTrend = previousMonthDevis.length > 0 
      ? ((currentMonthDevis.length - previousMonthDevis.length) / previousMonthDevis.length) * 100
      : currentMonthDevis.length > 0 ? 100 : 0;

    return {
      totalValue,
      averageValue,
      statusCounts,
      clientsCount,
      monthlyTrend
    };
  }, [currentDevis]);
  
  // Refs pour synchroniser les barres de scroll
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const scrollBarRef = useRef<HTMLDivElement>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [tablePosition, setTablePosition] = useState({ left: 0, width: 0 });
  const [isTableVisible, setIsTableVisible] = useState(false);

  // Effet pour calculer les dimensions du scroll et la position du tableau
  useEffect(() => {
    const updateScrollDimensions = () => {
      if (tableContainerRef.current && tableWrapperRef.current) {
        const container = tableContainerRef.current;
        const wrapper = tableWrapperRef.current;
        const rect = wrapper.getBoundingClientRect();
        
        setScrollWidth(container.scrollWidth);
        setClientWidth(container.clientWidth);
        setTablePosition({
          left: rect.left,
          width: rect.width
        });
        
        // Vérifier si le tableau est visible à l'écran
        setIsTableVisible(rect.top < window.innerHeight && rect.bottom > 0);
      }
    };

    const handleScroll = () => {
      updateScrollDimensions();
    };

    updateScrollDimensions();
    window.addEventListener('resize', updateScrollDimensions);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('resize', updateScrollDimensions);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentDevis]);

  // Synchronisation du scroll entre le tableau et la barre fixe
  const handleTableScroll = () => {
    if (tableContainerRef.current && scrollBarRef.current) {
      const scrollLeft = tableContainerRef.current.scrollLeft;
      const scrollBarInner = scrollBarRef.current.querySelector('.scroll-thumb') as HTMLElement;
      if (scrollBarInner) {
        const maxScroll = scrollWidth - clientWidth;
        const scrollPercentage = maxScroll > 0 ? scrollLeft / maxScroll : 0;
        const thumbMaxPosition = scrollBarRef.current.clientWidth - scrollBarInner.clientWidth;
        scrollBarInner.style.transform = `translateX(${scrollPercentage * thumbMaxPosition}px)`;
      }
    }
  };

  const handleScrollBarDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!scrollBarRef.current || !tableContainerRef.current) return;
    
    const scrollBar = scrollBarRef.current;
    const thumb = scrollBar.querySelector('.scroll-thumb') as HTMLElement;
    if (!thumb) return;

    const scrollBarRect = scrollBar.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const startX = e.clientX;
    const startScrollLeft = tableContainerRef.current.scrollLeft;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const scrollBarWidth = scrollBarRect.width;
      const thumbWidth = thumbRect.width;
      const maxThumbPosition = scrollBarWidth - thumbWidth;
      const maxTableScroll = scrollWidth - clientWidth;
      
      // Calculer le nouveau scroll basé sur le déplacement de la souris
      const scrollRatio = maxThumbPosition > 0 ? deltaX / maxThumbPosition : 0;
      const newScrollLeft = startScrollLeft + (scrollRatio * maxTableScroll);
      
      // Appliquer les limites
      const clampedScrollLeft = Math.max(0, Math.min(newScrollLeft, maxTableScroll));
      
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollLeft = clampedScrollLeft;
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    // Empêcher la sélection de texte pendant le drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const downloadPDF = () => {
    if (previewDevis) {
      handleGeneratePDF(previewDevis, afficherTTC);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const clientName = filterClient !== 'all' ? 
        clientsList.find(c => c.id.toString() === filterClient)?.client : 
        undefined;

      // Récupérer toutes les données filtrées (pas seulement la page actuelle)
      const allFilteredDevis = await fetchAllFilteredDevis();

      exportDevisToExcel(allFilteredDevis, {
        filename: `devis_export_${new Date().toISOString().split('T')[0]}.xlsx`,
        includeFilters: {
          searchTerm: searchTerm || undefined,
          filterClient: clientName || undefined,
          filterStatut: filterStatut !== 'all' ? filterStatut : undefined,
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
    } finally {
      setExportingExcel(false);
    }
  };

  const getStatutBadge = (statut: string) => {
    const badges = {
      en_attente: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        icon: Clock,
        label: "En attente"
      },
      en_cours: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        icon: Loader2,
        label: "En cours"
      },
      facturé: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        icon: CheckCircle2,
        label: "Facturé"
      },
      annule: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: XCircle,
        label: "Annulé"
      },
      payé: {
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-200",
        icon: CheckCircle2,
        label: "Payé"
      },
      terminé: {
        bg: "bg-teal-50",
        text: "text-teal-700",
        border: "border-teal-200",
        icon: CheckCircle2,
        label: "Terminé"
      },
      accepte: {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
        icon: CheckCircle2,
        label: "Accepté"
      },
    };
    return badges[statut as keyof typeof badges] || {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
      icon: AlertCircle,
      label: statut
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-4 md:px-6">
        {/* Header avec gradient */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Gestion des travaux P5</h1>
                <p className="text-orange-100">
                  {totalCount > 0 ? `${totalCount} devis au total` : 'Aucun devis'}
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <button
                  onClick={() => navigate('/gestion/devis-nouveau')}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-xl font-semibold hover:bg-orange-50 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  Nouveau Devis
                </button>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                  <FileText className="w-8 h-8" />
                </div>
                
              </div>
            </div>
          </div>
        </div>

        {/* Métriques Dashboard */}
        {!loading && currentDevis.length > 0 && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Valeur totale */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Revenus Payés {new Date().getFullYear()}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatNumber(metrics.totalValue)} Dhs
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Valeur moyenne */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Moyenne Payés {new Date().getFullYear()}</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatNumber(metrics.averageValue)} Dhs
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Nombre de clients */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Clients Actifs</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {metrics.clientsCount}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Tendance mensuelle */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Tendance Mensuelle</p>
                  <p className={`text-2xl font-bold ${metrics.monthlyTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metrics.monthlyTrend >= 0 ? '+' : ''}{metrics.monthlyTrend.toFixed(1)}%
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${metrics.monthlyTrend >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <TrendingUp className={`w-6 h-6 ${metrics.monthlyTrend >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Répartition par statut */}
        {!loading && currentDevis.length > 0 && Object.keys(metrics.statusCounts).length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Répartition par Statut
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {Object.entries(metrics.statusCounts).map(([statut, count]) => {
                  const badge = getStatutBadge(statut);
                  const IconComponent = badge.icon;
                  return (
                    <div key={statut} className={`p-4 rounded-xl border ${badge.border} ${badge.bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <IconComponent className={`w-4 h-4 ${badge.text}`} />
                        <span className={`text-lg font-bold ${badge.text}`}>{count}</span>
                      </div>
                      <p className={`text-xs font-medium ${badge.text}`}>{badge.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Barre de recherche et filtres améliorée */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Barre de recherche */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher par numéro, client, désignation..."
                value={localSearchTerm}
                onChange={(e) => {
                  setLocalSearchTerm(e.target.value);
                  handleSearchChange(e.target.value);
                }}
                className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              />
              {localSearchTerm && (
                <button
                  onClick={() => {
                    setLocalSearchTerm('');
                    handleSearchChange('');
                  }}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Boutons d'actions */}
            <div className="flex gap-3">
              {/* Bouton Export Excel */}
              <button
                onClick={handleExportExcel}
                disabled={currentDevis.length === 0 || exportingExcel}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white shadow-lg hover:shadow-xl"
                title="Exporter en Excel"
              >
                {exportingExcel ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span className="font-medium">Export...</span>
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    <span className="font-medium">Excel</span>
                  </>
                )}
              </button>

              {/* Bouton filtres */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 relative ${
                  showFilters 
                    ? 'bg-orange-500 text-white shadow-lg' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Filter size={20} />
                <span className="font-medium">Filtres</span>
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Panneau de filtres amélioré */}
          {showFilters && (
            <div className="mt-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Options de filtrage
                </h3>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium bg-white px-3 py-1.5 rounded-lg border border-orange-200 hover:border-orange-300 transition-all"
                  >
                    <RefreshCcw size={14} />
                    Réinitialiser
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Filtre Client */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Building2 className="w-4 h-4" />
                    Client
                  </label>
                  <select
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition-all"
                  >
                    <option value="all">Tous les clients</option>
                    {clientsList.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.client}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtre Statut */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Statut
                  </label>
                  <select
                    value={filterStatut}
                    onChange={(e) => setFilterStatut(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition-all"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="en_attente">En attente</option>
                    <option value="accepte">Accepté</option>
                    <option value="en_cours">En cours</option>
                    <option value="facturé">Facturé</option>
                    <option value="annule">Annulé</option>
                    <option value="payé">Payé</option>
                    <option value="terminé">Terminé</option>
                  </select>
                </div>

                {/* Filtre Pagination */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Hash className="w-4 h-4" />
                    Résultats par page
                  </label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition-all"
                  >
                    <option value={5}>5 éléments</option>
                    <option value={10}>10 éléments</option>
                    <option value={20}>20 éléments</option>
                    <option value={50}>50 éléments</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Badges des filtres actifs améliorés */}
          {activeFiltersCount > 0 && !showFilters && (
            <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
              <div className="flex flex-wrap gap-3">
                <span className="text-sm font-medium text-orange-800 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtres actifs:
                </span>
                {filterClient !== 'all' && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-orange-700 rounded-lg text-sm font-medium border border-orange-200 shadow-sm">
                    <Building2 className="w-3 h-3" />
                    {clientsList.find(c => c.id.toString() === filterClient)?.client}
                    <button
                      onClick={() => setFilterClient('all')}
                      className="hover:bg-orange-100 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filterStatut !== 'all' && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-orange-700 rounded-lg text-sm font-medium border border-orange-200 shadow-sm">
                    <CheckCircle2 className="w-3 h-3" />
                    {filterStatut.replace('_', ' ')}
                    <button
                      onClick={() => setFilterStatut('all')}
                      className="hover:bg-orange-100 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Indicateur de recherche active amélioré */}
          {searchTerm && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-blue-800">
                  <Search size={16} />
                  <span className="text-sm font-medium">
                    Recherche active: <span className="font-semibold">"{searchTerm}"</span>
                  </span>
                </div>
                <button
                  onClick={() => {
                    setLocalSearchTerm('');
                    handleSearchChange('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm bg-white px-3 py-1 rounded-lg border border-blue-200 hover:border-blue-300 transition-all"
                >
                  Effacer
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-orange-500" />
                </div>
              </div>
              <p className="text-gray-600 font-medium">Chargement des devis...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Tableau amélioré avec scroll horizontal fixe */}
            <div 
              ref={tableWrapperRef}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div 
                ref={tableContainerRef}
                className="overflow-x-auto"
                onScroll={handleTableScroll}
              >
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                      <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Statut</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">N° Devis</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Client</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Code chantier</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Désignation</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Domaine</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Total HT</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Total TTC</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Contact</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Échéance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">{currentDevis.map((d, index) => {
                    console.log(d)
                      const totalHT = calculateTotalHT(d);
                      const totalTTC = calculateTotalTTC(totalHT);

                      return (
                        <tr key={d.id} className={`transition-all duration-200 hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {/* Actions avec tooltips améliorés */}
                              <button
                                onClick={() => { navigate(`/gestion/devis/${d.id}/edit`); }}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                                title="Modifier le devis"
                              >
                                <Edit2 size={16} className="group-hover:scale-110 transition-transform" />
                              </button>

                              <button
                                onClick={() => handleDelete(d.id, d.chantiers?.code)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200 group"
                                title="Supprimer le devis"
                              >
                                <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                              </button>

                              <button
                                onClick={() => openPDFPreview(d)}
                                className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-all duration-200 group"
                                title="Prévisualiser PDF"
                              >
                                <Eye size={16} className="group-hover:scale-110 transition-transform" />
                              </button>

                              <button
                                onClick={() => goToPDFGeneratorPage(d.id)}
                                className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-lg transition-all duration-200 group"
                                title="Générer documents"
                              >
                                <FileOutput size={16} className="group-hover:scale-110 transition-transform" />
                              </button>

                              {d.statut === "annule" && (
                                <button
                                  onClick={() => reactiverDevis(d)}
                                  className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all duration-200 group"
                                  title="Réactiver le devis"
                                >
                                  <RefreshCcw size={16} className="group-hover:scale-110 transition-transform" />
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {updatingStatus === d.id ? (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="text-xs text-gray-600">Mise à jour...</span>
                              </div>
                            ) : (
                              <select
                                value={d.statut}
                                onChange={(e) => handleStatusChange(d.id, e.target.value)}
                                disabled={d.statut == "annule" || d.statut == "payé"}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer hover:shadow-md ${getStatutBadge(d.statut).bg} ${getStatutBadge(d.statut).text} ${getStatutBadge(d.statut).border}`}
                              >
                                <option value="en_attente" disabled>En attente</option>
                                <option value="en_cours" disabled>En cours</option>
                                <option value="accepte" disabled>Accepté</option>
                                <option value="terminé" disabled>Terminé</option>
                                <option value="facturé" disabled>Facturé</option>
                                <option value="payé" disabled={d.statut != 'facturé'}>Payé</option>
                                <option value="annule">Annulé</option>
                              </select>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <button
                              onClick={() => goToPDFGeneratorPage(d.id)}
                              className="text-orange-700 hover:text-orange-900 font-semibold hover:underline transition-all"
                            >
                              {d.num_devis}
                            </button>
                          </td>

                          <td className="px-6 py-4">
                            <button
                              //onClick={() => setSelectedClient(d.clients_devis as any)}
                              className="flex items-center gap-2 text-green-700 hover:text-green-900 font-semibold hover:underline transition-all"
                            >
                              <Building2 className="w-4 h-4" />
                              {d.clients_devis?.client || "-"}
                            </button>
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                              <Hash className="w-3 h-3" />
                              {d.chantiers?.code || '-'}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              <p className="text-sm text-gray-900 truncate" title={d.designation || undefined}>
                                {d.designation || "-"}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium" title={d.type_devis?.libelle}>
                              {d.type_devis?.code || "-"}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-700">
                              {d.domaines_activite?.libelle || "-"}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-green-700 font-semibold">
                              {formatNumber(totalHT)}{d.monetaire?.symbol || "Dhs"}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-blue-700 font-semibold">
                              {d.ht_ttc == "HT" ? 'HT' : `${formatNumber(totalTTC)}${d.monetaire?.symbol || "Dhs"}`}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <User className="w-4 h-4" />
                              {d.contact?.nom || "-"}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              {d.date_devis ? new Date(d.date_devis).toLocaleDateString("fr-FR") : "-"}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {/* Si le devis est payé, afficher la date et l'heure de paiement */}
                            {d.statut === 'payé' && d.date_paye ? (
                              <div className="space-y-1">
                                <div className="flex flex-col gap-1 text-sm text-purple-700">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(d.date_paye).toLocaleDateString("fr-FR")}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-purple-600">
                                    <Clock className="w-3 h-3" />
                                    {new Date(d.date_paye).toLocaleTimeString("fr-FR", { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </div>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Payé
                                </span>
                              </div>
                            ) : d.factures?.date_echeance ? (() => {
                              const echeanceDate = new Date(d.factures.date_echeance + "T00:00:00");
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);

                              const diffTime = echeanceDate.getTime() - today.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                              const isOverdue = diffDays < 0;
                              const isToday = diffDays === 0;
                              const isSoon = diffDays > 0 && diffDays <= 7;

                              return (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Calendar className="w-3 h-3" />
                                    {echeanceDate.toLocaleDateString("fr-FR")}
                                  </div>
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                    isOverdue ? 'bg-red-100 text-red-800' :
                                    isToday ? 'bg-yellow-100 text-yellow-800' :
                                    isSoon ? 'bg-orange-100 text-orange-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    <Clock className="w-3 h-3" />
                                    {isOverdue ? `${Math.abs(diffDays)} j. retard` :
                                     isToday ? "Aujourd'hui" :
                                     `${diffDays} jours`}
                                  </span>
                                </div>
                              );
                            })() : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {currentDevis.length === 0 && (
                      <tr>
                        <td colSpan={13} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <FileText className="w-8 h-8 text-gray-400" />
                            </div>
                            <div className="text-center">
                              <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {searchTerm || filterClient !== "all" || filterStatut !== "all"
                                  ? "Aucun devis trouvé"
                                  : "Aucun devis"}
                              </h3>
                              <p className="text-gray-500">
                                {searchTerm || filterClient !== "all" || filterStatut !== "all"
                                  ? "Essayez de modifier vos critères de recherche"
                                  : 'Cliquez sur "Ajouter un devis" pour commencer'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Barre de scroll horizontal fixe - Position absolue */}
            {scrollWidth > clientWidth && isTableVisible && (
              <div 
                className="fixed bottom-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50"
                style={{
                  left: `${Math.max(16, tablePosition.left)}px`,
                  width: `${Math.min(tablePosition.width, window.innerWidth - 32)}px`
                }}
              >
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span className="flex items-center gap-1">
                    <ChevronLeft className="w-3 h-3" />
                    Scroll horizontal
                  </span>
                  <span className="flex items-center gap-1">
                    Glisser pour naviguer
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
                <div 
                  ref={scrollBarRef}
                  className="relative h-4 bg-gray-100 rounded-full cursor-pointer select-none"
                >
                  <div 
                    className="scroll-thumb absolute top-0 h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full cursor-grab active:cursor-grabbing transition-colors duration-150 hover:from-orange-500 hover:to-orange-600 shadow-sm"
                    style={{ 
                      width: `${Math.max(60, (clientWidth / scrollWidth) * 100)}px`,
                      transform: 'translateX(0px)'
                    }}
                    onMouseDown={handleScrollBarDrag}
                  >
                    <div className="absolute inset-0 bg-white/20 rounded-full"></div>
                    <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-white/40 rounded-full"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Pagination améliorée */}
            {totalCount > 0 && (
              <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-16">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      <span className="font-medium">
                        Affichage de <span className="text-orange-600 font-semibold">{startIndex + 1}</span> à{' '}
                        <span className="text-orange-600 font-semibold">{Math.min(endIndex, totalCount)}</span> sur{' '}
                        <span className="text-orange-600 font-semibold">{totalCount}</span> devis
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                      title="Page précédente"
                    >
                      <ChevronLeft size={16} />
                      Précédent
                    </button>

                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 2 && page <= currentPage + 2)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => goToPage(page)}
                              className={`px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${
                                currentPage === page
                                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg"
                                  : "border border-gray-200 hover:bg-gray-50 text-gray-700"
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (page === currentPage - 3 || page === currentPage + 3) {
                          return (
                            <span key={page} className="px-2 py-2 text-gray-400">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                      title="Page suivante"
                    >
                      Suivant
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal de prévisualisation PDF amélioré */}
        {isPDFPreviewOpen && previewDevis && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Prévisualisation PDF</h2>
                    <p className="text-orange-100 text-sm">{previewDevis.num_devis}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={downloadPDF}
                    className="flex items-center gap-2 bg-white text-orange-600 px-4 py-2 rounded-xl hover:bg-orange-50 transition-all duration-200 font-medium shadow-sm"
                  >
                    <FileText size={18} />
                    Télécharger
                  </button>
                  <button
                    onClick={closePDFPreview}
                    className="text-white hover:bg-white/20 transition-all duration-200 p-2 rounded-xl"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden bg-gray-100">
                <PDFViewer width="100%" height="100%" showToolbar={false}>
                  <DevisPDFPreview devis={previewDevis} afficherTTC={afficherTTC} />
                </PDFViewer>
              </div>
            </div>
          </div>
        )}
        
        {selectedClient && (
          <ClientDevisStatsPopup
            client={selectedClient as any}
            onClose={() => setSelectedClient(null)}
            supabase={supabase}
          />
        )}
      </div>
    </div>
  );
}