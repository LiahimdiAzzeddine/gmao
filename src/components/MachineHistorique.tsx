import { useState, useMemo } from "react";
import DemandeCard from "./DemandeCard";
import { ClipboardList, Calendar, AlertTriangle, CheckCircle2, Clock, Search, Filter, X } from "lucide-react";

export default function MachineHistorique({
  demandes,
  interventions,
  machine,
  onCreateIntervention
}: any) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("tous");
  const [sortOrder, setSortOrder] = useState<"recent" | "ancien">("recent");

  const getInterventions = (id: any) =>
    interventions.filter((i: any) => i.demande_id === id);

  const filteredDemandes = useMemo(() => {
    let filtered = [...demandes];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((d: any) =>
        d.label?.toLowerCase().includes(query) ||
        d.type?.toLowerCase().includes(query) ||
        d.statut?.toLowerCase().includes(query)
      );
    }

    if (selectedStatus !== "tous") {
      filtered = filtered.filter((d: any) => d.statut === selectedStatus);
    }

    filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || a.date_demande).getTime();
      const dateB = new Date(b.created_at || b.date_demande).getTime();
      return sortOrder === "recent" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [demandes, searchQuery, selectedStatus, sortOrder]);

  // Statistiques
  const stats = {
    total: demandes.length,
    enCours: demandes.filter((d: any) => d.statut === 'en cours').length,
    termine: demandes.filter((d: any) => d.statut === 'terminé').length,
    totalInterventions: interventions.length
  };

  if (!demandes.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClipboardList size={40} className="text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Aucun historique
        </h3>
        <p className="text-slate-600 max-w-md mx-auto">
          Aucune demande d'intervention n'a été enregistrée pour cette machine.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* STATISTIQUES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<ClipboardList size={20} />}
          label="Total demandes"
          value={stats.total}
          color="blue"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="En cours"
          value={stats.enCours}
          color="amber"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label="Terminées"
          value={stats.termine}
          color="green"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Interventions"
          value={stats.totalInterventions}
          color="purple"
        />
      </div>

      {/* RECHERCHE ET FILTRES */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Barre de recherche */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par label, type ou statut..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Filtre par statut */}
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 bg-white min-w-[150px]"
            >
              <option value="tous">Tous les statuts</option>
              <option value="en attente">En attente</option>
              <option value="en cours">En cours</option>
              <option value="terminé">Clôturé</option>
            </select>
          </div>

          {/* Tri par date */}
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "recent" | "ancien")}
              className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 bg-white min-w-[150px]"
            >
              <option value="recent">Plus récent</option>
              <option value="ancien">Plus ancien</option>
            </select>
          </div>
        </div>

        {/* Indicateur de résultats */}
        {(searchQuery || selectedStatus !== "tous") && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {filteredDemandes.length} résultat{filteredDemandes.length > 1 ? 's' : ''} trouvé{filteredDemandes.length > 1 ? 's' : ''}
            </p>
            {(searchQuery || selectedStatus !== "tous") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatus("tous");
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {/* TIMELINE DES DEMANDES */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Calendar size={20} className="text-blue-600" />
              Historique des demandes
            </h2>
            <span className="text-sm text-slate-600">
              {filteredDemandes.length} demande{filteredDemandes.length > 1 ? 's' : ''} affichée{filteredDemandes.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="p-6">
          {filteredDemandes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Aucun résultat
              </h3>
              <p className="text-slate-600 max-w-md mx-auto">
                Aucune demande ne correspond à vos critères de recherche.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredDemandes.map((demande: any, index: number) => (
                <div key={demande.id} className="relative">
                  <DemandeCard
                    demande={demande}
                    interventions={getInterventions(demande.id)}
                    machine={machine}
                    onCreateIntervention={onCreateIntervention}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* STAT CARD COMPONENT */
function StatCard({
  icon,
  label,
  value,
  color = 'blue'
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
}) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      value: 'text-blue-700',
      border: 'border-blue-200'
    },
    green: {
      bg: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconText: 'text-green-600',
      value: 'text-green-700',
      border: 'border-green-200'
    },
    amber: {
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-600',
      value: 'text-amber-700',
      border: 'border-amber-200'
    },
    purple: {
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconText: 'text-purple-600',
      value: 'text-purple-700',
      border: 'border-purple-200'
    },
    red: {
      bg: 'bg-red-50',
      iconBg: 'bg-red-100',
      iconText: 'text-red-600',
      value: 'text-red-700',
      border: 'border-red-200'
    }
  };

  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} rounded-xl p-5 border ${colors.border} hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 ${colors.iconBg} rounded-lg`}>
          <div className={colors.iconText}>{icon}</div>
        </div>
        <span className={`text-3xl font-bold ${colors.value}`}>
          {value}
        </span>
      </div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
    </div>
  );
}