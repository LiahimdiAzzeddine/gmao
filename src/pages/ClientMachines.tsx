import { useEffect, useMemo, useState } from 'react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardList,
  Eye,
  ImageIcon,
  MapPin,
  Package,
  Search,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ClientLayout from '../components/ClientLayout';
import EmptyState from '../components/Ui/EmptyState';

type ClientMachine = {
  id: string;
  nom: string;
  modele: string | null;
  numero_serie: string | null;
  fabricant: string | null;
  localisation: string | null;
  etat: string | null;
  annee: number | null;
  puissance: string | null;
  tension: string | null;
  qte: number | null;
  image_url: string | null;
  created_at: string;
  ordres_travail_count?: number;
  interventions_count?: number;
  dernier_ot?: string | null;
};

function getMachineStateConfig(etat: string | null) {
  const configs: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
    'en service': {
      label: 'En service',
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
    },
    'en panne': {
      label: 'En panne',
      className: 'bg-red-100 text-red-800 border-red-200',
      icon: AlertCircle,
    },
    'hors service': {
      label: 'Hors service',
      className: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: XCircle,
    },
  };

  return configs[etat?.toLowerCase() || ''] || {
    label: etat || 'Non défini',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Clock,
  };
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'N/A';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

export default function ClientMachines() {
  const { profile, client } = useAuth();
  const navigate = useNavigate();
  const [machines, setMachines] = useState<ClientMachine[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEtat, setFilterEtat] = useState('tous');

  const observerTarget = React.useRef<HTMLDivElement>(null);
  const itemsPerPage = 20;

  useEffect(() => {
    // Réinitialiser et charger la première page quand les filtres changent
    setMachines([]);
    setCurrentPage(0);
    setHasMore(true);
    loadClientMachines(0, true);
  }, [profile?.id, client?.id, filterEtat]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadClientMachines(currentPage + 1, false);
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

  async function loadClientMachines(page: number, reset: boolean) {
    if (!profile) return;

    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      let clientId = client?.id;
      if (!clientId) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (clientError) throw clientError;
        clientId = clientData?.id;
      }

      if (!clientId) {
        setMachines([]);
        setHasMore(false);
        setTotalCount(0);
        return;
      }

      // Pagination
      const from = page * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('machines')
        .select('*', { count: 'exact' })
        .eq('client_id', clientId);

      // Filtre par état
      if (filterEtat !== 'tous') {
        query = query.eq('etat', filterEtat);
      }

      const { data: machinesData, count, error: machinesError } = await query
        .order('nom')
        .range(from, to);

      if (machinesError) throw machinesError;

      const newMachines = (machinesData || []) as ClientMachine[];

      // Charger les compteurs d'OT et interventions
      if (newMachines.length > 0) {
        const machineIds = newMachines.map(m => m.id);

        // Compter les OT
        const { data: otData } = await supabase
          .from('ordres_travail')
          .select('machine_id, created_at')
          .in('machine_id', machineIds);

        // Compter les interventions
        const { data: interventionsData } = await supabase
          .from('interventions')
          .select('machine_id')
          .in('machine_id', machineIds);

        // Ajouter les compteurs aux machines
        newMachines.forEach(machine => {
          const machineOts = otData?.filter(ot => ot.machine_id === machine.id) || [];
          machine.ordres_travail_count = machineOts.length;
          machine.interventions_count = interventionsData?.filter(i => i.machine_id === machine.id).length || 0;
          machine.dernier_ot = machineOts.length > 0 
            ? machineOts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
            : null;
        });
      }

      if (reset) {
        setMachines(newMachines);
        setTotalCount(count || 0);
      } else {
        setMachines((prev) => [...prev, ...newMachines]);
      }

      setCurrentPage(page);
      setHasMore(newMachines.length === itemsPerPage);
    } catch (err) {
      console.error('Erreur chargement machines:', err);
      setError('Impossible de charger les machines du client.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const filteredMachines = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return machines.filter((machine) => {
      const matchesSearch = !query ||
        machine.nom.toLowerCase().includes(query) ||
        machine.modele?.toLowerCase().includes(query) ||
        machine.numero_serie?.toLowerCase().includes(query) ||
        machine.fabricant?.toLowerCase().includes(query) ||
        machine.localisation?.toLowerCase().includes(query);

      return matchesSearch;
    });
  }, [machines, searchTerm]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterEtat('tous');
  };

  const hasFilters = searchTerm.trim() || filterEtat !== 'tous';

  return (
    <ClientLayout>
      {/* En-tête */}
      <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 md:text-2xl lg:text-3xl">Mes machines</h1>
          <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm">
            Consultez votre parc de machines industrielles
          </p>
        </div>
        <div className="hidden rounded-lg border border-[#ff6b57]/30 bg-white px-3 py-1.5 text-xs font-bold text-[#ff6b57] md:block md:px-4 md:py-2 md:text-sm">
          {filteredMachines.length} / {totalCount} machines
        </div>
      </div>

      {/* Filtres */}
      <div className="mt-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:mt-6 md:p-5">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher par nom, modèle, série, fabricant..."
              className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#ff6b57] focus:border-transparent text-sm transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={filterEtat}
              onChange={(event) => setFilterEtat(event.target.value)}
              className="w-full sm:w-44 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#ff6b57] focus:border-transparent text-sm bg-white transition-all"
            >
              <option value="tous">Tous les états</option>
              <option value="en service">En service</option>
              <option value="en panne">En panne</option>
              <option value="hors service">Hors service</option>
            </select>

            {hasFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold text-sm transition-colors"
              >
                <X size={16} />
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 text-xs font-semibold text-slate-500 sm:text-sm">
          {filteredMachines.length} machine{filteredMachines.length > 1 ? 's' : ''} affichée{filteredMachines.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mt-4 md:mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="mt-4 md:mt-6 grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5 animate-pulse">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-slate-200"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </div>
                <div className="h-7 w-24 bg-slate-200 rounded-lg"></div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-slate-200 rounded"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="mt-4 md:mt-6">
          <EmptyState
            title={hasFilters ? 'Aucune machine trouvée' : 'Aucune machine'}
            message={hasFilters ? 'Aucune machine ne correspond à vos filtres.' : "Vous n'avez pas encore de machines enregistrées."}
          />
        </div>
      ) : (
        <>
          {/* Grille de cartes machines */}
          <div className="mt-4 md:mt-6 grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {filteredMachines.map((machine) => (
              <MachineCard
                key={machine.id}
                machine={machine}
                onClick={() => navigate(`/machine/${machine.id}`)}
              />
            ))}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={observerTarget} className="mt-4 flex justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#ff6b57]"></div>
                Chargement...
              </div>
            )}
            {!hasMore && filteredMachines.length > 0 && (
              <div className="text-sm text-slate-500 py-4">
                Toutes les machines sont affichées
              </div>
            )}
          </div>
        </>
      )}
    </ClientLayout>
  );
}

function MachineCard({
  machine,
  onClick,
}: {
  machine: ClientMachine;
  onClick: () => void;
}) {
  const stateConfig = getMachineStateConfig(machine.etat);
  const StateIcon = stateConfig.icon;

  return (
    <div className="flex flex-col rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-lg md:p-5">
      <div className="flex items-start justify-between gap-3">
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
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-slate-900 truncate md:text-lg">{machine.nom}</h3>
          {machine.modele && (
            <p className="mt-1 text-sm font-semibold text-slate-500 truncate">{machine.modele}</p>
          )}
        </div>
        <span className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${stateConfig.className}`}>
          <StateIcon size={12} />
          {stateConfig.label}
        </span>
      </div>

      <div className="mt-4 flex-1 space-y-2.5 text-sm">
        {machine.numero_serie && (
          <div className="flex items-center gap-2 text-slate-700">
            <Package size={14} className="text-slate-400 flex-shrink-0" />
            <span className="font-semibold truncate">N° {machine.numero_serie}</span>
          </div>
        )}

        {machine.fabricant && (
          <div className="flex items-center gap-2 text-slate-700">
            <Wrench size={14} className="text-slate-400 flex-shrink-0" />
            <span className="font-semibold truncate">{machine.fabricant}</span>
          </div>
        )}

        {machine.localisation && (
          <div className="flex items-center gap-2 text-slate-700">
            <MapPin size={14} className="text-slate-400 flex-shrink-0" />
            <span className="font-semibold truncate">{machine.localisation}</span>
          </div>
        )}

        {machine.dernier_ot && (
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar size={14} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs font-medium">Dernier OT : {formatDate(machine.dernier_ot)}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-[#ff6b57]" />
          <span className="text-sm font-black text-slate-900">{machine.ordres_travail_count || 0}</span>
          <span className="text-xs font-semibold text-slate-500">OT</span>
        </div>
        <div className="flex items-center gap-2">
          <Wrench size={16} className="text-emerald-600" />
          <span className="text-sm font-black text-slate-900">{machine.interventions_count || 0}</span>
          <span className="text-xs font-semibold text-slate-500">Interventions</span>
        </div>
      </div>

      <button 
        onClick={onClick}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ff735f] to-[#f04438] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-200/50 transition-all hover:from-[#ff6b57] hover:to-[#e03d30] hover:shadow-red-300/50 active:scale-95"
      >
        <Eye size={16} />
        Voir détails
      </button>
    </div>
  );
}
