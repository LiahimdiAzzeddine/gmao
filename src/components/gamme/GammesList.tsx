import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  Filter,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  Square,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { deleteGamme, useGammes } from '../../hooks/useGammes';
import { supabase } from '../../lib/supabase';
import { GammeWithEtapes } from '../../types/gammes';
import GammeDetail from './GammeDetail';
import GammeForm from './GammeForm';

type FilterType = 'tous' | 'préventive' | 'corrective';

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Une erreur inattendue est survenue.';
}

export default function GammesList() {
  const [selectedGamme, setSelectedGamme] = useState<GammeWithEtapes | null>(null);
  const [editingGamme, setEditingGamme] = useState<GammeWithEtapes | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('tous');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedGammes, setSelectedGammes] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ total: 0, preventive: 0, corrective: 0 });

  const { gammes, loading, error, totalCount, totalPages, loadGammes, reload } = useGammes();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setCurrentPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadGammes({ page: currentPage, pageSize: itemsPerPage, searchTerm, filterType });
  }, [currentPage, filterType, itemsPerPage, loadGammes, searchTerm]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setSelectedGammes((current) => new Set([...current].filter((id) => gammes.some((gamme) => gamme.id === id))));
  }, [gammes]);

  async function loadGlobalStats() {
    const base = () => supabase.from('gammes_maintenance').select('id', { count: 'exact', head: true });
    const [all, preventive, corrective] = await Promise.all([
      base(),
      base().eq('type', 'préventive'),
      base().eq('type', 'corrective'),
    ]);
    if (all.error || preventive.error || corrective.error) return;
    setStats({ total: all.count || 0, preventive: preventive.count || 0, corrective: corrective.count || 0 });
  }

  useEffect(() => { loadGlobalStats(); }, []);

  async function refreshAll() {
    setActionError(null);
    await Promise.all([reload(), loadGlobalStats()]);
  }

  async function handleDeleteGamme(gamme: GammeWithEtapes) {
    const confirmed = window.confirm(`Supprimer la gamme « ${gamme.nom} » et ses ${gamme.etapes.length} étape${gamme.etapes.length > 1 ? 's' : ''} ?`);
    if (!confirmed) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteGamme(gamme.id);
      setSelectedGammes((current) => {
        const next = new Set(current);
        next.delete(gamme.id);
        return next;
      });
      await refreshAll();
    } catch (error) {
      console.error('Error deleting gamme:', error);
      setActionError(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteSelected() {
    if (!selectedGammes.size) return;
    if (!window.confirm(`Supprimer définitivement ${selectedGammes.size} gamme${selectedGammes.size > 1 ? 's' : ''} sélectionnée${selectedGammes.size > 1 ? 's' : ''} ?`)) return;

    setDeleting(true);
    setActionError(null);
    const ids = [...selectedGammes];
    const results = await Promise.allSettled(ids.map((id) => deleteGamme(id)));
    const failedIds = results.flatMap((result, index) => result.status === 'rejected' ? [ids[index]] : []);
    setSelectedGammes(new Set(failedIds));
    await Promise.all([reload(), loadGlobalStats()]);
    if (failedIds.length) {
      const firstFailure = results.find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;
      setActionError(`${failedIds.length} gamme${failedIds.length > 1 ? 's' : ''} non supprimée${failedIds.length > 1 ? 's' : ''}. ${getErrorMessage(firstFailure?.reason)}`);
    }
    setDeleting(false);
  }

  function toggleSelectAll() {
    const allVisibleSelected = gammes.length > 0 && gammes.every((gamme) => selectedGammes.has(gamme.id));
    setSelectedGammes(allVisibleSelected ? new Set() : new Set(gammes.map((gamme) => gamme.id)));
  }

  function toggleSelection(id: string) {
    setSelectedGammes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetFilters() {
    setSearchInput('');
    setSearchTerm('');
    setFilterType('tous');
    setCurrentPage(1);
  }

  async function handleFormSuccess() {
    setShowCreateForm(false);
    setEditingGamme(null);
    await refreshAll();
  }

  const allVisibleSelected = gammes.length > 0 && gammes.every((gamme) => selectedGammes.has(gamme.id));
  const hasFilters = Boolean(searchInput || filterType !== 'tous');
  const pageLabel = useMemo(() => {
    if (!totalCount) return 'Aucun résultat';
    const first = (currentPage - 1) * itemsPerPage + 1;
    const last = Math.min(currentPage * itemsPerPage, totalCount);
    return `${first}–${last} sur ${totalCount}`;
  }, [currentPage, itemsPerPage, totalCount]);

  return (
    <>
      <div className="mx-auto mb-14 max-w-7xl px-3 sm:px-5 lg:px-6">
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d95708]">Maintenance préventive</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Gammes de maintenance</h1>
            <p className="mt-1 text-sm text-slate-500">Créez les modèles d’opérations utilisés par les plans et les techniciens.</p>
          </div>
          <button type="button" onClick={() => setShowCreateForm(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ee6b1a] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#d95708]">
            <Plus size={19} /> Nouvelle gamme
          </button>
        </header>

        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Statistiques des gammes">
          <StatCard icon={<ListChecks size={20} />} label="Total" value={stats.total} tone="slate" />
          <StatCard icon={<Wrench size={20} />} label="Préventives" value={stats.preventive} tone="green" />
          <StatCard icon={<AlertTriangle size={20} />} label="Correctives" value={stats.corrective} tone="orange" />
        </section>

        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_240px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-[#f15c00] focus:ring-4 focus:ring-orange-100" placeholder="Rechercher par nom ou description…" />
              {searchInput && <button type="button" onClick={() => setSearchInput('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Effacer la recherche"><X size={16} /></button>}
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <select value={filterType} onChange={(event) => { setFilterType(event.target.value as FilterType); setCurrentPage(1); }} className="w-full appearance-none rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#f15c00] focus:ring-4 focus:ring-orange-100">
                <option value="tous">Tous les types</option>
                <option value="préventive">Préventive</option>
                <option value="corrective">Corrective</option>
              </select>
            </div>
            <button type="button" onClick={refreshAll} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} /> Actualiser
            </button>
          </div>

          <div className="mt-4 flex min-h-7 flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-sm text-slate-500">{loading ? 'Actualisation…' : `${totalCount} gamme${totalCount > 1 ? 's' : ''} trouvée${totalCount > 1 ? 's' : ''}`}</p>
            <div className="flex flex-wrap items-center gap-2">
              {hasFilters && <button type="button" onClick={resetFilters} className="text-xs font-bold text-slate-500 hover:text-[#d95708]">Réinitialiser les filtres</button>}
              {selectedGammes.size > 0 && (
                <button type="button" onClick={handleDeleteSelected} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"><Trash2 size={14} /> Supprimer ({selectedGammes.size})</button>
              )}
            </div>
          </div>
        </section>

        {(error || actionError) && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            <span className="flex items-start gap-2"><AlertCircle className="mt-0.5 flex-shrink-0" size={18} />{actionError || error}</span>
            {actionError && <button type="button" onClick={() => setActionError(null)} aria-label="Fermer le message"><X size={17} /></button>}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading && gammes.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center"><RefreshCw className="mb-3 animate-spin text-[#d95708]" size={34} /><p className="font-bold text-slate-700">Chargement des gammes…</p></div>
          ) : gammes.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
              <ListChecks className="mb-3 text-slate-300" size={44} />
              <p className="font-black text-slate-700">{hasFilters ? 'Aucune gamme ne correspond aux filtres' : 'Aucune gamme enregistrée'}</p>
              <p className="mt-1 max-w-md text-sm text-slate-500">{hasFilters ? 'Modifiez la recherche ou réinitialisez les filtres.' : 'Créez une gamme puis définissez les étapes à effectuer.'}</p>
              <button type="button" onClick={hasFilters ? resetFilters : () => setShowCreateForm(true)} className="mt-4 rounded-xl bg-[#ee6b1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#d95708]">{hasFilters ? 'Réinitialiser' : 'Créer une gamme'}</button>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="w-12 px-5 py-3"><SelectButton selected={allVisibleSelected} onClick={toggleSelectAll} label="Sélectionner la page" /></th>
                      <th className="px-3 py-3">Gamme</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Étapes</th><th className="px-3 py-3">Durée</th><th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gammes.map((gamme) => <GammeRow key={gamme.id} gamme={gamme} selected={selectedGammes.has(gamme.id)} onSelect={() => toggleSelection(gamme.id)} onView={() => setSelectedGamme(gamme)} onEdit={() => setEditingGamme(gamme)} onDelete={() => handleDeleteGamme(gamme)} deleting={deleting} />)}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {gammes.map((gamme) => <GammeCard key={gamme.id} gamme={gamme} selected={selectedGammes.has(gamme.id)} onSelect={() => toggleSelection(gamme.id)} onView={() => setSelectedGamme(gamme)} onEdit={() => setEditingGamme(gamme)} onDelete={() => handleDeleteGamme(gamme)} deleting={deleting} />)}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-4 sm:justify-start">
                  <span className="text-sm font-medium text-slate-600">{pageLabel}</span>
                  <select value={itemsPerPage} onChange={(event) => { setItemsPerPage(Number(event.target.value)); setCurrentPage(1); }} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                    <option value={5}>5 / page</option><option value={10}>10 / page</option><option value={25}>25 / page</option><option value={50}>50 / page</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1 || loading} className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40" aria-label="Page précédente"><ChevronLeft size={18} /></button>
                  <span className="min-w-24 text-center text-sm font-bold text-slate-700">Page {currentPage} / {Math.max(totalPages, 1)}</span>
                  <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages || loading} className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40" aria-label="Page suivante"><ChevronRight size={18} /></button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {selectedGamme && <GammeDetail gamme={selectedGamme} onClose={() => setSelectedGamme(null)} onUpdate={refreshAll} />}
      {(showCreateForm || editingGamme) && <GammeForm gamme={editingGamme} onClose={() => { setShowCreateForm(false); setEditingGamme(null); }} onSuccess={handleFormSuccess} />}
    </>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'slate' | 'green' | 'orange' }) {
  const tones = { slate: 'bg-slate-100 text-slate-600', green: 'bg-emerald-50 text-emerald-600', orange: 'bg-orange-50 text-[#d95708]' };
  return <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-0.5 text-2xl font-black text-slate-900">{value}</p></div><span className={`rounded-xl p-2.5 ${tones[tone]}`}>{icon}</span></div>;
}

function SelectButton({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className="rounded-md p-1 text-slate-400 hover:bg-orange-50 hover:text-[#d95708]" aria-label={label}>{selected ? <CheckSquare size={19} className="text-[#d95708]" /> : <Square size={19} />}</button>;
}

interface GammeItemProps {
  gamme: GammeWithEtapes; selected: boolean; deleting: boolean;
  onSelect: () => void; onView: () => void; onEdit: () => void; onDelete: () => void;
}

function GammeRow({ gamme, selected, deleting, onSelect, onView, onEdit, onDelete }: GammeItemProps) {
  const duration = gamme.etapes.reduce((sum, item) => sum + (item.duree_estimee || 0), 0);
  return (
    <tr className={`transition hover:bg-orange-50/30 ${selected ? 'bg-orange-50/60' : ''}`}>
      <td className="px-5 py-4"><SelectButton selected={selected} onClick={onSelect} label={`Sélectionner ${gamme.nom}`} /></td>
      <td className="max-w-md px-3 py-4"><button type="button" onClick={onView} className="block w-full text-left"><span className="block truncate text-sm font-black text-slate-800 hover:text-[#d95708]">{gamme.nom}</span><span className="mt-1 block truncate text-xs text-slate-500">{gamme.description || 'Aucune description'}</span></button></td>
      <td className="px-3 py-4"><TypeBadge type={gamme.type} /></td>
      <td className="px-3 py-4"><span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700"><ListChecks size={16} className="text-slate-400" />{gamme.etapes.length}</span></td>
      <td className="px-3 py-4"><span className="inline-flex items-center gap-1.5 text-sm text-slate-600"><Clock size={15} className="text-slate-400" />{duration ? formatDuration(duration) : '—'}</span></td>
      <td className="px-5 py-4"><ActionButtons onView={onView} onEdit={onEdit} onDelete={onDelete} disabled={deleting} /></td>
    </tr>
  );
}

function GammeCard({ gamme, selected, deleting, onSelect, onView, onEdit, onDelete }: GammeItemProps) {
  const duration = gamme.etapes.reduce((sum, item) => sum + (item.duree_estimee || 0), 0);
  return (
    <article className={`p-4 ${selected ? 'bg-orange-50/60' : ''}`}>
      <div className="flex items-start gap-3"><SelectButton selected={selected} onClick={onSelect} label={`Sélectionner ${gamme.nom}`} /><button type="button" onClick={onView} className="min-w-0 flex-1 text-left"><span className="block truncate font-black text-slate-800">{gamme.nom}</span><span className="mt-1 line-clamp-2 text-sm text-slate-500">{gamme.description || 'Aucune description'}</span></button><TypeBadge type={gamme.type} /></div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><div className="flex gap-3 text-xs font-semibold text-slate-600"><span className="inline-flex items-center gap-1"><ListChecks size={14} />{gamme.etapes.length} étape{gamme.etapes.length > 1 ? 's' : ''}</span>{duration > 0 && <span className="inline-flex items-center gap-1"><Clock size={14} />{formatDuration(duration)}</span>}</div><ActionButtons onView={onView} onEdit={onEdit} onDelete={onDelete} disabled={deleting} /></div>
    </article>
  );
}

function TypeBadge({ type }: { type: GammeWithEtapes['type'] }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${type === 'préventive' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{type}</span>;
}

function ActionButtons({ onView, onEdit, onDelete, disabled }: { onView: () => void; onEdit: () => void; onDelete: () => void; disabled: boolean }) {
  return <div className="flex items-center justify-end gap-1"><button type="button" onClick={onView} className="rounded-lg p-2 text-slate-500 hover:bg-orange-50 hover:text-[#d95708]" aria-label="Voir les étapes"><Eye size={17} /></button><button type="button" onClick={onEdit} className="rounded-lg p-2 text-slate-500 hover:bg-orange-50 hover:text-[#d95708]" aria-label="Modifier"><Edit size={17} /></button><button type="button" onClick={onDelete} disabled={disabled} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" aria-label="Supprimer"><Trash2 size={17} /></button></div>;
}
