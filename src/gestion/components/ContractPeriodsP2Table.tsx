import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Euro,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  X,
  Building2,
  Receipt,
  Hash,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  User,
  Download
} from 'lucide-react';
import { supabaseGes } from '../../lib/supagestion';
import { exportContractPeriodsToExcel } from '../../utils/exportContractPeriodsExcel';

interface ContractPeriodP2 {
  id: number;
  periode_debut: string;
  periode_fin: string;
  montant: number;
  statut: 'en_attente' | 'en_cours' | 'facture' | 'payee' | 'annulee';
  payment_mode?: string;
  facture_id: number;
  contract_id: number;
  created_at: string;
  updated_at: string;
  // Relations
  contract: {
    id: number;
    nom: string;
    description?: string;
    chantier_code: string;
    statut: string;
    date_debut: string;
    date_fin?: string;
    forfaitaire?: number;
    montant_periode?: number;
    facturation?: string;
    numero_commande?: string;
    ht_ttc: string;
    client: {
      id: number;
      client: string;
      ice?: string;
      numero_fournisseur?: string;
    };
    emetteur?: {
      id: number;
      nom: string;
      telephone?: string;
      email?: string;
    };
    contact?: {
      num_contact: number;
      nom: string;
      tel?: string;
      email?: string;
      adresse?: string;
    };
    chantier?: {
      code: string;
      chantier: string;
      type_devis?: {
        id: number;
        libelle: string;
        code: string;
      };
    };
  };
  facture: {
    id: number;
    numero_facture?: string;
    date_facture: string;
    date_echeance?: string;
    statut: string;
    methode_paiement?: string;
  };
  correctifs?: Array<{
    id: number;
    description: string;
    prix_unitaire: number;
    quantite: number;
    total: number;
    created_at: string;
  }>;
}

export default function  ContractPeriodsP2Table(){
  const [periods, setPeriods] = useState<ContractPeriodP2[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Refs pour le scroll horizontal
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const scrollBarRef = useRef<HTMLDivElement>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [tablePosition, setTablePosition] = useState({ left: 0, width: 0 });
  const [isTableVisible, setIsTableVisible] = useState(false);

  useEffect(() => {
    loadContractPeriodsP2();
    loadClientsList();
  }, [currentPage, itemsPerPage, searchTerm, statusFilter, clientFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchTerm(localSearchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [localSearchTerm]);

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const clientName = clientFilter ? 
        clientsList.find(c => c.id.toString() === clientFilter)?.client : 
        undefined;

      // Récupérer toutes les données filtrées (pas seulement la page actuelle)
      const allFilteredPeriods = await fetchAllFilteredPeriods();

      exportContractPeriodsToExcel(allFilteredPeriods, {
        filename: `periodes_contrats_P2_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Périodes P2',
        includeFilters: {
          searchTerm: searchTerm || undefined,
          filterClient: clientName || undefined,
          filterStatut: statusFilter || undefined,
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      setError('Erreur lors de l\'export Excel');
    } finally {
      setExportingExcel(false);
    }
  };

  const fetchAllFilteredPeriods = async () => {
    try {
      let query = supabaseGes
        .from('contract_periods')
        .select(`
          *,
          contract:contracts!inner (
            *,
            client:clients_devis!inner (
              id,
              client,
              ice,
              numero_fournisseur
            ),
            emetteur:emetteurs (
              id,
              nom,
              telephone,
              email
            ),
            contact:contacts (
              num_contact,
              nom,
              tel,
              email,
              adresse
            ),
            chantier:chantiers (
              code,
              chantier,
              type_devis:type_devis (
                id,
                libelle,
                code
              )
            )
          ),
          facture:factures!inner (
            *
          ),
          correctifs:contract_period_correctifs (
            id,
            description,
            prix_unitaire,
            quantite,
            total,
            created_at
          )
        `)
        .not('facture_id', 'is', null)
        .eq('contract.statut', 'actif');

      // Appliquer les mêmes filtres que la vue paginée
      if (searchTerm.trim()) {
        query = query.or(`contract.nom.ilike.%${searchTerm}%,contract.client.client.ilike.%${searchTerm}%,contract.chantier_code.ilike.%${searchTerm}%,contract.numero_commande.ilike.%${searchTerm}%,facture.numero_facture.ilike.%${searchTerm}%`);
      }

      if (statusFilter) {
        query = query.eq('statut', statusFilter);
      }

      if (clientFilter) {
        query = query.eq('contract.client_id', clientFilter);
      }

      const { data, error } = await query.order('periode_debut', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erreur lors de la récupération des données filtrées:', err);
      throw err;
    }
  };

  const loadClientsList = async () => {
    try {
      const { data, error } = await supabaseGes
        .from('clients_devis')
        .select('id, client')
        .order('client');

      if (error) throw error;
      setClientsList(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des clients:', err);
    }
  };

  const loadContractPeriodsP2 = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabaseGes
        .from('contract_periods')
        .select(`
          *,
          contract:contracts!inner (
            *,
            client:clients_devis!inner (
              id,
              client,
              ice,
              numero_fournisseur
            ),
            emetteur:emetteurs (
              id,
              nom,
              telephone,
              email
            ),
            contact:contacts (
              num_contact,
              nom,
              tel,
              email,
              adresse
            ),
            chantier:chantiers (
              code,
              chantier,
              type_devis:type_devis (
                id,
                libelle,
                code
              )
            )
          ),
          facture:factures!inner (
            *
          ),
          correctifs:contract_period_correctifs (
            id,
            description,
            prix_unitaire,
            quantite,
            total,
            created_at
          )
        `, { count: 'exact' })
        .not('facture_id', 'is', null)
        .eq('contract.statut', 'actif');

      // Filtres
      if (searchTerm.trim()) {
        query = query.or(`contract.nom.ilike.%${searchTerm}%,contract.client.client.ilike.%${searchTerm}%,contract.chantier_code.ilike.%${searchTerm}%,contract.numero_commande.ilike.%${searchTerm}%,facture.numero_facture.ilike.%${searchTerm}%`);
      }

      if (statusFilter) {
        query = query.eq('statut', statusFilter);
      }

      if (clientFilter) {
        query = query.eq('contract.client_id', clientFilter);
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, count, error: queryError } = await query
        .order('periode_debut', { ascending: false })
        .range(from, to);

      if (queryError) {
        throw queryError;
      }

      setPeriods(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Erreur lors du chargement des périodes P2:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Calcul des métriques (année actuelle uniquement)
  const metrics = useMemo(() => {
    if (!periods || periods.length === 0) {
      return {
        totalValue: 0,
        averageValue: 0,
        statusCounts: {},
        clientsCount: 0,
        monthlyTrend: 0,
        correctifsTotal: 0,
        facturesEnAttente: 0,
        facturesPayees: 0,
        contractsActifs: 0
      };
    }

    // Filtrer les périodes de l'année actuelle
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);
    
    const currentYearPeriods = periods.filter(p => {
      const periodDate = new Date(p.created_at);
      return periodDate >= startOfYear && periodDate < endOfYear;
    });

    // Calcul de la valeur totale (année actuelle)
    const totalValue = currentYearPeriods.reduce((sum, p) => sum + p.montant, 0);
    const averageValue = currentYearPeriods.length > 0 ? totalValue / currentYearPeriods.length : 0;

    // Comptage par statut (année actuelle)
    const statusCounts = currentYearPeriods.reduce((counts, period) => {
      counts[period.statut] = (counts[period.statut] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Nombre de clients uniques (année actuelle)
    const uniqueClients = new Set(currentYearPeriods.map(p => p.contract.client.id));
    const clientsCount = uniqueClients.size;

    // Nombre de contrats uniques (année actuelle)
    const uniqueContracts = new Set(currentYearPeriods.map(p => p.contract.id));
    const contractsActifs = uniqueContracts.size;

    // Calcul des correctifs (année actuelle)
    const correctifsTotal = currentYearPeriods.reduce((sum, p) => {
      return sum + (p.correctifs?.reduce((cSum, c) => cSum + c.total, 0) || 0);
    }, 0);

    // Comptage des factures (année actuelle)
    const facturesEnAttente = currentYearPeriods.filter(p => p.facture.statut === 'envoyee' || p.facture.statut === 'brouillon').length;
    const facturesPayees = currentYearPeriods.filter(p => p.facture.statut === 'payee').length;

    // Tendance mensuelle (année actuelle)
    const currentMonth = new Date().getMonth();
    
    const currentMonthPeriods = currentYearPeriods.filter(p => {
      const periodDate = new Date(p.periode_debut);
      return periodDate.getMonth() === currentMonth && periodDate.getFullYear() === currentYear;
    });

    const previousMonthPeriods = currentYearPeriods.filter(p => {
      const periodDate = new Date(p.periode_debut);
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return periodDate.getMonth() === prevMonth && periodDate.getFullYear() === prevYear;
    });

    const monthlyTrend = previousMonthPeriods.length > 0 
      ? ((currentMonthPeriods.length - previousMonthPeriods.length) / previousMonthPeriods.length) * 100
      : currentMonthPeriods.length > 0 ? 100 : 0;

    return {
      totalValue,
      averageValue,
      statusCounts,
      clientsCount,
      monthlyTrend,
      correctifsTotal,
      facturesEnAttente,
      facturesPayees,
      contractsActifs
    };
  }, [periods]);

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
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        icon: Clock
      },
      'en_cours': {
        label: 'En cours',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: Clock
      },
      'facture': {
        label: 'Facturé',
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        icon: Receipt
      },
      'payee': {
        label: 'Payée',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: CheckCircle2
      },
      'annulee': {
        label: 'Annulée',
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: XCircle
      }
    };
    return configs[statut as keyof typeof configs] || configs.en_attente;
  };

  const getFactureStatusConfig = (statut: string) => {
    const configs = {
      'brouillon': {
        label: 'Brouillon',
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        border: 'border-slate-200'
      },
      'envoyee': {
        label: 'Envoyée',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200'
      },
      'payee': {
        label: 'Payée',
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200'
      },
      'annulee': {
        label: 'Annulée',
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200'
      }
    };
    return configs[statut as keyof typeof configs] || configs.brouillon;
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      setUpdatingStatus(id);
      
      const { error } = await supabaseGes
        .from('contract_periods')
        .update({ statut: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Recharger les données
      await loadContractPeriodsP2();
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      setError('Erreur lors de la mise à jour du statut');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const resetFilters = () => {
    setLocalSearchTerm('');
    setSearchTerm('');
    setStatusFilter('');
    setClientFilter('');
    setCurrentPage(1);
  };

  const activeFiltersCount = [
    searchTerm.trim() !== '',
    statusFilter !== '',
    clientFilter !== ''
  ].filter(Boolean).length;

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(currentPage * itemsPerPage, totalCount);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Gestion du scroll horizontal
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
        setIsTableVisible(rect.top < window.innerHeight && rect.bottom > 0);
      }
    };

    updateScrollDimensions();
    window.addEventListener('resize', updateScrollDimensions);
    window.addEventListener('scroll', updateScrollDimensions);
    
    return () => {
      window.removeEventListener('resize', updateScrollDimensions);
      window.removeEventListener('scroll', updateScrollDimensions);
    };
  }, [periods]);

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
      
      const scrollRatio = maxThumbPosition > 0 ? deltaX / maxThumbPosition : 0;
      const newScrollLeft = startScrollLeft + (scrollRatio * maxTableScroll);
      
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

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (loading && periods.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full px-4 md:px-6">
          <div className="space-y-4">
            <div className="h-32 bg-gradient-to-r from-orange-100 to-orange-200 rounded-xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="h-96 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full px-4 md:px-6 py-8">
          <div className="bg-red-50 border-l-4 border-red-400 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur de chargement</h3>
                <p className="text-red-700 mb-4">{error}</p>
                <button
                  onClick={loadContractPeriodsP2}
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-4 md:px-6 py-8">
        {/* Header avec gradient */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-[#f15c00] to-[#ee6b1a] rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Gestion des travaux P2</h1>
                <p className="text-orange-100">
                  Périodes de contrats actives avec factures créées - {totalCount > 0 ? `${totalCount} périodes au total` : 'Aucune période'}
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <Receipt className="w-8 h-8" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Métriques Dashboard */}
        {!loading && periods.length > 0 && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {/* Valeur totale */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Revenus 2026</p>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-green-600 break-words">
                  {formatCurrency(metrics.totalValue)}
                </p>
              </div>
            </div>

            {/* Valeur moyenne */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Moyenne 2026</p>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-blue-600 break-words">
                  {formatCurrency(metrics.averageValue)}
                </p>
              </div>
            </div>

            {/* Nombre de clients */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Clients 2026</p>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-purple-600">
                  {metrics.clientsCount}
                </p>
                <p className="text-xs text-gray-500">{metrics.contractsActifs} contrats</p>
              </div>
            </div>

            {/* Correctifs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Correctifs 2026</p>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-orange-600 break-words">
                  {formatCurrency(metrics.correctifsTotal)}
                </p>
              </div>
            </div>

            {/* Factures */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Factures 2026</p>
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Receipt className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-indigo-600">
                  {metrics.facturesPayees}
                </p>
                <p className="text-xs text-gray-500">{metrics.facturesEnAttente} en attente</p>
              </div>
            </div>
          </div>
        )}

        {/* Répartition par statut */}
        {!loading && periods.length > 0 && Object.keys(metrics.statusCounts).length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Répartition par Statut (2026)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(metrics.statusCounts).map(([statut, count]) => {
                  const badge = getStatusConfig(statut);
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

        {/* Barre de recherche et filtres */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Barre de recherche */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher par contrat, client, chantier, commande, facture..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              />
              {localSearchTerm && (
                <button
                  onClick={() => setLocalSearchTerm('')}
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
                disabled={periods.length === 0 || exportingExcel}
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
                    ? 'bg-[#f15c00] text-white shadow-lg' 
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

              <button
                onClick={loadContractPeriodsP2}
                className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-medium"
              >
                <RefreshCw size={16} />
                Actualiser
              </button>
            </div>
          </div>

          {/* Panneau de filtres */}
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
                    className="flex items-center gap-2 text-sm text-[#f15c00] hover:text-[#ee6b1a] font-medium bg-white px-3 py-1.5 rounded-lg border border-orange-200 hover:border-orange-300 transition-all"
                  >
                    <RefreshCw size={14} />
                    Réinitialiser
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Filtre Statut */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Statut
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f15c00] focus:border-transparent bg-white transition-all"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="en_attente">En attente</option>
                    <option value="en_cours">En cours</option>
                    <option value="facture">Facturé</option>
                    <option value="payee">Payée</option>
                    <option value="annulee">Annulée</option>
                  </select>
                </div>

                {/* Filtre Client */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Building2 className="w-4 h-4" />
                    Client
                  </label>
                  <select
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f15c00] focus:border-transparent bg-white transition-all"
                  >
                    <option value="">Tous les clients</option>
                    {clientsList.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.client}
                      </option>
                    ))}
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f15c00] focus:border-transparent bg-white transition-all"
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

          {/* Badges des filtres actifs */}
          {activeFiltersCount > 0 && !showFilters && (
            <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
              <div className="flex flex-wrap gap-3">
                <span className="text-sm font-medium text-orange-800 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtres actifs:
                </span>
                {clientFilter && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-orange-700 rounded-lg text-sm font-medium border border-orange-200 shadow-sm">
                    <Building2 className="w-3 h-3" />
                    {clientsList.find(c => c.id.toString() === clientFilter)?.client}
                    <button
                      onClick={() => setClientFilter('')}
                      className="hover:bg-orange-100 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {statusFilter && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-orange-700 rounded-lg text-sm font-medium border border-orange-200 shadow-sm">
                    <CheckCircle2 className="w-3 h-3" />
                    {statusFilter.replace('_', ' ')}
                    <button
                      onClick={() => setStatusFilter('')}
                      className="hover:bg-orange-100 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Indicateur de recherche active */}
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
                    setSearchTerm('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm bg-white px-3 py-1 rounded-lg border border-blue-200 hover:border-blue-300 transition-all"
                >
                  Effacer
                </button>
              </div>
            </div>
          )}

          {/* Compteur de résultats */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{totalCount}</span> période{totalCount > 1 ? 's' : ''} trouvée{totalCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Table */}
        <div 
          ref={tableWrapperRef}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          {periods.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-4 bg-slate-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Receipt className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {searchTerm || statusFilter ? 'Aucune période trouvée' : 'Aucune période P2'}
              </h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                {searchTerm || statusFilter 
                  ? 'Aucune période ne correspond à vos critères de recherche.'
                  : 'Aucune période de contrat actif avec facture créée trouvée.'
                }
              </p>
            </div>
          ) : (
            <div 
              ref={tableContainerRef}
              className="overflow-x-auto"
              onScroll={handleTableScroll}
            >
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-[#f15c00] to-[#ee6b1a] text-white">
                    <th className="px-6 py-4 text-left text-sm font-semibold">Statut</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Contrat</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Client</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Code Chantier</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Période</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Montant</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Facture</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Correctifs</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Contact</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Émetteur</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Commande</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {periods.map((period, index) => {
                    const statusConfig = getStatusConfig(period.statut);
                    const factureStatusConfig = getFactureStatusConfig(period.facture.statut);
                    const correctifsTotal = period.correctifs?.reduce((sum, c) => sum + c.total, 0) || 0;

                    return (
                      <tr key={period.id} className={`transition-all duration-200 hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        {/* Statut */}
                        <td className="px-6 py-4">
                          {updatingStatus === period.id ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span className="text-xs text-gray-600">Mise à jour...</span>
                            </div>
                          ) : (
                            <select
                              value={period.statut}
                              onChange={(e) => handleStatusChange(period.id, e.target.value)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-[#f15c00] transition-all cursor-pointer hover:shadow-md ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                            >
                              <option value="en_attente">En attente</option>
                              <option value="en_cours">En cours</option>
                              <option value="facture">Facturé</option>
                              <option value="payee">Payée</option>
                              <option value="annulee">Annulée</option>
                            </select>
                          )}
                        </td>

                        {/* Contrat */}
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="p-2 bg-slate-100 rounded-lg mr-3">
                              <Building2 className="text-slate-600" size={16} />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {period.contract.nom}
                              </div>
                              {period.contract.description && (
                                <div className="text-xs text-slate-500 max-w-xs truncate" title={period.contract.description}>
                                  {period.contract.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Client */}
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="p-2 bg-green-50 rounded-lg mr-3">
                              <Users className="text-green-600" size={16} />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {period.contract.client.client}
                              </div>
                              {period.contract.client.ice && (
                                <div className="text-xs text-slate-500">
                                  ICE: {period.contract.client.ice}
                                </div>
                              )}
                              {period.contract.client.numero_fournisseur && (
                                <div className="text-xs text-slate-500">
                                  N° Fourn: {period.contract.client.numero_fournisseur}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Code Chantier */}
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="p-2 bg-blue-50 rounded-lg mr-3">
                              <Hash className="text-blue-600" size={16} />
                            </div>
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-mono">
                                {period.contract.chantier_code}
                              </span>
                              {period.contract.chantier?.chantier && (
                                <div className="text-xs text-slate-500 mt-1 max-w-xs truncate" title={period.contract.chantier.chantier}>
                                  {period.contract.chantier.chantier}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-6 py-4">
                          {period.contract.chantier?.type_devis ? (
                            <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-medium" title={period.contract.chantier.type_devis.libelle}>
                              {period.contract.chantier.type_devis.code}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>

                        {/* Période */}
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="p-2 bg-blue-50 rounded-lg mr-3">
                              <Calendar className="text-blue-600" size={16} />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                Du {formatDate(period.periode_debut)}
                              </div>
                              <div className="text-sm text-slate-500">
                                Au {formatDate(period.periode_fin)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Montant */}
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="p-2 bg-green-50 rounded-lg mr-3">
                              <Euro className="text-green-600" size={16} />
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-green-700">
                                {formatCurrency(period.montant)}
                              </span>
                              <div className="text-xs text-slate-500">
                                {period.contract.ht_ttc}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Facture */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-lg border ${factureStatusConfig.bg} ${factureStatusConfig.text} ${factureStatusConfig.border}`}>
                              {factureStatusConfig.label}
                            </span>
                            {period.facture.numero_facture && (
                              <div className="text-xs text-slate-500 font-mono">
                                N° {period.facture.numero_facture}
                              </div>
                            )}
                            <div className="text-xs text-slate-500">
                              Créée le {formatDate(period.facture.date_facture)}
                            </div>
                            {period.facture.date_echeance && (
                              <div className="text-xs text-slate-500">
                                Échéance: {formatDate(period.facture.date_echeance)}
                              </div>
                            )}
                            {period.facture.methode_paiement && (
                              <div className="text-xs text-slate-500">
                                {period.facture.methode_paiement}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Correctifs */}
                        <td className="px-6 py-4">
                          {correctifsTotal > 0 ? (
                            <div className="flex items-center">
                              <div className="p-2 bg-orange-50 rounded-lg mr-3">
                                <TrendingUp className="text-orange-600" size={16} />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-orange-600">
                                  {formatCurrency(correctifsTotal)}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {period.correctifs?.length} correctif{(period.correctifs?.length || 0) > 1 ? 's' : ''}
                                </div>
                                {period.correctifs && period.correctifs.length > 0 && (
                                  <div className="text-xs text-slate-400">
                                    Dernier: {formatDate(period.correctifs[0].created_at)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Aucun</span>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="px-6 py-4">
                          {period.contract.contact ? (
                            <div className="flex items-center">
                              <div className="p-2 bg-indigo-50 rounded-lg mr-3">
                                <User className="text-indigo-600" size={16} />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-900">
                                  {period.contract.contact.nom}
                                </div>
                                {period.contract.contact.tel && (
                                  <div className="text-xs text-slate-500">
                                    {period.contract.contact.tel}
                                  </div>
                                )}
                                {period.contract.contact.email && (
                                  <div className="text-xs text-slate-500">
                                    {period.contract.contact.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>

                        {/* Émetteur */}
                        <td className="px-6 py-4">
                          {period.contract.emetteur ? (
                            <div className="flex items-center">
                              <div className="p-2 bg-yellow-50 rounded-lg mr-3">
                                <User className="text-yellow-600" size={16} />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-900">
                                  {period.contract.emetteur.nom}
                                </div>
                                {period.contract.emetteur.telephone && (
                                  <div className="text-xs text-slate-500">
                                    {period.contract.emetteur.telephone}
                                  </div>
                                )}
                                {period.contract.emetteur.email && (
                                  <div className="text-xs text-slate-500">
                                    {period.contract.emetteur.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>

                        {/* Commande */}
                        <td className="px-6 py-4">
                          {period.contract.numero_commande ? (
                            <div className="flex items-center">
                              <div className="p-2 bg-teal-50 rounded-lg mr-3">
                                <Receipt className="text-teal-600" size={16} />
                              </div>
                              <span className="text-sm font-semibold text-slate-900 font-mono">
                                {period.contract.numero_commande}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Barre de scroll horizontal fixe */}
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
                className="scroll-thumb absolute top-0 h-full bg-gradient-to-r from-[#f15c00] to-[#ee6b1a] rounded-full cursor-grab active:cursor-grabbing transition-colors duration-150 hover:from-orange-500 hover:to-orange-600 shadow-sm"
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

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-16">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  <span className="font-medium">
                    Affichage de <span className="text-[#f15c00] font-semibold">{startIndex + 1}</span> à{' '}
                    <span className="text-[#f15c00] font-semibold">{Math.min(endIndex, totalCount)}</span> sur{' '}
                    <span className="text-[#f15c00] font-semibold">{totalCount}</span> périodes
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
                              ? "bg-gradient-to-r from-[#f15c00] to-[#ee6b1a] text-white shadow-lg"
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
      </div>
    </div>
  );
};

