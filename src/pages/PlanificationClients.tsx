import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Loader2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { generateMaintenancePlanDates, toLocalDateKey } from '../utils/maintenancePlanDates';

interface Client {
  id: string;
  raison_sociale: string;
  prenom: string;
}

interface OTValidee {
  id: string;
  numot: string;
  date_programmee: string;
  statut: string;
  type: string;
  machine: {
    nom: string;
  };
  isValidated: boolean;
  isExecuted: boolean;
}

type ViewMode = 'month' | 'year';

export default function PlanificationClients() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(new Date()); // Utiliser la vraie date actuelle
  const [clients, setClients] = useState<Client[]>([]);
  const [otData, setOtData] = useState<Record<string, Record<number, OTValidee[]>>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{ clientId: string; week: number } | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate, viewMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger les clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, raison_sociale, prenom')
        .order('raison_sociale');

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Calculer la plage de dates
      const { startDate, endDate } = getDateRange();

      // D'abord, compter TOUS les OT pour diagnostic
      const { data: allOTData, error: allOTError } = await supabase
        .from('ordres_travail')
        .select('id, date_programmee, statut')
        .order('date_programmee', { ascending: false });

      // Charger les OT pour la période
      const { data: otDataRaw, error: otError } = await supabase
        .from('ordres_travail')
        .select(`
          id,
          numot,
          date_programmee,
          statut,
          type,
          machine_id,
          plan_id
        `)
        .gte('date_programmee', startDate.toISOString())
        .lte('date_programmee', endDate.toISOString());

      if (otError) throw otError;

      // Charger toutes les machines : les plans futurs doivent apparaître même si
      // aucune occurrence d'OT n'existe encore dans la période affichée.
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select(`
          id,
          nom,
          client_id
        `);

      if (machinesError) throw machinesError;

      // Charger les interventions pour ces OT
      const otIds = otDataRaw?.map((ot: any) => ot.id) || [];
      
      let interventionsData: any[] = [];
      if (otIds.length > 0) {
        const { data, error: interventionsError } = await supabase
          .from('interventions')
          .select(`
            id,
            ordre_travail_id,
            valide,
            date_debut,
            date_fin
          `)
          .in('ordre_travail_id', otIds);

        if (interventionsError) throw interventionsError;
        interventionsData = data || [];
      }

      // Créer un map des machines
      const machinesMap = new Map();
      machinesData?.forEach((machine: any) => {
        machinesMap.set(machine.id, machine);
      });

      // Créer un map des interventions par OT
      const interventionsMap = new Map();
      interventionsData?.forEach((intervention: any) => {
        if (!interventionsMap.has(intervention.ordre_travail_id)) {
          interventionsMap.set(intervention.ordre_travail_id, []);
        }
        interventionsMap.get(intervention.ordre_travail_id).push(intervention);
      });

      // Organiser tous les OT programmés
      const otProgrammes = otDataRaw || [];

      // Charger les plans de maintenance actifs pour générer les OT futurs
      const { data: plansActifs, error: plansError } = await supabase
        .from('plans_maintenance')
        .select(`
          id,
          plan_machines(machine_id),
          type,
          type_recurrence,
          intervalle,
          date_debut,
          date_fin,
          forcer_jour_semaine,
          jour_semaine,
          semaine_du_mois,
          statut
        `)
        .eq('statut', 'actif');

      if (plansError) throw plansError;

      // Générer les OT futurs basés sur les plans actifs
      const otFuturs: any[] = [];
      const otExistants = new Set(
        (otDataRaw || [])
          .filter((ot: any) => ot.plan_id && ot.machine_id && ot.date_programmee)
          .map((ot: any) => `${ot.plan_id}:${ot.machine_id}:${toLocalDateKey(ot.date_programmee)}`)
      );
      
      plansActifs?.forEach((plan: any) => {
        // Calculer les prochaines dates d'exécution dans la période
        const prochaineDates = generateMaintenancePlanDates(plan, startDate, endDate);

        (plan.plan_machines || []).forEach((link: any) => {
          const machine = machinesMap.get(link.machine_id);
          if (!machine) return;
          prochaineDates.forEach((date: Date) => {
            const occurrenceKey = `${plan.id}:${link.machine_id}:${toLocalDateKey(date)}`;
            if (otExistants.has(occurrenceKey)) return;
            otFuturs.push({
            id: `future-${plan.id}-${link.machine_id}-${date.getTime()}`,
            numot: `À créer`,
            date_programmee: date.toISOString(),
            statut: 'prévu',
            type: plan.type,
            machine_id: link.machine_id,
            machine: machine,
            isFuture: true
            });
          });
        });
      });

      // Organiser les données par client et semaine
      const organized: Record<string, Record<number, OTValidee[]>> = {};

      // Ajouter les OT existants
      otProgrammes.forEach((ot: any) => {
        const machine = machinesMap.get(ot.machine_id);
        
        if (!machine || !machine.client_id) return;

        const clientId = machine.client_id;
        const week = getWeekNumber(new Date(ot.date_programmee));

        if (!organized[clientId]) {
          organized[clientId] = {};
        }
        if (!organized[clientId][week]) {
          organized[clientId][week] = [];
        }

        // Déterminer le statut d'exécution basé sur les interventions
        const interventions = interventionsMap.get(ot.id) || [];
        const hasValidatedIntervention = interventions.some((i: any) => i.valide === true);
        const hasIntervention = interventions.length > 0;

        organized[clientId][week].push({
          id: ot.id,
          numot: ot.numot,
          date_programmee: ot.date_programmee,
          statut: ot.statut,
          type: ot.type,
          machine: {
            nom: machine.nom
          },
          isValidated: hasValidatedIntervention,
          isExecuted: hasIntervention
        });
      });

      // Ajouter les OT futurs (à créer)
      otFuturs.forEach((ot: any) => {
        const clientId = ot.machine.client_id;
        const week = getWeekNumber(new Date(ot.date_programmee));

        if (!organized[clientId]) {
          organized[clientId] = {};
        }
        if (!organized[clientId][week]) {
          organized[clientId][week] = [];
        }

        organized[clientId][week].push({
          id: ot.id,
          numot: ot.numot,
          date_programmee: ot.date_programmee,
          statut: ot.statut,
          type: ot.type,
          machine: {
            nom: ot.machine.nom
          },
          isValidated: false,
          isExecuted: false
        });
      });

      setOtData(organized);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    if (viewMode === 'month') {
      const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      return { startDate, endDate };
    } else {
      const startDate = new Date(selectedDate.getFullYear(), 0, 1);
      const endDate = new Date(selectedDate.getFullYear(), 11, 31);
      return { startDate, endDate };
    }
  };

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const getWeeksInPeriod = (): number[] => {
    const { startDate, endDate } = getDateRange();
    const weeks = new Set<number>();

    const current = new Date(startDate);
    while (current <= endDate) {
      weeks.add(getWeekNumber(current));
      current.setDate(current.getDate() + 1);
    }

    return Array.from(weeks).sort((a, b) => a - b);
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const getPeriodLabel = () => {
    if (viewMode === 'month') {
      return selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } else {
      return selectedDate.getFullYear().toString();
    }
  };

  const handleCellClick = (clientId: string, week: number) => {
    if (otData[clientId]?.[week]?.length > 0) {
      setSelectedCell({ clientId, week });
    }
  };

  const weeks = getWeeksInPeriod();

  const exportToExcel = () => {
    // Préparer les données pour l'export
    const exportData: any[] = [];
    
    // En-tête avec les semaines
    const header = ['Client', ...weeks.map(week => `Semaine ${week}`)];
    exportData.push(header);
    
    // Données par client
    clients.forEach(client => {
      const row: any[] = [client.raison_sociale || client.prenom];
      
      weeks.forEach(week => {
        const ots = otData[client.id]?.[week] || [];
        if (ots.length > 0) {
          // Créer un résumé des OT pour cette cellule
          const summary = ots.map(ot => 
            `${ot.numot} - ${ot.machine.nom} (${ot.type})`
          ).join('\n');
          row.push(summary);
        } else {
          row.push('');
        }
      });
      
      exportData.push(row);
    });
    
    // Créer le workbook et la feuille
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    
    // Définir la largeur des colonnes
    const colWidths = [{ wch: 30 }, ...weeks.map(() => ({ wch: 40 }))];
    ws['!cols'] = colWidths;
    
    // Créer le workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Planification');
    
    // Générer le nom du fichier
    const fileName = `Planification_${getPeriodLabel().replace(/\s/g, '_')}.xlsx`;
    
    // Télécharger le fichier
    XLSX.writeFile(wb, fileName);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Chargement de la planification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-[#f15c00] mb-3 transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            Retour
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Planification Clients</h1>
              <p className="text-slate-600 mt-2">Vue d'ensemble de tous les OT programmés par client et par semaine</p>
            </div>
            <Calendar className="text-slate-400" size={40} />
          </div>
        </div>
      </header>

      {/* Contrôles */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Sélecteur de vue */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'month'
                    ? 'bg-[#f15c00] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Par Mois
              </button>
              <button
                onClick={() => setViewMode('year')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'year'
                    ? 'bg-[#f15c00] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Par Année
              </button>
            </div>

            {/* Navigation période */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigatePeriod('prev')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={24} className="text-slate-600" />
              </button>
              <span className="text-lg font-bold text-slate-800 min-w-[200px] text-center capitalize">
                {getPeriodLabel()}
              </span>
              <button
                onClick={() => navigatePeriod('next')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight size={24} className="text-slate-600" />
              </button>
              
              {/* Bouton pour aller à la période actuelle */}
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Aujourd'hui
              </button>
              
              {/* Bouton d'export Excel */}
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
                title="Exporter vers Excel"
              >
                <Download size={18} />
                <span>Exporter Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Légende */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Légende</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-200 rounded border border-purple-300 flex items-center justify-center">
                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
              </div>
              <div>
                <span className="font-medium text-slate-800">À créer</span>
                <p className="text-sm text-slate-600">OT à créer selon plan actif</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-200 rounded border border-blue-300 flex items-center justify-center">
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              </div>
              <div>
                <span className="font-medium text-slate-800">Programmé</span>
                <p className="text-sm text-slate-600">OT créé (statut: prévu)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-200 rounded border border-yellow-300 flex items-center justify-center">
                <span className="w-2 h-2 bg-yellow-600 rounded-full"></span>
              </div>
              <div>
                <span className="font-medium text-slate-800">En cours</span>
                <p className="text-sm text-slate-600">Intervention en cours (statut: en_cours)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-200 rounded border border-green-300 flex items-center justify-center">
                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
              </div>
              <div>
                <span className="font-medium text-slate-800">Clôturé</span>
                <p className="text-sm text-slate-600">Intervention validée (statut: terminé)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-200 rounded border border-red-300 flex items-center justify-center">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span>
              </div>
              <div>
                <span className="font-medium text-slate-800">Clôturé avec anomalie</span>
                <p className="text-sm text-slate-600">Clôturé avec problèmes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau de planification */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 border-r border-slate-200 sticky left-0 bg-slate-50 z-10">
                    Client
                  </th>
                  {weeks.map((week) => (
                    <th
                      key={week}
                      className="px-4 py-3 text-center text-sm font-bold text-slate-700 border-r border-slate-200 min-w-[100px]"
                    >
                      S{week.toString().padStart(2, '0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800 border-r border-slate-200 sticky left-0 bg-white">
                      {client.raison_sociale || client.prenom}
                    </td>
                    {weeks.map((week) => {
                      const hasOT = otData[client.id]?.[week]?.length > 0;
                      const otCount = otData[client.id]?.[week]?.length || 0;
                      const otList = otData[client.id]?.[week] || [];
                      
                      // Calculer les statistiques des OT
                      const toCreateCount = otList.filter(ot => 
                        ot.numot === 'À créer'
                      ).length;
                      const plannedCount = otList.filter(ot => 
                        ot.statut === 'prévu' && ot.numot !== 'À créer'
                      ).length;
                      const inProgressCount = otList.filter(ot => 
                        ot.statut === 'en_cours'
                      ).length;
                      const closedCount = otList.filter(ot => 
                        ot.statut === 'terminé'
                      ).length;
                      const closedWithAnomalyCount = otList.filter(ot => 
                        ot.statut === 'clôturé_avec_anomalie'
                      ).length;

                      // Déterminer la couleur de fond selon le statut majoritaire
                      let bgColor = 'bg-white hover:bg-slate-50';
                      if (hasOT) {
                        if (closedCount > 0 && closedCount === otCount) {
                          bgColor = 'bg-green-200 hover:bg-green-300'; // Tous clôturés
                        } else if (closedWithAnomalyCount > 0 && closedWithAnomalyCount === otCount) {
                          bgColor = 'bg-red-200 hover:bg-red-300'; // Tous clôturés avec anomalie
                        } else if (closedCount > 0 || closedWithAnomalyCount > 0) {
                          bgColor = 'bg-green-100 hover:bg-green-200'; // Partiellement clôturés
                        } else if (inProgressCount > 0) {
                          bgColor = 'bg-yellow-200 hover:bg-yellow-300'; // En cours
                        } else if (toCreateCount > 0) {
                          bgColor = 'bg-purple-200 hover:bg-purple-300'; // À créer
                        } else {
                          bgColor = 'bg-blue-200 hover:bg-blue-300'; // Programmés
                        }
                      }

                      return (
                        <td
                          key={week}
                          onClick={() => handleCellClick(client.id, week)}
                          className={`px-4 py-3 text-center border-r border-slate-200 transition-all ${bgColor} ${
                            hasOT ? 'cursor-pointer' : ''
                          }`}
                        >
                          {hasOT && (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-block bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded-full">
                                {otCount}
                              </span>
                              {/* Indicateurs de statut */}
                              <div className="flex gap-1">
                                {toCreateCount > 0 && (
                                  <span className="w-2 h-2 bg-purple-600 rounded-full" title={`${toCreateCount} à créer`}></span>
                                )}
                                {plannedCount > 0 && (
                                  <span className="w-2 h-2 bg-blue-600 rounded-full" title={`${plannedCount} programmé(s)`}></span>
                                )}
                                {inProgressCount > 0 && (
                                  <span className="w-2 h-2 bg-yellow-600 rounded-full" title={`${inProgressCount} en cours`}></span>
                                )}
                                {closedCount > 0 && (
                                  <span className="w-2 h-2 bg-green-600 rounded-full" title={`${closedCount} clôturé(s)`}></span>
                                )}
                                {closedWithAnomalyCount > 0 && (
                                  <span className="w-2 h-2 bg-red-600 rounded-full" title={`${closedWithAnomalyCount} clôturé(s) avec anomalie`}></span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Popup détails OT */}
        {selectedCell && otData[selectedCell.clientId]?.[selectedCell.week] && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedCell(null)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-[#f15c00] to-[#ff7a2f] p-6 text-white">
                <h3 className="text-2xl font-bold mb-2">
                  OT Programmés - Semaine {selectedCell.week}
                </h3>
                <p className="text-orange-100">
                  {clients.find((c) => c.id === selectedCell.clientId)?.raison_sociale ||
                    clients.find((c) => c.id === selectedCell.clientId)?.prenom}
                </p>
              </div>
              <div className="p-6 space-y-4">
                {otData[selectedCell.clientId][selectedCell.week]
                  .filter(ot => ot.numot !== 'À créer') // Exclure les OT à créer
                  .map((ot) => {
                  // Déterminer le statut et la couleur basé sur l'OT et les interventions
                  let statusColor = 'bg-blue-100 text-blue-800';
                  let statusText = 'Programmé';
                  let statusIcon = '📅';
                  
                  // Logique de statut améliorée
                  if (ot.statut === 'terminé' || ot.statut === 'clôturé_avec_anomalie') {
                    statusColor = 'bg-green-100 text-green-800';
                    statusText = ot.statut === 'terminé' ? 'Clôturé' : 'Clôturé avec anomalie';
                    statusIcon = '✅';
                  } else if (ot.isValidated) {
                    statusColor = 'bg-green-100 text-green-800';
                    statusText = 'Validé';
                    statusIcon = '✅';
                  } else if (ot.isExecuted) {
                    statusColor = 'bg-yellow-100 text-yellow-800';
                    statusText = 'En attente de validation';
                    statusIcon = '⏳';
                  } else if (ot.statut === 'en_cours') {
                    statusColor = 'bg-orange-100 text-orange-800';
                    statusText = 'En cours';
                    statusIcon = '🔧';
                  } else if (ot.statut === 'annulé') {
                    statusColor = 'bg-red-100 text-red-800';
                    statusText = 'Annulé';
                    statusIcon = '❌';
                  }

                  return (
                    <div
                      key={ot.id}
                      className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/ordres-travail/${ot.id}`)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-800 text-lg">OT #{ot.numot}</span>
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                            {statusIcon} {statusText}
                          </span>
                        </div>
                        <span className="text-sm text-slate-600">
                          {new Date(ot.date_programmee).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="font-medium text-slate-700">Machine:</span>
                            <span className="text-slate-900 ml-1">{ot.machine.nom}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            ot.type === 'préventif' ? 'bg-purple-100 text-purple-800' :
                            ot.type === 'correctif' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {ot.type}
                          </span>
                          
                          {/* Statut de l'OT dans la base */}
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            ot.statut === 'prévu' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            ot.statut === 'en_cours' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                            ot.statut === 'terminé' ? 'bg-green-50 text-green-700 border border-green-200' :
                            ot.statut === 'clôturé_avec_anomalie' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                            'bg-gray-50 text-gray-700 border border-gray-200'
                          }`}>
                            {ot.statut === 'terminé' ? 'Clôturé' : 
                             ot.statut === 'clôturé_avec_anomalie' ? 'Clôturé avec anomalie' :
                             ot.statut}
                          </span>
                        </div>
                      </div>
                      
                      {/* Informations supplémentaires sur l'intervention */}
                      {(ot.isExecuted || ot.isValidated) && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            {ot.isExecuted && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                Intervention réalisée
                              </span>
                            )}
                            {ot.isValidated && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                Intervention validée
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="sticky bottom-0 bg-slate-50 p-4 border-t border-slate-200">
                <button
                  onClick={() => setSelectedCell(null)}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
