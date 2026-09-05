import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Edit,
  Eye,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCog,
  Wrench,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  AddTechnicienModal,
  DeleteConfirmModal,
  EditTechnicienModal,
  ViewTechnicienModal,
} from './TechnicienModals';

interface Technicien {
  id: string;
  nom: string;
  email: string | null;
  password?: string | null;
  created_at: string;
  totalInterventions: number;
  interventionsEnCours: number;
}

type InterventionStatRow = {
  technicien_id: string;
  date_fin: string | null;
};

const TechniciensTable = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [techniciens, setTechniciens] = useState<Technicien[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTechnicien, setSelectedTechnicien] = useState<Technicien | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    void fetchTechniciens();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    const normalizedSearch = searchTerm.trim();
    if (normalizedSearch) params.set('search', normalizedSearch);
    else params.delete('search');
    setSearchParams(params, { replace: true });
  }, [searchTerm, setSearchParams]);

  const fetchTechniciens = async (background = false): Promise<void> => {
    try {
      if (background) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [techniciensResponse, interventionsResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, nom, email, password, created_at')
          .eq('role', 'technicien')
          .order('nom'),
        supabase
          .from('interventions')
          .select('technicien_id, date_fin'),
      ]);

      if (techniciensResponse.error) throw techniciensResponse.error;
      if (interventionsResponse.error) throw interventionsResponse.error;

      const interventionStats = new Map<string, { total: number; enCours: number }>();
      (interventionsResponse.data as InterventionStatRow[] | null)?.forEach((intervention) => {
        const current = interventionStats.get(intervention.technicien_id) || { total: 0, enCours: 0 };
        current.total += 1;
        if (!intervention.date_fin) current.enCours += 1;
        interventionStats.set(intervention.technicien_id, current);
      });

      setTechniciens((techniciensResponse.data || []).map((technicien) => {
        const stats = interventionStats.get(technicien.id) || { total: 0, enCours: 0 };
        return {
          ...technicien,
          totalInterventions: stats.total,
          interventionsEnCours: stats.enCours,
        };
      }));
    } catch (err) {
      console.error('Erreur lors du chargement des techniciens:', err);
      setError(err instanceof Error ? err.message : 'Impossible de charger les techniciens.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredTechniciens = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase('fr-FR');
    if (!search) return techniciens;
    return techniciens.filter((technicien) =>
      technicien.nom.toLocaleLowerCase('fr-FR').includes(search)
      || technicien.email?.toLocaleLowerCase('fr-FR').includes(search),
    );
  }, [searchTerm, techniciens]);

  const stats = useMemo(() => {
    const totalInterventions = techniciens.reduce((sum, item) => sum + item.totalInterventions, 0);
    const interventionsEnCours = techniciens.reduce((sum, item) => sum + item.interventionsEnCours, 0);
    return {
      totalInterventions,
      interventionsEnCours,
      moyenne: techniciens.length ? Math.round(totalInterventions / techniciens.length) : 0,
    };
  }, [techniciens]);

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Non renseignée';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const closeModal = (setter: (value: boolean) => void) => {
    setter(false);
    setSelectedTechnicien(null);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!selectedTechnicien) return;
    setDeleteLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) throw new Error('Votre session administrateur a expiré.');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-technicien`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedTechnicien.id }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erreur lors de la suppression du technicien.');
      }

      setShowDeleteModal(false);
      setSelectedTechnicien(null);
      await fetchTechniciens(true);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#f98440]" size={30} />
          <p className="mt-3 text-sm font-semibold text-slate-600">Chargement de l’équipe technique…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-l-4 border-[#f98440] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#f98440]">
              <UserCog size={25} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Équipe technique</h2>
              <p className="mt-1 text-sm text-slate-500">Gérez les accès, profils et activités de vos techniciens.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f98440] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#e97435] focus:outline-none focus:ring-2 focus:ring-[#f98440]/30"
          >
            <Plus size={18} />
            Ajouter un technicien
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800" role="alert">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-sm font-bold">Une erreur est survenue</p>
              <p className="mt-0.5 text-xs text-red-700">{error}</p>
            </div>
          </div>
          <button type="button" onClick={() => setError(null)} className="rounded-md p-1 hover:bg-red-100" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Techniciens" value={techniciens.length} icon={UserCog} tone="orange" />
        <StatCard label="Interventions" value={stats.totalInterventions} icon={Wrench} tone="slate" />
        <StatCard label="En cours" value={stats.interventionsEnCours} icon={Loader2} tone="amber" />
        <StatCard label="Moyenne / technicien" value={stats.moyenne} icon={Calendar} tone="slate" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="search"
              placeholder="Rechercher par nom ou adresse e-mail…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#f98440]/60 focus:bg-white focus:ring-2 focus:ring-[#f98440]/15"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Effacer la recherche">
                <X size={16} />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="text-xs font-semibold text-slate-500">
              {filteredTechniciens.length} résultat{filteredTechniciens.length > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => void fetchTechniciens(true)}
              disabled={refreshing}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-[#f98440]/40 hover:bg-orange-50 hover:text-[#f98440] disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[850px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                {['Technicien', 'Adresse e-mail', 'Interventions', 'En cours', 'Membre depuis', 'Actions'].map((label) => (
                  <th key={label} className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTechniciens.map((technicien) => (
                <tr key={technicien.id} className="group transition-colors hover:bg-orange-50/30">
                  <td className="px-5 py-3.5">
                    <TechnicienIdentity technicien={technicien} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Mail size={15} className="shrink-0 text-slate-400" />
                      <span className="max-w-[250px] truncate">{technicien.email || 'Non renseignée'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-bold text-slate-800">{technicien.totalInterventions}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex min-w-8 justify-center rounded-full px-2.5 py-1 text-xs font-bold ${technicien.interventionsEnCours > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                      {technicien.interventionsEnCours}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{formatDate(technicien.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <TechnicienActions
                      onView={() => { setSelectedTechnicien(technicien); setShowViewModal(true); }}
                      onEdit={() => { setSelectedTechnicien(technicien); setShowEditModal(true); }}
                      onDelete={() => { setSelectedTechnicien(technicien); setShowDeleteModal(true); }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {filteredTechniciens.map((technicien) => (
            <article key={technicien.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <TechnicienIdentity technicien={technicien} />
                <TechnicienActions
                  compact
                  onView={() => { setSelectedTechnicien(technicien); setShowViewModal(true); }}
                  onEdit={() => { setSelectedTechnicien(technicien); setShowEditModal(true); }}
                  onDelete={() => { setSelectedTechnicien(technicien); setShowDeleteModal(true); }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                <MobileMetric label="Interventions" value={technicien.totalInterventions} />
                <MobileMetric label="En cours" value={technicien.interventionsEnCours} />
                <MobileMetric label="Depuis" value={formatDate(technicien.created_at)} small />
              </div>
            </article>
          ))}
        </div>

        {filteredTechniciens.length === 0 && (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <UserCog size={27} />
            </div>
            <p className="mt-4 font-bold text-slate-800">Aucun technicien trouvé</p>
            <p className="mt-1 text-sm text-slate-500">Modifiez votre recherche ou ajoutez un nouveau technicien.</p>
          </div>
        )}
      </section>

      <AddTechnicienModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={() => fetchTechniciens(true)} />
      <EditTechnicienModal
        isOpen={showEditModal}
        onClose={() => closeModal(setShowEditModal)}
        onSuccess={() => fetchTechniciens(true)}
        technicien={selectedTechnicien}
      />
      <ViewTechnicienModal isOpen={showViewModal} onClose={() => closeModal(setShowViewModal)} technicien={selectedTechnicien} />
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => closeModal(setShowDeleteModal)}
        onConfirm={handleDeleteConfirm}
        technicien={selectedTechnicien}
        loading={deleteLoading}
      />
    </div>
  );
};

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof UserCog;
  tone: 'orange' | 'amber' | 'slate';
}) {
  const tones = {
    orange: 'bg-orange-50 text-[#f98440]',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon size={20} />
      </div>
    </div>
  );
}

function TechnicienIdentity({ technicien }: { technicien: Technicien }) {
  const initial = technicien.nom.trim().charAt(0).toLocaleUpperCase('fr-FR') || 'T';
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f98440] text-sm font-black text-white shadow-sm">
        {initial}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-900">{technicien.nom}</p>
        <p className="truncate text-xs text-slate-500 md:hidden">{technicien.email || 'E-mail non renseigné'}</p>
        <p className="hidden text-[11px] font-medium text-slate-400 md:block">ID · {technicien.id.slice(0, 8)}</p>
      </div>
    </div>
  );
}

function TechnicienActions({
  onView,
  onEdit,
  onDelete,
  compact = false,
}: {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center ${compact ? 'gap-0.5' : 'gap-1'}`}>
      <ActionButton label="Voir le profil" icon={Eye} onClick={onView} />
      <ActionButton label="Modifier" icon={Edit} onClick={onEdit} accent />
      <ActionButton label="Supprimer" icon={Trash2} onClick={onDelete} danger />
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  accent = false,
  danger = false,
}: {
  label: string;
  icon: typeof Eye;
  onClick: () => void;
  accent?: boolean;
  danger?: boolean;
}) {
  const tone = danger
    ? 'text-slate-500 hover:bg-red-50 hover:text-red-600'
    : accent
      ? 'text-slate-500 hover:bg-orange-50 hover:text-[#f98440]'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800';
  return (
    <button type="button" onClick={onClick} className={`rounded-lg p-2 transition-colors ${tone}`} title={label} aria-label={label}>
      <Icon size={17} />
    </button>
  );
}

function MobileMetric({ label, value, small = false }: { label: string; value: number | string; small?: boolean }) {
  return (
    <div>
      <p className={`${small ? 'text-[11px]' : 'text-sm'} font-black text-slate-800`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}

export default TechniciensTable;
