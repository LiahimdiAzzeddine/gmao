import { Download, Plus, RefreshCw, ChevronLeft, ChevronRight, Calendar, Filter, LayoutGrid, List } from 'lucide-react';
import { Client, Lot } from '../../lib/supabase';
import { MONTHS } from '../../utils/planningUtils';

interface PlanningHeaderProps {
  currentYear: number;
  selectedMonth: number;
  viewMode: 'month' | 'year';
  filterLot: string;
  filterGamme: string;
  lots: Lot[];
  clients: Client[];
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onViewModeChange: (mode: 'month' | 'year') => void;
  onFilterChange: (lotId: string) => void;
  onGammeChange: (gamme: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  filterClient: any;
  onClientChange: any;
}

export function PlanningHeader({
  currentYear,
  selectedMonth,
  viewMode,
  filterLot,
  filterGamme,
  lots,
  clients,
  onYearChange,
  onMonthChange,
  onViewModeChange,
  onFilterChange,
  onGammeChange,
  onRefresh,
  onExport,
  filterClient,
  onClientChange,
}: PlanningHeaderProps) {
  return (
    <div className="mb-6 space-y-4">
      {/* En-tête principal */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Calendar className="text-blue-600" size={32} />
            Planning des Visites Préventives -
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Gestion et planification des interventions préventives
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 shadow-sm font-medium"
          >
            <RefreshCw size={18} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg shadow-green-500/30 font-medium"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Exporter</span>
          </button>
        </div>
      </div>

      {/* Contrôles de navigation et filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Navigation temporelle */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onYearChange(currentYear - 1)}
                className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm"
              >
                <ChevronLeft size={20} className="text-slate-600" />
              </button>
              <div className="bg-white px-6 py-2 rounded-lg shadow-sm border border-slate-200">
                <span className="font-bold text-xl text-slate-800">
                  {currentYear}
                </span>
              </div>
              <button
                onClick={() => onYearChange(currentYear + 1)}
                className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm"
              >
                <ChevronRight size={20} className="text-slate-600" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Sélecteur de mode de vue */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => onViewModeChange('month')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    viewMode === 'month'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Calendar size={16} />
                  <span>Mensuel</span>
                </button>
                <button
                  onClick={() => onViewModeChange('year')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    viewMode === 'year'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid size={16} />
                  <span>Annuel</span>
                </button>
              </div>

              {/* Sélecteur de mois (uniquement en mode mensuel) */}
              {viewMode === 'month' && (
                <select
                  value={selectedMonth}
                  onChange={(e) => onMonthChange(parseInt(e.target.value))}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-slate-700 shadow-sm"
                >
                  {MONTHS.map((month, idx) => (
                    <option key={idx} value={idx}>{month}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Filtres de fréquence */}
        <div className="px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <Filter size={16} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Fréquence des visites</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'Toutes', color: 'slate' },
              { key: 'hebdomadaire', label: 'Hebdo', color: 'slate' },
              { key: 'mensuel', label: 'Mensuel', color: 'slate' },
              { key: 'quinzaine', label: 'Quinzaine', color: 'slate' },
              { key: 'trimestriel', label: 'Trimestriel', color: 'slate' },
              { key: 'semestriel', label: 'Semestriel', color: 'slate' },
              { key: 'annuel', label: 'Annuel', color: 'slate' },
            ].map(g => (
              <button
                key={g.key}
                onClick={() => onGammeChange(g.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  filterGamme === g.key
                    ? `bg-${g.color}-600 text-white shadow-md shadow-${g.color}-500/30`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtres clients et lots */}
        <div className="px-6 py-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                Client
              </label>
              <select
                value={filterClient}
                onChange={(e) => onClientChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-slate-700 transition-all"
              >
                <option value="all">Tous les clients</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.raison_sociale}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                Lot
              </label>
              <select
                value={filterLot}
                onChange={(e) => onFilterChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-slate-700 transition-all"
              >
                <option value="all">Tous les lots</option>
                {lots.map(lot => (
                  <option key={lot.id} value={lot.id}>{lot.nom}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}