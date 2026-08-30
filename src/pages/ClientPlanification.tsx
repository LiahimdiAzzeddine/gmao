import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ClientLayout from '../components/ClientLayout';
import * as XLSX from 'xlsx';
import { generateMaintenancePlanDates, toLocalDateKey } from '../utils/maintenancePlanDates';

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

export default function ClientPlanification() {
  const navigate = useNavigate();
  const { profile, client } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [otData, setOtData] = useState<Record<number, OTValidee[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  useEffect(() => {
    if (profile && client) {
      loadData();
    }
  }, [selectedDate, viewMode, profile, client]);

  const loadData = async () => {
    if (!client?.id) return;

    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();

      // Charger les OT pour la période et le client connecté
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

      // Charger toutes les machines du client. Une machine sans OT dans la période
      // peut tout de même avoir une occurrence future via plan_machines.
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select(`
          id,
          nom,
          client_id
        `)
        .eq('client_id', client.id);

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

      // Organiser les données par semaine
      const organized: Record<number, OTValidee[]> = {};

      // Ajouter les OT existants
      otDataRaw?.forEach((ot: any) => {
        const machine = machinesMap.get(ot.machine_id);
        
        if (!machine) return;

        const week = getWeekNumber(new Date(ot.date_programmee));

        if (!organized[week]) {
          organized[week] = [];
        }

        const interventions = interventionsMap.get(ot.id) || [];
        const hasValidatedIntervention = interventions.some((i: any) => i.valide === true);
        const hasIntervention = interventions.length > 0;

        organized[week].push({
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

      // Ajouter les OT futurs
      otFuturs.forEach((ot: any) => {
        const week = getWeekNumber(new Date(ot.date_programmee));

        if (!organized[week]) {
          organized[week] = [];
        }

        organized[week].push({
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

  const handleCellClick = (week: number) => {
    if (otData[week]?.length > 0) {
      setSelectedCell(week);
    }
  };

  const weeks = getWeeksInPeriod();

  const exportToExcel = () => {
    const exportData: any[] = [];
    
    const header = ['Semaine', 'Nombre OT', 'Détails'];
    exportData.push(header);
    
    weeks.forEach(week => {
      const ots = otData[week] || [];
      if (ots.length > 0) {
        const summary = ots.map(ot => 
          `${ot.numot} - ${ot.machine.nom} (${ot.type})`
        ).join('\n');
        exportData.push([`Semaine ${week}`, ots.length, summary]);
      }
    });
    
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const colWidths = [{ wch: 15 }, { wch: 15 }, { wch: 60 }];
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ma Planification');
    
    const fileName = `Ma_Planification_${getPeriodLabel().replace(/\s/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#ff6b57] border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-600 font-semibold">Chargement de la planification...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900">Ma Planification</h1>
            <p className="text-sm md:text-base text-slate-600 mt-1">Vue d'ensemble de tous mes OT programmés par semaine</p>
          </div>
          <Calendar className="text-[#ff6b57]" size={32} />
        </div>
      </div>

      {/* Contrôles */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-slate-100 p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Sélecteur de vue */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('month')}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                viewMode === 'month'
                  ? 'bg-[#ff6b57] text-white shadow-lg shadow-red-200/50'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Par Mois
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                viewMode === 'year'
                  ? 'bg-[#ff6b57] text-white shadow-lg shadow-red-200/50'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Par Année
            </button>
          </div>

          {/* Navigation période */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigatePeriod('prev')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <span className="text-base md:text-lg font-black text-slate-800 min-w-[160px] md:min-w-[200px] text-center capitalize">
              {getPeriodLabel()}
            </span>
            <button
              onClick={() => navigatePeriod('next')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-slate-600" />
            </button>
            
            <button
              onClick={() => setSelectedDate(new Date())}
              className="hidden md:block px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold"
            >
              Aujourd'hui
            </button>
            
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold shadow-sm"
              title="Exporter vers Excel"
            >
              <Download size={16} />
              <span className="hidden md:inline">Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-slate-100 p-4 md:p-6 mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-black text-slate-900 mb-4">Légende</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 bg-purple-200 rounded border border-purple-300 flex items-center justify-center flex-shrink-0">
              <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 text-sm">À créer</span>
              <p className="text-xs text-slate-600">Selon plan actif</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 bg-blue-200 rounded border border-blue-300 flex items-center justify-center flex-shrink-0">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 text-sm">Programmé</span>
              <p className="text-xs text-slate-600">OT créé (prévu)</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 bg-yellow-200 rounded border border-yellow-300 flex items-center justify-center flex-shrink-0">
              <span className="w-2 h-2 bg-yellow-600 rounded-full"></span>
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 text-sm">En cours</span>
              <p className="text-xs text-slate-600">Intervention en cours</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 bg-green-200 rounded border border-green-300 flex items-center justify-center flex-shrink-0">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 text-sm">Clôturé</span>
              <p className="text-xs text-slate-600">Intervention validée</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 bg-red-200 rounded border border-red-300 flex items-center justify-center flex-shrink-0">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 text-sm">Avec anomalie</span>
              <p className="text-xs text-slate-600">Clôturé avec problèmes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grille de planification par semaine */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-slate-100 overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-px bg-slate-200">
          {weeks.map((week) => {
            const otList = otData[week] || [];
            const otCount = otList.length;
            
            const toCreateCount = otList.filter(ot => ot.numot === 'À créer').length;
            const plannedCount = otList.filter(ot => ot.statut === 'prévu' && ot.numot !== 'À créer').length;
            const inProgressCount = otList.filter(ot => ot.statut === 'en_cours').length;
            const closedCount = otList.filter(ot => ot.statut === 'terminé').length;
            const closedWithAnomalyCount = otList.filter(ot => ot.statut === 'clôturé_avec_anomalie').length;

            let bgColor = 'bg-white hover:bg-slate-50';
            if (otCount > 0) {
              if (closedCount > 0 && closedCount === otCount) {
                bgColor = 'bg-green-200 hover:bg-green-300';
              } else if (closedWithAnomalyCount > 0 && closedWithAnomalyCount === otCount) {
                bgColor = 'bg-red-200 hover:bg-red-300';
              } else if (closedCount > 0 || closedWithAnomalyCount > 0) {
                bgColor = 'bg-green-100 hover:bg-green-200';
              } else if (inProgressCount > 0) {
                bgColor = 'bg-yellow-200 hover:bg-yellow-300';
              } else if (toCreateCount > 0) {
                bgColor = 'bg-purple-200 hover:bg-purple-300';
              } else {
                bgColor = 'bg-blue-200 hover:bg-blue-300';
              }
            }

            return (
              <div
                key={week}
                onClick={() => handleCellClick(week)}
                className={`p-4 text-center transition-all ${bgColor} ${
                  otCount > 0 ? 'cursor-pointer' : ''
                }`}
              >
                <div className="text-xs font-bold text-slate-600 mb-2">S{week.toString().padStart(2, '0')}</div>
                {otCount > 0 && (
                  <div className="flex flex-col items-center gap-2">
                    <span className="inline-block bg-slate-800 text-white text-xs font-black px-2.5 py-1 rounded-full">
                      {otCount}
                    </span>
                    <div className="flex gap-1 flex-wrap justify-center">
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
                        <span className="w-2 h-2 bg-red-600 rounded-full" title={`${closedWithAnomalyCount} avec anomalie`}></span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Popup détails OT */}
      {selectedCell !== null && otData[selectedCell] && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCell(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-[#ff735f] to-[#f04438] p-4 md:p-6 text-white">
              <h3 className="text-xl md:text-2xl font-black mb-2">
                OT Programmés - Semaine {selectedCell}
              </h3>
              <p className="text-sm text-white/90">
                {client?.raison_sociale || client?.prenom}
              </p>
            </div>
            <div className="p-4 md:p-6 space-y-3 md:space-y-4">
              {otData[selectedCell]
                .filter(ot => ot.numot !== 'À créer')
                .map((ot) => {
                let statusColor = 'bg-blue-100 text-blue-800';
                let statusText = 'Programmé';
                let statusIcon = '📅';
                
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
                    className="bg-slate-50 rounded-lg p-3 md:p-4 border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/ordres-travail/${ot.id}`)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="font-black text-slate-800 text-base md:text-lg">OT #{ot.numot}</span>
                        <span className={`inline-flex items-center gap-1 px-2 md:px-3 py-1 rounded-lg text-xs font-bold ${statusColor}`}>
                          {statusIcon} {statusText}
                        </span>
                      </div>
                      <span className="text-xs md:text-sm text-slate-600 font-semibold">
                        {new Date(ot.date_programmee).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs md:text-sm">
                      <div>
                        <span className="font-semibold text-slate-700">Machine:</span>
                        <span className="text-slate-900 ml-1">{ot.machine.nom}</span>
                      </div>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                        ot.type === 'préventif' ? 'bg-purple-100 text-purple-800' :
                        ot.type === 'correctif' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {ot.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </ClientLayout>
  );
}
