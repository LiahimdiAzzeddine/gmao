import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Calendar, 
  Edit, 
  Filter, 
  Trash2, 
  Plus, 
  Search, 
  RefreshCw, 
  Power, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  Users,
  Activity,
  User,
  Loader2,
  X
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plan } from '../../types/plan';
import { useMaintenancePlans } from '../../hooks/useMaintenancePlans';

const JOURS_SEMAINE = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function MaintenancePlansTable() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // États de filtrage et recherche - Initialiser depuis les URL params
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [filterType, setFilterType] = useState<string>(searchParams.get('type') || 'préventive');
  const [filterStatut, setFilterStatut] = useState<string>(searchParams.get('statut') || 'tous');
  const [filterClient, setFilterClient] = useState<string>(searchParams.get('client') || 'tous');
  const [showClientModal, setShowClientModal] = useState<boolean>(searchParams.get('client') ? false : true);
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState<boolean>(true);
  
  // Filtres pré-sélection dans le modal
  const [preFilterType, setPreFilterType] = useState<string>(filterType);
  const [preFilterStatut, setPreFilterStatut] = useState<string>(filterStatut);
  
  // États de pagination
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [itemsPerPage, setItemsPerPage] = useState(parseInt(searchParams.get('pageSize') || '10'));

  // Charger les plans avec les filtres (seulement si un client est sélectionné)
  const { plans, loading, stats, totalCount, reload } = useMaintenancePlans({
    typeFilter: filterType,
    searchTerm,
    filterStatut,
    page: currentPage,
    pageSize: itemsPerPage,
    clientId: filterClient !== 'tous' ? filterClient : undefined
  });

  // Mettre à jour les URL params quand les filtres changent
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filterType !== 'préventive') params.set('type', filterType);
    if (filterStatut !== 'tous') params.set('statut', filterStatut);
    if (filterClient !== 'tous') params.set('client', filterClient);
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (itemsPerPage !== 10) params.set('pageSize', itemsPerPage.toString());
    
    setSearchParams(params, { replace: true });
  }, [searchTerm, filterType, filterStatut, filterClient, currentPage, itemsPerPage, setSearchParams]);

  // Charger les clients au montage
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async (): Promise<void> => {
    try {
      setLoadingClients(true);
      const { data, error } = await supabase
        .from('clients')
        .select('id, raison_sociale, prenom')
        .order('raison_sociale');

      if (error) throw error;

      setClients(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleClientSelection = (clientId: string) => {
    setFilterClient(clientId);
    setFilterType(preFilterType);
    setFilterStatut(preFilterStatut);
    setCurrentPage(1);
    setShowClientModal(false);

    const params = new URLSearchParams(searchParams);
    params.set('client', clientId);
    setSearchParams(params, { replace: true });
  };

  // ==================== FONCTIONS UTILITAIRES ====================

  const getRecurrenceLabel = (plan: Plan) => {
    if (plan.type === 'corrective') return 'Sur demande';

    const intervals: { [key: string]: string } = {
      'journalière': 'jour',
      'hebdomadaire': 'semaine',
      'mensuelle': 'mois',
      'annuelle': 'an'
    };

    const unit = intervals[plan.type_recurrence || ''] || '';
    const label = `Tous les ${plan.intervalle} ${unit}${plan.intervalle! > 1 ? 's' : ''}`;

    if (plan.forcer_jour_semaine && plan.jour_semaine !== null) {
      return `${label} (${JOURS_SEMAINE[plan.jour_semaine]})`;
    }

    return label;
  };

  // ==================== ACTIONS ====================

  const toggleStatus = async (plan: Plan) => {
    try {
      const newStatus = plan.statut === 'actif' ? 'inactif' : 'actif';
      const { error } = await supabase
        .from('plans_maintenance')
        .update({ statut: newStatus })
        .eq('id', plan.id);

      if (error) throw error;
      reload();
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('Supprimer ce plan pour toutes les machines associées ? Les OT liés seront également concernés selon les règles de la base.')) return;

    try {
      const { error } = await supabase
        .from('plans_maintenance')
        .delete()
        .eq('id', id);

      if (error) throw error;
      reload();
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  // ==================== FILTRAGE ET PAGINATION ====================

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // ==================== HANDLERS ====================

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterTypeChange = (value: string) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  const handleFilterStatutChange = (value: string) => {
    setFilterStatut(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  // ==================== COMPOSANTS DE RENDU ====================

  const LoadingState = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <RefreshCw className="animate-spin h-12 w-12 text-[#f15c00] mx-auto mb-4" />
        <p className="text-slate-600">Chargement des plans...</p>
      </div>
    </div>
  );

  const StatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-[#f15c00]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-600 text-xs font-medium">Total Plans</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.total}</p>
          </div>
          <div className="bg-orange-50 p-2 rounded-lg">
            <Calendar className="w-5 h-5 text-[#f15c00]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-600 text-xs font-medium">Plans Actifs</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.actifs}</p>
          </div>
          <div className="bg-green-50 p-2 rounded-lg">
            <Activity className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-slate-400">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-600 text-xs font-medium">Plans Inactifs</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.total - stats.actifs}</p>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg">
            <Power className="w-5 h-5 text-slate-600" />
          </div>
        </div>
      </div>
    </div>
  );

  const ActionButtons = ({ plan }: { plan: Plan }) => (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => navigate(`/admin/plans-maintenance/${plan.id}`)}
        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
        title="Modifier"
      >
        <Edit size={18} />
      </button>
      <button
        onClick={() => toggleStatus(plan)}
        className={`p-2 rounded-lg transition-all ${
          plan.statut === 'actif' 
            ? 'text-slate-600 hover:text-orange-600 hover:bg-orange-50' 
            : 'text-slate-600 hover:text-green-600 hover:bg-green-50'
        }`}
        title={plan.statut === 'actif' ? 'Désactiver' : 'Activer'}
      >
        <Power size={18} />
      </button>
      <button
        onClick={() => deletePlan(plan.id)}
        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
        title="Supprimer"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );

  const MobileCard = ({ plan }: { plan: Plan }) => (
    <div className="p-4 bg-white border-b border-slate-100">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 mb-1">
            {plan.machines?.length
              ? `${plan.machines.length} machine${plan.machines.length > 1 ? 's' : ''}`
              : plan.machine?.nom || plan.lot?.nom || 'N/A'}
          </div>
          <div className="text-sm text-slate-600 mb-2">
            {plan.gamme?.nom}
          </div>
          <div className="text-xs text-slate-500 mb-3">
            Client: {plan.machine?.client?.raison_sociale || plan.machine?.client?.prenom || 'N/A'}
          </div>
          {plan.machines && plan.machines.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {plan.machines.slice(0, 3).map(machine => (
                <span key={machine.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{machine.nom}</span>
              ))}
              {plan.machines.length > 3 && <span className="px-1 py-1 text-xs font-medium text-slate-500">+{plan.machines.length - 3}</span>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <span
              className="rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700"
              title={plan.id}
            >
              #{plan.numero ?? plan.id.slice(0, 8)}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
              plan.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${plan.statut === 'actif' ? 'bg-green-500' : 'bg-slate-500'}`} />
              {plan.statut === 'actif' ? 'Actif' : 'Inactif'}
            </span>
          </div>
        </div>
        <ActionButtons plan={plan} />
      </div>
    </div>
  );

  const DesktopTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <tr>
            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">ID</th>
            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Cible</th>
            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Gamme</th>
            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Récurrence</th>
            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Statut</th>
            <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {plans.map((plan) => (
            <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4">
                <span
                  className="rounded-lg bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-700"
                  title={plan.id}
                >
                  #{plan.numero ?? plan.id.slice(0, 8)}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-slate-900">
                  {plan.machines?.length
                    ? `${plan.machines.length} machine${plan.machines.length > 1 ? 's associées' : ' associée'}`
                    : `${plan.machine ? 'Machine' : 'Lot'}: ${plan.machine?.nom || plan.lot?.nom || 'N/A'}`}
                </div>
                <div className="text-sm text-slate-500">
                  Client: {plan.machine?.client?.raison_sociale || plan.machine?.client?.prenom || 'N/A'}
                </div>
                {plan.machines && plan.machines.length > 0 && (
                  <div className="mt-1 max-w-md truncate text-xs text-slate-500" title={plan.machines.map(machine => machine.nom).join(', ')}>
                    {plan.machines.map(machine => machine.nom).join(', ')}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-slate-700 font-medium">{plan.gamme?.nom}</td>
              <td className="px-6 py-4 text-slate-600 text-sm">
                {getRecurrenceLabel(plan)}
              </td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                  plan.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${plan.statut === 'actif' ? 'bg-green-500' : 'bg-slate-500'}`} />
                  {plan.statut === 'actif' ? 'Actif' : 'Inactif'}
                </span>
              </td>
              <td className="px-6 py-4">
                <ActionButtons plan={plan} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const Pagination = () => (
    <div className="px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Contrôles de pagination */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Afficher</label>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-[#f15c00] focus:border-transparent"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-slate-600">par page</span>
        </div>
        <span className="text-sm text-slate-600">
          Page {currentPage} sur {totalPages || 1}
        </span>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-1">
          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1;
            if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === pageNum 
                      ? "bg-[#f15c00] text-white" 
                      : "text-slate-600 hover:bg-orange-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
              return <span key={pageNum} className="px-2 text-slate-400">...</span>;
            }
            return null;
          })}
        </div>

        <button
          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="text-center py-12">
      <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
      <p className="text-slate-600 font-medium">Aucun plan trouvé</p>
      <p className="text-slate-500 text-sm mt-1">Essayez de modifier vos critères de recherche</p>
    </div>
  );

  // ==================== RENDU PRINCIPAL ====================

  if (loading && plans.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="max-w-7xl mx-auto mb-14 px-4 sm:px-6 lg:px-8">
      {/* Modal de sélection de client */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-[#f15c00] to-[#ff7a2f] p-6 text-white">
              <div>
                <h2 className="text-2xl font-bold">Sélectionner un client</h2>
                <p className="text-orange-100 text-sm mt-1">Choisissez le client et appliquez des filtres optionnels</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
                aria-label="Retour à la page précédente"
                title="Retour à la page précédente"
              >
                <X size={22} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Filtres optionnels */}
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Filter size={16} />
                  Filtres optionnels
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Type */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Type de maintenance
                    </label>
                    <select
                      value={preFilterType}
                      onChange={(e) => setPreFilterType(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent"
                    >
                      <option value="préventive">Préventive</option>
                      <option value="corrective">Corrective</option>
                      <option value="all">Tous les types</option>
                    </select>
                  </div>

                  {/* Statut */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Statut
                    </label>
                    <select
                      value={preFilterStatut}
                      onChange={(e) => setPreFilterStatut(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent"
                    >
                      <option value="tous">Tous</option>
                      <option value="actif">Actifs</option>
                      <option value="inactif">Inactifs</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Liste des clients */}
              {loadingClients ? (
                <div className="text-center py-8">
                  <Loader2 size={32} className="mx-auto text-[#f15c00] animate-spin mb-2" />
                  <p className="text-slate-600">Chargement des clients...</p>
                </div>
              ) : clients.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600">Aucun client trouvé</p>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Sélectionner un client ({clients.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {clients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleClientSelection(client.id)}
                        className="p-4 border-2 border-slate-200 rounded-lg hover:border-[#f15c00] hover:bg-orange-50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                            <User size={20} className="text-[#f15c00]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 group-hover:text-[#f15c00] truncate">
                              {client.raison_sociale || client.prenom}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 leading-tight">
              Plans de Maintenance
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1">
              Gérez et planifiez vos maintenances préventives
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {filterClient !== 'tous' && (
              <button
                onClick={() => setShowClientModal(true)}
                className="flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-3 rounded-lg transition-colors border border-blue-200"
              >
                <User size={18} />
                <span>Changer de client</span>
              </button>
            )}
            <button
              onClick={() => navigate('/admin/plans-maintenance/new')}
              className="flex items-center justify-center gap-2 bg-[#f15c00] text-white px-4 py-3 sm:px-6 rounded-lg hover:bg-[#d14d00] transition-colors shadow-sm"
            >
              <Plus size={20} />
              <span>Nouveau Plan</span>
            </button>
            <button
              onClick={() => navigate('/admin/addOT')}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 sm:px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
            >
              <Zap size={20} />
              <span>Générer OT</span>
            </button>
          </div>
        </div>

        <StatsCards />
        
        {/* Barre de recherche */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
            {/* Recherche */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher par ID ou machine..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all"
              />
            </div>

            {/* Résultats */}
            <div className="text-sm text-slate-600 whitespace-nowrap">
              <span className="font-semibold">{totalCount}</span> plan{totalCount > 1 ? 's' : ''} trouvé{totalCount > 1 ? 's' : ''}
            </div>

            {/* Bouton refresh */}
            <button
              onClick={reload}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#f15c00] transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {plans.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Version mobile */}
            <div className="sm:hidden">
              {plans.map((plan) => (
                <MobileCard key={plan.id} plan={plan} />
              ))}
            </div>

            {/* Version desktop */}
            <div className="hidden sm:block">
              <DesktopTable />
            </div>

            <Pagination />
          </>
        )}
      </div>
    </div>
  );
}
