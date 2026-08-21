import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, Client } from '../lib/supabase';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Phone, 
  MapPin, 
  Copy, 
  Check, 
  User, 
  CreditCard, 
  RefreshCw,
  Filter,
  X,
  Mail,
  Building2,
  Calendar,
  Eye,
  Users,
  Activity
} from 'lucide-react';

interface ClientsStats {
  total: number;
  withMachines: number;
  recentlyAdded: number;
}

export default function ClientsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Initialiser depuis les URL params
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'with-machines' | 'without-machines'>(
    (searchParams.get('filter') as 'all' | 'with-machines' | 'without-machines') || 'all'
  );
  const [stats, setStats] = useState<ClientsStats>({ total: 0, withMachines: 0, recentlyAdded: 0 });

  useEffect(() => {
    loadClients();
  }, []);

  // Mettre à jour les URL params quand les filtres changent
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filterType !== 'all') params.set('filter', filterType);
    
    setSearchParams(params, { replace: true });
  }, [searchTerm, filterType, setSearchParams]);

  async function loadClients() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          profile:profiles(id, nom, role, email, password),
          machines(id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const clientsData = data || [];
      setClients(clientsData);
      
      // Calculate stats
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      setStats({
        total: clientsData.length,
        withMachines: clientsData.filter(c => c.machines && c.machines.length > 0).length,
        recentlyAdded: clientsData.filter(c => new Date(c.created_at) > thirtyDaysAgo).length
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (clientId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) throw new Error("Non authentifié");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-client`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clientId }),
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error || "Erreur lors de la suppression");

      setClients(clients.filter(c => c.id !== clientId));
      setDeleteConfirm(null);
      
      // Update stats
      loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  };

  async function copyCredentials(client: Client) {
    try {
      const text = `Email: ${client.profile.email}\nMot de passe: ${client.profile.password}`;
      await navigator.clipboard.writeText(text);
      setCopiedCredentials(client.id);
      setTimeout(() => setCopiedCredentials(null), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  }

  const getFilteredClients = () => {
    let filtered = clients.filter(client =>
      `${client.profile.nom} ${client.prenom || ''} ${client.raison_sociale || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

    switch (filterType) {
      case 'with-machines':
        filtered = filtered.filter(c => c.machines && c.machines.length > 0);
        break;
      case 'without-machines':
        filtered = filtered.filter(c => !c.machines || c.machines.length === 0);
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredClients = getFilteredClients();

  // ==================== COMPOSANTS DE RENDU ====================

  const StatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-[#f15c00] hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-600 text-xs font-medium">Total Clients</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.total}</p>
          </div>
          <div className="bg-orange-50 p-2 rounded-lg">
            <Users className="w-5 h-5 text-[#f15c00]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-green-500 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-600 text-xs font-medium">Avec Machines</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.withMachines}</p>
          </div>
          <div className="bg-green-50 p-2 rounded-lg">
            <Building2 className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-600 text-xs font-medium">Récents (30j)</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.recentlyAdded}</p>
          </div>
          <div className="bg-blue-50 p-2 rounded-lg">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );

  const SearchAndFilters = () => (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom ou raison sociale..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all"
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

        {/* Filter Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            showFilters || filterType !== 'all'
              ? 'bg-[#f15c00] text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Filter size={20} />
          Filtres
          {filterType !== 'all' && (
            <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">1</span>
          )}
        </button>

        {/* Add Client Button */}
        <button
          onClick={() => navigate('/admin/client/new')}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f15c00] to-[#d14d00] text-white rounded-lg hover:from-[#d14d00] hover:to-[#b8420] font-medium shadow-sm hover:shadow-md transition-all"
        >
          <Plus size={20} />
          Nouveau Client
        </button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'Tous les clients', count: stats.total },
              { value: 'with-machines', label: 'Avec machines', count: stats.withMachines },
              { value: 'without-machines', label: 'Sans machines', count: stats.total - stats.withMachines }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterType(filter.value as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterType === filter.value
                    ? 'bg-[#f15c00] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-sm text-slate-600">
          <span className="font-semibold">{filteredClients.length}</span> client{filteredClients.length > 1 ? 's' : ''} trouvé{filteredClients.length > 1 ? 's' : ''}
          {searchTerm && ` pour "${searchTerm}"`}
        </p>
      </div>
    </div>
  );

  const ClientCard = ({ client }: { client: Client }) => {
    const machineCount = client.machines?.length || 0;
    const isRecent = new Date(client.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 hover:border-[#f15c00] hover:shadow-md transition-all duration-300 overflow-hidden">
        {/* Header */}
        <div className="p-3 pb-2">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="p-2 bg-gradient-to-br from-[#f15c00] to-[#d14d00] rounded-lg shadow-sm flex-shrink-0">
                <User size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {client.raison_sociale || 'Client'}
                </h3>
                <p className="text-xs text-slate-600 truncate">
                  {client.prenom} {client.profile.nom}
                </p>
              </div>
            </div>
            {isRecent && (
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded flex-shrink-0">
                New
              </span>
            )}
          </div>

          {/* Machine Count Badge */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              machineCount > 0 
                ? 'bg-green-50 text-green-700' 
                : 'bg-slate-50 text-slate-600'
            }`}>
              <Building2 size={12} />
              {machineCount} machine{machineCount > 1 ? 's' : ''}
            </div>
            {client.cin && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                <CreditCard size={12} />
                {client.cin}
              </div>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="px-3 pb-2 space-y-1.5">
          {/* Email */}
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
            <Mail size={12} className="text-slate-500 flex-shrink-0" />
            <span className="text-xs text-slate-700 truncate flex-1">
              {client.profile.email}
            </span>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
            <Phone size={12} className="text-slate-500 flex-shrink-0" />
            {client.telephone ? (
              <a
                href={`tel:${client.telephone}`}
                className="text-xs text-slate-700 hover:text-[#f15c00] transition-colors truncate flex-1"
              >
                {client.telephone}
              </a>
            ) : (
              <span className="text-xs text-slate-500 italic flex-1">Non renseigné</span>
            )}
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 p-2 bg-slate-50 rounded">
            <MapPin size={12} className="text-slate-500 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-slate-700 flex-1 line-clamp-2">
              {client.adresse || <span className="italic text-slate-500">Adresse non renseignée</span>}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-3 pt-0">
          {deleteConfirm === client.id ? (
            <div className="space-y-2 p-2 bg-red-50 rounded border border-red-200">
              <div className="flex items-center gap-1.5 text-red-700">
                <Trash2 size={12} />
                <p className="text-xs font-medium">Confirmer ?</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleDelete(client.id)}
                  className="flex-1 px-2 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 font-medium text-xs transition-all"
                >
                  Supprimer
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-2 py-1.5 bg-white text-slate-700 rounded hover:bg-slate-100 font-medium text-xs border border-slate-300 transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Primary Actions */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => navigate(`/admin/client/${client.id}`)}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[#f15c00] text-white rounded hover:bg-[#d14d00] font-medium text-xs transition-all"
                >
                  <Edit2 size={12} />
                  Modifier
                </button>
                <button
                  onClick={() => copyCredentials(client)}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-xs transition-all"
                >
                  {copiedCredentials === client.id ? (
                    <>
                      <Check size={12} />
                      Copié !
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      ID
                    </>
                  )}
                </button>
              </div>

              {/* Secondary Actions */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => navigate(`/admin/machines?client=${client.id}`)}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 font-medium text-xs transition-all"
                >
                  <Eye size={12} />
                  Machines
                </button>
                <button
                  onClick={() => setDeleteConfirm(client.id)}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium text-xs transition-all"
                >
                  <Trash2 size={12} />
                  Supprimer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const EmptyState = () => (
    <div className="text-center py-16 bg-white rounded-xl shadow-sm">
      <User size={64} className="mx-auto text-slate-300 mb-4" />
      <h3 className="text-xl font-semibold text-slate-700 mb-2">
        {searchTerm || filterType !== 'all' ? 'Aucun client trouvé' : 'Aucun client enregistré'}
      </h3>
      <p className="text-slate-500 mb-6 max-w-md mx-auto">
        {searchTerm || filterType !== 'all' 
          ? 'Essayez de modifier vos critères de recherche ou filtres'
          : 'Commencez par créer votre premier client pour gérer vos relations commerciales'
        }
      </p>
      {!searchTerm && filterType === 'all' && (
        <button
          onClick={() => navigate('/admin/client/new')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f15c00] to-[#d14d00] text-white rounded-lg hover:from-[#d14d00] hover:to-[#b8420] font-medium shadow-sm hover:shadow-md transition-all"
        >
          <Plus size={20} />
          Créer le premier client
        </button>
      )}
    </div>
  );

  const LoadingState = () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <RefreshCw className="animate-spin h-12 w-12 text-[#f15c00] mx-auto mb-4" />
        <p className="text-slate-600">Chargement des clients...</p>
      </div>
    </div>
  );

  // ==================== RENDU PRINCIPAL ====================

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestion des Clients</h1>
          <p className="text-slate-600">
            Gérez vos clients et leurs informations de contact
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg shadow-sm">
            <p className="font-medium">{error}</p>
            <button
              onClick={() => setError('')}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Fermer
            </button>
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <StatsCards />
            <SearchAndFilters />
            
            {filteredClients.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredClients.map(client => (
                  <ClientCard key={client.id} client={client} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}