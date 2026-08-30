import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateMaintenancePlanDates, toLocalDateKey } from '../../utils/maintenancePlanDates';

// Types
interface Plan {
  id: string;
  machine_id?: string;
  lot_id?: string;
  gamme_id: string;
  type_recurrence: 'journalière' | 'hebdomadaire' | 'mensuelle' | 'annuelle';
  intervalle: number;
  jour_semaine?: number;
  semaine_du_mois?: number;
  forcer_jour_semaine: boolean;
  date_debut: string;
  date_fin?: string;
  type: 'préventive' | 'corrective';
  statut: string;
  machine?: { nom: string };
  plan_machines?: Array<{ machine_id: string; machine?: { nom: string } }>;
  lot?: { nom: string };
  gamme?: { nom: string };
}

interface Technicien {
  id: string;
  nom: string;
}

// Fonction pour calculer toutes les dates selon le plan
function generateOTDates(plan: Plan): Date[] {
  const startDate = new Date(`${plan.date_debut}T00:00:00`);
  const endDate = plan.date_fin
    ? new Date(`${plan.date_fin}T23:59:59`)
    : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());

  return generateMaintenancePlanDates(plan, startDate, endDate);
}

// Composant Calendrier simplifié
function SimpleCalendar({ 
  dates, 
  selectedDates, 
  onDateToggle,
  currentMonth,
  onMonthChange 
}: { 
  dates: Date[]; 
  selectedDates: Set<string>;
  onDateToggle: (date: Date) => void;
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
}) {
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  const dateToString = (date: Date) => toLocalDateKey(date);
  
  const isAvailableDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return dates.some(d => dateToString(d) === dateToString(date));
  };
  
  const isSelectedDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return selectedDates.has(dateToString(date));
  };
  
  const handleDateClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (isAvailableDate(day)) {
      onDateToggle(date);
    }
  };
  
  const previousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    onMonthChange(newMonth);
  };
  
  const nextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    onMonthChange(newMonth);
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded">
          ←
        </button>
        <h3 className="font-semibold">
          {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </h3>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded">
          →
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 p-4">
        {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
        
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} />;
          }
          
          const available = isAvailableDate(day);
          const selected = isSelectedDate(day);
          
          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={!available}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm
                transition-all
                ${!available ? 'text-gray-300 cursor-not-allowed' : ''}
                ${available && !selected ? 'text-gray-900 hover:bg-indigo-50 cursor-pointer border border-indigo-200' : ''}
                ${selected ? 'bg-indigo-600 text-white font-semibold cursor-pointer' : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CreateOTFromPlan() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  
  // États
  const [plan, setPlan] = useState<Plan | null>(null);
  const [techniciens, setTechniciens] = useState<Technicien[]>([]);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [existingOTKeys, setExistingOTKeys] = useState<Set<string>>(new Set());
  const [technicienId, setTechnicienId] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Chargement des données depuis Supabase
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let resolvedPlanId = planId;
        const { data: alias } = await supabase
          .from('plan_maintenance_aliases')
          .select('plan_id')
          .eq('legacy_plan_id', planId)
          .maybeSingle();

        if (alias?.plan_id) {
          resolvedPlanId = alias.plan_id;
          navigate(`/admin/plans-maintenance/${resolvedPlanId}/create-ot`, { replace: true });
        }

        // Charger le plan avec ses relations
        const { data: planData, error: planError } = await supabase
          .from('plans_maintenance')
          .select('*, machine:machines!plans_maintenance_machine_id_fkey(nom), plan_machines(machine_id, machine:machines(nom)), lot:lots(nom), gamme:gammes_maintenance(nom)')
          .eq('id', resolvedPlanId)
          .single();
        
        if (planError) throw planError;
        if (!planData) throw new Error('Plan introuvable');
        
        setPlan(planData);
        
        // Charger les techniciens
        const { data: techsData, error: techsError } = await supabase
          .from('profiles')
          .select('id, nom')
          .eq('role', 'technicien');
        
        if (techsError) throw techsError;
        
        setTechniciens(techsData || []);
        
        // Générer les dates disponibles
        const dates = generateOTDates(planData);
        setAvailableDates(dates);

        const { data: existingOT, error: existingOTError } = await supabase
          .from('ordres_travail')
          .select('machine_id, date_programmee')
          .eq('plan_id', planData.id);

        if (existingOTError) throw existingOTError;
        setExistingOTKeys(new Set(
          (existingOT || []).map((ot: any) =>
            `${ot.machine_id}:${toLocalDateKey(ot.date_programmee)}`
          )
        ));
        
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement des données');
        console.error('Erreur chargement:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (planId) {
      loadData();
    }
  }, [planId]);
  
  const dateToString = (date: Date) => toLocalDateKey(date);
  
  const handleDateToggle = (date: Date) => {
    const dateStr = dateToString(date);
    const newSelected = new Set(selectedDates);
    
    if (newSelected.has(dateStr)) {
      newSelected.delete(dateStr);
    } else {
      newSelected.add(dateStr);
    }
    
    setSelectedDates(newSelected);
  };
  
  const handleSelectAll = () => {
    const visibleDates = availableDates.filter(date => 
      date.getMonth() === currentMonth.getMonth() &&
      date.getFullYear() === currentMonth.getFullYear()
    );
    
    const newSelected = new Set(selectedDates);
    visibleDates.forEach(date => {
      newSelected.add(dateToString(date));
    });
    
    setSelectedDates(newSelected);
  };
  
  const handleDeselectAll = () => {
    setSelectedDates(new Set());
  };
  
  const handleCreateOTs = async () => {
    if (!technicienId || selectedDates.size === 0 || !plan) return;

    const machineIds = Array.from(new Set(
      plan.plan_machines?.map(link => link.machine_id)
        || (plan.machine_id ? [plan.machine_id] : [])
    ));
    if (machineIds.length === 0) {
      setError('Aucune machine associée à ce plan');
      return;
    }

    const pendingPairs = Array.from(selectedDates).flatMap(dateStr =>
      machineIds
        .filter(machineId => !existingOTKeys.has(`${machineId}:${dateStr}`))
        .map(machine_id => ({ machine_id, dateStr }))
    );
    const totalToCreate = pendingPairs.length;
    if (totalToCreate === 0) {
      setError('Tous les OT correspondant à cette sélection existent déjà');
      return;
    }
    if (!window.confirm(
      `Créer ${totalToCreate} ordre(s) de travail pour ${machineIds.length} machine(s) et ${selectedDates.size} date(s) ?`
    )) return;
    
    setCreating(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Préparer les données pour insertion
      const otData = pendingPairs.map(({ machine_id, dateStr }) => ({
          plan_id: plan.id,
          machine_id,
          technicien_id: technicienId,
          date_programmee: new Date(dateStr).toISOString(),
          statut: 'prévu',
          type: 'préventif',
        }));
      
      // Insérer dans Supabase
      const { error: insertError } = await supabase
        .from('ordres_travail')
        .insert(otData);
      
      if (insertError) throw insertError;
      
      setSuccess(`${otData.length} ordre(s) de travail créé(s) avec succès !`);
      setExistingOTKeys(previous => {
        const next = new Set(previous);
        pendingPairs.forEach(({ machine_id, dateStr }) => next.add(`${machine_id}:${dateStr}`));
        return next;
      });
      setSelectedDates(new Set());
      setTechnicienId('');
      
      // Optionnel : rediriger après quelques secondes
      // setTimeout(() => navigate('/admin/plans-maintenance'), 2000);
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création des ordres de travail');
      console.error('Erreur création OT:', err);
    } finally {
      setCreating(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }
  
  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Plan de maintenance introuvable</p>
        </div>
      </div>
    );
  }

  const associatedMachineCount = new Set(
    plan.plan_machines?.map(link => link.machine_id)
      || (plan.machine_id ? [plan.machine_id] : [])
  ).size;
  const associatedMachineIds = Array.from(new Set(
    plan.plan_machines?.map(link => link.machine_id)
      || (plan.machine_id ? [plan.machine_id] : [])
  ));
  const totalOTToCreate = Array.from(selectedDates).reduce(
    (total, dateStr) => total + associatedMachineIds.filter(
      machineId => !existingOTKeys.has(`${machineId}:${dateStr}`)
    ).length,
    0
  );
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Créer des ordres de travail
              </h1>
              <div className="space-y-1 text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  <span className="font-medium">Gamme:</span> {plan.gamme?.nom}
                </p>
                {plan.machine && (!plan.plan_machines || plan.plan_machines.length === 0) && (
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Machine:</span> {plan.machine.nom}
                  </p>
                )}
                {plan.plan_machines && plan.plan_machines.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium">Machines :</span>
                    <span>{plan.plan_machines.map(link => link.machine?.nom).filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {plan.lot && (
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Lot:</span> {plan.lot.nom}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <span className="font-medium">Type:</span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    plan.type === 'préventive' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {plan.type}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-medium">Récurrence:</span>
                  {plan.type_recurrence} (intervalle: {plan.intervalle})
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-500">Dates disponibles</p>
              <p className="text-3xl font-bold text-indigo-600">{availableDates.length}</p>
            </div>
          </div>
        </div>
        
        {/* Alertes */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800">{success}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendrier */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Sélectionner les dates
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                  >
                    Tout sélectionner
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="text-sm px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    Tout désélectionner
                  </button>
                </div>
              </div>
              
              <SimpleCalendar
                dates={availableDates}
                selectedDates={selectedDates}
                onDateToggle={handleDateToggle}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
              />
              
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-indigo-200 bg-white" />
                  <span className="text-gray-600">Date disponible</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-indigo-600" />
                  <span className="text-gray-600">Date sélectionnée</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Panneau de création */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Paramètres OT
              </h2>
              
              {/* Dates sélectionnées */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dates sélectionnées
                </label>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-2xl font-bold text-indigo-600">
                    {selectedDates.size}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedDates.size === 0 ? 'Aucune date' : 
                     selectedDates.size === 1 ? 'date sélectionnée' : 
                     'dates sélectionnées'}
                  </p>
                  {selectedDates.size > 0 && associatedMachineCount > 0 && (
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {associatedMachineCount} machine{associatedMachineCount > 1 ? 's' : ''} × {selectedDates.size} date{selectedDates.size > 1 ? 's' : ''}
                      {' = '}{totalOTToCreate} nouvel{totalOTToCreate > 1 ? 's' : ''} OT
                    </p>
                  )}
                </div>
              </div>
              
              {/* Sélection technicien */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Technicien assigné
                </label>
                <select
                  value={technicienId}
                  onChange={(e) => setTechnicienId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="">Sélectionner un technicien</option>
                  {techniciens.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                     {tech.nom}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Bouton de création */}
              <button
                onClick={handleCreateOTs}
                disabled={selectedDates.size === 0 || totalOTToCreate === 0 || !technicienId || creating}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Créer {totalOTToCreate > 0 ? `${totalOTToCreate} ` : ''}OT
                  </>
                )}
              </button>
              
              {selectedDates.size === 0 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Sélectionnez au moins une date
                </p>
              )}
              
              {!technicienId && selectedDates.size > 0 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Choisissez un technicien
                </p>
              )}
              {selectedDates.size > 0 && totalOTToCreate === 0 && (
                <p className="mt-2 text-center text-xs text-amber-600">
                  Tous les OT de cette sélection existent déjà
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
