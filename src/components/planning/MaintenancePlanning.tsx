import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useMaintenancePlanning } from '../../hooks/useMaintenancePlanning';
import { exportToExcel } from '../../utils/planningUtils';
import { PlanningHeader } from './PlanningHeader';
import { PlanningTable } from './PlanningTable';
import { PlanningStats } from './PlanningStats';
import { PlanningLegend } from './PlanningLegend';

export default function MaintenancePlanning() {
  const {
    lots,
    machines,
    planningData,
    loading,
    currentYear,
    setCurrentYear,
    reload,
  } = useMaintenancePlanning();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [filterLot, setFilterLot] = useState('all');
  const [filterGamme, setFilterGamme] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

  /* =======================
     MAP MACHINES (clé → valeur)
  ======================= */
  const machineMap = useMemo(
    () => new Map(machines.map(m => [m.id, m])),
    [machines]
  );

  /* =======================
     CLIENTS DÉDUITS
  ======================= */
  const clients = useMemo(() => {
    return Array.from(
      new Map(
        machines
          .filter(m => m.client)
          .map(m => [m.client!.id, m.client!])
      ).values()
    );
  }, [machines]);

  /* =======================
     FILTRAGE PLANNING
  ======================= */
  const filteredPlanning = useMemo(() => {
    return planningData.filter(p => {
      if (filterLot !== 'all' && p.lot_id !== filterLot) return false;
      if (filterGamme !== 'all' && p.gamme !== filterGamme) return false;

      const machine = machineMap.get(p.machine_id);
      if (filterClient !== 'all' && machine?.client?.id !== filterClient) {
        return false;
      }

      return true;
    });
  }, [planningData, filterLot, filterGamme, filterClient, machineMap]);

  /* =======================
     EXPORT EXCEL - MISE À JOUR
  ======================= */
  const handleExport = () => {
    exportToExcel(
      filteredPlanning,
      lots,
      machines,
      clients,
      currentYear,
      filterGamme,
      viewMode,
      viewMode === 'month' ? selectedMonth : undefined
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-[#d94f00] mx-auto mb-4" />
          <p className="text-slate-600">Chargement du planning...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <PlanningHeader
          currentYear={currentYear}
          selectedMonth={selectedMonth}
          viewMode={viewMode}
          lots={lots}
          clients={clients}
          filterLot={filterLot}
          filterGamme={filterGamme}
          filterClient={filterClient}
          onYearChange={setCurrentYear}
          onMonthChange={setSelectedMonth}
          onViewModeChange={setViewMode}
          onFilterChange={setFilterLot}
          onGammeChange={setFilterGamme}
          onClientChange={setFilterClient}
          onRefresh={reload}
          onExport={handleExport}
        />

        <PlanningTable
          planningData={filteredPlanning}
          lots={lots}
          machines={machines}
          currentYear={currentYear}
          viewMode={viewMode}
          selectedMonth={selectedMonth}
        />

        <PlanningStats planningData={filteredPlanning} />
        <PlanningLegend />
      </div>
    </div>
  );
}