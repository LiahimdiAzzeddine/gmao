import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { supabase } from '../../lib/supabase';
import { generateMaintenancePlanDates } from '../../utils/maintenancePlanDates';
import {
  Calendar,
  Settings,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Zap,
  Info,
  Clock,
  Target,
  Filter,
  ClipboardList,
  Eye,
  X,
} from 'lucide-react';

type Plan = {
  id: string;
  numero?: number;
  machines: Array<{ id: string; nom: string }>;
  machines_manquantes?: Array<{ id: string; nom: string }>;
  type_recurrence: string;
  intervalle: number;
  date_debut: string;
  date_fin?: string | null;
  jour_semaine?: number;
  forcer_jour_semaine?: boolean;
  semaine_du_mois?: number;
};

type JourDisponible = {
  date: string;
  dateObj: Date;
  semaine: number;
  annee: number;
  plansManquants: Plan[];
  totalPlans: number;
};

type SemaineDisponible = {
  numero: number;
  dateDebut: string;
  dateFin: string;
  annee: number;
  joursManquants: JourDisponible[];
  totalOTManquants: number;
};

type PlanOption = {
  value: string;
  label: string;
};

type MachineOption = {
  value: string;
  label: string;
};

export default function GenererOTForm() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansSelectionnes, setPlansSelectionnes] = useState<PlanOption[]>([]);
  const [semainesDisponibles, setSemainesDisponibles] = useState<SemaineDisponible[]>([]);
  const [semainesSelectionnees, setSemainesSelectionnees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAnalyse, setLoadingAnalyse] = useState(true);
  const [message, setMessage] = useState('');
  const [modeFiltrePlans, setModeFiltrePlans] = useState<'tous' | 'selection'>('tous');
  const [machineFilter, setMachineFilter] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);
  const [semaineDetail, setSemaineDetail] = useState<SemaineDisponible | null>(null);

  const getRecurrenceDescription = (plan: Plan): string => {
    const { type_recurrence, intervalle, jour_semaine, semaine_du_mois } = plan;
    switch (type_recurrence) {
      case 'journalière':
        return intervalle === 1 ? 'Quotidien' : `Tous les ${intervalle} jours`;
      case 'hebdomadaire': {
        const jourNom = jour_semaine ? ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][jour_semaine] : '';
        if (intervalle === 1) return jourNom ? `Hebdomadaire (${jourNom})` : 'Hebdomadaire';
        if (intervalle === 2) return jourNom ? `Quinzaine (${jourNom})` : 'Quinzaine';
        if (intervalle === 4) return jourNom ? `Mensuel via semaines (${jourNom})` : 'Mensuel via semaines';
        return jourNom ? `Toutes les ${intervalle} semaines (${jourNom})` : `Toutes les ${intervalle} semaines`;
      }
      case 'mensuelle': {
        const semaineNom = semaine_du_mois ? `S${semaine_du_mois}` : '';
        const jourNomM = jour_semaine ? ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][jour_semaine] : '';
        const detail = [semaineNom, jourNomM].filter(Boolean).join(' ');
        if (intervalle === 1) return detail ? `Mensuel (${detail})` : 'Mensuel';
        if (intervalle === 2) return detail ? `Bimestriel (${detail})` : 'Bimestriel';
        if (intervalle === 3) return detail ? `Trimestriel (${detail})` : 'Trimestriel';
        if (intervalle === 6) return detail ? `Semestriel (${detail})` : 'Semestriel';
        if (intervalle === 12) return detail ? `Annuel via mois (${detail})` : 'Annuel via mois';
        return detail ? `Tous les ${intervalle} mois (${detail})` : `Tous les ${intervalle} mois`;
      }
      case 'annuelle': {
        const jourNomA = jour_semaine ? ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][jour_semaine] : '';
        if (intervalle === 1) return jourNomA ? `Annuel (${jourNomA})` : 'Annuel';
        if (intervalle === 2) return jourNomA ? `Bisannuel (${jourNomA})` : 'Bisannuel';
        if (intervalle === 3) return jourNomA ? `Triennal (${jourNomA})` : 'Triennal';
        if (intervalle === 5) return jourNomA ? `Quinquennal (${jourNomA})` : 'Quinquennal';
        if (intervalle === 10) return jourNomA ? `Décennal (${jourNomA})` : 'Décennal';
        return jourNomA ? `Tous les ${intervalle} ans (${jourNomA})` : `Tous les ${intervalle} ans`;
      }
      default:
        return 'Non défini';
    }
  };

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const getWeekDates = (year: number, week: number): { debut: Date; fin: Date } => {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    const debut = new Date(ISOweekStart);
    const fin = new Date(debut);
    fin.setDate(debut.getDate() + 6);
    return { debut, fin };
  };

  const planNecessiteOT = (plan: Plan, date: Date): boolean => {
    const dateTest = new Date(date);
    dateTest.setHours(0, 0, 0, 0);
    return generateMaintenancePlanDates(plan, dateTest, dateTest, 5000).length > 0;
  };

  const chargerPlans = async (): Promise<Plan[]> => {
    try {
      const { data: plansData, error: plansError } = await supabase
        .from('plans_maintenance')
        .select(`
          id,
          numero,
          type_recurrence,
          intervalle,
          date_debut,
          date_fin,
          jour_semaine,
          forcer_jour_semaine,
          semaine_du_mois,
          plan_machines(machine_id, machine:machines(id, nom))
        `)
        .eq('statut', 'actif')
        .order('date_debut', { ascending: true });

      if (plansError) throw plansError;

      const plansFormates: Plan[] = plansData
        .map((p: any) => ({
          id: p.id,
          numero: p.numero,
          machines: (p.plan_machines || []).map((link: any) => ({
            id: link.machine_id,
            nom: link.machine?.nom || 'Machine inconnue',
          })),
          type_recurrence: p.type_recurrence,
          intervalle: p.intervalle,
          date_debut: p.date_debut,
          date_fin: p.date_fin,
          jour_semaine: p.jour_semaine,
          forcer_jour_semaine: p.forcer_jour_semaine,
          semaine_du_mois: p.semaine_du_mois,
        }))
        .filter((plan: Plan) => plan.machines.length > 0);

      setPlans(plansFormates);
      return plansFormates;
    } catch (error) {
      console.error('Erreur lors du chargement des plans:', error);
      setMessage('Erreur lors du chargement des plans de maintenance.');
      return [];
    }
  };

  const analyserSemainesManquantes = async () => {
    setLoadingAnalyse(true);
    try {
      const plansData = await chargerPlans();
      if (plansData.length === 0) {
        setSemainesDisponibles([]);
        setLoadingAnalyse(false);
        return;
      }

      const plansAAnalyser =
        modeFiltrePlans === 'selection' && plansSelectionnes.length > 0
          ? plansData.filter(plan => plansSelectionnes.some(ps => ps.value === plan.id))
          : plansData;

      if (plansAAnalyser.length === 0) {
        setSemainesDisponibles([]);
        setLoadingAnalyse(false);
        return;
      }

      const maintenant = new Date();
      const datesDebut = plansAAnalyser.map(plan => new Date(plan.date_debut));
      const dateDebutLaPlusAncienne = new Date(Math.min(...datesDebut.map(d => d.getTime())));

      // PERFORMANCE FIX: single query for entire date range
      const startDateStr = dateDebutLaPlusAncienne.toISOString().split('T')[0];
      const endDateStr = maintenant.toISOString().split('T')[0];

      const { data: ordresExistants, error: ordresError } = await supabase
        .from('ordres_travail')
        .select('plan_id, machine_id, date_programmee')
        .not('plan_id', 'is', null)
        .gte('date_programmee', startDateStr)
        .lte('date_programmee', endDateStr);

      if (ordresError) throw ordresError;

      // O(1) lookup set
      const otExistantsSet = new Set(
        (ordresExistants || []).map(o => `${o.plan_id}_${o.machine_id}_${o.date_programmee.split('T')[0]}`)
      );

      const semainesAnalysees: SemaineDisponible[] = [];
      const semaineActuelle = getWeekNumber(maintenant);
      const anneeActuelle = maintenant.getFullYear();
      const semaineDebut = getWeekNumber(dateDebutLaPlusAncienne);
      const anneeDebut = dateDebutLaPlusAncienne.getFullYear();

      let anneeAnalyse = anneeDebut;
      let semaineAnalyse = semaineDebut;

      while (
        anneeAnalyse < anneeActuelle ||
        (anneeAnalyse === anneeActuelle && semaineAnalyse <= semaineActuelle)
      ) {
        const { debut, fin } = getWeekDates(anneeAnalyse, semaineAnalyse);
        const joursManquants: JourDisponible[] = [];

        for (let j = 0; j < 7; j++) {
          const dateJour = new Date(debut);
          dateJour.setDate(debut.getDate() + j);
          dateJour.setHours(0, 0, 0, 0); // Normaliser à minuit
          if (dateJour > maintenant) break;

          // Formater la date en YYYY-MM-DD en heure locale (pas UTC)
          const dateStr = `${dateJour.getFullYear()}-${String(dateJour.getMonth() + 1).padStart(2, '0')}-${String(dateJour.getDate()).padStart(2, '0')}`;
          const plansNecessaires = plansAAnalyser.filter(plan => planNecessiteOT(plan, dateJour));
          const plansManquants = plansNecessaires
            .map(plan => ({
              ...plan,
              machines_manquantes: plan.machines.filter(machine =>
                !otExistantsSet.has(`${plan.id}_${machine.id}_${dateStr}`)
              ),
            }))
            .filter(plan => plan.machines_manquantes.length > 0);

          if (plansManquants.length > 0) {
            joursManquants.push({
              date: dateStr,
              dateObj: dateJour,
              semaine: semaineAnalyse,
              annee: anneeAnalyse,
              plansManquants,
              totalPlans: plansNecessaires.length,
            });
          }
        }

        if (joursManquants.length > 0) {
          semainesAnalysees.push({
            numero: semaineAnalyse,
            dateDebut: debut.toISOString().split('T')[0],
            dateFin: fin.toISOString().split('T')[0],
            annee: anneeAnalyse,
            joursManquants,
            totalOTManquants: joursManquants.reduce(
              (total, jour) => total + jour.plansManquants.reduce(
                (planTotal, plan) => planTotal + (plan.machines_manquantes?.length || 0),
                0
              ),
              0
            ),
          });
        }

        semaineAnalyse++;
        if (semaineAnalyse > 52) {
          semaineAnalyse = 1;
          anneeAnalyse++;
        }
      }

      semainesAnalysees.sort((a, b) =>
        a.annee !== b.annee ? b.annee - a.annee : b.numero - a.numero
      );
      setSemainesDisponibles(semainesAnalysees);
    } catch (error) {
      console.error("Erreur lors de l'analyse:", error);
      setMessage("Erreur lors de l'analyse des jours manquants.");
    } finally {
      setLoadingAnalyse(false);
    }
  };

  const getSemaineKey = (s: SemaineDisponible) => `${s.annee}-${s.numero}`;

  const toggleSemaine = (key: string) => {
    setSemainesSelectionnees(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleTout = () => {
    if (semainesSelectionnees.length === semainesFiltrees.length && semainesFiltrees.length > 0) {
      setSemainesSelectionnees([]);
    } else {
      setSemainesSelectionnees(semainesFiltrees.map(getSemaineKey));
    }
  };

  const handleSubmit = async () => {
    if (semainesSelectionnees.length === 0) {
      setMessage('Veuillez sélectionner au moins une semaine.');
      return;
    }

    setLoading(true);
    setMessage('');

    const selectedSemaines = semainesDisponibles.filter(s =>
      semainesSelectionnees.includes(getSemaineKey(s))
    );
    const totalOT = selectedSemaines.reduce((t, s) => t + s.totalOTManquants, 0);
    let generated = 0;
    setGenerationProgress({ current: 0, total: totalOT });

    try {
      for (const semaine of selectedSemaines) {
        for (const jour of semaine.joursManquants) {
          for (const plan of jour.plansManquants) {
            const otToCreate = (plan.machines_manquantes || []).map(machine => ({
              plan_id: plan.id,
              machine_id: machine.id,
              date_programmee: new Date(jour.date).toISOString(),
              statut: 'prévu',
              type: 'préventif',
            }));
            if (otToCreate.length === 0) continue;

            const { error } = await supabase.from('ordres_travail').insert(otToCreate);
            if (error) throw error;
            generated += otToCreate.length;
            setGenerationProgress({ current: generated, total: totalOT });
          }
        }
      }

      setMessage(`${generated} ordre(s) de travail généré(s) avec succès !`);
      setSemainesSelectionnees([]);
      setTimeout(() => analyserSemainesManquantes(), 1000);
    } catch (error) {
      console.error('Erreur:', error);
      setMessage('Erreur lors de la génération des ordres de travail.');
    } finally {
      setLoading(false);
      setGenerationProgress(null);
    }
  };

  useEffect(() => {
    analyserSemainesManquantes();
  }, [modeFiltrePlans, plansSelectionnes]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

  const planOptions: PlanOption[] = plans.map(p => ({
    value: p.id,
    label: `Plan #${p.numero ?? p.id.slice(0, 8)} · ${p.machines.length} machine${p.machines.length > 1 ? 's' : ''} · ${getRecurrenceDescription(p)}`,
  }));

  // Machine filter options derived from all plans
  const machineOptions: MachineOption[] = Array.from(
    new Map(plans.flatMap(plan => plan.machines.map(machine => [machine.id, machine.nom] as const))).entries()
  ).map(([id, nom]) => ({ value: id, label: nom }));

  // Filter displayed weeks by machine
  const semainesFiltrees = machineFilter
    ? semainesDisponibles.filter(s =>
        s.joursManquants.some(j => j.plansManquants.some(p =>
          p.machines_manquantes?.some(machine => machine.id === machineFilter)
        ))
      )
    : semainesDisponibles;

  const totalOTManquantsGlobal = semainesDisponibles.reduce((t, s) => t + s.totalOTManquants, 0);
  const totalOccurrencesGlobal = semainesDisponibles.reduce(
    (total, semaine) => total + semaine.joursManquants.reduce(
      (jourTotal, jour) => jourTotal + jour.plansManquants.length,
      0
    ),
    0
  );
  const totalOTSelectionnes = semainesDisponibles
    .filter(s => semainesSelectionnees.includes(getSemaineKey(s)))
    .reduce((t, s) => t + s.totalOTManquants, 0);
  const totalOccurrencesSelectionnees = semainesDisponibles
    .filter(s => semainesSelectionnees.includes(getSemaineKey(s)))
    .reduce(
      (total, semaine) => total + semaine.joursManquants.reduce(
        (jourTotal, jour) => jourTotal + jour.plansManquants.length,
        0
      ),
      0
    );

  const getSemaineOccurrences = (semaine: SemaineDisponible) =>
    semaine.joursManquants.reduce((total, jour) => total + jour.plansManquants.length, 0);

  const toutSelectionne =
    semainesFiltrees.length > 0 &&
    semainesFiltrees.every(s => semainesSelectionnees.includes(getSemaineKey(s)));

  // Variables pour identifier la semaine actuelle
  const maintenant = new Date();
  const semaineActuelle = getWeekNumber(maintenant);
  const anneeActuelle = maintenant.getFullYear();

  useEffect(() => {
    if (!semaineDetail) return;

    const fermerAvecEchap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSemaineDetail(null);
    };

    document.addEventListener('keydown', fermerAvecEchap);
    return () => document.removeEventListener('keydown', fermerAvecEchap);
  }, [semaineDetail]);

  return (
    <div className="space-y-5 pb-8 pt-2">
      {/* Spinner global pendant la génération des OT */}
      {loading && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/60 bg-white p-7 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 ring-1 ring-orange-100">
                <Loader2 className="h-9 w-9 animate-spin text-[#f98440]" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Génération des OT en cours...
              </h3>
              {generationProgress ? (
                <>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-slate-600 mb-2">
                      <span>Progression</span>
                      <span className="font-semibold">
                        {generationProgress.current} / {generationProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-orange-600 h-full transition-all duration-300 ease-out"
                        style={{
                          width: `${(generationProgress.current / generationProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {Math.round((generationProgress.current / generationProgress.total) * 100)}% complété
                    </p>
                  </div>
                  <p className="text-slate-600 text-sm">
                    Création des ordres de travail préventifs...
                  </p>
                </>
              ) : (
                <p className="text-slate-600">
                  Préparation de la génération...
                </p>
              )}
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                <span>Veuillez patienter, ne fermez pas cette page</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {semaineDetail && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={event => {
            if (event.currentTarget === event.target) setSemaineDetail(null);
          }}
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="semaine-detail-title"
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600">
                  <Calendar className="h-4 w-4" />
                  Détail de la programmation
                </div>
                <h2 id="semaine-detail-title" className="text-lg font-bold text-slate-900 sm:text-xl">
                  Semaine {semaineDetail.numero} — {semaineDetail.annee}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Du {formatDate(semaineDetail.dateDebut)} au {formatDate(semaineDetail.dateFin)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSemaineDetail(null)}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                aria-label="Fermer les détails"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid grid-cols-1 gap-3 border-b border-slate-200 px-5 py-3 sm:grid-cols-3 sm:px-6">
              <div className="rounded-xl bg-orange-50 px-4 py-3">
                <div className="text-xl font-bold text-orange-700">{semaineDetail.totalOTManquants}</div>
                <div className="text-xs font-medium text-orange-700">OT à créer</div>
                <div className="mt-1 text-[11px] text-orange-600">1 OT par machine</div>
              </div>
              <div className="rounded-xl bg-blue-50 px-4 py-3">
                <div className="text-xl font-bold text-blue-700">{getSemaineOccurrences(semaineDetail)}</div>
                <div className="text-xs font-medium text-blue-700">Occurrences de plan</div>
                <div className="mt-1 text-[11px] text-blue-600">1 plan à une date</div>
              </div>
              <div className="rounded-xl bg-slate-100 px-4 py-3">
                <div className="text-xl font-bold text-slate-700">{semaineDetail.joursManquants.length}</div>
                <div className="text-xs font-medium text-slate-600">Jours concernés</div>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-4 sm:px-6">
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <span className="font-semibold">Comment lire le total :</span>{' '}
                une occurrence correspond à un plan prévu pour une date. Cette occurrence génère un OT pour chaque machine du plan qui n’en possède pas encore.
              </div>
              <div className="space-y-3">
                {semaineDetail.joursManquants.map(jour => (
                  <article key={jour.date} className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
                      <h3 className="text-sm font-bold capitalize text-slate-800">
                        {new Date(jour.date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </h3>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                          {jour.plansManquants.length} occurrence{jour.plansManquants.length > 1 ? 's' : ''}
                        </span>
                        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                          {jour.plansManquants.reduce((total, plan) => total + (plan.machines_manquantes?.length || 0), 0)} OT
                        </span>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {jour.plansManquants.map((plan, index) => (
                        <div key={`${plan.id}-${index}`} className="flex gap-3 px-4 py-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orange-100 text-xs font-bold text-orange-700">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800">
                              Plan #{plan.numero ?? plan.id.slice(0, 8)}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              {getRecurrenceDescription(plan)}
                            </div>
                            <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
                              1 occurrence × {(plan.machines_manquantes || []).length} machine{(plan.machines_manquantes || []).length > 1 ? 's' : ''}
                              {' = '}{(plan.machines_manquantes || []).length} OT
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(plan.machines_manquantes || []).map(machine => (
                                <span key={machine.id} className="rounded-md bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                                  {machine.nom}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-5">
        <div className="overflow-hidden rounded-2xl border border-orange-200/70 bg-white shadow-sm">
          {/* En-tête */}
          <div className="bg-gradient-to-br from-[#f98440] via-[#f97316] to-[#d95f24] px-5 py-6 text-white sm:px-7 lg:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                  Rattraper les OT Préventifs Manqués
                </h1>
                <p className="mt-1.5 max-w-3xl text-sm leading-6 text-orange-50/90">
                  Analysez les dates prévues par chaque plan, puis créez un OT pour chaque machine concernée
                </p>
              </div>
            </div>
          </div>

          {/* Message d'information */}
          <div className="mx-5 mt-5 rounded-xl border border-blue-200 bg-blue-50/80 p-4 sm:mx-7 lg:mx-8">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Un plan peut générer plusieurs OT pour une même date</p>
                <p>
                  Le plan détermine les dates. Pour chaque date prévue, le système vérifie toutes les
                  machines associées au plan. Une occurrence de plan concernant 2 machines produit donc
                  2 OT distincts. Les OT déjà présents ne sont pas comptés.
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {message && (
            <div
              className={`mx-5 mt-5 rounded-xl border p-4 sm:mx-7 lg:mx-8 ${
                message.includes('succès')
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex gap-3">
                {message.includes('succès') ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className={`text-sm ${message.includes('succès') ? 'text-green-800' : 'text-red-800'}`}>
                  {message}
                </div>
              </div>
            </div>
          )}

          <div className="p-5 sm:p-7 lg:p-8">
            {/* SECTION 1: FILTRAGE DES PLANS */}
            <div className="mb-7 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div className="mb-5 flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-slate-700">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
                  <span className="text-orange-600 font-bold">1</span>
                </div>
                Sélectionner les plans à analyser
              </div>

              <div className="space-y-4 lg:pl-12">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-4 transition-all ${modeFiltrePlans === 'tous' ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200 hover:border-orange-200'}`}>
                    <input
                      type="radio"
                      name="modeFiltre"
                      value="tous"
                      checked={modeFiltrePlans === 'tous'}
                      onChange={e => setModeFiltrePlans(e.target.value as 'tous' | 'selection')}
                      className="w-4 h-4 text-orange-500 border-slate-300 focus:ring-orange-500"
                    />
                    <span className="text-sm font-semibold text-slate-700">
                      Analyser tous les plans actifs ({plans.length})
                    </span>
                  </label>
                  <label className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-4 transition-all ${modeFiltrePlans === 'selection' ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200 hover:border-orange-200'}`}>
                    <input
                      type="radio"
                      name="modeFiltre"
                      value="selection"
                      checked={modeFiltrePlans === 'selection'}
                      onChange={e => setModeFiltrePlans(e.target.value as 'tous' | 'selection')}
                      className="w-4 h-4 text-orange-500 border-slate-300 focus:ring-orange-500"
                    />
                    <span className="text-sm font-semibold text-slate-700">
                      Sélectionner des plans spécifiques
                    </span>
                  </label>
                </div>

                {modeFiltrePlans === 'selection' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <Filter className="w-4 h-4 inline mr-1" />
                      Plans de maintenance
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Select
                      options={planOptions}
                      value={plansSelectionnes}
                      onChange={selected => setPlansSelectionnes(selected as PlanOption[])}
                      isMulti
                      placeholder="Sélectionner un ou plusieurs plans..."
                      noOptionsMessage={() => 'Aucun plan actif disponible'}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          padding: '0.5rem',
                          borderColor: state.isFocused ? '#f97316' : '#cbd5e1',
                          boxShadow: state.isFocused ? '0 0 0 2px rgba(249, 115, 22, 0.2)' : 'none',
                          '&:hover': { borderColor: '#f97316' },
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isSelected ? '#f97316' : state.isFocused ? '#fed7aa' : 'white',
                          color: state.isSelected ? 'white' : '#334155',
                          cursor: 'pointer',
                          '&:active': { backgroundColor: '#ea580c' },
                        }),
                        multiValue: base => ({ ...base, backgroundColor: '#fed7aa', borderRadius: '0.375rem' }),
                        multiValueLabel: base => ({ ...base, color: '#9a3412', fontWeight: '500' }),
                        multiValueRemove: base => ({
                          ...base,
                          color: '#9a3412',
                          ':hover': { backgroundColor: '#f97316', color: 'white' },
                        }),
                      }}
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      {plansSelectionnes.length} plan(s) sélectionné(s) sur {plans.length} disponible(s)
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Settings className="w-4 h-4" />
                    <span>
                      <span className="font-semibold">
                        {modeFiltrePlans === 'tous' ? plans.length : plansSelectionnes.length}
                      </span>{' '}
                      plan(s) seront analysés pour détecter les OT manquants
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {loadingAnalyse ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
                  <p className="text-slate-600">Analyse des semaines en cours...</p>
                </div>
              </div>
            ) : plans.length === 0 ? (
              /* Empty state: no plans at all */
              <div className="text-center py-16">
                <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Aucun plan de maintenance actif</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                  Créez des plans de maintenance préventive pour commencer à générer des ordres de travail.
                </p>
                <button
                  onClick={() => navigate('/admin/plans-maintenance')}
                  className="px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                  Gérer les plans
                </button>
              </div>
            ) : (
              <>
                {/* Statistiques */}
                <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <div className="text-xl font-bold leading-none text-slate-700">
                      {modeFiltrePlans === 'tous' ? plans.length : plansSelectionnes.length}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">Plans analysés</div>
                  </div>
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-3.5">
                    <div className="text-xl font-bold leading-none text-orange-600">{semainesDisponibles.length}</div>
                    <div className="text-sm text-orange-600 mt-1">Semaines en retard</div>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5">
                    <div className="text-xl font-bold leading-none text-blue-600">{totalOccurrencesGlobal}</div>
                    <div className="text-sm text-blue-600 mt-1">Occurrences manquantes</div>
                  </div>
                  <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3.5">
                    <div className="text-xl font-bold leading-none text-cyan-700">{semainesSelectionnees.length}</div>
                    <div className="text-sm text-cyan-700 mt-1">Semaines sélectionnées</div>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3.5">
                    <div className="text-xl font-bold leading-none text-red-600">{totalOTManquantsGlobal}</div>
                    <div className="text-sm text-red-600 mt-1">OT manquants (total)</div>
                  </div>
                  <div className="col-span-2 rounded-xl border border-green-200 bg-green-50 p-3.5 lg:col-span-1">
                    <div className="text-xl font-bold leading-none text-green-600">{totalOTSelectionnes}</div>
                    <div className="text-sm text-green-600 mt-1">OT à rattraper</div>
                  </div>
                </div>

                {semainesDisponibles.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun OT en retard !</h3>
                    <p className="text-slate-600 mb-4">
                      Tous les ordres de travail préventifs ont été créés selon les plans sélectionnés
                      depuis leur date de début jusqu'à aujourd'hui.
                    </p>
                    <button
                      onClick={analyserSemainesManquantes}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Réanalyser
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Section 2 header + machine filter + toggle button */}
                    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide">
                          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                            <span className="text-orange-600 font-bold">2</span>
                          </div>
                          Semaines avec OT manqués (en retard)
                        </div>
                        <button
                          onClick={toggleTout}
                          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                            toutSelectionne
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {toutSelectionne ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                      </div>

                      {/* Machine filter */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <div className="w-full sm:w-80">
                          <Select<MachineOption>
                            options={machineOptions}
                            value={machineOptions.find(o => o.value === machineFilter) ?? null}
                            onChange={opt => setMachineFilter(opt ? opt.value : '')}
                            isClearable
                            placeholder="Filtrer par machine..."
                            noOptionsMessage={() => 'Aucune machine'}
                            classNamePrefix="react-select"
                            styles={{
                              control: (base, state) => ({
                                ...base,
                                minHeight: '36px',
                                borderColor: state.isFocused ? '#f97316' : '#cbd5e1',
                                boxShadow: state.isFocused ? '0 0 0 2px rgba(249,115,22,0.2)' : 'none',
                                '&:hover': { borderColor: '#f97316' },
                              }),
                              option: (base, state) => ({
                                ...base,
                                backgroundColor: state.isSelected ? '#f97316' : state.isFocused ? '#fed7aa' : 'white',
                                color: state.isSelected ? 'white' : '#334155',
                                cursor: 'pointer',
                              }),
                            }}
                          />
                        </div>
                        {machineFilter && (
                          <span className="text-xs text-slate-500">
                            {semainesFiltrees.length} semaine(s) affichée(s)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Liste des semaines */}
                    <div className="mb-6 grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
                      {semainesFiltrees.map(semaine => {
                        const key = getSemaineKey(semaine);
                        const selected = semainesSelectionnees.includes(key);
                        return (
                          <div
                            key={key}
                            className={`self-start cursor-pointer overflow-hidden rounded-xl border-2 p-3.5 transition-all duration-200 ${
                              selected
                                ? 'border-orange-500 bg-orange-50 shadow-sm ring-2 ring-orange-100'
                                : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-sm'
                            }`}
                            onClick={() => toggleSemaine(key)}
                          >
                            <div className="mb-1.5 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <span className="font-semibold text-slate-900">
                                  Semaine {semaine.numero} — {semaine.annee}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={event => {
                                    event.stopPropagation();
                                    setSemaineDetail(semaine);
                                  }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  aria-label={`Afficher les détails de la semaine ${semaine.numero}`}
                                  title="Afficher tous les détails"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleSemaine(key)}
                                  onClick={e => e.stopPropagation()}
                                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                  aria-label={`Sélectionner la semaine ${semaine.numero}`}
                                />
                              </div>
                            </div>

                            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                              {formatDate(semaine.dateDebut)} – {formatDate(semaine.dateFin)}
                              {semaine.numero === semaineActuelle && semaine.annee === anneeActuelle ? (
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                                  Cette semaine
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">
                                  En retard
                                </span>
                              )}
                            </div>

                            <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
                              <div className="flex flex-wrap items-center gap-1.5 font-medium text-slate-600">
                                <span>{getSemaineOccurrences(semaine)} occurrence{getSemaineOccurrences(semaine) > 1 ? 's' : ''}</span>
                                <span className="text-slate-400">→</span>
                                <span className="font-semibold text-orange-700">
                                  {semaine.totalOTManquants} OT
                                </span>
                              </div>
                              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
                                {semaine.joursManquants.length} jour{semaine.joursManquants.length > 1 ? 's' : ''}
                              </span>
                            </div>

                            <div className="space-y-1">
                              {semaine.joursManquants.slice(0, 2).map(jour => (
                                <div key={jour.date} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs">
                                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                                    {new Date(jour.date).toLocaleDateString('fr-FR', {
                                      weekday: 'short',
                                      day: '2-digit',
                                      month: 'short',
                                    })}
                                  </div>
                                  <div className="space-y-1">
                                    {jour.plansManquants.slice(0, 2).map((p, idx) => {
                                      const jourNom = p.jour_semaine !== undefined && p.jour_semaine !== null
                                        ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][p.jour_semaine]
                                        : null;
                                      return (
                                        <div key={idx} className="border-l-2 border-orange-200 pl-2 text-[11px] leading-tight">
                                          <div className="truncate font-medium text-slate-700" title={p.id}>
                                            Plan #{p.numero ?? p.id.slice(0, 8)} · 1 occurrence → {p.machines_manquantes?.length || 0} OT
                                          </div>
                                          <div className="truncate text-[10px] text-slate-500">
                                            {getRecurrenceDescription(p)}
                                            {jourNom && ` • ${jourNom}`}
                                          </div>
                                          <div
                                            className="truncate text-[10px] text-slate-500"
                                            title={(p.machines_manquantes || []).map(machine => machine.nom).join(', ')}
                                          >
                                            {(p.machines_manquantes || []).map(machine => machine.nom).join(', ')}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {jour.plansManquants.length > 2 && (
                                      <div className="pt-0.5 text-[10px] font-semibold text-slate-500">
                                        +{jour.plansManquants.length - 2} autre(s) plan(s)
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {semaine.joursManquants.length > 2 && (
                                <div className="pt-1 text-center text-[10px] font-medium text-slate-500">
                                  +{semaine.joursManquants.length - 2} autre(s) jour(s)
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Résumé de la sélection */}
                    {semainesSelectionnees.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                          <Target className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-green-800 mb-1">Rattrapage prévu</p>
                            <p className="text-sm text-green-700">
                              {totalOccurrencesSelectionnees} occurrence(s) de plan sur {semainesSelectionnees.length} semaine(s)
                              produiront {totalOTSelectionnes} ordre(s) de travail, à raison d’un OT par machine manquante.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Boutons d'action */}
                    <div className="sticky bottom-3 z-20 flex flex-col-reverse gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => navigate('/admin/plans-maintenance')}
                        className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                      >
                        Retour
                      </button>

                      <button
                        type="button"
                        onClick={analyserSemainesManquantes}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-100 px-5 py-3 font-semibold text-orange-700 transition-colors hover:bg-orange-200"
                      >
                        <Clock className="w-4 h-4" />
                        Réanalyser
                      </button>

                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || semainesSelectionnees.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f98440] to-[#e96524] px-6 py-3 font-bold text-white shadow-md transition-all hover:from-[#e96524] hover:to-[#d95f24] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {generationProgress
                              ? `Génération ${generationProgress.current}/${generationProgress.total}...`
                              : 'Génération en cours...'}
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5" />
                            Rattraper {totalOTSelectionnes} OT
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
