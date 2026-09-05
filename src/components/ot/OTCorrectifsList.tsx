import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getOtStatusLabel, normalizeOtStatus } from '../../utils/otStatus';
import { 
  Wrench, 
  Calendar, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Filter,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Loader2,
  ListChecks
} from 'lucide-react';
import { toast } from 'react-toastify';

interface OrdreTravail {
  id: string;
  numot: number | string | null;
  plan_id: string | null;
  ot_parent_id: string | null;
  machine_id: string;
  technicien_id: string | null;
  date_programmee: string;
  date_realisation: string | null;
  statut: 'prévu' | 'en_cours' | 'terminé' | 'clôturé_avec_anomalie' | 'annulé';
  observations: string | null;
  cause: string | null;
  lot_defaillance: string | null;
  famille_probleme: string | null;
  mode_defaillance: string | null;
  problem_lot?: { nom: string } | null;
  problem_family?: { nom: string } | null;
  failure_mode?: { nom: string } | null;
  type: string;
  created_at: string;
  machine?: {
    id: string;
    nom: string;
    numero_serie: string | null;
    client?: {
      id: string;
      raison_sociale: string | null;
      prenom: string | null;
    };
  };
  technicien?: {
    id: string;
    nom: string;
  };
  plan?: {
    id: string;
    numero: number | string | null;
  } | null;
  ot_parent?: {
    plan_id: string | null;
    plan?: {
      id: string;
      numero: number | string | null;
    } | null;
  } | null;
}

function getPlanReference(ordre: OrdreTravail) {
  const plan = ordre.plan || ordre.ot_parent?.plan || null;
  const id = ordre.plan_id || ordre.ot_parent?.plan_id || plan?.id || null;
  return { id, numero: plan?.numero ?? null };
}

export default function OTCorrectifsList() {
  const navigate = useNavigate();
  
  const [ordres, setOrdres] = useState<OrdreTravail[]>([]);
  const [filteredOrdres, setFilteredOrdres] = useState<OrdreTravail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [filterClient, setFilterClient] = useState<string>('tous');
  const [sortCreation, setSortCreation] = useState<'recent' | 'ancien'>('recent');
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    loadOrdresTravail();
  }, []);

  useEffect(() => {
    filterOrdres();
  }, [searchTerm, filterStatut, filterClient, sortCreation, ordres]);

  // Réinitialiser à la page 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatut, filterClient, sortCreation]);

  const loadOrdresTravail = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('ordres_travail')
        .select(`
          *,
          machine:machines(
            id,
            nom,
            numero_serie,
            client:clients(
              id,
              raison_sociale,
              prenom
            )
          ),
          technicien:profiles!ordres_travail_technicien_id_fkey(
            id,
            nom
          ),
          problem_lot:plan_action_lots!ordres_travail_problem_lot_id_fkey(nom),
          problem_family:plan_action_problem_families!ordres_travail_problem_family_id_fkey(nom),
          failure_mode:plan_action_failure_modes!ordres_travail_failure_mode_id_fkey(nom)
        `)
        .eq('type', 'correctif')
        .order('date_programmee', { ascending: false });

      if (error) throw error;

      const baseOrdres = (data || []) as unknown as OrdreTravail[];
      const parentIds = [...new Set(
        baseOrdres
          .filter((ordre) => !ordre.plan_id && ordre.ot_parent_id)
          .map((ordre) => ordre.ot_parent_id as string)
      )];
      const parentPlanByOt = new Map<string, string>();

      if (parentIds.length > 0) {
        const { data: parents, error: parentsError } = await supabase
          .from('ordres_travail')
          .select('id, plan_id')
          .in('id', parentIds);

        if (parentsError) {
          console.warn('Impossible de charger les plans des OT parents:', parentsError);
        } else {
          (parents || []).forEach((parent) => {
            if (parent.plan_id) parentPlanByOt.set(parent.id, parent.plan_id);
          });
        }
      }

      const planIds = [...new Set(
        baseOrdres
          .map((ordre) => ordre.plan_id || (ordre.ot_parent_id ? parentPlanByOt.get(ordre.ot_parent_id) : null))
          .filter((planId): planId is string => Boolean(planId))
      )];
      const plansById = new Map<string, { id: string; numero: number | string | null }>();

      if (planIds.length > 0) {
        const { data: plans, error: plansError } = await supabase
          .from('plans_maintenance')
          .select('id, numero')
          .in('id', planIds);

        if (plansError) {
          console.warn('Impossible de charger les références des plans:', plansError);
        } else {
          (plans || []).forEach((plan) => plansById.set(plan.id, plan));
        }
      }

      setOrdres(baseOrdres.map((ordre) => {
        const parentPlanId = ordre.ot_parent_id ? parentPlanByOt.get(ordre.ot_parent_id) || null : null;
        return {
          ...ordre,
          plan: ordre.plan_id ? plansById.get(ordre.plan_id) || null : null,
          ot_parent: ordre.ot_parent_id
            ? { plan_id: parentPlanId, plan: parentPlanId ? plansById.get(parentPlanId) || null : null }
            : null,
        };
      }));
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      toast.error('Erreur lors du chargement des ordres de travail');
    } finally {
      setLoading(false);
    }
  };

  const filterOrdres = () => {
    let filtered = [...ordres];

    // Filtre par statut
    if (filterStatut !== 'tous') {
      filtered = filtered.filter(o => o.statut === filterStatut);
    }

    // Filtre par client
    if (filterClient !== 'tous') {
      filtered = filtered.filter(o => o.machine?.client?.id === filterClient);
    }

    // Filtre par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o => 
        o.numot?.toString().toLowerCase().includes(term) ||
        o.id.toLowerCase().includes(term) ||
        getPlanReference(o).id?.toLowerCase().includes(term) ||
        getPlanReference(o).numero?.toString().toLowerCase().includes(term) ||
        o.machine?.nom?.toLowerCase().includes(term) ||
        o.machine?.client?.raison_sociale?.toLowerCase().includes(term) ||
        o.machine?.client?.prenom?.toLowerCase().includes(term) ||
        o.technicien?.nom?.toLowerCase().includes(term) ||
        o.problem_lot?.nom?.toLowerCase().includes(term) ||
        o.problem_family?.nom?.toLowerCase().includes(term) ||
        o.failure_mode?.nom?.toLowerCase().includes(term) ||
        o.mode_defaillance?.toLowerCase().includes(term) ||
        o.cause?.toLowerCase().includes(term) ||
        o.observations?.toLowerCase().includes(term)
      );
    }

    // Tri par date de création
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortCreation === 'recent' ? dateB - dateA : dateA - dateB;
    });

    setFilteredOrdres(filtered);
  };

  const clients = Array.from(
    new Map(
      ordres
        .map((ordre) => ordre.machine?.client)
        .filter((client): client is NonNullable<typeof client> => Boolean(client?.id))
        .map((client) => [client.id, client])
    ).values()
  ).sort((a, b) => {
    const nameA = a.raison_sociale || a.prenom || '';
    const nameB = b.raison_sociale || b.prenom || '';
    return nameA.localeCompare(nameB, 'fr');
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet ordre de travail ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ordres_travail')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Ordre de travail supprimé avec succès');
      loadOrdresTravail();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStatutBadge = (statut: string) => {
    const styles = {
      'prévu': 'bg-blue-100 text-blue-800 border-blue-200',
      'en_cours': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'terminé': 'bg-green-100 text-green-800 border-green-200',
      'clôturé_avec_anomalie': 'bg-orange-100 text-orange-800 border-orange-200',
      'annulé': 'bg-red-100 text-red-800 border-red-200'
    };

    const icons = {
      'prévu': Clock,
      'en_cours': AlertCircle,
      'terminé': CheckCircle2,
      'clôturé_avec_anomalie': AlertCircle,
      'annulé': AlertCircle
    };

    const normalizedStatus = normalizeOtStatus(statut);
    const Icon = normalizedStatus ? icons[normalizedStatus] : Clock;
    const style = normalizedStatus
      ? styles[normalizedStatus]
      : 'bg-slate-100 text-slate-800 border-slate-200';

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${style}`}>
        <Icon className="w-3 h-3" />
        {getOtStatusLabel(statut)}
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Calcul de la pagination
  const totalPages = Math.ceil(filteredOrdres.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrdres = filteredOrdres.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin text-[#f98440]" />
          <p className="text-sm font-bold text-slate-700">Chargement des OT correctifs…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-14">
      <div className="mx-auto px-3 sm:px-5 lg:px-6">
        {/* En-tête */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 md:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#d95708]">
                  <Wrench className="h-6 w-6" />
                </span>
                <div>
                  <h1 className="text-xl font-black text-slate-900 md:text-2xl">
                    Ordres de Travail Correctifs
                  </h1>
                  <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                    Gestion des interventions correctives • {filteredOrdres.length} OT{filteredOrdres.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/demande-maintenance/new')}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#ee6b1a] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#d95708]"
              >
                <Plus className="w-5 h-5" />
                Nouveau OT Correctif
              </button>
            </div>
          </div>

          {/* Filtres et recherche */}
          <div className="bg-slate-50/70 p-4 md:p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_190px_220px_220px]">
              {/* Recherche */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Rechercher par OT, plan, machine, client ou technicien…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
                  />
                </div>
              </div>

              {/* Filtre par statut */}
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={filterStatut}
                  onChange={(e) => setFilterStatut(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
                >
                  <option value="tous">Tous les statuts</option>
                  <option value="prévu">À faire</option>
                  <option value="en_cours">En cours</option>
                  <option value="terminé">Clôturé</option>
                  <option value="clôturé_avec_anomalie">Clôturé avec anomalie</option>
                  <option value="annulé">Annulés</option>
                </select>
              </div>

              {/* Filtre par client */}
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
                >
                  <option value="tous">Tous les clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.raison_sociale || client.prenom || 'Client sans nom'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tri par date de création */}
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={sortCreation}
                  onChange={(e) => setSortCreation(e.target.value as 'recent' | 'ancien')}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
                  aria-label="Trier par date de création"
                >
                  <option value="recent">Création : plus récents</option>
                  <option value="ancien">Création : plus anciens</option>
                </select>
              </div>
            </div>

            {/* Statistiques */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 md:grid-cols-4">
              <div className="rounded-xl border border-orange-100 bg-white p-3 md:p-4">
                <div className="text-2xl font-black text-[#d95708]">
                  {ordres.filter(o => o.statut === 'prévu').length}
                </div>
                <div className="mt-1 text-xs font-bold text-slate-500">À faire</div>
              </div>
              <div className="rounded-xl border border-yellow-100 bg-white p-3 md:p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {ordres.filter(o => o.statut === 'en_cours').length}
                </div>
                <div className="text-sm text-yellow-600 mt-1">En cours</div>
              </div>
              <div className="rounded-xl border border-green-100 bg-white p-3 md:p-4">
                <div className="text-2xl font-bold text-green-600">
                  {ordres.filter(o => o.statut === 'terminé' || o.statut === 'clôturé_avec_anomalie').length}
                </div>
                <div className="text-sm text-green-600 mt-1">Clôturés</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
                <div className="text-2xl font-bold text-slate-600">
                  {ordres.length}
                </div>
                <div className="text-sm text-slate-600 mt-1">Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Table des ordres */}
        {filteredOrdres.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Wrench className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Aucun ordre de travail trouvé
            </h3>
            <p className="text-slate-500">
              {searchTerm || filterStatut !== 'tous' || filterClient !== 'tous'
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Créez votre premier ordre de travail correctif'}
            </p>
          </div>
        ) : (
          <>
            {/* VUE MOBILE - CARTES */}
            <div className="lg:hidden space-y-3">
              {paginatedOrdres.map((ordre) => (
                <div
                  key={ordre.id}
                  className="overflow-hidden rounded-xl border border-slate-200 border-l-4 border-l-orange-400 bg-white shadow-sm"
                >
                  {/* Header de la carte */}
                  <div className="p-3 border-b border-slate-200 bg-orange-50/30">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="mb-1 font-mono text-[11px] font-bold text-[#d95708]">OT #{ordre.numot ?? ordre.id.slice(0, 8)}</p>
                        <h3 className="text-sm font-bold text-slate-900">
                          {ordre.machine?.nom || 'Machine inconnue'}
                        </h3>
                        <p className="text-xs text-slate-600">
                          {ordre.machine?.client?.raison_sociale || ordre.machine?.client?.prenom || 'Client inconnu'}
                        </p>
                      </div>
                      {getStatutBadge(ordre.statut)}
                    </div>
                  </div>

                  {/* Contenu de la carte */}
                  <div className="p-3 space-y-2">
                    {/* Plan de maintenance associé */}
                    <div className="flex items-center gap-2">
                      <ListChecks size={14} className="flex-shrink-0 text-slate-400" />
                      <span className="text-xs text-slate-600">Plan :</span>
                      {getPlanReference(ordre).id ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/plans-maintenance/${getPlanReference(ordre).id}`)}
                          className="rounded-md bg-orange-50 px-2 py-1 font-mono text-xs font-bold text-[#d95708] transition hover:bg-orange-100 hover:underline"
                          title={getPlanReference(ordre).id || undefined}
                        >
                          #{getPlanReference(ordre).numero ?? getPlanReference(ordre).id?.slice(0, 8)}
                        </button>
                      ) : (
                        <span className="text-xs italic text-slate-400">Non associé</span>
                      )}
                    </div>

                    {/* Date de création */}
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-600">Créé le:</span>
                      <span className="text-xs text-slate-900 font-medium">
                        {formatDate(ordre.created_at)}
                      </span>
                    </div>

                    {/* Date programmée */}
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-600">Date prévue:</span>
                      <span className="text-xs text-slate-900 font-medium">
                        {formatDate(ordre.date_programmee)}
                      </span>
                    </div>

                    {/* Technicien */}
                    {ordre.technicien && (
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-slate-600">Technicien:</span>
                        <span className="text-xs text-slate-900 font-medium">
                          {ordre.technicien.nom}
                        </span>
                      </div>
                    )}

                    {/* Cause */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                      <span className="font-semibold">Défaillance : </span>
                      {ordre.failure_mode?.nom || ordre.mode_defaillance || 'Non classée'}
                    </div>

                    {/* Cause */}
                    {ordre.cause && (
                      <div className="pt-2 border-t border-slate-200">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={14} className="text-orange-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="text-xs font-semibold text-orange-800 uppercase">Cause</span>
                            <p className="text-xs text-orange-700 mt-1 line-clamp-2">{ordre.cause}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/ordres-travail/${ordre.id}`)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#f98440] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#e97435]"
                    >
                      <Eye size={14} />
                      <span>Voir</span>
                    </button>
                    <button
                      onClick={() => navigate(`/admin/demande-maintenance/${ordre.id}/edit`)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
                    >
                      <Edit size={14} />
                      <span>Modifier</span>
                    </button>
                    <button
                      onClick={() => handleDelete(ordre.id)}
                      className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* VUE DESKTOP - TABLE */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1300px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        OT #
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Défaillance
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Machine
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Date de création
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Date programmée
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Technicien
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Cause
                      </th>
                      <th className="sticky right-0 bg-slate-50 px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedOrdres.map((ordre) => (
                      <tr key={ordre.id} className="group bg-white hover:bg-orange-50/50 transition-colors border-l-4 border-l-orange-400">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => navigate(`/ordres-travail/${ordre.id}`)}
                            className="font-mono text-sm font-bold text-slate-800 transition hover:text-[#d95708] hover:underline"
                            title={ordre.id}
                          >
                            #{ordre.numot ?? ordre.id.substring(0, 8)}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPlanReference(ordre).id ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/plans-maintenance/${getPlanReference(ordre).id}`)}
                              className="rounded-lg bg-orange-50 px-2.5 py-1.5 font-mono text-xs font-bold text-[#d95708] transition hover:bg-orange-100 hover:underline"
                              title={getPlanReference(ordre).id || undefined}
                            >
                              #{getPlanReference(ordre).numero ?? getPlanReference(ordre).id?.slice(0, 8)}
                            </button>
                          ) : (
                            <span className="text-sm italic text-slate-400">Non associé</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900">{ordre.failure_mode?.nom || ordre.mode_defaillance || 'Non classée'}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {[ordre.problem_lot?.nom || ordre.lot_defaillance, ordre.problem_family?.nom || ordre.famille_probleme].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900 font-medium">
                            {ordre.machine?.nom || 'Machine inconnue'}
                          </div>
                          {ordre.machine?.numero_serie && (
                            <div className="text-xs text-slate-500">
                              N° {ordre.machine.numero_serie}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">
                            {ordre.machine?.client?.raison_sociale || ordre.machine?.client?.prenom || 'Client inconnu'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatutBadge(ordre.statut)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-slate-400" />
                            <span className="text-sm text-slate-900">
                              {formatDate(ordre.created_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-slate-400" />
                            <span className="text-sm text-slate-900">
                              {formatDate(ordre.date_programmee)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-slate-400" />
                            <span className="text-sm text-slate-900">
                              {ordre.technicien?.nom || 'Non assigné'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900 max-w-xs truncate" title={ordre.cause || ''}>
                            {ordre.cause || '-'}
                          </div>
                        </td>
                        <td className="sticky right-0 bg-white px-6 py-4 whitespace-nowrap shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/ordres-travail/${ordre.id}`)}
                              className="rounded-lg p-2 text-[#f98440] transition-colors hover:bg-orange-50"
                              title="Voir détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/admin/demande-maintenance/${ordre.id}/edit`)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(ordre.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Pagination */}
        {filteredOrdres.length > itemsPerPage && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Informations de pagination */}
              <div className="text-sm text-slate-600">
                Affichage de {startIndex + 1} à {Math.min(endIndex, filteredOrdres.length)} sur {filteredOrdres.length} OT
              </div>

              {/* Contrôles de pagination */}
              <div className="flex items-center gap-2">
                {/* Bouton précédent */}
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Précédent
                </button>

                {/* Numéros de page */}
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' ? goToPage(page) : undefined}
                      disabled={typeof page === 'string'}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        page === currentPage
                          ? 'bg-[#f98440] text-white'
                          : typeof page === 'string'
                          ? 'text-slate-400 cursor-default'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                {/* Bouton suivant */}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === totalPages
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Suivant
                </button>
              </div>

              {/* Sélecteur d'éléments par page */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Éléments par page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-300 px-2 py-1 focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
