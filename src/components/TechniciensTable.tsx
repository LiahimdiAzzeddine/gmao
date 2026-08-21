import React, { useState, useEffect } from 'react';
import { Search, Filter, User, Mail, UserCog, ChevronDown, Eye, Edit, Trash2, Loader2, Plus, Calendar, Wrench } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AddTechnicienModal, EditTechnicienModal, ViewTechnicienModal, DeleteConfirmModal } from './TechnicienModals';
import Loading from './Ui/Loading';
import { useSearchParams } from 'react-router-dom';

interface Technicien {
  id: string;
  nom: string;
  email: string | null;
  password?: string | null;
  created_at: string;
  totalInterventions: number;
  interventionsEnCours: number;
}

const TechniciensTable: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialiser depuis les URL params
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [techniciens, setTechniciens] = useState<Technicien[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [selectedTechnicien, setSelectedTechnicien] = useState<Technicien | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchTechniciens();
  }, []);

  // Mettre à jour les URL params quand le filtre de recherche change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    
    setSearchParams(params, { replace: true });
  }, [searchTerm, setSearchParams]);

  const fetchTechniciens = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les techniciens avec leurs statistiques
      const { data: techniciensData, error: techError } = await supabase
        .from('profiles')
        .select('id, nom, email,password, created_at')
        .eq('role', 'technicien')
        .order('nom');

      if (techError) throw techError;

      // Pour chaque technicien, récupérer le nombre d'interventions
      const techniciensAvecStats = await Promise.all(
        (techniciensData || []).map(async (tech) => {
          const { count: totalInterventions } = await supabase
            .from('interventions')
            .select('*', { count: 'exact', head: true })
            .eq('technicien_id', tech.id);

          const { count: interventionsEnCours } = await supabase
            .from('interventions')
            .select(`
              id,
              demande:demande_intervention!interventions_demande_id_fkey(statut)
            `, { count: 'exact', head: true })
            .eq('technicien_id', tech.id);

          return {
            ...tech,
            totalInterventions: totalInterventions || 0,
            interventionsEnCours: interventionsEnCours || 0
          };
        })
      );

      setTechniciens(techniciensAvecStats);
    } catch (err) {
      console.error('Erreur lors du chargement des techniciens:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const filteredTechniciens = techniciens.filter((technicien) => {
    const matchesSearch = 
      technicien.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (technicien.email && technicien.email.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const handleView = (technicien: Technicien) => {
    setSelectedTechnicien(technicien);
    setShowViewModal(true);
  };

  const handleEdit = (technicien: Technicien) => {
    setSelectedTechnicien(technicien);
    setShowEditModal(true);
  };

  const handleDeleteClick = (technicien: Technicien) => {
    setSelectedTechnicien(technicien);
    setShowDeleteModal(true);
  };

const handleDeleteConfirm = async (): Promise<void> => {
  if (!selectedTechnicien) return;

  setDeleteLoading(true);

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) throw new Error("Non authentifié");

    // Appel Edge Function
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-technicien`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: selectedTechnicien.id }),
    });

    const result = await response.json();

    if (!result.success) {
      // Affiche le message exact renvoyé par l'Edge Function
      alert(result.error || "Erreur lors de la suppression du technicien");
      setDeleteLoading(false);
      return;
    }

    // Si tout est OK, on recharge la liste
    await fetchTechniciens();
    setShowDeleteModal(false);
    setSelectedTechnicien(null);

  } catch (err) {
    console.error("Erreur lors de la suppression:", err);
    alert(err instanceof Error ? err.message : "Une erreur est survenue");
  } finally {
    setDeleteLoading(false);
  }
};

  if (loading) {
    return (
      
        <Loading
            size='md'
            fullScreen={true}
            message="Chargement des techniciens..."
          />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
          <p className="text-red-800 font-medium mb-2">Erreur de chargement</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Techniciens</h1>
              <p className="text-slate-600">Gestion de l'équipe technique</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus size={20} />
              Ajouter un technicien
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Techniciens</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{techniciens.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <UserCog size={32} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Interventions Totales</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {techniciens.reduce((sum, t) => sum + t.totalInterventions, 0)}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Wrench size={32} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Moyenne / Technicien</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {techniciens.length > 0 
                    ? Math.round(techniciens.reduce((sum, t) => sum + t.totalInterventions, 0) / techniciens.length)
                    : 0}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Calendar size={32} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-slate-600">
            {filteredTechniciens.length} technicien{filteredTechniciens.length > 1 ? 's' : ''} trouvé{filteredTechniciens.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Technicien
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Interventions Totales
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    En Cours
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Membre Depuis
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTechniciens.map((technicien) => (
                  <tr key={technicien.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {technicien.nom.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {technicien.nom}
                          </div>
                          <div className="text-xs text-slate-500">
                            ID: {technicien.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-slate-400" />
                        <span className="text-sm text-slate-900">
                          {technicien.email || 'Non renseigné'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Wrench size={16} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">
                          {technicien.totalInterventions}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {technicien.interventionsEnCours}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-sm text-slate-900">
                          {formatDate(technicien.created_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(technicien)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir le profil"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(technicien)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(technicien)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTechniciens.length === 0 && (
            <div className="text-center py-12">
              <UserCog size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600 text-lg font-medium mb-2">Aucun technicien trouvé</p>
              <p className="text-slate-500 text-sm">Essayez de modifier vos critères de recherche</p>
            </div>
          )}
        </div>
      </div>

      <AddTechnicienModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchTechniciens}
      />

      <EditTechnicienModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTechnicien(null);
        }}
        onSuccess={fetchTechniciens}
        technicien={selectedTechnicien}
      />

      <ViewTechnicienModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedTechnicien(null);
        }}
        technicien={selectedTechnicien}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedTechnicien(null);
        }}
        onConfirm={handleDeleteConfirm}
        technicien={selectedTechnicien}
        loading={deleteLoading}
      />
    </div>
  );
};

export default TechniciensTable;