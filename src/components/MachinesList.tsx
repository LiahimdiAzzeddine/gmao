import { useEffect, useState } from "react";
import { supabase, Machine } from "../lib/supabase";
import {
  Edit,
  Trash2,
  QrCode,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Users,
  Building2,
  X,
  Settings,
  ClipboardList,
  ImageIcon
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import QRCodeGenerator from "./QRCodeGenerator";
import { useMachines } from "../hooks/useMachines";
import { ALL_MACHINE_STATES, MachineState, getMachineStateConfig, normalizeMachineState } from "../types/machineState";

interface Client {
  id: string;
  prenom: string;
  raison_sociale: string;
}

export default function MachinesList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [lots, setLots] = useState<{ id: string; nom: string }[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  // Initialiser les filtres depuis les URL params
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [filterEtat, setFilterEtat] = useState<string>(searchParams.get('etat') || 'tous');
  const [filterLot, setFilterLot] = useState<string>(searchParams.get('lot') || 'tous');
  const [filterClient, setFilterClient] = useState<string>(searchParams.get('client') || 'tous');
  const [showFilters, setShowFilters] = useState(false);
  const [showClientModal, setShowClientModal] = useState(filterClient === 'tous');
  const [preFilterEtat, setPreFilterEtat] = useState<string>(filterEtat);
  const [preFilterLot, setPreFilterLot] = useState<string>(filterLot);

  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [itemsPerPage, setItemsPerPage] = useState(parseInt(searchParams.get('pageSize') || '10'));

  // États pour la multi-sélection
  const [selectedMachines, setSelectedMachines] = useState<Set<string>>(new Set());

  // États pour les statistiques globales
  const [stats, setStats] = useState({
    total: 0,
    operationnel: 0,
    maintenance: 0,
    byClient: 0,
  });

  // État pour les compteurs d'OT par machine
  const [otCounts, setOtCounts] = useState<Record<string, number>>({});

  const { machines, loading, totalCount, totalPages, loadMachines, reload } = useMachines(filterClient !== 'tous');

  // Charger les statistiques globales au montage
  useEffect(() => {
    loadGlobalStats();
    loadLots();
    loadClients();
  }, []);

  // Charger les compteurs d'OT quand les machines changent
  useEffect(() => {
    if (machines.length > 0) {
      loadOTCounts();
    }
  }, [machines]);

  async function loadOTCounts() {
    const machineIds = machines.map(m => m.id);
    
    // Compter les OT non fermés (statut !== 'terminé' et !== 'clôturé_avec_anomalie')
    const { data, error } = await supabase
      .from('ordres_travail')
      .select('machine_id, statut')
      .in('machine_id', machineIds)
      .not('statut', 'in', '("terminé","clôturé_avec_anomalie")');

    if (!error && data) {
      const counts: Record<string, number> = {};
      data.forEach(ot => {
        counts[ot.machine_id] = (counts[ot.machine_id] || 0) + 1;
      });
      setOtCounts(counts);
    }
  }

  // Mettre à jour les URL params quand les filtres changent
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filterEtat !== 'tous') params.set('etat', filterEtat);
    if (filterLot !== 'tous') params.set('lot', filterLot);
    if (filterClient !== 'tous') params.set('client', filterClient);
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (itemsPerPage !== 10) params.set('pageSize', itemsPerPage.toString());
    
    setSearchParams(params, { replace: true });
  }, [searchTerm, filterEtat, filterLot, filterClient, currentPage, itemsPerPage, setSearchParams]);

  // Recharger les machines quand les filtres ou la pagination changent
  useEffect(() => {
    if (filterClient === 'tous' && showClientModal) {
      return;
    }

    loadMachines({
      page: currentPage,
      pageSize: itemsPerPage,
      searchTerm,
      filterEtat,
      filterLot,
      filterClient,
    });
  }, [currentPage, itemsPerPage, searchTerm, filterEtat, filterLot, filterClient, loadMachines, showClientModal]);

  async function loadGlobalStats() {
    // Charger les statistiques globales (sans pagination)
    const { data } = await supabase
      .from('machines')
      .select('etat, client_id');

    if (data) {
      const currentClientFilter = searchParams.get('client');
      const filteredData = currentClientFilter 
        ? data.filter(m => m.client_id === currentClientFilter)
        : data;

      setStats({
        total: data.length,
        operationnel: data.filter((m) => normalizeMachineState(m.etat) === MachineState.EN_SERVICE).length,
        maintenance: data.filter((m) => normalizeMachineState(m.etat) === MachineState.HORS_SERVICE).length,
        byClient: currentClientFilter ? filteredData.length : 0,
      });
    }
  }

  async function loadLots() {
    const { data } = await supabase.from("lots").select("id, nom").order("nom");
    if (data) setLots(data);
  }

  async function loadClients() {
    const { data } = await supabase
      .from("clients")
      .select("id, prenom, raison_sociale")
      .order("raison_sociale");
    if (data) setClients(data);
  }

  const handleClientSelection = (clientId: string) => {
    setFilterClient(clientId);
    setFilterEtat(preFilterEtat);
    setFilterLot(preFilterLot);
    setCurrentPage(1);
    setShowClientModal(false);

    if (clientId === 'tous') {
      searchParams.delete('client');
    } else {
      searchParams.set('client', clientId);
    }
    setSearchParams(searchParams);
    loadGlobalStats();
  };

  async function deleteMachine(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette machine ?")) return;
    const { error } = await supabase.from("machines").delete().eq("id", id);
    if (!error) {
      reload();
      loadGlobalStats();
      setSelectedMachines(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }

  async function deleteSelectedMachines() {
    if (selectedMachines.size === 0) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedMachines.size} machine(s) ?`)) return;

    const { error } = await supabase
      .from("machines")
      .delete()
      .in("id", Array.from(selectedMachines));

    if (!error) {
      reload();
      loadGlobalStats();
      setSelectedMachines(new Set());
    }
  }

  // Gestion de la sélection
  function toggleSelectAll() {
    if (selectedMachines.size === machines.length) {
      setSelectedMachines(new Set());
    } else {
      setSelectedMachines(new Set(machines.map(m => m.id)));
    }
  }

  function toggleSelectMachine(id: string) {
    setSelectedMachines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  // Réinitialiser la page lors du changement de filtres
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterEtatChange = (value: string) => {
    setFilterEtat(value);
    setCurrentPage(1);
  };

  const handleFilterLotChange = (value: string) => {
    setFilterLot(value);
    setCurrentPage(1);
  };

  const handleFilterClientChange = (value: string) => {
    setFilterClient(value);
    setCurrentPage(1);
    
    // Update URL params
    if (value === 'tous') {
      searchParams.delete('client');
    } else {
      searchParams.set('client', value);
    }
    setSearchParams(searchParams);
    
    loadGlobalStats();
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterEtat('tous');
    setFilterLot('tous');
    setFilterClient('tous');
    setCurrentPage(1);
    searchParams.delete('client');
    setSearchParams(searchParams);
    loadGlobalStats();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filterEtat !== 'tous') count++;
    if (filterLot !== 'tous') count++;
    if (filterClient !== 'tous') count++;
    return count;
  };

  const getSelectedClientName = () => {
    if (filterClient === 'tous') return null;
    const client = clients.find(c => c.id === filterClient);
    return client ? (client.raison_sociale || client.prenom) : null;
  };

  if (loading && machines.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-[#f98440] mx-auto mb-4" />
          <p className="text-slate-600">Chargement des machines...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto mb-10">
        {showClientModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 bg-[#f98440] p-5 text-white">
                <div>
                  <h2 className="text-xl font-black">Sélectionner un client</h2>
                  <p className="mt-1 text-sm text-white/80">Choisissez le client et appliquez des filtres optionnels</p>
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
              <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">Tous les états</label>
                    <select
                      value={preFilterEtat}
                      onChange={(e) => setPreFilterEtat(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#f98440]/30 focus:border-[#f98440]"
                    >
                      <option value="tous">Tous les états</option>
                      {ALL_MACHINE_STATES.map((state) => (
                        <option key={state} value={state}>{getMachineStateConfig(state).label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">Tous les lots</label>
                    <select
                      value={preFilterLot}
                      onChange={(e) => setPreFilterLot(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#f98440]/30 focus:border-[#f98440]"
                    >
                      <option value="tous">Tous les lots</option>
                      {lots.map((lot) => (
                        <option key={lot.id} value={lot.id}>{lot.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="text-sm text-slate-500">
                      Sélectionnez d’abord un client pour charger les machines.
                    </div>
                    {filterClient !== 'tous' && (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-2 text-sm text-orange-700">
                        <Users className="w-4 h-4" />
                        Client actuel : {getSelectedClientName()}
                      </div>
                    )}
                  </div>
                </div>

                {clients.length === 0 ? (
                  <div className="text-center py-8 text-slate-600">Chargement des clients...</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {clients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleClientSelection(client.id)}
                        className={`w-full rounded-lg border p-3 text-left transition-all ${client.id === filterClient ? 'border-[#f98440] bg-orange-50 shadow-sm' : 'border-slate-200 hover:border-[#f98440]/60 hover:bg-orange-50'}`}
                      >
                        <div className="font-semibold text-slate-800 truncate">{client.raison_sociale || client.prenom}</div>
                        <div className="text-sm text-slate-500 mt-1">Choisir ce client</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* En-tête avec statistiques */}
        <div className="mb-6">
          <div className="mb-5 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between md:p-5">
            {/* TITRE */}
            <div className="min-w-0">
              <h1 className="text-xl font-black leading-tight text-slate-900 sm:text-2xl">
                Gestion des Machines
              </h1>
              <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                Gérez et surveillez toutes vos machines
              </p>
            </div>

            {/* BOUTONS */}
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => navigate('/admin/machines/config')}
                className="
                  flex items-center justify-center gap-2
                  bg-white text-slate-700 border-2 border-slate-200
                  px-4 py-3 sm:px-5
                  rounded-lg
                  hover:bg-slate-50 hover:border-slate-300
                  transition-all
                  shadow-sm
                "
                title="Configuration"
              >
                <Settings size={20} />
                <span className="hidden lg:inline font-medium">
                  Configuration
                </span>
              </button>
              {filterClient !== 'tous' && (
                <button
                  onClick={() => {
                    setPreFilterEtat(filterEtat);
                    setPreFilterLot(filterLot);
                    setShowClientModal(true);
                  }}
                  className="
                    flex items-center justify-center gap-2
                    bg-orange-50 text-[#f98440] border border-orange-200
                    px-4 py-3 sm:px-5
                    rounded-lg
                    hover:bg-orange-100
                    transition-all
                    shadow-sm
                  "
                  title="Changer de client"
                >
                  <Users size={20} />
                  <span className="hidden lg:inline font-medium">
                    Changer de client
                  </span>
                </button>
              )}
              <button
                onClick={() => navigate('/admin/machine/new')}
                className="
                  flex items-center justify-center gap-2
                  bg-[#f98440]
                  text-white
                  px-4 py-3 sm:px-6
                  rounded-lg
                  hover:bg-[#e97435]
                  transition-all
                  shadow-md hover:shadow-lg
                  font-medium
                "
              >
                <Plus size={20} />
                <span className="sm:inline hidden">
                  Nouvelle Machine
                </span>
                <span className="sm:hidden">
                  Nouveau
                </span>
              </button>
            </div>
          </div>


          {/* Statistiques */}
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <div className="rounded-lg bg-[#f98440] p-3 text-white shadow-lg shadow-orange-200 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white/80">
                    Total Machines
                  </p>
                  <p className="mt-0.5 text-2xl font-black text-white">
                    {stats.total}
                  </p>
                </div>
                <div className="rounded-lg bg-black/10 p-2">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-100 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">
                    En service
                  </p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">
                    {stats.operationnel}
                  </p>
                </div>
                <div className="bg-green-50 p-2 rounded-lg">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-100 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">
                    Hors service
                  </p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">
                    {stats.maintenance}
                  </p>
                </div>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <svg
                    className="w-5 h-5 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {filterClient !== 'tous' && (
              <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-100 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-slate-600 text-xs font-medium">
                      Client Sélectionné
                    </p>
                    <p className="text-sm font-bold text-slate-800 mt-1 truncate">
                      {getSelectedClientName()}
                    </p>
                    <p className="text-xs font-medium text-[#f98440]">
                      {totalCount} machine{totalCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex-shrink-0 rounded-lg bg-orange-50 p-2.5">
                    <Users className="h-6 w-6 text-[#f98440]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Barre de recherche et filtres */}
          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Rechercher une machine..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 transition-all focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
                />
                {searchTerm && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all shadow-sm ${
                  showFilters || getActiveFiltersCount() > 0
                    ? 'bg-[#f98440] text-white shadow-md'
                    : 'bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <Filter size={20} />
                <span className="hidden sm:inline">Filtres</span>
                {getActiveFiltersCount() > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    showFilters || getActiveFiltersCount() > 0
                      ? 'bg-white text-[#f98440]'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {getActiveFiltersCount()}
                  </span>
                )}
              </button>

              {/* Add Machine Button - Hidden on mobile, shown on desktop */}
              <button
                onClick={() => navigate('/admin/machine/new')}
                className="hidden items-center gap-2 rounded-lg bg-[#f98440] px-5 py-2.5 font-medium text-white shadow-md transition-all hover:bg-[#e97435] hover:shadow-lg md:flex"
              >
                <Plus size={20} />
                <span>Nouvelle Machine</span>
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="pt-4 border-t border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  {/* Client Filter */}
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <select
                      value={filterClient}
                      onChange={(e) => handleFilterClientChange(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
                    >
                      <option value="tous">Tous les clients</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.raison_sociale || client.prenom}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* State Filter */}
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <select
                      value={filterEtat}
                      onChange={(e) => handleFilterEtatChange(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
                    >
                      <option value="tous">Tous les états</option>
                      {ALL_MACHINE_STATES.map((state) => {
                        const config = getMachineStateConfig(state);
                        return (
                          <option key={state} value={state}>
                            {config.icon} {config.label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Lot Filter */}
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <select
                      value={filterLot}
                      onChange={(e) => handleFilterLotChange(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
                    >
                      <option value="tous">Tous les lots</option>
                      {lots.map((lot) => (
                        <option key={lot.id} value={lot.id}>
                          {lot.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Clear Filters Button */}
                  {getActiveFiltersCount() > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 font-medium transition-all"
                    >
                      <X size={16} />
                      <span className="hidden sm:inline">Réinitialiser</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Results and Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-slate-200 gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">{totalCount}</span> machine{totalCount > 1 ? "s" : ""} trouvée{totalCount > 1 ? "s" : ""}
                  {filterClient !== 'tous' && ` pour ${getSelectedClientName()}`}
                </p>
                {selectedMachines.size > 0 && (
                  <>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#f98440]">
                        {selectedMachines.size} sélectionnée{selectedMachines.size > 1 ? "s" : ""}
                      </p>
                      <button
                        onClick={deleteSelectedMachines}
                        className="text-sm px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 font-medium transition-all"
                      >
                        Supprimer
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  reload();
                  loadGlobalStats();
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition-all hover:bg-orange-50 hover:text-[#f98440]"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                <span>Actualiser</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
          {totalCount === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-lg">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-200 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-slate-700 font-semibold text-lg mb-1">
                Aucune machine trouvée
              </p>
              <p className="text-slate-500 text-sm">
                Essayez de modifier vos critères de recherche
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse sm:table">
                  <thead className="hidden sm:table-header-group bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 w-12">
                        <button
                          onClick={toggleSelectAll}
                          className="text-slate-600 transition-colors hover:text-[#f98440]"
                        >
                          {selectedMachines.size === machines.length && machines.length > 0 ? (
                            <CheckSquare size={20} />
                          ) : (
                            <Square size={20} />
                          )}
                        </button>
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                        Machine
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                        Client
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                        Lot
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                        Localisation
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                        État
                      </th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  {/* Mobile cards */}
                  <tbody className="sm:hidden divide-y divide-slate-100">
                    {machines.map((machine) => {
                      const lotName = lots.find((l) => l.id === machine.lot_id)?.nom || "-";
                      const isSelected = selectedMachines.has(machine.id);

                      return (
                        <tr key={machine.id} className="block sm:table-row mb-4 sm:mb-0">
                          <td className="block p-4 bg-white rounded-lg sm:shadow-sm mb-2 sm:mb-0">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                  {machine.image_url ? (
                                    <img
                                      src={machine.image_url}
                                      alt={machine.nom}
                                      className="h-14 w-14 flex-shrink-0 rounded-lg border border-slate-200 object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                                      <ImageIcon size={22} />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-800 truncate">
                                      {machine.nom}
                                    </div>
                                    <div className="text-sm text-slate-500 truncate">
                                      {machine.modele}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-sm text-slate-600 mt-1 truncate">
                                  {machine.client ? machine.client.raison_sociale || machine.client.prenom : "—"}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                                    {lotName}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                                      getMachineStateConfig(machine.etat).bgColor
                                    } ${getMachineStateConfig(machine.etat).textColor}`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        getMachineStateConfig(machine.etat).dotColor
                                      }`}
                                    />
                                    {getMachineStateConfig(machine.etat).label}
                                  </span>
                                  {otCounts[machine.id] > 0 && (
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                      <ClipboardList size={12} />
                                      {otCounts[machine.id]} OT
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 ml-2">
                                <button
                                  onClick={() => setSelectedMachine(machine)}
                                  className="rounded-lg p-2 text-slate-600 transition-all hover:bg-orange-50 hover:text-[#f98440]"
                                  title="QR Code"
                                >
                                  <QrCode size={18} />
                                </button>
                                <button
                                  onClick={() => navigate(`/admin/machine/${machine.id}`)}
                                  className="rounded-lg p-2 text-slate-600 transition-all hover:bg-orange-50 hover:text-[#f98440]"
                                  title="Modifier"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() => deleteMachine(machine.id)}
                                  className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Supprimer"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Desktop tbody */}
                  <tbody className="hidden sm:table-row-group divide-y divide-slate-100">
                    {machines.map((machine) => {
                      const lotName = lots.find((l) => l.id === machine.lot_id)?.nom || "-";
                      const isSelected = selectedMachines.has(machine.id);

                      return (
                        <tr key={machine.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? "bg-orange-50" : ""}`}>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => toggleSelectMachine(machine.id)}
                              className="text-slate-600 transition-colors hover:text-[#f98440]"
                            >
                              {isSelected ? <CheckSquare size={20} className="text-[#f98440]" /> : <Square size={20} />}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {machine.image_url ? (
                                <img
                                  src={machine.image_url}
                                  alt={machine.nom}
                                  className="h-12 w-12 flex-shrink-0 rounded-lg border border-slate-200 object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                                  <ImageIcon size={20} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-800">{machine.nom}</div>
                                <div className="text-sm text-slate-500">{machine.modele}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-700">
                            {machine.client ? machine.client.raison_sociale || machine.client.prenom : "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{lotName}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-700">{machine.localisation}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                              getMachineStateConfig(machine.etat).bgColor
                            } ${getMachineStateConfig(machine.etat).textColor}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                getMachineStateConfig(machine.etat).dotColor
                              }`} />
                              {getMachineStateConfig(machine.etat).label}
                            </span>
                            {otCounts[machine.id] > 0 && (
                              <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                <ClipboardList size={12} />
                                {otCounts[machine.id]}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setSelectedMachine(machine)} className="rounded-lg p-2 text-slate-600 transition-all hover:bg-orange-50 hover:text-[#f98440]">
                                <QrCode size={18} />
                              </button>
                              <button onClick={() => navigate(`/admin/machine/${machine.id}`)} className="rounded-lg p-2 text-slate-600 transition-all hover:bg-orange-50 hover:text-[#f98440]">
                                <Edit size={18} />
                              </button>
                              <button onClick={() => deleteMachine(machine.id)} className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>


              {/* Pagination */}
              <div className="px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                {/* Desktop: items per page + page info */}
                <div className="hidden sm:flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Afficher</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="rounded-lg border border-slate-300 px-3 py-1 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-slate-600">par page</span>
                  </div>
                  <span className="text-sm text-slate-600">
                    Page {currentPage} sur {totalPages || 1}
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
                    className="p-2 sm:p-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Page précédente"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  {/* Mobile: show only current page */}
                  <div className="flex items-center gap-1 sm:gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            disabled={loading}
                            className={`px-3 py-1 sm:px-2 sm:py-1 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed ${currentPage === pageNum
                                ? "bg-[#f98440] text-white"
                                : "text-slate-600 hover:bg-slate-100"
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                        return <span key={pageNum} className="px-2 text-slate-400 hidden sm:inline">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="p-2 sm:p-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Page suivante"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

            </>
          )}
        </div>
      </div>

      {selectedMachine && (
        <QRCodeGenerator
          machine={selectedMachine}
          onClose={() => setSelectedMachine(null)}
        />
      )}
    </>
  );
}
