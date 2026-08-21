import { useState, useEffect, useRef } from 'react';
import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, Filter, Settings, MapPin, Calendar, ClipboardList } from 'lucide-react';
import { supabase, Machine, Client } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import TechnicienLayout from '../components/TechnicienLayout';
import { ALL_MACHINE_STATES, getMachineStateConfig } from '../types/machineState';

export default function TechnicienMachines() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allMachines, setAllMachines] = useState<Machine[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const [otCounts, setOtCounts] = useState<Record<string, number>>({});
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [filterEtat, setFilterEtat] = useState<string>(searchParams.get('etat') || 'tous');
  const [filterClient, setFilterClient] = useState<string>(searchParams.get('client') || 'tous');
  const [filterDateProgrammeeFrom, setFilterDateProgrammeeFrom] = useState<string>(searchParams.get('date_programmee_from') || searchParams.get('date_programmee') || '');
  const [filterDateProgrammeeTo, setFilterDateProgrammeeTo] = useState<string>(searchParams.get('date_programmee_to') || '');
  const [filterDateCreationFrom, setFilterDateCreationFrom] = useState<string>(searchParams.get('date_creation_from') || searchParams.get('date_creation_ot') || '');
  const [filterDateCreationTo, setFilterDateCreationTo] = useState<string>(searchParams.get('date_creation_to') || '');
  const [showFilters, setShowFilters] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 9;

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAllMachines([]);
    setCurrentPage(1);
    setHasMore(true);
    loadMachines(1, true);
  }, [profile, searchTerm, filterEtat, filterClient, filterDateProgrammeeFrom, filterDateProgrammeeTo, filterDateCreationFrom, filterDateCreationTo]);

  useEffect(() => {
    if (!profile) return;

    supabase
      .from('clients')
      .select('id, raison_sociale, prenom')
      .order('raison_sociale')
      .then(({ data, error }) => {
        if (error) {
          console.error('Erreur chargement clients:', error);
          return;
        }
        setClients(data || []);
      });
  }, [profile]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMachines(currentPage + 1, false);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, loadingMore, currentPage]);

  useEffect(() => {
    if (allMachines.length > 0) {
      loadOTCounts();
    }
  }, [allMachines]);

  async function loadOTCounts() {
    const machineIds = allMachines.map(m => m.id);
    
    const { data: openData, error: openError } = await supabase
      .from('ordres_travail')
      .select('machine_id, statut')
      .in('machine_id', machineIds)
      .not('statut', 'in', '("terminé","clôturé_avec_anomalie")');

    if (!openError && openData) {
      const counts: Record<string, number> = {};
      openData.forEach(ot => {
        counts[ot.machine_id] = (counts[ot.machine_id] || 0) + 1;
      });
      setOtCounts(counts);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filterEtat !== 'tous') params.set('etat', filterEtat);
    if (filterClient !== 'tous') params.set('client', filterClient);
    if (filterDateProgrammeeFrom) params.set('date_programmee_from', filterDateProgrammeeFrom);
    if (filterDateProgrammeeTo) params.set('date_programmee_to', filterDateProgrammeeTo);
    if (filterDateCreationFrom) params.set('date_creation_from', filterDateCreationFrom);
    if (filterDateCreationTo) params.set('date_creation_to', filterDateCreationTo);
    
    setSearchParams(params, { replace: true });
  }, [searchTerm, filterEtat, filterClient, filterDateProgrammeeFrom, filterDateProgrammeeTo, filterDateCreationFrom, filterDateCreationTo]);

  async function loadMachines(page: number, reset: boolean) {
    if (!profile) return;

    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const hasOTDateFilter = Boolean(filterDateProgrammeeFrom || filterDateProgrammeeTo || filterDateCreationFrom || filterDateCreationTo);
      let query = supabase
        .from('machines')
        .select(`
          *,
          client:clients(*),
          poste_technique:postes_techniques(
            *,
            site:sites(*),
            domaine:domaines(*),
            lot:lots(*),
            secteur:secteurs(*)
          )
          ${hasOTDateFilter ? ', ordres_travail!inner(id)' : ''}
        `, { count: 'exact' });

      if (filterEtat !== 'tous') {
        query = query.eq('etat', filterEtat);
      }

      if (filterClient !== 'tous') {
        query = query.eq('client_id', filterClient);
      }

      if (filterDateProgrammeeFrom) query = query.gte('ordres_travail.date_programmee', filterDateProgrammeeFrom);
      if (filterDateProgrammeeTo) query = query.lt('ordres_travail.date_programmee', getNextDate(filterDateProgrammeeTo));
      if (filterDateCreationFrom) query = query.gte('ordres_travail.created_at', filterDateCreationFrom);
      if (filterDateCreationTo) query = query.lt('ordres_travail.created_at', getNextDate(filterDateCreationTo));

      if (searchTerm.trim()) {
        query = query.or(`nom.ilike.%${searchTerm}%,modele.ilike.%${searchTerm}%,localisation.ilike.%${searchTerm}%`);
      }

      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data: machinesData, count, error: machinesError } = await query
        .order('nom')
        .range(from, to);

      if (machinesError) throw machinesError;

      if (reset) {
        setAllMachines(machinesData || []);
      } else {
        setAllMachines(prev => [...prev, ...(machinesData || [])]);
      }
      
      setTotalCount(count || 0);
      setCurrentPage(page);
      setHasMore((machinesData?.length || 0) === itemsPerPage);
    } catch (error) {
      console.error('Erreur chargement machines:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const resetFilters = () => {
    setSearchTerm('');
    setFilterEtat('tous');
    setFilterClient('tous');
    setFilterDateProgrammeeFrom('');
    setFilterDateProgrammeeTo('');
    setFilterDateCreationFrom('');
    setFilterDateCreationTo('');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filterEtat !== 'tous') count++;
    if (filterClient !== 'tous') count++;
    if (filterDateProgrammeeFrom || filterDateProgrammeeTo) count++;
    if (filterDateCreationFrom || filterDateCreationTo) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <TechnicienLayout>
      {/* En-tête */}
      <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 md:text-2xl lg:text-3xl">Toutes les machines</h1>
          <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm">
            Consultez le parc de machines industrielles
          </p>
        </div>
        <div className="hidden rounded-lg border border-blue-600/30 bg-white px-3 py-1.5 text-xs font-bold text-blue-600 md:block md:px-4 md:py-2 md:text-sm">
          {allMachines.length} / {totalCount} machines
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative mb-4 md:mb-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher une machine par nom, modèle ou localisation..."
          className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-12 pr-24 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-slate-100 transition-all placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 md:py-3.5 md:text-base"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative rounded-lg p-2 transition-all ${
              activeFiltersCount > 0 || showFilters
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200/50'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Filter size={18} />
            {activeFiltersCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="mb-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:mb-6 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 md:text-base">Filtres</h3>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 md:text-sm"
              >
                <X size={14} />
                Réinitialiser
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700 md:text-sm">
                Client
              </label>
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-slate-100 transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                <option value="tous">Tous les clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.raison_sociale || client.prenom || 'Client sans nom'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700 md:text-sm">
                État de la machine
              </label>
              <select
                value={filterEtat}
                onChange={(e) => setFilterEtat(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-slate-100 transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                <option value="tous">Tous les états</option>
                {ALL_MACHINE_STATES.map((state) => {
                  const config = getMachineStateConfig(state);
                  return (
                    <option key={state} value={state}>
                      {config.label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700 md:text-sm">
                Date programmée de l'OT
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-slate-500">
                  Du
                  <input type="date" value={filterDateProgrammeeFrom} max={filterDateProgrammeeTo || undefined} onChange={(e) => setFilterDateProgrammeeFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20" />
                </label>
                <label className="text-[11px] text-slate-500">
                  Au
                  <input type="date" value={filterDateProgrammeeTo} min={filterDateProgrammeeFrom || undefined} onChange={(e) => setFilterDateProgrammeeTo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20" />
                </label>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700 md:text-sm">
                Date de création de l'OT
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-slate-500">
                  Du
                  <input type="date" value={filterDateCreationFrom} max={filterDateCreationTo || undefined} onChange={(e) => setFilterDateCreationFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20" />
                </label>
                <label className="text-[11px] text-slate-500">
                  Au
                  <input type="date" value={filterDateCreationTo} min={filterDateCreationFrom || undefined} onChange={(e) => setFilterDateCreationTo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20" />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
              <div className="mb-4 h-6 rounded bg-slate-200"></div>
              <div className="space-y-2">
                <div className="h-4 rounded bg-slate-200"></div>
                <div className="h-4 w-3/4 rounded bg-slate-200"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && allMachines.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-slate-100 md:p-12">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Settings size={32} className="text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-slate-900 md:text-xl">Aucune machine trouvée</h3>
          <p className="text-sm text-slate-600 md:text-base">
            {activeFiltersCount > 0
              ? 'Aucune machine ne correspond à vos critères de recherche.'
              : 'Aucune machine disponible pour le moment.'}
          </p>
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200/50 transition-all hover:bg-blue-700"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Grille des machines */}
      {!loading && allMachines.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {allMachines.map((machine) => {
            const stateConfig = getMachineStateConfig(machine.etat);
            const otCount = otCounts[machine.id] || 0;

            return (
              <div
                key={machine.id}
                onClick={() => navigate(`/machine/${machine.id}`)}
                className="group cursor-pointer rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-lg hover:ring-2 hover:ring-blue-600 md:p-5"
              >
                {/* En-tête */}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors md:text-lg">
                      {machine.nom}
                    </h3>
                    {machine.client && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {machine.client.raison_sociale || machine.client.prenom}
                      </p>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ${stateConfig.bgColor} ${stateConfig.textColor} border ${stateConfig.borderColor}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${stateConfig.dotColor} animate-pulse`}></span>
                    {stateConfig.label}
                  </span>
                </div>

                {/* Infos */}
                <div className="space-y-2 text-sm">
                  {machine.modele && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Settings size={14} className="flex-shrink-0 text-slate-400" />
                      <span className="truncate font-semibold">{machine.modele}</span>
                    </div>
                  )}
                  {machine.localisation && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin size={14} className="flex-shrink-0 text-slate-400" />
                      <span className="truncate font-semibold">{machine.localisation}</span>
                    </div>
                  )}
                  {machine.annee && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Calendar size={14} className="flex-shrink-0 text-slate-400" />
                      <span className="font-semibold">{machine.annee}</span>
                    </div>
                  )}
                </div>

                {/* Badge OT */}
                {otCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs">
                      <ClipboardList size={12} className="text-orange-600" />
                      <span className="font-bold text-orange-700">
                        {otCount} OT {otCount > 1 ? 'actifs' : 'actif'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Infinite scroll trigger */}
      <div ref={observerTarget} className="mt-6 flex justify-center">
        {loadingMore && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"></div>
            Chargement...
          </div>
        )}
        {!hasMore && allMachines.length > 0 && (
          <div className="text-sm text-slate-500">Toutes les machines sont affichées</div>
        )}
      </div>
    </TechnicienLayout>
  );
}

function getNextDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
