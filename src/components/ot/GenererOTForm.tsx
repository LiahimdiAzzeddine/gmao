import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { supabase } from '../../lib/supabase';
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
} from 'lucide-react';

type Plan = {
  id: string;
  machine_id: string;
  nom_machine: string;
  type_recurrence: string;
  intervalle: number;
  date_debut: string;
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
    const planDebut = new Date(plan.date_debut);
    planDebut.setHours(0, 0, 0, 0);
    
    // Normaliser la date testée à minuit
    const dateTest = new Date(date);
    dateTest.setHours(0, 0, 0, 0);
    
    if (dateTest < planDebut) return false;

    // Generate dates using the EXACT same logic as MaintenancePreview
    let currentDate = new Date(planDebut);
    currentDate.setHours(0, 0, 0, 0);
    
    const maxIterations = 1000;
    let iterations = 0;
    
    while (currentDate <= dateTest && iterations < maxIterations) {
      // Check if current date matches the target date
      if (
        currentDate.getFullYear() === dateTest.getFullYear() &&
        currentDate.getMonth() === dateTest.getMonth() &&
        currentDate.getDate() === dateTest.getDate()
      ) {
        return true;
      }
      
      // Move to next occurrence based on recurrence type
      // This logic MUST match MaintenancePreview.generateUpcomingDates exactly
      switch (plan.type_recurrence) {
        case 'journalière':
          currentDate.setDate(currentDate.getDate() + plan.intervalle);
          break;
          
        case 'hebdomadaire':
          currentDate.setDate(currentDate.getDate() + (7 * plan.intervalle));
          break;
          
        case 'mensuelle':
          if (plan.semaine_du_mois) {
            // Si une semaine du mois est spécifiée, calculer la date dans cette semaine
            currentDate.setMonth(currentDate.getMonth() + plan.intervalle);
            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const targetDate = new Date(firstDay);
            targetDate.setDate(1 + (plan.semaine_du_mois - 1) * 7);
            if (targetDate.getMonth() === currentDate.getMonth()) {
              currentDate = targetDate;
            }
          } else {
            // Sinon, simplement ajouter les mois en préservant le jour du mois
            const dayOfMonth = currentDate.getDate();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            
            // Calculer le nouveau mois et année
            const newMonth = currentMonth + plan.intervalle;
            const newYear = currentYear + Math.floor(newMonth / 12);
            const finalMonth = newMonth % 12;
            
            // Créer une nouvelle date avec le même jour
            currentDate = new Date(newYear, finalMonth, dayOfMonth);
            
            // Gérer le cas où le jour n'existe pas dans le nouveau mois (ex: 31 février)
            // JavaScript ajuste automatiquement (31 fév devient 3 mars), donc on vérifie le mois
            if (currentDate.getMonth() !== finalMonth) {
              // Le jour était invalide, revenir au dernier jour du mois cible
              currentDate = new Date(newYear, finalMonth + 1, 0);
            }
          }
          break;
          
        case 'annuelle':
          currentDate.setFullYear(currentDate.getFullYear() + plan.intervalle);
          break;
      }
      
      // Adjust for imposed day if specified (same as MaintenancePreview)
      if (plan.forcer_jour_semaine && plan.jour_semaine !== undefined && plan.jour_semaine !== null) {
        const maxDays = 7;
        let daysChecked = 0;
        while (currentDate.getDay() !== plan.jour_semaine && daysChecked < maxDays) {
          currentDate.setDate(currentDate.getDate() + 1);
          daysChecked++;
        }
      }
      
      currentDate.setHours(0, 0, 0, 0);
      iterations++;
    }
    
    return false;
  };

  const chargerPlans = async (): Promise<Plan[]> => {
    try {
      const { data: plansData, error: plansError } = await supabase
        .from('plans_maintenance')
        .select(`
          id,
          machine_id,
          type_recurrence,
          intervalle,
          date_debut,
          jour_semaine,
          forcer_jour_semaine,
          semaine_du_mois,
          machines(nom)
        `)
        .eq('statut', 'actif')
        .order('date_debut', { ascending: true });

      if (plansError) throw plansError;

      const plansFormates: Plan[] = plansData.map((p: any) => ({
        id: p.id,
        machine_id: p.machine_id,
        nom_machine: p.machines.nom,
        type_recurrence: p.type_recurrence,
        intervalle: p.intervalle,
        date_debut: p.date_debut,
        jour_semaine: p.jour_semaine,
        forcer_jour_semaine: p.forcer_jour_semaine,
        semaine_du_mois: p.semaine_du_mois,
      }));

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
        .select('plan_id, date_programmee')
        .not('plan_id', 'is', null)
        .gte('date_programmee', startDateStr)
        .lte('date_programmee', endDateStr);

      if (ordresError) throw ordresError;

      // O(1) lookup set
      const otExistantsSet = new Set(
        (ordresExistants || []).map(o => `${o.plan_id}_${o.date_programmee.split('T')[0]}`)
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
          const plansManquants = plansNecessaires.filter(plan => !otExistantsSet.has(`${plan.id}_${dateStr}`));

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
            totalOTManquants: joursManquants.reduce((t, j) => t + j.plansManquants.length, 0),
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
            const { error } = await supabase.from('ordres_travail').insert({
              plan_id: plan.id,
              machine_id: plan.machine_id,
              date_programmee: new Date(jour.date).toISOString(),
              statut: 'prévu',
              type: 'préventif',
            });
            if (error) throw error;
            generated++;
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
    label: `${p.nom_machine} - ${getRecurrenceDescription(p)}`,
  }));

  // Machine filter options derived from all plans
  const machineOptions: MachineOption[] = Array.from(
    new Map(plans.map(p => [p.machine_id, p.nom_machine])).entries()
  ).map(([id, nom]) => ({ value: id, label: nom }));

  // Filter displayed weeks by machine
  const semainesFiltrees = machineFilter
    ? semainesDisponibles.filter(s =>
        s.joursManquants.some(j => j.plansManquants.some(p => p.machine_id === machineFilter))
      )
    : semainesDisponibles;

  const totalOTManquantsGlobal = semainesDisponibles.reduce((t, s) => t + s.totalOTManquants, 0);
  const totalOTSelectionnes = semainesDisponibles
    .filter(s => semainesSelectionnees.includes(getSemaineKey(s)))
    .reduce((t, s) => t + s.totalOTManquants, 0);

  const toutSelectionne =
    semainesFiltrees.length > 0 &&
    semainesFiltrees.every(s => semainesSelectionnees.includes(getSemaineKey(s)));

  // Variables pour identifier la semaine actuelle
  const maintenant = new Date();
  const semaineActuelle = getWeekNumber(maintenant);
  const anneeActuelle = maintenant.getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      {/* Spinner global pendant la génération des OT */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <Loader2 className="w-16 h-16 animate-spin text-orange-500 mx-auto mb-4" />
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

      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200">
          {/* En-tête */}
          <div className="border-b border-slate-200 bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6 rounded-t-xl">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Rattraper les OT Préventifs Manqués
                </h1>
                <p className="text-orange-100 text-sm mt-1">
                  Identifiez et générez les ordres de travail préventifs manqués depuis le début des plans jusqu'à aujourd'hui
                </p>
              </div>
            </div>
          </div>

          {/* Message d'information */}
          <div className="mx-8 mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Détection des OT manqués (semaines passées)</p>
                <p>
                  Le système analyse automatiquement toutes les semaines passées depuis le début
                  des plans de maintenance jusqu'à la semaine actuelle et identifie chaque jour
                  pour lequel des ordres de travail préventifs auraient dû être créés mais sont manquants.
                  Cela permet de rattraper les OT en retard.
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {message && (
            <div
              className={`mx-8 mt-6 border rounded-lg p-4 ${
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

          <div className="p-8">
            {/* SECTION 1: FILTRAGE DES PLANS */}
            <div className="space-y-6 mb-8">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-bold">1</span>
                </div>
                Sélectionner les plans à analyser
              </div>

              <div className="ml-10 space-y-4">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="modeFiltre"
                      value="tous"
                      checked={modeFiltrePlans === 'tous'}
                      onChange={e => setModeFiltrePlans(e.target.value as 'tous' | 'selection')}
                      className="w-4 h-4 text-orange-500 border-slate-300 focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Analyser tous les plans actifs ({plans.length})
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="modeFiltre"
                      value="selection"
                      checked={modeFiltrePlans === 'selection'}
                      onChange={e => setModeFiltrePlans(e.target.value as 'tous' | 'selection')}
                      className="w-4 h-4 text-orange-500 border-slate-300 focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
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

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="text-2xl font-bold text-slate-700">
                      {modeFiltrePlans === 'tous' ? plans.length : plansSelectionnes.length}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">Plans analysés</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="text-2xl font-bold text-orange-600">{semainesDisponibles.length}</div>
                    <div className="text-sm text-orange-600 mt-1">Semaines en retard</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">{semainesSelectionnees.length}</div>
                    <div className="text-sm text-blue-600 mt-1">Semaines sélectionnées</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="text-2xl font-bold text-red-600">{totalOTManquantsGlobal}</div>
                    <div className="text-sm text-red-600 mt-1">OT manquants (total)</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{totalOTSelectionnes}</div>
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
                    <div className="flex flex-col gap-4 mb-6">
                      <div className="flex items-center justify-between">
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
                      <div className="flex items-center gap-3">
                        <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <div className="w-64">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                      {semainesFiltrees.map(semaine => {
                        const key = getSemaineKey(semaine);
                        const selected = semainesSelectionnees.includes(key);
                        return (
                          <div
                            key={key}
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                              selected
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                            onClick={() => toggleSemaine(key)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <span className="font-semibold text-slate-900">
                                  Semaine {semaine.numero} — {semaine.annee}
                                </span>
                              </div>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleSemaine(key)}
                                onClick={e => e.stopPropagation()}
                                className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                              />
                            </div>

                            <div className="text-sm text-slate-600 mb-3">
                              {formatDate(semaine.dateDebut)} – {formatDate(semaine.dateFin)}
                              {semaine.numero === semaineActuelle && semaine.annee === anneeActuelle ? (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Cette semaine
                                </span>
                              ) : (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  En retard
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-sm mb-3">
                              <span className="text-slate-500">
                                {semaine.totalOTManquants} OT manquant{semaine.totalOTManquants > 1 ? 's' : ''}
                              </span>
                              <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                                {semaine.joursManquants.length} jour{semaine.joursManquants.length > 1 ? 's' : ''}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {semaine.joursManquants.slice(0, 2).map(jour => (
                                <div key={jour.date} className="text-xs bg-slate-50 p-2 rounded border border-slate-200">
                                  <div className="font-medium text-slate-700 mb-1 text-[11px]">
                                    {new Date(jour.date).toLocaleDateString('fr-FR', {
                                      weekday: 'short',
                                      day: '2-digit',
                                      month: 'short',
                                    })}
                                  </div>
                                  <div className="space-y-1">
                                    {jour.plansManquants.map((p, idx) => {
                                      const jourNom = p.jour_semaine !== undefined && p.jour_semaine !== null
                                        ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][p.jour_semaine]
                                        : null;
                                      return (
                                        <div key={idx} className="text-[11px] leading-tight">
                                          <div className="font-medium text-slate-700">{p.nom_machine}</div>
                                          <div className="text-slate-500">
                                            {getRecurrenceDescription(p)}
                                            {jourNom && ` • ${jourNom}`}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                              {semaine.joursManquants.length > 2 && (
                                <div className="text-[11px] text-slate-400 text-center py-1">
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
                              {totalOTSelectionnes} ordre(s) de travail seront générés pour rattraper le retard
                              sur {semainesSelectionnees.length} semaine(s) sélectionnée(s).
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Boutons d'action */}
                    <div className="flex justify-end gap-4">
                      <button
                        type="button"
                        onClick={() => navigate('/admin/plans-maintenance')}
                        className="px-6 py-3 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                      >
                        Retour
                      </button>

                      <button
                        type="button"
                        onClick={analyserSemainesManquantes}
                        className="px-6 py-3 text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors font-medium flex items-center gap-2"
                      >
                        <Clock className="w-4 h-4" />
                        Réanalyser
                      </button>

                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || semainesSelectionnees.length === 0}
                        className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
