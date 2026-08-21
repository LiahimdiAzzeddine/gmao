import { useEffect, useMemo, useState } from 'react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Search,
  Settings,
  X,
  Wrench,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ClientLayout from '../components/ClientLayout';
import EmptyState from '../components/Ui/EmptyState';

type OTNonTraite = {
  id: string;
  numot: number | null;
  type: string;
  statut: string;
  date_programmee: string | null;
  created_at: string;
  machine: {
    id: string;
    nom: string;
    modele: string | null;
    localisation: string | null;
  } | null;
  interventions?: Array<{
    id: string;
    valide: boolean | null;
  }> | null;
};

function getOTTypeConfig(type: string | null) {
  const configs: Record<string, { label: string; className: string; icon: typeof ClipboardList }> = {
    'préventif': {
      label: 'Préventif',
      className: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: Calendar,
    },
    'correctif': {
      label: 'Correctif',
      className: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: Wrench,
    },
    'curatif': {
      label: 'Curatif',
      className: 'bg-red-100 text-red-800 border-red-200',
      icon: AlertCircle,
    },
  };

  return configs[type?.toLowerCase() || ''] || {
    label: type || 'Non défini',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: ClipboardList,
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

export default function ClientOTNonTraites() {
  const { profile, client } = useAuth();
  const navigate = useNavigate();
  const [ordresTravail, setOrdresTravail] = useState<OTNonTraite[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('tous');
  const [filterMachine, setFilterMachine] = useState('toutes');
  const [machines, setMachines] = useState<Array<{ id: string; nom: string }>>([]);

  const observerTarget = React.useRef<HTMLDivElement>(null);
  const itemsPerPage = 20;

  useEffect(() => {
    // Charger les machines du client
    loadMachines();
  }, [profile?.id, client?.id]);

  useEffect(() => {
    // Réinitialiser et charger la première page quand les filtres changent
    setOrdresTravail([]);
    setCurrentPage(0);
    setHasMore(true);
    loadOTNonTraites(0, true);
  }, [profile?.id, client?.id, filterType]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadOTNonTraites(currentPage + 1, false);
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

  async function loadMachines() {
    if (!profile) return;

    try {
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
        return;
      }

      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select('id, nom')
        .eq('client_id', clientId)
        .order('nom');

      if (machinesError) throw machinesError;

      setMachines(machinesData || []);
    } catch (err) {
      console.error('Erreur chargement machines:', err);
    }
  }

  async function loadOTNonTraites(page: number, reset: boolean) {
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
        setOrdresTravail([]);
        setHasMore(false);
        setTotalCount(0);
        return;
      }

      // Pagination
      const from = page * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('ordres_travail')
        .select(`
          id,
          numot,
          type,
          statut,
          date_programmee,
          created_at,
          machine:machines!inner(
            id,
            nom,
            modele,
            localisation,
            client_id
          ),
          interventions:interventions!interventions_ot_fkey(
            id,
            valide
          )
        `, { count: 'exact' })
        .eq('machine.client_id', clientId);

      // Filtre par type
      if (filterType !== 'tous') {
        query = query.eq('type', filterType);
      }

      const { data: otData, count, error: otError } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (otError) throw otError;

      // Filtrer les OT non traités (sans intervention validée)
      const newOTs = ((otData || []) as OTNonTraite[]).filter((ot) => {
        const hasValidIntervention = (ot.interventions || []).some((inter) => inter.valide === true);
        return !hasValidIntervention;
      });

      if (reset) {
        setOrdresTravail(newOTs);
        // Compter tous les OT non traités
        const allOTCount = ((otData || []) as OTNonTraite[]).filter((ot) => {
          const hasValidIntervention = (ot.interventions || []).some((inter) => inter.valide === true);
          return !hasValidIntervention;
        }).length;
        setTotalCount(allOTCount);
      } else {
        setOrdresTravail((prev) => [...prev, ...newOTs]);
      }

      setCurrentPage(page);
      setHasMore(newOTs.length === itemsPerPage);
    } catch (err) {
      console.error('Erreur chargement OT non traités:', err);
      setError('Impossible de charger les ordres de travail non traités.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const filteredOTs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return ordresTravail.filter((ot) => {
      const matchesSearch = !query ||
        ot.numot?.toString().includes(query) ||
        ot.machine?.nom.toLowerCase().includes(query) ||
        ot.machine?.modele?.toLowerCase().includes(query) ||
        ot.machine?.localisation?.toLowerCase().includes(query) ||
        ot.type?.toLowerCase().includes(query) ||
        ot.statut?.toLowerCase().includes(query);

      const matchesMachine = filterMachine === 'toutes' || ot.machine?.id === filterMachine;

      return matchesSearch && matchesMachine;
    });
  }, [ordresTravail, searchTerm, filterMachine]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('tous');
    setFilterMachine('toutes');
  };

  const hasFilters = searchTerm.trim() || filterType !== 'tous' || filterMachine !== 'toutes';

  return (
    <ClientLayout>
      {/* En-tête */}
      <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 md:text-2xl lg:text-3xl">OT non traités</h1>
          <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm">
            Ordres de travail en attente d'intervention validée
          </p>
        </div>
        <div className="hidden rounded-lg border border-[#ff6b57]/30 bg-white px-3 py-1.5 text-xs font-bold text-[#ff6b57] md:block md:px-4 md:py-2 md:text-sm">
          {filteredOTs.length} / {totalCount} OT
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
              placeholder="Rechercher par N° OT, machine, type..."
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
              value={filterType}
              onChange={(event) => setFilterType(event.target.value)}
              className="w-full sm:w-44 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#ff6b57] focus:border-transparent text-sm bg-white transition-all"
            >
              <option value="tous">Tous les types</option>
              <option value="préventif">Préventif</option>
              <option value="correctif">Correctif</option>
            </select>

            <select
              value={filterMachine}
              onChange={(event) => setFilterMachine(event.target.value)}
              className="w-full sm:w-56 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#ff6b57] focus:border-transparent text-sm bg-white transition-all"
            >
              <option value="toutes">Toutes les machines</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.nom}
                </option>
              ))}
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
          {filteredOTs.length} OT non traité{filteredOTs.length > 1 ? 's' : ''}
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
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
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
      ) : filteredOTs.length === 0 ? (
        <div className="mt-4 md:mt-6">
          <EmptyState
            title={hasFilters ? 'Aucun OT non traité trouvé' : 'Aucun OT non traité'}
            message={hasFilters ? 'Aucun OT ne correspond à vos filtres.' : "Tous vos ordres de travail ont été traités."}
          />
        </div>
      ) : (
        <>
          {/* Grille de cartes OT */}
          <div className="mt-4 md:mt-6 grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {filteredOTs.map((ot) => (
              <OTCard key={ot.id} ot={ot} />
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
            {!hasMore && filteredOTs.length > 0 && (
              <div className="text-sm text-slate-500 py-4">
                Tous les OT sont affichés
              </div>
            )}
          </div>
        </>
      )}
    </ClientLayout>
  );
}

function OTCard({ ot }: { ot: OTNonTraite }) {
  const typeConfig = getOTTypeConfig(ot.type);
  const TypeIcon = typeConfig.icon;

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-[#ff6b57] flex-shrink-0" />
            <h3 className="text-base font-black text-slate-900 md:text-lg">
              OT #{ot.numot || 'N/A'}
            </h3>
          </div>
          {ot.machine && (
            <p className="mt-1 text-sm font-semibold text-slate-500 truncate">{ot.machine.nom}</p>
          )}
        </div>
        <span className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${typeConfig.className}`}>
          <TypeIcon size={12} />
          {typeConfig.label}
        </span>
      </div>

      <div className="mt-4 space-y-2.5 text-sm">
        {ot.machine?.modele && (
          <div className="flex items-center gap-2 text-slate-700">
            <Settings size={14} className="text-slate-400 flex-shrink-0" />
            <span className="font-semibold truncate">{ot.machine.modele}</span>
          </div>
        )}

        {ot.machine?.localisation && (
          <div className="flex items-center gap-2 text-slate-700">
            <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-semibold truncate">{ot.machine.localisation}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-slate-600">
          <Calendar size={14} className="text-slate-400 flex-shrink-0" />
          <span className="text-xs font-medium">Créé le {formatDate(ot.created_at)}</span>
        </div>

        {ot.date_programmee && (
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar size={14} className="text-orange-500 flex-shrink-0" />
            <span className="text-xs font-medium">Programmé : {formatDate(ot.date_programmee)}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-100 px-2.5 py-1.5 text-xs font-bold text-orange-700">
          <AlertCircle size={12} />
          Non traité
        </span>
      </div>
    </div>
  );
}
