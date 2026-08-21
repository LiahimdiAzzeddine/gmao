import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, Settings, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface PlanActionFormData {
  lot_defaillance: string;
  famille_probleme: string;
  mode_defaillance: string;
  action_recommandee: string;
  gravite_libelle: string;
  gravite_classe: number;
  occurrence_libelle: string;
  occurrence_classe: number;
  detectabilite_libelle: string;
  detectabilite_classe: number;
  date_expression: string;
  action_cloturee: boolean;
  date_cloture_action: string;
  observation_resultat: string;
}

interface PlanActionValidationModalProps {
  machineName?: string;
  lotName?: string | null;
  showClosureFields?: boolean;
  onCancel: () => void;
  onConfirm: (data: PlanActionFormData) => Promise<void>;
}

const defaultForm: PlanActionFormData = {
  lot_defaillance: '',
  famille_probleme: '',
  mode_defaillance: '',
  action_recommandee: '',
  gravite_libelle: '',
  gravite_classe: 3,
  occurrence_libelle: '',
  occurrence_classe: 3,
  detectabilite_libelle: '',
  detectabilite_classe: 3,
  date_expression: new Date().toISOString().slice(0, 10),
  action_cloturee: false,
  date_cloture_action: '',
  observation_resultat: ''
};

// Exportee pour proposer les memes lots et familles dans la page d'administration.
// eslint-disable-next-line react-refresh/only-export-components
export const PLAN_ACTION_PROBLEMS = [
  { lot: 'CVC', family: 'CVC', problem: 'Inexistant' },
  { lot: 'CVC', family: 'CVC', problem: 'Insuffisant' },
  { lot: 'CVC', family: 'CVC', problem: 'Trop froid' },
  { lot: 'CVC', family: 'CVC', problem: 'Odeur' },
  { lot: 'CVC', family: 'CVC', problem: 'Bruyant' },
  { lot: 'CVC', family: 'CVC', problem: 'Fuite de gaz' },
  { lot: 'CVC', family: 'CVC', problem: 'Fuite de condensat' },
  { lot: 'CVC', family: 'CVC', problem: 'Manque de gaz' },
  { lot: 'CVC', family: 'CVC', problem: 'Alarme / Defaut' },
  { lot: 'CVC', family: 'CVC', problem: "Probleme d'hygrometrie" },
  { lot: 'CVC', family: 'CVC', problem: 'Demande de mise en service' },
  { lot: 'CVC', family: 'CVC', problem: "Demande de mise a l'arret" },
  { lot: 'CVC', family: 'CVC', problem: 'Autre' },
  { lot: 'CVC', family: 'Extraction', problem: 'Inexistante' },
  { lot: 'CVC', family: 'Extraction', problem: 'Odeur' },
  { lot: 'CVC', family: 'Extraction', problem: 'Bruyante' },
  { lot: 'CVC', family: 'Extraction', problem: 'Alarme / Defaut' },
  { lot: 'CVC', family: 'Extraction', problem: 'Autre' },
  { lot: 'Electricite', family: 'Electricite', problem: 'Absence / Coupure' },
  { lot: 'Electricite', family: 'Electricite', problem: 'Baisse de tension' },
  { lot: 'Electricite', family: 'Electricite', problem: 'protection / isolation / reparation des cables' },
  { lot: 'Electricite', family: 'Electricite', problem: 'Alarme / defaut' },
  { lot: 'Electricite', family: 'Electricite', problem: 'Plus de courant sur un appareil' },
  { lot: 'Electricite', family: 'Electricite', problem: 'prise hors service' },
  { lot: 'Electricite', family: 'Electricite', problem: 'Defaut onduleur' },
  { lot: 'Electricite', family: 'Electricite', problem: 'Autre' },
  { lot: 'Eclairage', family: 'Eclairage', problem: 'Probleme eclairage' },
  { lot: 'Eclairage', family: 'Eclairage', problem: 'problemes eclairage piscine' },
  { lot: 'Eclairage', family: 'Eclairage', problem: 'Pose ou reparation eclairage' },
  { lot: 'Eclairage', family: 'Eclairage', problem: 'Disjonction batiment' },
  { lot: 'Eclairage', family: 'Eclairage', problem: "Plus de lumiere dans le bureau / a l'etage" },
  { lot: 'Eclairage', family: 'Eclairage', problem: 'Spot au sol' },
  { lot: 'Eclairage', family: 'Eclairage', problem: 'Luminaire plafond hors service' },
  { lot: 'Eclairage', family: 'Eclairage', problem: 'Interrupteur hors service' },
  { lot: 'Eclairage', family: 'Eclairage', problem: 'Reparation lampe individuelle de bureau' },
  { lot: 'Eclairage', family: 'Eclairage', problem: 'Pb alimentation Enseigne/totem' },
  { lot: 'Eclairage', family: 'Eclairage', problem: 'Eclairage Enseigne' },
  { lot: 'Eclairage', family: 'Eclairage', problem: 'Autre' },
  { lot: 'Plomberie', family: 'Plomberie', problem: 'Engorgement' },
  { lot: 'Plomberie', family: 'Plomberie', problem: 'Fuite' },
  { lot: 'Plomberie', family: 'Plomberie', problem: 'Rupture / casse' },
  { lot: 'Plomberie', family: 'Plomberie', problem: 'Pompe de relevage / EU / Puits' },
  { lot: 'Plomberie', family: 'Plomberie', problem: 'Probleme de pression' },
  { lot: 'Plomberie', family: 'Plomberie', problem: 'Probleme qualite eau' },
  { lot: 'Plomberie', family: 'Plomberie', problem: 'Coupure Eau' },
  { lot: 'Plomberie', family: 'Plomberie', problem: 'Lavabo / Douchettes' },
  { lot: 'Plomberie', family: 'Plomberie', problem: 'PB siphon' },
  { lot: 'Plomberie', family: 'Plomberie', problem: 'regard / WC bouche' },
  { lot: 'Plomberie', family: 'Plomberie', problem: 'fuite robinet Lavabo' },
  { lot: 'Plomberie', family: 'Plomberie', problem: 'Urinoir fuite poussoir' },
  { lot: 'Plomberie', family: 'Plomberie', problem: 'WC fuite' },
  { lot: 'Plomberie', family: 'Plomberie', problem: "WC Mecanisme chasse d'eau" },
  { lot: 'Plomberie', family: 'Plomberie', problem: 'Inondation' },
  { lot: 'Plomberie', family: 'Plomberie', problem: 'Deratisation et traitement des locaux' },
  { lot: 'Plomberie', family: 'Plomberie', problem: "Fontaine d'eau glacee" },
  { lot: 'Ascenseur', family: 'Ascenseur', problem: 'Pb alimentation electrique' },
  { lot: 'Ascenseur', family: 'Ascenseur', problem: 'Pb securite des portes' },
  { lot: 'Ascenseur', family: 'Ascenseur', problem: 'Pb eclairage inr' },
  { lot: 'Ascenseur', family: 'Ascenseur', problem: 'coulisse' },
  { lot: 'Courant faible', family: 'internet/intranet/tel/fax', problem: 'Pb interne de connexion' },
  { lot: 'Courant faible', family: 'internet/intranet/tel/fax', problem: 'Nouvelle installation' },
  { lot: 'Incendie', family: 'Securite Incendie', problem: 'Pb. Detection et Incendie' },
  { lot: 'Incendie', family: 'Securite Incendie', problem: 'Pb.Extincteurs' },
  { lot: 'Incendie', family: 'Securite Incendie', problem: "Pb. Controle d'acces" },
  { lot: 'Incendie', family: 'Securite Incendie', problem: 'Pb.Video / Camera / Magnetoscope' },
  { lot: 'Incendie', family: 'Securite Incendie', problem: 'Alarme' },
  { lot: 'Incendie', family: 'Securite Incendie', problem: "Installation d'extincteurs" },
  { lot: 'Incendie', family: 'Securite Incendie', problem: 'Expiration extincteur' },
  { lot: 'Incendie', family: 'Securite Incendie', problem: 'Pb. Eclairage secours' },
  { lot: 'Incendie', family: 'Securite Incendie', problem: 'Autre' },
  { lot: 'Menuiserie', family: 'Menuiserie', problem: 'Pb. Serrurerie' },
  { lot: 'Menuiserie', family: 'Menuiserie', problem: 'Pb. Menuiserie' },
  { lot: 'Menuiserie', family: 'Menuiserie', problem: 'Fourniture cle de bureau' },
  { lot: 'Menuiserie', family: 'Menuiserie', problem: 'Serrure / Verrou HS' },
  { lot: 'Menuiserie', family: 'Menuiserie', problem: 'Pb SAS' },
  { lot: 'Menuiserie', family: 'Menuiserie', problem: 'Poignee de porte HS' },
  { lot: 'Menuiserie', family: 'Menuiserie', problem: 'Poignee de fenetre HS' },
  { lot: 'Menuiserie', family: 'Menuiserie', problem: 'Menuiserie' },
  { lot: 'Menuiserie', family: 'Menuiserie', problem: 'Pb Fermeture Porte / Fenetre' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Pb. Vitrerie' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'problemes lit medical' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Pb. Revetement Sol' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Pb. Revetement Mur' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Pb. Revetement Plafond' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Pb. Toiture' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Gros oeuvre' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Pb.de store/rideau' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Barre antipatique HS' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Faux-plafond / Faux-plancher' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Fermeture fenetre bureau' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Fixation barre de seuil' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Pose depose boite a cle' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Pose depose de tableau mural' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Pose ou depose store' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Deplacement cloison' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Pose ou reparation moquette ou carrelage' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Pose protection cable au sol' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Infiltration (plafond / mur)' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Pb.seche main' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Autre' },
  { lot: 'Secondes Oeuvres', family: 'Secondes_Oeuvres', problem: 'Revetement mural (papier / peinture / carrelage)' },
  { lot: 'Divers Services', family: 'Divers Services', problem: 'A preciser' }
];

type RiskOption = {
  label: string;
  classe: number;
};

const GRAVITY_OPTIONS: RiskOption[] = [
  { label: 'consequences majeures', classe: 5 },
  { label: 'danger pour la securite', classe: 4 },
  { label: 'impact significatif', classe: 3 },
  { label: 'dysfonctionnement limite', classe: 2 },
  { label: 'impact negligeable', classe: 1 }
];

const OCCURRENCE_OPTIONS: RiskOption[] = [
  { label: 'Tres frequente', classe: 5 },
  { label: 'Frequente', classe: 4 },
  { label: 'Moyennement frequente', classe: 3 },
  { label: 'Occasionnelle', classe: 2 },
  { label: 'Exceptionnelle', classe: 1 }
];

const DETECTABILITY_OPTIONS: RiskOption[] = [
  { label: 'Aucune detection possible', classe: 5 },
  { label: 'Detection en visite preventive', classe: 4 },
  { label: 'Detection apres arret machine', classe: 3 },
  { label: 'Detection immediate par operateur', classe: 2 },
  { label: 'Detection en temps reel', classe: 1 }
];

function normalizeValue(value?: string | null): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[œ]/g, 'oe')
    .replace(/[_\s]+/g, ' ')
    .trim();
}

function findMatchingLot(value?: string | null): string | null {
  const normalizedValue = normalizeValue(value);
  if (!normalizedValue) return null;

  return Array.from(new Set(PLAN_ACTION_PROBLEMS.map((item) => item.lot))).find((lot) => {
    const normalizedLot = normalizeValue(lot);
    return normalizedLot === normalizedValue ||
      normalizedLot.includes(normalizedValue) ||
      normalizedValue.includes(normalizedLot);
  }) || null;
}

export default function PlanActionValidationModal({
  machineName,
  lotName,
  showClosureFields = true,
  onCancel,
  onConfirm
}: PlanActionValidationModalProps) {
  const { profile } = useAuth();
  const [form, setForm] = useState<PlanActionFormData>(defaultForm);
  const [selectedLot, setSelectedLot] = useState<string>(() => findMatchingLot(lotName) || '');
  const [selectedProblemFamily, setSelectedProblemFamily] = useState<string>('all');
  const [customProblems, setCustomProblems] = useState<Array<{ lot: string; family: string; problem: string | null }>>([]);
  const [databaseCatalogLoaded, setDatabaseCatalogLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadCustomProblems = () => {
      Promise.all([
        supabase.from('plan_action_lots').select('id, nom').eq('actif', true),
        supabase.from('plan_action_problem_families').select('id, lot_id, nom').eq('actif', true),
        supabase.from('plan_action_failure_modes').select('famille_id, nom').eq('actif', true)
      ]).then(([lotsResult, familiesResult, modesResult]) => {
        if (!active) return;
        const error = lotsResult.error || familiesResult.error || modesResult.error;
        if (error) {
          console.warn('Catalogue du plan d action indisponible:', error.message);
          return;
        }
        const lotNames = new Map((lotsResult.data || []).map((lot) => [lot.id, lot.nom]));
        const modesByFamily = new Map<string, string[]>();
        (modesResult.data || []).forEach((mode) => {
          modesByFamily.set(mode.famille_id, [...(modesByFamily.get(mode.famille_id) || []), mode.nom]);
        });
        const catalog = (familiesResult.data || []).flatMap((family) => {
          const lot = lotNames.get(family.lot_id);
          if (!lot) return [];
          const familyModes = modesByFamily.get(family.id) || [];
          return familyModes.length
            ? familyModes.map((problem) => ({ lot, family: family.nom, problem }))
            : [{ lot, family: family.nom, problem: null }];
        });
        setDatabaseCatalogLoaded(true);
        setCustomProblems(catalog);
      });
    };

    loadCustomProblems();
    window.addEventListener('focus', loadCustomProblems);

    return () => {
      active = false;
      window.removeEventListener('focus', loadCustomProblems);
    };
  }, []);

  const allProblems = useMemo(() => {
    const unique = new Map<string, { lot: string; family: string; problem: string }>();
    const customModes = customProblems.filter(
      (item): item is { lot: string; family: string; problem: string } => Boolean(item.problem)
    );
    const catalog = databaseCatalogLoaded ? customModes : [...PLAN_ACTION_PROBLEMS, ...customModes];
    catalog.forEach((item) => {
      unique.set(`${item.lot}\u0000${item.family}\u0000${item.problem}`, item);
    });
    return Array.from(unique.values());
  }, [customProblems, databaseCatalogLoaded]);

  useEffect(() => {
    const matchedLot = findMatchingLot(lotName);
    if (matchedLot && !selectedLot) {
      setSelectedLot(matchedLot);
      updateField('lot_defaillance', matchedLot);
    }
  }, [lotName, selectedLot]);

  const lotOptions = useMemo(
    () => Array.from(new Set([
      ...allProblems.map((item) => item.lot),
      ...customProblems.map((item) => item.lot)
    ])).sort(),
    [allProblems, customProblems]
  );

  const lotProblems = useMemo(() => {
    if (!selectedLot) return allProblems;
    return allProblems.filter((item) => item.lot === selectedLot);
  }, [allProblems, selectedLot]);

  const problemFamilies = useMemo(
    () => Array.from(new Set([
      ...lotProblems.map((item) => item.family),
      ...customProblems.filter((item) => item.lot === selectedLot).map((item) => item.family)
    ])).sort(),
    [customProblems, lotProblems, selectedLot]
  );

  const filteredProblems = useMemo(
    () => selectedProblemFamily === 'all'
      ? lotProblems
      : lotProblems.filter((item) => item.family === selectedProblemFamily),
    [lotProblems, selectedProblemFamily]
  );

  const rpn = useMemo(
    () => form.gravite_classe * form.occurrence_classe * form.detectabilite_classe,
    [form.gravite_classe, form.occurrence_classe, form.detectabilite_classe]
  );

  const updateField = <K extends keyof PlanActionFormData>(key: K, value: PlanActionFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateRiskField = (
    labelKey: 'gravite_libelle' | 'occurrence_libelle' | 'detectabilite_libelle',
    classKey: 'gravite_classe' | 'occurrence_classe' | 'detectabilite_classe',
    value: string,
    options: RiskOption[]
  ) => {
    const option = options.find((item) => item.label === value);
    setForm((current) => ({
      ...current,
      [labelKey]: value,
      [classKey]: option?.classe || current[classKey]
    }));
  };

  const handleSubmit = async () => {
    if (!form.mode_defaillance.trim() || !form.action_recommandee.trim()) {
      alert('Veuillez renseigner le mode de defaillance et l action recommandee.');
      return;
    }

    setLoading(true);
    try {
      const selectedProblem = allProblems.find((item) =>
        item.lot === selectedLot &&
        item.problem === form.mode_defaillance &&
        (selectedProblemFamily === 'all' || item.family === selectedProblemFamily)
      );

      await onConfirm({
        ...form,
        lot_defaillance: selectedProblem?.lot || selectedLot,
        famille_probleme: selectedProblem?.family || (selectedProblemFamily === 'all' ? '' : selectedProblemFamily)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        <div className="bg-slate-800 p-4 sm:p-6 text-white rounded-t-2xl flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 p-2 rounded-lg">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Plan d'action correctif</h2>
                <p className="text-slate-200 text-sm mt-1">
                  {machineName || 'Intervention corrective'} - informations obligatoires avant validation
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={loading}
              className="text-white hover:bg-white/15 rounded-lg p-2 transition-colors disabled:opacity-50"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2">
                    Lot *
                    {profile?.role === 'admin' && (
                      <a
                        href="/admin/plan-action/options"
                        target="_blank"
                        rel="noreferrer"
                        title="Gérer les lots, familles et modes de défaillance"
                        aria-label="Gérer le catalogue du plan d'action"
                        className="inline-flex rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                      >
                        <Settings size={15} />
                      </a>
                    )}
                  </span>
                  <select
                    value={selectedLot}
                    onChange={(event) => {
                      setSelectedLot(event.target.value);
                      setSelectedProblemFamily('all');
                      updateField('lot_defaillance', event.target.value);
                      updateField('famille_probleme', '');
                      updateField('mode_defaillance', '');
                    }}
                    className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    disabled={loading}
                  >
                    <option value="">Selectionner un lot</option>
                    {lotOptions.map((lot) => (
                      <option key={lot} value={lot}>{lot}</option>
                    ))}
                  </select>
                </label>
                {lotName && (
                  <p className="text-xs text-slate-500">Lot detecte sur la machine: {lotName}</p>
                )}
              </div>

              <label className="block">
                <span className="block text-sm font-bold text-slate-800 mb-2">Famille de problemes</span>
                <select
                  value={selectedProblemFamily}
                onChange={(event) => {
                  setSelectedProblemFamily(event.target.value);
                  updateField('famille_probleme', event.target.value === 'all' ? '' : event.target.value);
                  updateField('mode_defaillance', '');
                }}
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  disabled={loading || !selectedLot}
                >
                  <option value="all">Toutes les familles du lot</option>
                  {problemFamilies.map((family) => (
                    <option key={family} value={family}>{family}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-sm font-bold text-slate-800 mb-2">Mode de defaillance potentiel *</span>
                <select
                  value={form.mode_defaillance}
                  onChange={(event) => {
                    const problem = filteredProblems.find((item) => item.problem === event.target.value);
                    updateField('mode_defaillance', event.target.value);
                    updateField('lot_defaillance', problem?.lot || selectedLot);
                    updateField('famille_probleme', problem?.family || (selectedProblemFamily === 'all' ? '' : selectedProblemFamily));
                  }}
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  disabled={loading || !selectedLot}
                >
                  <option value="">{selectedLot ? 'Selectionner un probleme' : 'Selectionner un lot d abord'}</option>
                  {filteredProblems.map((item) => (
                    <option key={`${item.lot}-${item.family}-${item.problem}`} value={item.problem}>
                      {item.problem}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="block text-sm font-bold text-slate-800 mb-2">Action recommandee *</span>
              <textarea
                value={form.action_recommandee}
                onChange={(event) => updateField('action_recommandee', event.target.value)}
                rows={3}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 resize-none"
                disabled={loading}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <RiskField
              label="Gravite productivite de l'echec"
              textValue={form.gravite_libelle}
              classValue={form.gravite_classe}
              onTextChange={(value) => updateRiskField('gravite_libelle', 'gravite_classe', value, GRAVITY_OPTIONS)}
              options={GRAVITY_OPTIONS}
              placeholder="Selectionner une gravite"
              disabled={loading}
            />
            <RiskField
              label="Occurrence d'echec"
              textValue={form.occurrence_libelle}
              classValue={form.occurrence_classe}
              onTextChange={(value) => updateRiskField('occurrence_libelle', 'occurrence_classe', value, OCCURRENCE_OPTIONS)}
              options={OCCURRENCE_OPTIONS}
              placeholder="Selectionner une occurrence"
              disabled={loading}
            />
            <RiskField
              label="Detectabilite"
              textValue={form.detectabilite_libelle}
              classValue={form.detectabilite_classe}
              onTextChange={(value) => updateRiskField('detectabilite_libelle', 'detectabilite_classe', value, DETECTABILITY_OPTIONS)}
              options={DETECTABILITY_OPTIONS}
              placeholder="Selectionner une detectabilite"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border-2 border-slate-300 bg-slate-50 p-4">
              <span className="block text-sm font-bold text-slate-800 mb-2">R.P.N.</span>
              <div className="text-3xl font-bold text-slate-900">{rpn}</div>
              <p className="text-xs text-slate-500 mt-1">Gravite x occurrence x detectabilite</p>
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-4 ${showClosureFields ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}>
            <label className="block">
              <span className="block text-sm font-bold text-slate-800 mb-2">Date expression</span>
              <input
                type="date"
                value={form.date_expression}
                onChange={(event) => updateField('date_expression', event.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                disabled={loading}
              />
            </label>

            {showClosureFields && (
              <>
                <label className="flex items-center gap-3 rounded-lg border-2 border-slate-300 px-3 py-2 mt-0 md:mt-7">
                  <input
                    type="checkbox"
                    checked={form.action_cloturee}
                    onChange={(event) => updateField('action_cloturee', event.target.checked)}
                    className="h-4 w-4"
                    disabled={loading}
                  />
                  <span className="text-sm font-bold text-slate-800">Action cloturee</span>
                </label>

                <label className="block">
                  <span className="block text-sm font-bold text-slate-800 mb-2">Date cloture action</span>
                  <input
                    type="date"
                    value={form.date_cloture_action}
                    onChange={(event) => updateField('date_cloture_action', event.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    disabled={loading}
                  />
                </label>
              </>
            )}
          </div>

          <label className="block">
            <span className="block text-sm font-bold text-slate-800 mb-2">Observation resultat</span>
            <textarea
              value={form.observation_resultat}
              onChange={(event) => updateField('observation_resultat', event.target.value)}
              rows={3}
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 resize-none"
              disabled={loading}
            />
          </label>
        </div>

        <div className="bg-slate-50 px-4 sm:px-6 py-4 border-t-2 border-slate-200 rounded-b-2xl flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-semibold transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            Enregistrer et valider
          </button>
        </div>
      </div>
    </div>
  );
}

function RiskField({
  label,
  textValue,
  classValue,
  onTextChange,
  options,
  placeholder,
  disabled
}: {
  label: string;
  textValue: string;
  classValue: number;
  onTextChange: (value: string) => void;
  options?: RiskOption[];
  placeholder?: string;
  disabled: boolean;
}) {
  return (
    <div className="rounded-xl border-2 border-slate-200 p-4 space-y-3">
      <label className="block">
        <span className="block text-sm font-bold text-slate-800 mb-2">{label}</span>
        {options ? (
          <select
            value={textValue}
            onChange={(event) => onTextChange(event.target.value)}
            className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
            disabled={disabled}
          >
            <option value="">{placeholder || 'Selectionner une option'}</option>
            {options.map((option) => (
              <option key={option.label} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <textarea
            value={textValue}
            onChange={(event) => onTextChange(event.target.value)}
            rows={2}
            className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 resize-none"
            disabled={disabled}
          />
        )}
      </label>
      <label className="block">
        <span className="block text-sm font-bold text-slate-800 mb-2">Classe</span>
        <input
          type="number"
          value={classValue}
          className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg bg-slate-100 font-bold text-slate-800"
          disabled
          readOnly
        />
        <p className="mt-1 text-xs text-slate-500">Associee automatiquement au choix.</p>
      </label>
    </div>
  );
}
