import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Machine, DemandeIntervention } from '../lib/supabase';
import { Edit, Trash2, Eye, FileSpreadsheet, FileText, Filter, Search, X, BarChart3 } from 'lucide-react';

export default function DemandesList() {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState<DemandeIntervention[]>([]);
  const [machines, setMachines] = useState<Record<string, Machine>>({});
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterUrgence, setFilterUrgence] = useState<string>('all');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadDemandes();
  }, []);

async function loadDemandes() {
  setLoading(true);

  try {
    const { data, error } = await supabase
      .from('demande_intervention')
      .select(`
        *,
        machines:machine_id (
          *,
          client:client_id (*)
        )
      `)
      .order('date_demande', { ascending: false });

    if (error) {
      console.error(error);
      setDemandes([]);
      setMachines({});
      setLoading(false);
      return;
    }

    if (data) {
      const machinesMap: Record<string, Machine> = {};
      data.forEach((d) => {
        if (d.machines) {
          machinesMap[d.machines.id] = d.machines;
        }
      });

      setMachines(machinesMap);
      console.log("🚀 ~ loadDemandes ~ machinesMap:", machinesMap)
      setDemandes(data);
    }

  } catch (err) {
    console.error(err);
    setDemandes([]);
    setMachines({});
  } finally {
    setLoading(false);
  }
}



  const filteredDemandes = useMemo(() => {
    return demandes.filter((d) => {
      const machine = machines[d.machine_id];
      const machineName = machine ? machine.nom.toLowerCase() : '';
      const searchLower = searchTerm.toLowerCase();

      const matchesSearch =
        machineName.includes(searchLower) ||
        d.description?.toLowerCase().includes(searchLower) ||
        d.statut.toLowerCase().includes(searchLower);

      const matchesType = filterType === 'all' || d.type_intervention === filterType;
      const matchesUrgence = filterUrgence === 'all' || d.urgence === filterUrgence;
      const matchesStatut = filterStatut === 'all' || d.statut === filterStatut;

      return matchesSearch && matchesType && matchesUrgence && matchesStatut;
    });
  }, [demandes, machines, searchTerm, filterType, filterUrgence, filterStatut]);

  const statistics = useMemo(() => {
    return {
      total: demandes.length,
      preventive: demandes.filter(d => d.type_intervention === 'preventive').length,
      corrective: demandes.filter(d => d.type_intervention === 'corrective').length,
      validee: demandes.filter(d => d.statut === 'validée').length,
      enAttente: demandes.filter(d => d.statut === 'en attente').length,
      annulee: demandes.filter(d => d.statut === 'annulée').length,
      urgenceElevee: demandes.filter(d => d.urgence === 'élevée').length,
    };
  }, [demandes]);

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) return;

    const { error } = await supabase.from('demande_intervention').delete().eq('id', id);

    if (error) {
      alert('Erreur lors de la suppression');
      console.error(error);
    } else {
      alert('Demande supprimée');
      loadDemandes();
    }
  }

  function clearFilters() {
    setSearchTerm('');
    setFilterType('all');
    setFilterUrgence('all');
    setFilterStatut('all');
  }

  const hasActiveFilters = searchTerm || filterType !== 'all' || filterUrgence !== 'all' || filterStatut !== 'all';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Demandes d'intervention</h1>
              <p className="text-slate-600">Gestion et suivi des interventions de maintenance</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Total</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{statistics.total}</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg">
                  <FileSpreadsheet className="text-slate-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Préventives</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{statistics.preventive}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <BarChart3 className="text-blue-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Correctives</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{statistics.corrective}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <FileText className="text-orange-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Urgence élevée</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{statistics.urgenceElevee}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <FileSpreadsheet className="text-red-600" size={24} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Rechercher par machine, description, statut..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                <Filter size={20} />
                Filtres
                {hasActiveFilters && (
                  <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    !
                  </span>
                )}
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors"
                >
                  <X size={20} />
                  Réinitialiser
                </button>
              )}
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tous les types</option>
                    <option value="preventive">Préventive</option>
                    <option value="corrective">Corrective</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Urgence</label>
                  <select
                    value={filterUrgence}
                    onChange={(e) => setFilterUrgence(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Toutes les urgences</option>
                    <option value="élevée">Élevée</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="faible">Faible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Statut</label>
                  <select
                    value={filterStatut}
                    onChange={(e) => setFilterStatut(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="validée">Validée</option>
                    <option value="en attente">En attente</option>
                    <option value="annulée">Annulée</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600 font-medium">Chargement des demandes...</p>
          </div>
        ) : filteredDemandes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <FileSpreadsheet size={56} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium text-lg mb-2">
              {hasActiveFilters ? 'Aucun résultat trouvé' : 'Aucune demande d\'intervention'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Titre (label)</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Machine</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Client</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Urgence</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Date intervention</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Statut</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDemandes.map((d) => {
                    const machine = machines[d.machine_id];

                    return (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">
                            {d.label?d.label:'N/A'}
                          </div>
                         
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">
                            {machine ? machine.nom : d.machine_id}
                          </div>
                          {machine && (
                            <div className="text-sm text-slate-500">{machine.modele}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">
                            {machine.client?.raison_sociale ? machine.client!.raison_sociale : machine.client!.prenom}
                          </div>
                        
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            d.type_intervention === 'preventive'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-orange-100 text-orange-800 border border-orange-200'
                          }`}>
                            {d.type_intervention === 'preventive' ? 'Préventive' : 'Corrective'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            d.urgence === 'élevée'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : d.urgence === 'moyenne'
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              : 'bg-green-100 text-green-800 border border-green-200'
                          }`}>
                            {d.urgence === 'élevée' ? 'Élevée' : d.urgence === 'moyenne' ? 'Moyenne' : 'Faible'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">
                          {d.date_intervention ? new Date(d.date_intervention).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            d.statut === 'validée'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : d.statut === 'annulée'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}>
                            {d.statut === 'validée' ? 'Validée' : d.statut === 'annulée' ? 'Annulée' : 'En attente'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            

                            <button
                              onClick={() => navigate(`/admin/demandes/${d.id}`)}
                              title="Voir les détails"
                              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-200"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => navigate(`/admin/demandes/edit/${d.id}`)}
                              title="Modifier la demande"
                              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-200"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(d.id)}
                              title="Supprimer la demande"
                              className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-200"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredDemandes.length > 0 && (
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                <p className="text-sm text-slate-600">
                  Affichage de <span className="font-semibold text-slate-900">{filteredDemandes.length}</span> sur{' '}
                  <span className="font-semibold text-slate-900">{demandes.length}</span> demande(s)
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
