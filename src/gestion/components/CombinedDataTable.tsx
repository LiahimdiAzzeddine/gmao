import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Euro,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  X,
  Building2,
  Hash,
  CheckCircle2,
  Loader2,
  DollarSign,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText
} from 'lucide-react';
import { supabaseGes } from '../../lib/supagestion';
import { supabase } from '../../lib/supabase';
import { exportCombinedDataToExcel } from '../../utils/exportCombinedExcel';
import { calculateTotalHT, calculateTotalTTC } from '../../utils/gestionMethode';

interface CombinedDataItem {
  id: string;
  type: 'P2' | 'P5';
  // Champs communs
  client_nom: string;
  client_ice?: string;
  montant: number;
  statut: string;
  date_creation: string;
  chantier_code?: string;
  facture_numero?: string;
  date_facture?: string;
  date_echeance?: string;
  // Champs spécifiques P2
  periode_debut?: string;
  periode_fin?: string;
  correctifs_total?: number;
  // Champs spécifiques P5
  num_devis?: string;
  designation?: string;
  date_devis?: string;
  date_paye?: string;
  montant_ttc?: number;
  // Données complètes pour l'export
  raw_data: any;
}

export default function CombinedDataTable() {
  const [data, setData] = useState<CombinedDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [exportingExcel, setExportingExcel] = useState(false);

  useEffect(() => {
    loadCombinedData();
    loadClientsList();
  }, [currentPage, itemsPerPage, searchTerm, typeFilter, statusFilter, clientFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchTerm(localSearchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [localSearchTerm]);

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

  const loadCombinedData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les données P2
      let p2Query = supabaseGes
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
          facture:factures!inner (*),
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

      // Charger les données P5
      let p5Query = supabase
        .from('devis')
        .select(`
          *,
          clients_devis (
            id,
            client,
            ice
          ),
          chantiers (
            code,
            chantier
          ),
          contact:contacts (
            num_contact,
            nom,
            tel
          ),
          emetteurs (
            id,
            nom
          ),
          monetaire (
            id,
            unite,
            symbol
          ),
          type_devis (
            id,
            libelle,
            code
          ),
          domaines_activite (
            id,
            libelle
          ),
          factures (
            id,
            numero_facture,
            date_facture,
            date_echeance,
            statut
          ),
          devis_lignes (
            id,
            materiel,
            quantite,
            prix,
            ordre,
            type,
            unite
          )
        `);

      // Appliquer les filtres
      if (searchTerm.trim()) {
        p2Query = p2Query.or(`contract.nom.ilike.%${searchTerm}%,contract.client.client.ilike.%${searchTerm}%,contract.chantier_code.ilike.%${searchTerm}%,contract.numero_commande.ilike.%${searchTerm}%,facture.numero_facture.ilike.%${searchTerm}%`);
        p5Query = p5Query.or(`num_devis.ilike.%${searchTerm}%,clients_devis.client.ilike.%${searchTerm}%,designation.ilike.%${searchTerm}%,chantiers.code.ilike.%${searchTerm}%`);
      }

      if (statusFilter) {
        p2Query = p2Query.eq('statut', statusFilter);
        p5Query = p5Query.eq('statut', statusFilter);
      }

      if (clientFilter) {
        p2Query = p2Query.eq('contract.client_id', clientFilter);
        p5Query = p5Query.eq('client_devis_id', clientFilter);
      }

      // Exécuter les requêtes
      const [p2Result, p5Result] = await Promise.all([
        p2Query.order('periode_debut', { ascending: false }),
        p5Query.order('date_devis', { ascending: false })
      ]);

      if (p2Result.error) throw p2Result.error;
      if (p5Result.error) throw p5Result.error;

      // Transformer les données P2
      const p2Data: CombinedDataItem[] = (p2Result.data || []).map(period => ({
        id: `P2-${period.id}`,
        type: 'P2' as const,
        client_nom: period.contract.client.client,
        client_ice: period.contract.client.ice,
        montant: period.montant,
        statut: period.statut,
        date_creation: period.created_at,
        chantier_code: period.contract.chantier_code,
        periode_debut: period.periode_debut,
        periode_fin: period.periode_fin,
        facture_numero: period.facture.numero_facture,
        date_facture: period.facture.date_facture,
        date_echeance: period.facture.date_echeance,
        correctifs_total: period.correctifs?.reduce((sum: number, c: any) => sum + c.total, 0) || 0,
        raw_data: period
      }));

      // Transformer les données P5
      const p5Data: CombinedDataItem[] = (p5Result.data || []).map(devis => {
        const devisForCalc = {
          lignes: (devis.devis_lignes || []).map((l: any) => ({
            type: l.type || 'materiel',
            quantite: l.quantite,
            prix: l.prix,
          })),
          kg_mo: devis.kg_mo,
          kg_mat: devis.kg_mat,
        };
        const totalHT = calculateTotalHT(devisForCalc as any);
        const totalTTC = calculateTotalTTC(totalHT);
        const factureNumero = devis.factures && devis.factures.length > 0 ? devis.factures[0].numero_facture : '';
        const dateFacture = devis.factures && devis.factures.length > 0 ? devis.factures[0].date_facture : '';
        const dateEcheance = devis.factures && devis.factures.length > 0 ? devis.factures[0].date_echeance : '';
        
        return {
          id: `P5-${devis.id}`,
          type: 'P5' as const,
          client_nom: devis.clients_devis?.client || '',
          client_ice: devis.clients_devis?.ice,
          montant: totalHT,
          montant_ttc: totalTTC,
          statut: devis.statut,
          date_creation: devis.date_devis || devis.created_at,
          chantier_code: devis.chantiers?.code,
          num_devis: devis.num_devis,
          designation: devis.designation,
          date_devis: devis.date_devis,
          date_paye: devis.date_paye,
          facture_numero: factureNumero,
          date_facture: dateFacture,
          date_echeance: dateEcheance,
          raw_data: devis
        };
      });

      // Combiner et filtrer par type si nécessaire
      let combinedData = [...p2Data, ...p5Data];
      
      if (typeFilter) {
        combinedData = combinedData.filter(item => item.type === typeFilter);
      }

      // Trier par date de création (plus récent en premier)
      combinedData.sort((a, b) => new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime());

      // Pagination
      const totalItems = combinedData.length;
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedData = combinedData.slice(startIndex, startIndex + itemsPerPage);

      setData(paginatedData);
      setTotalCount(totalItems);
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Calcul des métriques (année actuelle uniquement)
  const metrics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalValue: 0,
        p2Count: 0,
        p5Count: 0,
        clientsCount: 0,
        p2Value: 0,
        p5Value: 0
      };
    }

    // Filtrer les données de l'année actuelle
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);
    
    const currentYearData = data.filter(item => {
      const itemDate = new Date(item.date_creation);
      return itemDate >= startOfYear && itemDate < endOfYear;
    });

    const p2Items = currentYearData.filter(item => item.type === 'P2');
    const p5Items = currentYearData.filter(item => item.type === 'P5');
    
    const totalValue = currentYearData.reduce((sum, item) => sum + item.montant, 0);
    const p2Value = p2Items.reduce((sum, item) => sum + item.montant, 0);
    const p5Value = p5Items.reduce((sum, item) => sum + item.montant, 0);
    
    const uniqueClients = new Set(currentYearData.map(item => item.client_nom));

    return {
      totalValue,
      p2Count: p2Items.length,
      p5Count: p5Items.length,
      clientsCount: uniqueClients.size,
      p2Value,
      p5Value
    };
  }, [data]);

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      // Récupérer toutes les données sans pagination
      const allData = await fetchAllFilteredData();
      
      const clientName = clientFilter ? 
        clientsList.find(c => c.id.toString() === clientFilter)?.client : 
        undefined;

      exportCombinedDataToExcel(allData, {
        filename: `export_combine_P2_P5_${new Date().toISOString().split('T')[0]}.xlsx`,
        includeFilters: {
          searchTerm: searchTerm || undefined,
          filterClient: clientName || undefined,
          filterStatut: statusFilter || undefined,
          filterType: typeFilter || undefined,
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      setError('Erreur lors de l\'export Excel');
    } finally {
      setExportingExcel(false);
    }
  };

  const fetchAllFilteredData = async () => {
    try {
      // Charger les données P2
      let p2Query = supabaseGes
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
          facture:factures!inner (*),
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

      // Charger les données P5
      let p5Query = supabase
        .from('devis')
        .select(`
          *,
          clients_devis (
            id,
            client,
            ice
          ),
          chantiers (
            code,
            chantier
          ),
          contact:contacts (
            num_contact,
            nom,
            tel
          ),
          emetteurs (
            id,
            nom
          ),
          monetaire (
            id,
            unite,
            symbol
          ),
          type_devis (
            id,
            libelle,
            code
          ),
          domaines_activite (
            id,
            libelle
          ),
          factures (
            id,
            numero_facture,
            date_facture,
            date_echeance,
            statut
          ),
          devis_lignes (
            id,
            materiel,
            quantite,
            prix,
            ordre,
            type,
            unite
          )
        `);

      // Appliquer les filtres
      if (searchTerm.trim()) {
        p2Query = p2Query.or(`contract.nom.ilike.%${searchTerm}%,contract.client.client.ilike.%${searchTerm}%,contract.chantier_code.ilike.%${searchTerm}%,contract.numero_commande.ilike.%${searchTerm}%,facture.numero_facture.ilike.%${searchTerm}%`);
        p5Query = p5Query.or(`num_devis.ilike.%${searchTerm}%,clients_devis.client.ilike.%${searchTerm}%,designation.ilike.%${searchTerm}%,chantiers.code.ilike.%${searchTerm}%`);
      }

      if (statusFilter) {
        p2Query = p2Query.eq('statut', statusFilter);
        p5Query = p5Query.eq('statut', statusFilter);
      }

      if (clientFilter) {
        p2Query = p2Query.eq('contract.client_id', clientFilter);
        p5Query = p5Query.eq('client_devis_id', clientFilter);
      }

      // Exécuter les requêtes
      const [p2Result, p5Result] = await Promise.all([
        p2Query.order('periode_debut', { ascending: false }),
        p5Query.order('date_devis', { ascending: false })
      ]);

      if (p2Result.error) throw p2Result.error;
      if (p5Result.error) throw p5Result.error;

      // Transformer les données P2
      const p2Data: CombinedDataItem[] = (p2Result.data || []).map(period => ({
        id: `P2-${period.id}`,
        type: 'P2' as const,
        client_nom: period.contract.client.client,
        client_ice: period.contract.client.ice,
        montant: period.montant,
        statut: period.statut,
        date_creation: period.created_at,
        chantier_code: period.contract.chantier_code,
        periode_debut: period.periode_debut,
        periode_fin: period.periode_fin,
        facture_numero: period.facture.numero_facture,
        date_facture: period.facture.date_facture,
        date_echeance: period.facture.date_echeance,
        correctifs_total: period.correctifs?.reduce((sum: number, c: any) => sum + c.total, 0) || 0,
        raw_data: period
      }));

      // Transformer les données P5
      const p5Data: CombinedDataItem[] = (p5Result.data || []).map(devis => {
        const devisForCalc = {
          lignes: (devis.devis_lignes || []).map((l: any) => ({
            type: l.type || 'materiel',
            quantite: l.quantite,
            prix: l.prix,
          })),
          kg_mo: devis.kg_mo,
          kg_mat: devis.kg_mat,
        };
        const totalHT = calculateTotalHT(devisForCalc as any);
        const totalTTC = calculateTotalTTC(totalHT);
        const factureNumero = devis.factures && devis.factures.length > 0 ? devis.factures[0].numero_facture : '';
        const dateFacture = devis.factures && devis.factures.length > 0 ? devis.factures[0].date_facture : '';
        const dateEcheance = devis.factures && devis.factures.length > 0 ? devis.factures[0].date_echeance : '';
        
        return {
          id: `P5-${devis.id}`,
          type: 'P5' as const,
          client_nom: devis.clients_devis?.client || '',
          client_ice: devis.clients_devis?.ice,
          montant: totalHT,
          montant_ttc: totalTTC,
          statut: devis.statut,
          date_creation: devis.date_devis || devis.created_at,
          chantier_code: devis.chantiers?.code,
          num_devis: devis.num_devis,
          designation: devis.designation,
          date_devis: devis.date_devis,
          date_paye: devis.date_paye,
          facture_numero: factureNumero,
          date_facture: dateFacture,
          date_echeance: dateEcheance,
          raw_data: devis
        };
      });

      // Combiner et filtrer par type si nécessaire
      let combinedData = [...p2Data, ...p5Data];
      
      if (typeFilter) {
        combinedData = combinedData.filter(item => item.type === typeFilter);
      }

      // Trier par date de création (plus récent en premier)
      combinedData.sort((a, b) => new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime());

      return combinedData;
    } catch (err) {
      console.error('Erreur lors du chargement des données complètes:', err);
      return [];
    }
  };

  const resetFilters = () => {
    setLocalSearchTerm('');
    setSearchTerm('');
    setTypeFilter('');
    setStatusFilter('');
    setClientFilter('');
    setCurrentPage(1);
  };

  const activeFiltersCount = [
    searchTerm.trim() !== '',
    typeFilter !== '',
    statusFilter !== '',
    clientFilter !== ''
  ].filter(Boolean).length;

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

  const getStatusConfig = (statut: string, type: 'P2' | 'P5') => {
    if (type === 'P2') {
      const configs = {
        'en_attente': { label: 'En attente', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        'payee': { label: 'Payée', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
        'annulee': { label: 'Annulée', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
      };
      return configs[statut as keyof typeof configs] || configs.en_attente;
    } else {
      const configs = {
        'en_attente': { label: 'En attente', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        'en_cours': { label: 'En cours', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
        'facturé': { label: 'Facturé', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
        'annule': { label: 'Annulé', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
        'payé': { label: 'Payé', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
        'terminé': { label: 'Terminé', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
        'accepte': { label: 'Accepté', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' }
      };
      return configs[statut as keyof typeof configs] || configs.en_attente;
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(currentPage * itemsPerPage, totalCount);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (loading && data.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full px-4 md:px-6">
          <div className="space-y-4">
            <div className="h-32 bg-gradient-to-r from-purple-100 to-indigo-200 rounded-xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
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
                  onClick={loadCombinedData}
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
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Données Combinées P2 & P5</h1>
                <p className="text-purple-100">
                  Vue unifiée des périodes de contrats (P2) et devis (P5) - {totalCount > 0 ? `${totalCount} éléments au total` : 'Aucun élément'}
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <BarChart3 className="w-8 h-8" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Métriques Dashboard */}
        {!loading && data.length > 0 && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Valeur totale */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Valeur Totale 2026</p>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-green-600 break-words">
                  {formatCurrency(metrics.totalValue)}
                </p>
              </div>
            </div>

            {/* Périodes P2 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Périodes P2 2026</p>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-orange-600">
                  {metrics.p2Count}
                </p>
                <p className="text-xs text-gray-500">{formatCurrency(metrics.p2Value)}</p>
              </div>
            </div>

            {/* Devis P5 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Devis P5 2026</p>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-blue-600">
                  {metrics.p5Count}
                </p>
                <p className="text-xs text-gray-500">{formatCurrency(metrics.p5Value)}</p>
              </div>
            </div>

            {/* Clients */}
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
              </div>
            </div>

            {/* Export */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Export Excel</p>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Download className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <button
                  onClick={handleExportExcel}
                  disabled={exportingExcel || data.length === 0}
                  className="text-sm font-bold text-green-600 hover:text-green-700 disabled:text-gray-400 text-left"
                >
                  {exportingExcel ? 'Export...' : 'Télécharger'}
                </button>
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
                placeholder="Rechercher par client, contrat, devis, chantier..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
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
                disabled={data.length === 0 || exportingExcel}
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
                    ? 'bg-purple-500 text-white shadow-lg' 
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
                onClick={loadCombinedData}
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
                    className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium bg-white px-3 py-1.5 rounded-lg border border-purple-200 hover:border-purple-300 transition-all"
                  >
                    <RefreshCw size={14} />
                    Réinitialiser
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Filtre Type */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FileText className="w-4 h-4" />
                    Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all"
                  >
                    <option value="">Tous les types</option>
                    <option value="P2">P2 - Périodes</option>
                    <option value="P5">P5 - Devis</option>
                  </select>
                </div>

                {/* Filtre Statut */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Statut
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="en_attente">En attente</option>
                    <option value="en_cours">En cours</option>
                    <option value="accepte">Accepté</option>
                    <option value="facturé">Facturé</option>
                    <option value="payee">Payée</option>
                    <option value="payé">Payé</option>
                    <option value="terminé">Terminé</option>
                    <option value="annule">Annulé</option>
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all"
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all"
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
            <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex flex-wrap gap-3">
                <span className="text-sm font-medium text-purple-800 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtres actifs:
                </span>
                {typeFilter && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-purple-700 rounded-lg text-sm font-medium border border-purple-200 shadow-sm">
                    <FileText className="w-3 h-3" />
                    {typeFilter}
                    <button
                      onClick={() => setTypeFilter('')}
                      className="hover:bg-purple-100 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {clientFilter && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-purple-700 rounded-lg text-sm font-medium border border-purple-200 shadow-sm">
                    <Building2 className="w-3 h-3" />
                    {clientsList.find(c => c.id.toString() === clientFilter)?.client}
                    <button
                      onClick={() => setClientFilter('')}
                      className="hover:bg-purple-100 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {statusFilter && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-purple-700 rounded-lg text-sm font-medium border border-purple-200 shadow-sm">
                    <CheckCircle2 className="w-3 h-3" />
                    {statusFilter.replace('_', ' ')}
                    <button
                      onClick={() => setStatusFilter('')}
                      className="hover:bg-purple-100 rounded-full p-0.5 transition-colors"
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
              <span className="font-semibold text-slate-900">{totalCount}</span> élément{totalCount > 1 ? 's' : ''} trouvé{totalCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {data.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-4 bg-slate-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <BarChart3 className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {searchTerm || typeFilter || statusFilter || clientFilter ? 'Aucun élément trouvé' : 'Aucune donnée'}
              </h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                {searchTerm || typeFilter || statusFilter || clientFilter
                  ? 'Aucun élément ne correspond à vos critères de recherche.'
                  : 'Aucune donnée P2 ou P5 trouvée.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                    <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Référence</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Client</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Chantier</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Montant</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Statut</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((item, index) => {
                    const statusConfig = getStatusConfig(item.statut, item.type);

                    return (
                      <tr key={item.id} className={`transition-all duration-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        {/* Type */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-lg ${
                            item.type === 'P2' 
                              ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {item.type}
                          </span>
                        </td>

                        {/* Référence */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-slate-900">
                            {item.type === 'P2' ? `Période ${item.id.split('-')[1]}` : item.num_devis}
                          </div>
                          {item.type === 'P5' && item.designation && (
                            <div className="text-xs text-slate-500 max-w-xs truncate" title={item.designation}>
                              {item.designation}
                            </div>
                          )}
                        </td>

                        {/* Client */}
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="p-2 bg-green-50 rounded-lg mr-3">
                              <Users className="text-green-600" size={16} />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {item.client_nom}
                              </div>
                              {item.client_ice && (
                                <div className="text-xs text-slate-500">
                                  ICE: {item.client_ice}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Chantier */}
                        <td className="px-6 py-4">
                          {item.chantier_code ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-mono">
                              <Hash className="w-3 h-3" />
                              {item.chantier_code}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>

                        {/* Montant */}
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="p-2 bg-green-50 rounded-lg mr-3">
                              <Euro className="text-green-600" size={16} />
                            </div>
                            <span className="text-sm font-semibold text-green-700">
                              {formatCurrency(item.montant)}
                            </span>
                          </div>
                        </td>

                        {/* Statut */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-lg border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                            {statusConfig.label}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="p-2 bg-blue-50 rounded-lg mr-3">
                              <Calendar className="text-blue-600" size={16} />
                            </div>
                            <div className="text-sm text-slate-900">
                              {formatDate(item.date_creation)}
                            </div>
                          </div>
                        </td>

                        {/* Détails */}
                        <td className="px-6 py-4">
                          {item.type === 'P2' ? (
                            <div className="space-y-1">
                              {item.periode_debut && item.periode_fin && (
                                <div className="text-xs text-slate-600">
                                  {formatDate(item.periode_debut)} - {formatDate(item.periode_fin)}
                                </div>
                              )}
                              {item.facture_numero && (
                                <div className="text-xs text-slate-500">
                                  Facture: {item.facture_numero}
                                </div>
                              )}
                              {item.date_facture && (
                                <div className="text-xs text-blue-600">
                                  Facturé: {formatDate(item.date_facture)}
                                </div>
                              )}
                              {item.date_echeance && (
                                <div className="text-xs text-purple-600">
                                  Échéance: {formatDate(item.date_echeance)}
                                </div>
                              )}
                              {item.correctifs_total && item.correctifs_total > 0 && (
                                <div className="text-xs text-orange-600">
                                  Correctifs: {formatCurrency(item.correctifs_total)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {item.date_devis && (
                                <div className="text-xs text-slate-600">
                                  Devis: {formatDate(item.date_devis)}
                                </div>
                              )}
                              {item.facture_numero && (
                                <div className="text-xs text-slate-500">
                                  Facture: {item.facture_numero}
                                </div>
                              )}
                              {item.date_facture && (
                                <div className="text-xs text-blue-600">
                                  Facturé: {formatDate(item.date_facture)}
                                </div>
                              )}
                              {item.date_echeance && (
                                <div className="text-xs text-purple-600">
                                  Échéance: {formatDate(item.date_echeance)}
                                </div>
                              )}
                              {item.date_paye && (
                                <div className="text-xs text-green-600">
                                  Payé: {formatDate(item.date_paye)}
                                </div>
                              )}
                            </div>
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

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-16">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  <span className="font-medium">
                    Affichage de <span className="text-purple-600 font-semibold">{startIndex + 1}</span> à{' '}
                    <span className="text-purple-600 font-semibold">{Math.min(endIndex, totalCount)}</span> sur{' '}
                    <span className="text-purple-600 font-semibold">{totalCount}</span> éléments
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
                              ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg"
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
}