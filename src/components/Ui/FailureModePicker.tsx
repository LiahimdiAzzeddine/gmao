import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Lot = { id: string; nom: string };
type Family = { id: string; lot_id: string; nom: string };
type FailureMode = { id: string; famille_id: string; nom: string };

type FailureModePickerProps = {
  value: string[];
  onChange: (modeIds: string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
};

export function FailureModePicker({
  value,
  onChange,
  multiple = false,
  disabled = false,
}: FailureModePickerProps) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [modes, setModes] = useState<FailureMode[]>([]);
  const [selectedLotId, setSelectedLotId] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    Promise.all([
      supabase.from('plan_action_lots').select('id, nom').eq('actif', true).order('nom'),
      supabase.from('plan_action_problem_families').select('id, lot_id, nom').eq('actif', true).order('nom'),
      supabase.from('plan_action_failure_modes').select('id, famille_id, nom').eq('actif', true).order('nom'),
    ]).then(([lotsResult, familiesResult, modesResult]) => {
      if (!active) return;
      const loadError = lotsResult.error || familiesResult.error || modesResult.error;
      if (loadError) {
        setError('Le catalogue des défaillances est indisponible.');
      } else {
        setLots(lotsResult.data || []);
        setFamilies(familiesResult.data || []);
        setModes(modesResult.data || []);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!modes.length || !families.length) return;
    const selectedMode = modes.find((mode) => value.includes(mode.id));
    if (!selectedMode) return;
    const family = families.find((item) => item.id === selectedMode.famille_id);
    if (!family) return;
    setSelectedLotId((current) => current || family.lot_id);
    setSelectedFamilyId((current) => current || family.id);
  }, [families, modes, value]);

  const visibleFamilies = useMemo(
    () => families.filter((family) => family.lot_id === selectedLotId),
    [families, selectedLotId],
  );
  const visibleModes = useMemo(
    () => modes.filter((mode) => mode.famille_id === selectedFamilyId),
    [modes, selectedFamilyId],
  );
  const selectedModes = useMemo(
    () => modes.filter((mode) => value.includes(mode.id)),
    [modes, value],
  );

  const handleLotChange = (lotId: string) => {
    setSelectedLotId(lotId);
    setSelectedFamilyId('');
    if (!multiple) onChange([]);
  };

  const handleFamilyChange = (familyId: string) => {
    setSelectedFamilyId(familyId);
    if (!multiple) onChange([]);
  };

  const toggleMode = (modeId: string) => {
    if (!multiple) {
      onChange(modeId ? [modeId] : []);
      return;
    }
    onChange(value.includes(modeId) ? value.filter((id) => id !== modeId) : [...value, modeId]);
  };

  const removeMode = (modeId: string) => {
    onChange(value.filter((id) => id !== modeId));
  };

  const modePath = (mode: FailureMode) => {
    const family = families.find((item) => item.id === mode.famille_id);
    const lot = lots.find((item) => item.id === family?.lot_id);
    return `${lot?.nom || 'Lot'} · ${family?.nom || 'Famille'} · ${mode.nom}`;
  };

  if (loading) {
    return <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Chargement du catalogue…</div>;
  }

  if (error) {
    return <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" /> {error}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Lot de défaillance</span>
          <select
            value={selectedLotId}
            onChange={(event) => handleLotChange(event.target.value)}
            disabled={disabled}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#ee6b1a] focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
          >
            <option value="">Sélectionner un lot</option>
            {lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.nom}</option>)}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Famille de problèmes</span>
          <select
            value={selectedFamilyId}
            onChange={(event) => handleFamilyChange(event.target.value)}
            disabled={disabled || !selectedLotId}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#ee6b1a] focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
          >
            <option value="">Sélectionner une famille</option>
            {visibleFamilies.map((family) => <option key={family.id} value={family.id}>{family.nom}</option>)}
          </select>
        </label>

        {!multiple && (
          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Mode de défaillance</span>
            <select
              value={value[0] || ''}
              onChange={(event) => toggleMode(event.target.value)}
              disabled={disabled || !selectedFamilyId}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#ee6b1a] focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
            >
              <option value="">Non classé pour le moment</option>
              {visibleModes.map((mode) => <option key={mode.id} value={mode.id}>{mode.nom}</option>)}
            </select>
          </label>
        )}
      </div>

      {multiple && selectedFamilyId && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Modes concernés</p>
          {visibleModes.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleModes.map((mode) => {
                const checked = value.includes(mode.id);
                return (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleMode(mode.id)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${checked ? 'border-orange-300 bg-orange-50 text-orange-900' : 'border-slate-200 text-slate-700 hover:border-orange-200 hover:bg-orange-50/50'}`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? 'border-[#ee6b1a] bg-[#ee6b1a] text-white' : 'border-slate-300 bg-white'}`}>
                      {checked && <Check className="h-3.5 w-3.5" />}
                    </span>
                    {mode.nom}
                  </button>
                );
              })}
            </div>
          ) : <p className="text-sm text-slate-500">Aucun mode actif dans cette famille.</p>}
        </div>
      )}

      {selectedModes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedModes.map((mode) => (
            <span key={mode.id} className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900">
              {modePath(mode)}
              <button type="button" onClick={() => removeMode(mode.id)} disabled={disabled} aria-label={`Retirer ${mode.nom}`} className="rounded-full p-0.5 hover:bg-orange-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
