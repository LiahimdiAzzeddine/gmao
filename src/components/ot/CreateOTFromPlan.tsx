import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
  lot?: { nom: string };
  gamme?: { nom: string };
}

interface Technicien {
  id: string;
  nom: string;
}

// Fonction pour calculer toutes les dates selon le plan
function generateOTDates(plan: Plan): Date[] {
  const dates: Date[] = [];
  const startDate = new Date(plan.date_debut);
  const endDate = plan.date_fin ? new Date(plan.date_fin) : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
  
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    let nextDate = new Date(currentDate);
    
    switch(plan.type_recurrence) {
      case 'journalière':
        nextDate.setDate(nextDate.getDate() + (plan.intervalle || 1));
        break;
      case 'hebdomadaire':
        nextDate.setDate(nextDate.getDate() + 7 * (plan.intervalle || 1));
        break;
      case 'mensuelle':
        if (plan.semaine_du_mois) {
          // Si une semaine du mois est spécifiée, calculer la date dans cette semaine
          nextDate.setMonth(nextDate.getMonth() + (plan.intervalle || 1));
          const firstDay = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
          const targetDate = new Date(firstDay);
          targetDate.setDate(1 + (plan.semaine_du_mois - 1) * 7);
          if (targetDate.getMonth() === nextDate.getMonth()) {
            nextDate = targetDate;
          }
        } else {
          // Sinon, simplement ajouter les mois en préservant le jour du mois
          const dayOfMonth = nextDate.getDate();
          const currentMonth = nextDate.getMonth();
          const currentYear = nextDate.getFullYear();
          const intervalle = plan.intervalle || 1;
          
          // Calculer le nouveau mois et année
          const newMonth = currentMonth + intervalle;
          const newYear = currentYear + Math.floor(newMonth / 12);
          const finalMonth = newMonth % 12;
          
          // Créer une nouvelle date avec le même jour
          nextDate = new Date(newYear, finalMonth, dayOfMonth);
          
          // Gérer le cas où le jour n'existe pas dans le nouveau mois (ex: 31 février)
          // JavaScript ajuste automatiquement (31 fév devient 3 mars), donc on vérifie le mois
          if (nextDate.getMonth() !== finalMonth) {
            // Le jour était invalide, revenir au dernier jour du mois cible
            nextDate = new Date(newYear, finalMonth + 1, 0);
          }
        }
        break;
      case 'annuelle':
        nextDate.setFullYear(nextDate.getFullYear() + (plan.intervalle || 1));
        break;
    }
    
    // Forcer le jour de semaine si demandé
    if (plan.forcer_jour_semaine && plan.jour_semaine !== null && plan.jour_semaine !== undefined) {
      const dayDiff = (plan.jour_semaine - nextDate.getDay() + 7) % 7;
      nextDate.setDate(nextDate.getDate() + dayDiff);
    }
    
    if (nextDate <= endDate) {
      dates.push(new Date(nextDate));
    }
    
    currentDate = nextDate;
  }
  
  return dates;
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
  
  const dateToString = (date: Date) => date.toISOString().split('T')[0];
  
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
        // Charger le plan avec ses relations
        const { data: planData, error: planError } = await supabase
          .from('plans_maintenance')
          .select('*, machine:machines(nom), lot:lots(nom), gamme:gammes_maintenance(nom)')
          .eq('id', planId)
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
  
  const dateToString = (date: Date) => date.toISOString().split('T')[0];
  
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
    
    setCreating(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Préparer les données pour insertion
      const otData = Array.from(selectedDates).map(dateStr => ({
        plan_id: plan.id,
        technicien_id: technicienId,
        date_programmee: new Date(dateStr).toISOString(),
        statut: 'prévu'
      }));
      
      // Insérer dans Supabase
      const { error: insertError } = await supabase
        .from('ordres_travail')
        .insert(otData);
      
      if (insertError) throw insertError;
      
      setSuccess(`${selectedDates.size} ordre(s) de travail créé(s) avec succès !`);
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
                {plan.machine && (
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Machine:</span> {plan.machine.nom}
                  </p>
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
                disabled={selectedDates.size === 0 || !technicienId || creating}
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
                    Créer {selectedDates.size > 0 ? `${selectedDates.size} ` : ''}OT
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}