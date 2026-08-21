import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Wrench, 
  Calendar, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Filter,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';

interface OrdreTravail {
  id: string;
  machine_id: string;
  technicien_id: string | null;
  date_programmee: string;
  date_realisation: string | null;
  statut: 'prévu' | 'en_cours' | 'terminé' | 'annulé';
  observations: string | null;
  cause: string | null;
  type: string;
  created_at: string;
  machine?: {
    id: string;
    nom: string;
    numero_serie: string | null;
    client?: {
      id: string;
      raison_sociale: string | null;
      prenom: string | null;
    };
  };
  technicien?: {
    id: string;
    nom: string;
  };
}

export default function OTCorrectifsList() {
  const navigate = useNavigate();
  
  const [ordres, setOrdres] = useState<OrdreTravail[]>([]);
  const [filteredOrdres, setFilteredOrdres] = useState<OrdreTravail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [filterClient, setFilterClient] = useState<string>('tous');
  const [sortCreation, setSortCreation] = useState<'recent' | 'ancien'>('recent');
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    loadOrdresTravail();
  }, []);

  useEffect(() => {
    filterOrdres();
  }, [searchTerm, filterStatut, filterClient, sortCreation, ordres]);

  // Réinitialiser à la page 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatut, filterClient, sortCreation]);

  const loadOrdresTravail = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('ordres_travail')
        .select(`
          *,
          machine:machines(
            id,
            nom,
            numero_serie,
            client:clients(
              id,
              raison_sociale,
              prenom
            )
          ),
          technicien:profiles!ordres_travail_technicien_id_fkey(
            id,
            nom
          )
        `)
        .eq('type', 'correctif')
        .order('date_programmee', { ascending: false });

      if (error) throw error;

      setOrdres(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      toast.error('Erreur lors du chargement des ordres de travail');
    } finally {
      setLoading(false);
    }
  };

  const filterOrdres = () => {
    let filtered = [...ordres];

    // Filtre par statut
    if (filterStatut !== 'tous') {
      filtered = filtered.filter(o => o.statut === filterStatut);
    }

    // Filtre par client
    if (filterClient !== 'tous') {
      filtered = filtered.filter(o => o.machine?.client?.id === filterClient);
    }

    // Filtre par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o => 
        o.machine?.nom?.toLowerCase().includes(term) ||
        o.machine?.client?.raison_sociale?.toLowerCase().includes(term) ||
        o.machine?.client?.prenom?.toLowerCase().includes(term) ||
        o.technicien?.nom?.toLowerCase().includes(term) ||
        o.cause?.toLowerCase().includes(term) ||
        o.observations?.toLowerCase().includes(term)
      );
    }

    // Tri par date de création
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortCreation === 'recent' ? dateB - dateA : dateA - dateB;
    });

    setFilteredOrdres(filtered);
  };

  const clients = Array.from(
    new Map(
      ordres
        .map((ordre) => ordre.machine?.client)
        .filter((client): client is NonNullable<typeof client> => Boolean(client?.id))
        .map((client) => [client.id, client])
    ).values()
  ).sort((a, b) => {
    const nameA = a.raison_sociale || a.prenom || '';
    const nameB = b.raison_sociale || b.prenom || '';
    return nameA.localeCompare(nameB, 'fr');
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet ordre de travail ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ordres_travail')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Ordre de travail supprimé avec succès');
      loadOrdresTravail();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStatutBadge = (statut: string) => {
    const styles = {
      'prévu': 'bg-blue-100 text-blue-800 border-blue-200',
      'en_cours': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'terminé': 'bg-green-100 text-green-800 border-green-200',
      'annulé': 'bg-red-100 text-red-800 border-red-200'
    };

    const icons = {
      'prévu': Clock,
      'en_cours': AlertCircle,
      'terminé': CheckCircle2,
      'annulé': AlertCircle
    };

    const Icon = icons[statut as keyof typeof icons] || Clock;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${styles[statut as keyof typeof styles]}`}>
        <Icon className="w-3 h-3" />
        {statut.replace('_', ' ')}
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Calcul de la pagination
  const totalPages = Math.ceil(filteredOrdres.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrdres = filteredOrdres.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-orange-200 rounded-full mx-auto"></div>
          </div>
          <p className="text-slate-600 font-medium">Chargement des ordres de travail...</p>
          <p className="text-slate-500 text-sm mt-1">Veuillez patienter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-full mx-auto px-4">
        {/* En-tête */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 mb-6">
          <div className="border-b border-slate-200 bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wrench className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Ordres de Travail Correctifs
                  </h1>
                  <p className="text-orange-100 text-sm mt-1">
                    Gestion des interventions correctives • {filteredOrdres.length} OT{filteredOrdres.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/demande-maintenance/new')}
                className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-medium shadow-md"
              >
                <Plus className="w-5 h-5" />
                Nouveau OT Correctif
              </button>
            </div>
          </div>

          {/* Filtres et recherche */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Recherche */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Rechercher par machine, client, technicien, cause..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filtre par statut */}
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-500" />
                <select
                  value={filterStatut}
                  onChange={(e) => setFilterStatut(e.target.value)}
                  className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                >
                  <option value="tous">Tous les statuts</option>
                  <option value="prévu">À faire</option>
                  <option value="en_cours">En cours</option>
                  <option value="terminé">Clôturé</option>
                  <option value="annulé">Annulés</option>
                </select>
              </div>

              {/* Filtre par client */}
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-slate-500" />
                <select
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                  className="min-w-52 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                >
                  <option value="tous">Tous les clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.raison_sociale || client.prenom || 'Client sans nom'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tri par date de création */}
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-500" />
                <select
                  value={sortCreation}
                  onChange={(e) => setSortCreation(e.target.value as 'recent' | 'ancien')}
                  className="min-w-48 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                  aria-label="Trier par date de création"
                >
                  <option value="recent">Création : plus récents</option>
                  <option value="ancien">Création : plus anciens</option>
                </select>
              </div>
            </div>

            {/* Statistiques */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="text-2xl font-bold text-blue-600">
                  {ordres.filter(o => o.statut === 'prévu').length}
                </div>
                <div className="text-sm text-blue-600 mt-1">À faire</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                <div className="text-2xl font-bold text-yellow-600">
                  {ordres.filter(o => o.statut === 'en_cours').length}
                </div>
                <div className="text-sm text-yellow-600 mt-1">En cours</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <div className="text-2xl font-bold text-green-600">
                  {ordres.filter(o => o.statut === 'terminé').length}
                </div>
                <div className="text-sm text-green-600 mt-1">Clôturés</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="text-2xl font-bold text-slate-600">
                  {ordres.length}
                </div>
                <div className="text-sm text-slate-600 mt-1">Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Table des ordres */}
        {filteredOrdres.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-12 text-center">
            <Wrench className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Aucun ordre de travail trouvé
            </h3>
            <p className="text-slate-500">
              {searchTerm || filterStatut !== 'tous' || filterClient !== 'tous'
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Créez votre premier ordre de travail correctif'}
            </p>
          </div>
        ) : (
          <>
            {/* VUE MOBILE - CARTES */}
            <div className="lg:hidden space-y-3">
              {paginatedOrdres.map((ordre) => (
                <div
                  key={ordre.id}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden border-l-4 border-l-orange-400"
                >
                  {/* Header de la carte */}
                  <div className="p-3 border-b border-slate-200 bg-orange-50/30">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-900">
                          {ordre.machine?.nom || 'Machine inconnue'}
                        </h3>
                        <p className="text-xs text-slate-600">
                          {ordre.machine?.client?.raison_sociale || ordre.machine?.client?.prenom || 'Client inconnu'}
                        </p>
                      </div>
                      {getStatutBadge(ordre.statut)}
                    </div>
                  </div>

                  {/* Contenu de la carte */}
                  <div className="p-3 space-y-2">
                    {/* Date de création */}
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-600">Créé le:</span>
                      <span className="text-xs text-slate-900 font-medium">
                        {formatDate(ordre.created_at)}
                      </span>
                    </div>

                    {/* Date programmée */}
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-600">Date prévue:</span>
                      <span className="text-xs text-slate-900 font-medium">
                        {formatDate(ordre.date_programmee)}
                      </span>
                    </div>

                    {/* Technicien */}
                    {ordre.technicien && (
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-slate-600">Technicien:</span>
                        <span className="text-xs text-slate-900 font-medium">
                          {ordre.technicien.nom}
                        </span>
                      </div>
                    )}

                    {/* Cause */}
                    {ordre.cause && (
                      <div className="pt-2 border-t border-slate-200">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={14} className="text-orange-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="text-xs font-semibold text-orange-800 uppercase">Cause</span>
                            <p className="text-xs text-orange-700 mt-1 line-clamp-2">{ordre.cause}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/ordres-travail/${ordre.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs transition-colors"
                    >
                      <Eye size={14} />
                      <span>Voir</span>
                    </button>
                    <button
                      onClick={() => navigate(`/admin/demande-maintenance/${ordre.id}/edit`)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-xs transition-colors"
                    >
                      <Edit size={14} />
                      <span>Modifier</span>
                    </button>
                    <button
                      onClick={() => handleDelete(ordre.id)}
                      className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* VUE DESKTOP - TABLE */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        OT #
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Machine
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Date de création
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Date programmée
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Technicien
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Cause
                      </th>
                      <th className="sticky right-0 bg-slate-50 px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedOrdres.map((ordre) => (
                      <tr key={ordre.id} className="group bg-white hover:bg-orange-50/50 transition-colors border-l-4 border-l-orange-400">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-slate-900 font-medium">
                            #{ordre.id.substring(0, 8)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900 font-medium">
                            {ordre.machine?.nom || 'Machine inconnue'}
                          </div>
                          {ordre.machine?.numero_serie && (
                            <div className="text-xs text-slate-500">
                              N° {ordre.machine.numero_serie}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">
                            {ordre.machine?.client?.raison_sociale || ordre.machine?.client?.prenom || 'Client inconnu'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatutBadge(ordre.statut)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-slate-400" />
                            <span className="text-sm text-slate-900">
                              {formatDate(ordre.created_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-slate-400" />
                            <span className="text-sm text-slate-900">
                              {formatDate(ordre.date_programmee)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-slate-400" />
                            <span className="text-sm text-slate-900">
                              {ordre.technicien?.nom || 'Non assigné'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900 max-w-xs truncate" title={ordre.cause || ''}>
                            {ordre.cause || '-'}
                          </div>
                        </td>
                        <td className="sticky right-0 bg-white group-hover:bg-orange-50/50 px-6 py-4 whitespace-nowrap shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/ordres-travail/${ordre.id}`)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Voir détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/admin/demande-maintenance/${ordre.id}/edit`)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(ordre.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Pagination */}
        {filteredOrdres.length > itemsPerPage && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Informations de pagination */}
              <div className="text-sm text-slate-600">
                Affichage de {startIndex + 1} à {Math.min(endIndex, filteredOrdres.length)} sur {filteredOrdres.length} OT
              </div>

              {/* Contrôles de pagination */}
              <div className="flex items-center gap-2">
                {/* Bouton précédent */}
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Précédent
                </button>

                {/* Numéros de page */}
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' ? goToPage(page) : undefined}
                      disabled={typeof page === 'string'}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        page === currentPage
                          ? 'bg-orange-500 text-white'
                          : typeof page === 'string'
                          ? 'text-slate-400 cursor-default'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                {/* Bouton suivant */}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === totalPages
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Suivant
                </button>
              </div>

              {/* Sélecteur d'éléments par page */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Éléments par page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
