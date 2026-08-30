import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit,
  GripVertical,
  ListChecks,
  Package,
  Plus,
  RefreshCw,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { deleteEtape, reorderEtapes } from '../../hooks/useGammes';
import { supabase } from '../../lib/supabase';
import { EtapeGamme, GammeWithEtapes } from '../../types/gammes';
import EtapeForm from './EtapeForm';

interface GammeDetailProps {
  gamme: GammeWithEtapes;
  onClose: () => void;
  onUpdate: () => void;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export default function GammeDetail({ gamme, onClose, onUpdate }: GammeDetailProps) {
  const [etapes, setEtapes] = useState<EtapeGamme[]>(gamme.etapes);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const dragStartEtapesRef = useRef<EtapeGamme[]>(gamme.etapes);
  const [editingEtape, setEditingEtape] = useState<EtapeGamme | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setEtapes([...gamme.etapes].sort((a, b) => a.ordre - b.ordre));
  }, [gamme]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !showCreateForm && !editingEtape) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [editingEtape, onClose, showCreateForm]);

  const refreshEtapes = useCallback(async () => {
    setRefreshing(true);
    setActionError(null);
    try {
      const { data, error } = await supabase
        .from('etapes_gamme')
        .select('*')
        .eq('gamme_id', gamme.id)
        .order('ordre', { ascending: true });
      if (error) throw error;
      setEtapes((data || []) as EtapeGamme[]);
    } catch (error) {
      console.error('Error loading steps:', error);
      setActionError('Impossible d’actualiser les étapes de cette gamme.');
    } finally {
      setRefreshing(false);
    }
  }, [gamme.id]);

  async function handleDeleteEtape(id: string) {
    if (!window.confirm('Supprimer définitivement cette étape ?')) return;
    setActionError(null);
    try {
      await deleteEtape(id);
      await refreshEtapes();
      onUpdate();
    } catch (error) {
      console.error('Error deleting step:', error);
      setActionError('La suppression de l’étape a échoué. Vérifiez vos droits puis réessayez.');
    }
  }

  function handleDragOver(event: React.DragEvent, index: number) {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setEtapes((current) => {
      const reordered = [...current];
      const [dragged] = reordered.splice(draggedIndex, 1);
      reordered.splice(index, 0, dragged);
      return reordered;
    });
    setDraggedIndex(index);
  }

  async function persistOrder(nextEtapes: EtapeGamme[], previousEtapes: EtapeGamme[]) {
    setActionError(null);
    try {
      await reorderEtapes(nextEtapes.map((item, index) => ({ id: item.id, ordre: index + 1 })));
      setEtapes(nextEtapes.map((item, index) => ({ ...item, ordre: index + 1 })));
      onUpdate();
    } catch (error) {
      console.error('Error reordering steps:', error);
      setEtapes(previousEtapes);
      setActionError('Le nouvel ordre n’a pas pu être enregistré.');
    }
  }

  async function handleDragEnd() {
    if (draggedIndex === null) return;
    const previous = dragStartEtapesRef.current;
    setDraggedIndex(null);
    await persistOrder(etapes, previous);
  }

  async function moveEtape(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= etapes.length) return;
    const previous = [...etapes];
    const reordered = [...etapes];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setEtapes(reordered);
    await persistOrder(reordered, previous);
  }

  async function handleFormSuccess() {
    setShowCreateForm(false);
    setEditingEtape(null);
    await refreshEtapes();
    onUpdate();
  }

  const totalDuration = etapes.reduce((total, etape) => total + (etape.duree_estimee || 0), 0);

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-5" role="dialog" aria-modal="true" aria-labelledby="gamme-detail-title">
        <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-700 px-5 py-4 text-white sm:px-6">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-orange-400/20 px-2.5 py-1 text-xs font-bold capitalize text-orange-200">{gamme.type}</span>
                <span className="text-xs text-slate-400">Gamme de maintenance</span>
              </div>
              <h2 id="gamme-detail-title" className="truncate text-xl font-black sm:text-2xl">{gamme.nom}</h2>
              {gamme.description && <p className="mt-1 max-w-3xl text-sm text-slate-300">{gamme.description}</p>}
            </div>
            <button type="button" onClick={onClose} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition hover:bg-white/15" aria-label="Fermer">
              <X size={21} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-3">
            <Summary icon={<ListChecks size={18} />} label="Étapes" value={`${etapes.length}`} />
            <Summary icon={<Clock size={18} />} label="Durée totale" value={totalDuration ? formatDuration(totalDuration) : 'Non définie'} />
            <Summary icon={<Wrench size={18} />} label="Avec outil" value={`${etapes.filter((item) => item.outil).length}`} className="col-span-2 sm:col-span-1" />
          </div>

          <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h3 className="font-black text-slate-900">Étapes de maintenance</h3>
              <p className="text-xs text-slate-500">Glissez les lignes ou utilisez les flèches pour modifier leur ordre.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={refreshEtapes} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Actualiser
              </button>
              <button type="button" onClick={() => setShowCreateForm(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ee6b1a] px-3.5 py-2 text-sm font-bold text-white transition hover:bg-[#d95708]">
                <Plus size={17} /> Ajouter
              </button>
            </div>
          </div>

          {actionError && (
            <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:mx-6" role="alert">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" /> {actionError}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {etapes.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <ListChecks className="mb-3 text-slate-300" size={42} />
                <p className="font-bold text-slate-700">Aucune étape définie</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">Ajoutez les opérations que le technicien devra effectuer dans cette gamme.</p>
                <button type="button" onClick={() => setShowCreateForm(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#ee6b1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#d95708]"><Plus size={17} /> Ajouter la première étape</button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {etapes.map((etape, index) => (
                  <article
                    key={etape.id}
                    draggable
                    onDragStart={() => { dragStartEtapesRef.current = [...etapes]; setDraggedIndex(index); }}
                    onDragOver={(event) => handleDragOver(event, index)}
                    onDragEnd={handleDragEnd}
                    className={`group rounded-xl border bg-white p-3.5 transition hover:border-orange-200 hover:shadow-sm ${draggedIndex === index ? 'border-orange-300 opacity-60' : 'border-slate-200'}`}
                  >
                    <div className="flex items-start gap-3">
                      <GripVertical className="mt-2 hidden flex-shrink-0 cursor-grab text-slate-300 group-hover:text-slate-500 sm:block" size={18} />
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-orange-50 text-sm font-black text-[#d95708]">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold leading-6 text-slate-800">{etape.description}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                          {etape.duree_estimee ? <Meta icon={<Clock size={13} />} text={formatDuration(etape.duree_estimee)} /> : null}
                          {etape.outil ? <Meta icon={<Wrench size={13} />} text={etape.outil} /> : null}
                          {etape.piece ? <Meta icon={<Package size={13} />} text={etape.piece} /> : null}
                        </div>
                        {etape.consigne_securite && (
                          <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> {etape.consigne_securite}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-0.5">
                        <button type="button" onClick={() => moveEtape(index, -1)} disabled={index === 0} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-25" aria-label="Monter l’étape"><ChevronUp size={16} /></button>
                        <button type="button" onClick={() => moveEtape(index, 1)} disabled={index === etapes.length - 1} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-25" aria-label="Descendre l’étape"><ChevronDown size={16} /></button>
                        <button type="button" onClick={() => setEditingEtape(etape)} className="rounded-lg p-1.5 text-slate-500 hover:bg-orange-50 hover:text-[#d95708]" aria-label="Modifier l’étape"><Edit size={16} /></button>
                        <button type="button" onClick={() => handleDeleteEtape(etape.id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer l’étape"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100">Fermer</button>
          </div>
        </div>
      </div>

      {(showCreateForm || editingEtape) && (
        <EtapeForm
          gammeId={gamme.id}
          etape={editingEtape}
          nextOrdre={etapes.length + 1}
          onClose={() => { setShowCreateForm(false); setEditingEtape(null); }}
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  );
}

function Summary({ icon, label, value, className = '' }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return <div className={`bg-slate-50 px-5 py-3 ${className}`}><div className="flex items-center gap-2 text-xs font-semibold text-slate-500">{icon}{label}</div><p className="mt-1 text-base font-black text-slate-800">{value}</p></div>;
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1"><span className="flex-shrink-0">{icon}</span><span className="truncate">{text}</span></span>;
}
