import { useEffect, useState } from 'react';
import { GammeWithEtapes } from '../../types/gammes';
import { useGammes, deleteGamme } from '../../hooks/useGammes';
import { supabase } from '../../lib/supabase';
import {
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Clock,
  List,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import GammeDetail from './GammeDetail';
import GammeForm from './GammeForm';

export default function GammesList() {
  const [selectedGamme, setSelectedGamme] = useState<GammeWithEtapes | null>(null);
  const [editingGamme, setEditingGamme] = useState<GammeWithEtapes | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('tous');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedGammes, setSelectedGammes] = useState<Set<string>>(new Set());

  const [stats, setStats] = useState({
    total: 0,
    preventive: 0,
    corrective: 0,
  });

  const { gammes, loading, totalCount, totalPages, loadGammes, reload } = useGammes();

  useEffect(() => {
    loadGlobalStats();
  }, []);

  useEffect(() => {
    loadGammes({
      page: currentPage,
      pageSize: itemsPerPage,
      searchTerm,
      filterType,
    });
  }, [currentPage, itemsPerPage, searchTerm, filterType, loadGammes]);

  async function loadGlobalStats() {
    const { data } = await supabase.from('gammes_maintenance').select('type');

    if (data) {
      setStats({
        total: data.length,
        preventive: data.filter((g) => g.type === 'préventive').length,
        corrective: data.filter((g) => g.type === 'corrective').length,
      });
    }
  }

  async function handleDeleteGamme(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette gamme et toutes ses étapes ?')) return;

    try {
      await deleteGamme(id);
      reload();
      loadGlobalStats();
      setSelectedGammes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting gamme:', error);
      alert('Erreur lors de la suppression de la gamme');
    }
  }

  async function handleDeleteSelected() {
    if (selectedGammes.size === 0) return;

    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer ${selectedGammes.size} gamme(s) et toutes leurs étapes ?`
      )
    )
      return;

    try {
      await Promise.all(Array.from(selectedGammes).map((id) => deleteGamme(id)));
      reload();
      loadGlobalStats();
      setSelectedGammes(new Set());
    } catch (error) {
      console.error('Error deleting gammes:', error);
      alert('Erreur lors de la suppression des gammes');
    }
  }

  function toggleSelectAll() {
    if (selectedGammes.size === gammes.length) {
      setSelectedGammes(new Set());
    } else {
      setSelectedGammes(new Set(gammes.map((g) => g.id)));
    }
  }

  function toggleSelectGamme(id: string) {
    setSelectedGammes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterTypeChange = (value: string) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  function calculateTotalDuration(etapes: any[]) {
    return etapes.reduce((total, etape) => total + (etape.duree_estimee || 0), 0);
  }

  function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }

  const handleFormSuccess = () => {
    setShowCreateForm(false);
    setEditingGamme(null);
    reload();
    loadGlobalStats();
  };

  if (loading && gammes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-[#d94f00] mx-auto mb-4" />
          <p className="text-slate-600">Chargement des gammes...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto mb-14">
        <div className="mb-8">
          <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 leading-tight">
                Gammes de Maintenance
              </h1>
              <p className="text-sm sm:text-base text-slate-600 mt-1">
                Gérez les gammes et leurs étapes de maintenance
              </p>
            </div>

            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#ee6b1a] text-white px-4 py-3 sm:px-6 rounded-lg hover:bg-[#f15c00] transition-colors shadow-sm"
            >
              <Plus size={20} />
              <span className="sm:inline hidden">Nouvelle Gamme</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Total Gammes</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.total}</p>
                </div>
                <div className="bg-blue-100 p-2 rounded-lg">
                  <List className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Préventives</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.preventive}</p>
                </div>
                <div className="bg-green-100 p-2 rounded-lg">
                  <Wrench className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Correctives</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.corrective}</p>
                </div>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Rechercher une gamme..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <Filter
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <select
                  value={filterType}
                  onChange={(e) => handleFilterTypeChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="tous">Tous les types</option>
                  <option value="préventive">Préventive</option>
                  <option value="corrective">Corrective</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-4">
                <p className="text-sm text-slate-600">
                  {totalCount} gamme{totalCount > 1 ? 's' : ''} trouvée
                  {totalCount > 1 ? 's' : ''}
                </p>
                {selectedGammes.size > 0 && (
                  <>
                    <span className="text-slate-300">|</span>
                    <p className="text-sm font-medium text-blue-600">
                      {selectedGammes.size} sélectionnée{selectedGammes.size > 1 ? 's' : ''}
                    </p>
                    <button
                      onClick={handleDeleteSelected}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Supprimer la sélection
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  reload();
                  loadGlobalStats();
                }}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Actualiser
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {totalCount === 0 ? (
            <div className="text-center py-12">
              <List className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Aucune gamme trouvée</p>
              <p className="text-slate-500 text-sm mt-1">
                Essayez de modifier vos critères de recherche
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse sm:table">
                  <thead className="hidden sm:table-header-group bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 w-12">
                        <button
                          onClick={toggleSelectAll}
                          className="text-slate-600 hover:text-blue-600 transition-colors"
                        >
                          {selectedGammes.size === gammes.length && gammes.length > 0 ? (
                            <CheckSquare size={20} />
                          ) : (
                            <Square size={20} />
                          )}
                        </button>
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                        Gamme
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                        Type
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                        Étapes
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                        Durée totale
                      </th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="sm:hidden divide-y divide-slate-100">
                    {gammes.map((gamme) => {
                      const totalDuration = calculateTotalDuration(gamme.etapes);

                      return (
                        <tr key={gamme.id} className="block sm:table-row mb-4 sm:mb-0">
                          <td className="block p-4 bg-white rounded-lg sm:shadow-sm mb-2 sm:mb-0">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-800 truncate">{gamme.nom}</div>
                                <div className="text-sm text-slate-500 truncate mt-1">
                                  {gamme.description || 'Aucune description'}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      gamme.type === 'préventive'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-orange-100 text-orange-700'
                                    }`}
                                  >
                                    {gamme.type}
                                  </span>
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
                                    <List size={12} />
                                    {gamme.etapes.length} étape{gamme.etapes.length > 1 ? 's' : ''}
                                  </span>
                                  {totalDuration > 0 && (
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
                                      <Clock size={12} />
                                      {formatDuration(totalDuration)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 ml-2">
                                <button
                                  onClick={() => setSelectedGamme(gamme)}
                                  className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Voir détails"
                                >
                                  <List size={18} />
                                </button>
                                <button
                                  onClick={() => setEditingGamme(gamme)}
                                  className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Modifier"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteGamme(gamme.id)}
                                  className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Supprimer"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tbody className="hidden sm:table-row-group divide-y divide-slate-100">
                    {gammes.map((gamme) => {
                      const isSelected = selectedGammes.has(gamme.id);
                      const totalDuration = calculateTotalDuration(gamme.etapes);

                      return (
                        <tr
                          key={gamme.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <button
                              onClick={() => toggleSelectGamme(gamme.id)}
                              className="text-slate-600 hover:text-blue-600 transition-colors"
                            >
                              {isSelected ? (
                                <CheckSquare size={20} className="text-blue-600" />
                              ) : (
                                <Square size={20} />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-semibold text-slate-800">{gamme.nom}</div>
                              <div className="text-sm text-slate-500">
                                {gamme.description || 'Aucune description'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                gamme.type === 'préventive'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}
                            >
                              {gamme.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
                              <List size={14} />
                              {gamme.etapes.length} étape{gamme.etapes.length > 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {totalDuration > 0 ? (
                              <span className="inline-flex items-center gap-1 text-slate-700">
                                <Clock size={16} />
                                {formatDuration(totalDuration)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedGamme(gamme)}
                                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Voir détails"
                              >
                                <List size={18} />
                              </button>
                              <button
                                onClick={() => setEditingGamme(gamme)}
                                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Modifier"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteGamme(gamme.id)}
                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Supprimer"
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

              <div className="px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                <div className="hidden sm:flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Afficher</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="border border-slate-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <span className="text-sm text-slate-600">par page</span>
                  </div>
                  <span className="text-sm text-slate-600">
                    Page {currentPage} sur {totalPages || 1}
                  </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
                    className="p-2 sm:p-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Page précédente"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="flex items-center gap-1 sm:gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            disabled={loading}
                            className={`px-3 py-1 sm:px-2 sm:py-1 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                        return (
                          <span key={pageNum} className="px-2 text-slate-400 hidden sm:inline">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="p-2 sm:p-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Page suivante"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedGamme && (
        <GammeDetail
          gamme={selectedGamme}
          onClose={() => setSelectedGamme(null)}
          onUpdate={() => {
            reload();
            // Ne pas fermer le modal automatiquement après une mise à jour
            // L'utilisateur doit cliquer sur "Fermer" pour fermer le modal
          }}
        />
      )}

      {(showCreateForm || editingGamme) && (
        <GammeForm
          gamme={editingGamme}
          onClose={() => {
            setShowCreateForm(false);
            setEditingGamme(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  );
}
