import { Children, FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Folder, Loader2, Pencil, Plus, Tags, Trash2, Wrench } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

type CatalogLot = { id: string; nom: string; actif: boolean };
type ProblemFamily = { id: string; lot_id: string; nom: string; actif: boolean };
type FailureMode = { id: string; famille_id: string; nom: string; actif: boolean };

export default function PlanActionOptionsManagement() {
  const [lots, setLots] = useState<CatalogLot[]>([]);
  const [families, setFamilies] = useState<ProblemFamily[]>([]);
  const [modes, setModes] = useState<FailureMode[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [newLot, setNewLot] = useState('');
  const [newFamily, setNewFamily] = useState('');
  const [newMode, setNewMode] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingLevel, setSavingLevel] = useState<'lot' | 'family' | 'mode' | null>(null);

  const selectedLot = lots.find((lot) => lot.id === selectedLotId) || null;
  const selectedFamily = families.find((family) => family.id === selectedFamilyId) || null;
  const visibleFamilies = useMemo(
    () => families.filter((family) => family.lot_id === selectedLotId),
    [families, selectedLotId]
  );
  const visibleModes = useMemo(
    () => modes.filter((mode) => mode.famille_id === selectedFamilyId),
    [modes, selectedFamilyId]
  );

  const loadCatalog = async () => {
    setLoading(true);
    const [lotsResult, familiesResult, modesResult] = await Promise.all([
      supabase.from('plan_action_lots').select('id, nom, actif').order('nom'),
      supabase.from('plan_action_problem_families').select('id, lot_id, nom, actif').order('nom'),
      supabase.from('plan_action_failure_modes').select('id, famille_id, nom, actif').order('nom')
    ]);
    const error = lotsResult.error || familiesResult.error || modesResult.error;
    if (error) toast.error(`Impossible de charger le catalogue : ${error.message}`);
    else {
      setLots(lotsResult.data || []);
      setFamilies(familiesResult.data || []);
      setModes(modesResult.data || []);
      setSelectedLotId((current) => current || lotsResult.data?.[0]?.id || '');
    }
    setLoading(false);
  };

  useEffect(() => { void loadCatalog(); }, []);

  useEffect(() => {
    if (!selectedLotId) {
      setSelectedFamilyId('');
      return;
    }
    const belongsToLot = families.some(
      (family) => family.id === selectedFamilyId && family.lot_id === selectedLotId
    );
    if (!belongsToLot) {
      setSelectedFamilyId(families.find((family) => family.lot_id === selectedLotId)?.id || '');
    }
  }, [families, selectedFamilyId, selectedLotId]);

  const addLot = async (event: FormEvent) => {
    event.preventDefault();
    const nom = newLot.trim();
    if (!nom) return toast.error('Saisissez le nom du lot.');
    setSavingLevel('lot');
    const { data, error } = await supabase.from('plan_action_lots').insert({ nom }).select('id').single();
    setSavingLevel(null);
    if (error) return toast.error(error.code === '23505' ? 'Ce lot existe déjà.' : error.message);
    setNewLot('');
    setSelectedFamilyId('');
    toast.success('Lot ajouté.');
    await loadCatalog();
    setSelectedLotId(data.id);
  };

  const addFamily = async (event: FormEvent) => {
    event.preventDefault();
    const nom = newFamily.trim();
    if (!selectedLotId) return toast.error('Sélectionnez d’abord un lot.');
    if (!nom) return toast.error('Saisissez le nom de la famille.');
    setSavingLevel('family');
    const { data, error } = await supabase
      .from('plan_action_problem_families')
      .insert({ lot_id: selectedLotId, nom })
      .select('id')
      .single();
    setSavingLevel(null);
    if (error) return toast.error(error.code === '23505' ? 'Cette famille existe déjà dans ce lot.' : error.message);
    setNewFamily('');
    toast.success('Famille ajoutée.');
    await loadCatalog();
    setSelectedFamilyId(data.id);
  };

  const addMode = async (event: FormEvent) => {
    event.preventDefault();
    const nom = newMode.trim();
    if (!selectedFamilyId) return toast.error('Sélectionnez d’abord une famille.');
    if (!nom) return toast.error('Saisissez le mode de défaillance.');
    setSavingLevel('mode');
    const { error } = await supabase
      .from('plan_action_failure_modes')
      .insert({ famille_id: selectedFamilyId, nom });
    setSavingLevel(null);
    if (error) return toast.error(error.code === '23505' ? 'Ce mode existe déjà dans cette famille.' : error.message);
    setNewMode('');
    toast.success('Mode de défaillance ajouté.');
    await loadCatalog();
  };

  const renameItem = async (table: string, id: string, currentName: string, label: string) => {
    const value = window.prompt(`Nouveau nom du ${label} :`, currentName)?.trim();
    if (!value || value === currentName) return;
    const { error } = await supabase.from(table).update({ nom: value }).eq('id', id);
    if (error) toast.error(error.code === '23505' ? `Ce ${label} existe déjà.` : error.message);
    else {
      toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} modifié.`);
      await loadCatalog();
    }
  };

  const deleteItem = async (
    table: string,
    id: string,
    name: string,
    label: string,
    hasChildren: boolean
  ) => {
    const childrenWarning = hasChildren ? ' Ses éléments enfants seront également retirés du catalogue.' : '';
    if (!window.confirm(`Supprimer ${label} « ${name} » ?${childrenWarning}\nLes anciens plans d'action et OT resteront inchangés.`)) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return toast.error(`Suppression impossible : ${error.message}`);
    if (table === 'plan_action_lots') {
      setSelectedLotId('');
      setSelectedFamilyId('');
    } else if (table === 'plan_action_problem_families') {
      setSelectedFamilyId('');
    }
    toast.success('Élément supprimé du catalogue.');
    await loadCatalog();
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-500" /></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Catalogue du plan d'action correctif</h1>
        <p className="mt-1 text-sm text-slate-500">Sélectionnez un niveau pour gérer le suivant. L'historique des plans d'action et des OT reste indépendant de ce catalogue.</p>
      </div>

      <div className="grid min-h-[560px] grid-cols-1 gap-4 lg:grid-cols-3">
        <CatalogPanel icon={<Folder size={20} />} title="1. Lots" subtitle={`${lots.length} lot${lots.length > 1 ? 's' : ''}`}>
          <AddForm value={newLot} onChange={setNewLot} onSubmit={addLot} placeholder="Nouveau lot" loading={savingLevel === 'lot'} />
          <ItemList>
            {lots.map((lot) => (
              <CatalogItem key={lot.id} name={lot.nom} selected={lot.id === selectedLotId} onSelect={() => setSelectedLotId(lot.id)}
                onEdit={() => void renameItem('plan_action_lots', lot.id, lot.nom, 'lot')}
                onDelete={() => void deleteItem('plan_action_lots', lot.id, lot.nom, 'le lot', families.some((family) => family.lot_id === lot.id))} />
            ))}
          </ItemList>
        </CatalogPanel>

        <CatalogPanel icon={<Tags size={20} />} title="2. Familles de problèmes" subtitle={selectedLot ? `Lot : ${selectedLot.nom}` : 'Sélectionnez un lot'} disabled={!selectedLot}>
          <AddForm value={newFamily} onChange={setNewFamily} onSubmit={addFamily} placeholder="Nouvelle famille" loading={savingLevel === 'family'} disabled={!selectedLot} />
          <ItemList emptyMessage={selectedLot ? 'Aucune famille dans ce lot.' : 'Sélectionnez un lot.'}>
            {visibleFamilies.map((family) => (
              <CatalogItem key={family.id} name={family.nom} selected={family.id === selectedFamilyId} onSelect={() => setSelectedFamilyId(family.id)}
                onEdit={() => void renameItem('plan_action_problem_families', family.id, family.nom, 'famille')}
                onDelete={() => void deleteItem('plan_action_problem_families', family.id, family.nom, 'la famille', modes.some((mode) => mode.famille_id === family.id))} />
            ))}
          </ItemList>
        </CatalogPanel>

        <CatalogPanel icon={<Wrench size={20} />} title="3. Modes de défaillance" subtitle={selectedFamily ? `Famille : ${selectedFamily.nom}` : 'Sélectionnez une famille'} disabled={!selectedFamily}>
          <AddForm value={newMode} onChange={setNewMode} onSubmit={addMode} placeholder="Nouveau mode" loading={savingLevel === 'mode'} disabled={!selectedFamily} />
          <ItemList emptyMessage={selectedFamily ? 'Aucun mode dans cette famille.' : 'Sélectionnez une famille.'}>
            {visibleModes.map((mode) => (
              <CatalogItem key={mode.id} name={mode.nom} selected={false} onSelect={() => undefined}
                onEdit={() => void renameItem('plan_action_failure_modes', mode.id, mode.nom, 'mode')}
                onDelete={() => void deleteItem('plan_action_failure_modes', mode.id, mode.nom, 'le mode', false)} />
            ))}
          </ItemList>
        </CatalogPanel>
      </div>
    </div>
  );
}

function CatalogPanel({ icon, title, subtitle, disabled = false, children }: { icon: ReactNode; title: string; subtitle: string; disabled?: boolean; children: ReactNode }) {
  const content = Children.toArray(children);
  return <section className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${disabled ? 'border-slate-200 opacity-70' : 'border-slate-200'}`}>
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-4"><div className="flex items-center gap-2 font-bold text-slate-900">{icon}{title}</div><p className="mt-1 truncate text-xs text-slate-500">{subtitle}</p></div>
    <div className="border-b border-slate-100 p-3">{content[0]}</div>
    <div className="min-h-0 flex-1 overflow-y-auto p-2">{content.slice(1)}</div>
  </section>;
}

function AddForm({ value, onChange, onSubmit, placeholder, loading, disabled = false }: { value: string; onChange: (value: string) => void; onSubmit: (event: FormEvent) => void; placeholder: string; loading: boolean; disabled?: boolean }) {
  return <form onSubmit={onSubmit} className="flex gap-2"><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} disabled={disabled || loading} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100" /><button disabled={disabled || loading} title="Ajouter" className="rounded-lg bg-slate-800 p-2 text-white hover:bg-slate-700 disabled:opacity-40">{loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}</button></form>;
}

function ItemList({ children, emptyMessage = 'Aucun élément.' }: { children: ReactNode; emptyMessage?: string }) {
  const items = Array.isArray(children) ? children : [children];
  return <div className="space-y-1">{items.length && items.some(Boolean) ? children : <p className="p-5 text-center text-sm text-slate-400">{emptyMessage}</p>}</div>;
}

function CatalogItem({ name, selected, onSelect, onEdit, onDelete }: { name: string; selected: boolean; onSelect: () => void; onEdit: () => void; onDelete: () => void }) {
  return <div className={`group flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${selected ? 'border-slate-700 bg-slate-800 text-white' : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'}`}>
    <button onClick={onSelect} className="min-w-0 flex-1 truncate text-left text-sm font-medium" title={name}>{name}</button>
    <button onClick={onEdit} title="Modifier" className={`rounded p-1.5 ${selected ? 'hover:bg-white/15' : 'text-blue-600 hover:bg-blue-50'}`}><Pencil size={15} /></button>
    <button onClick={onDelete} title="Supprimer" className={`rounded p-1.5 ${selected ? 'hover:bg-white/15' : 'text-red-600 hover:bg-red-50'}`}><Trash2 size={15} /></button>
  </div>;
}
