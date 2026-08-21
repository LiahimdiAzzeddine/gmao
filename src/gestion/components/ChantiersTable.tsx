import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Euro, FileText, Eye, ShoppingCart, Building2, Filter, X, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { calculateTotalHT, formatNumber } from "../../utils/gestionMethode";
import { Monetaire } from "../../types/devis";

export type DevisInfo = {
  id: number;
  designation: string | null;
  client_devis?: {
    client: string;
  } | null;
  devis_lignes: {
    materiel: string | null;
    quantite: number | null;
    prix: number | null;
    type: string;
    ordre: number | null;
  }[];
  monetaire?: Monetaire | null;
};

export type Chantier = {
  code: string;
  created_at: string;
  devis_id?: number;
  devis?: DevisInfo;
  achats?: {
    id: number;
    total_ht: number;
    statut: string;
  }[];
};

export default function ChantiersTable() {
  const navigate = useNavigate();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [clients, setClients] = useState<string[]>([]);

  // États pour la pagination et les filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    fetchChantiers();
  }, []);

  const fetchChantiers = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("chantiers")
      .select(`
        *,
        devis:devis_id (
          id,
          kg_mat,
          kg_mo,
          monetaire:monetaire_id (*),
          designation,
          client_devis:client_devis_id(*),
          lignes:devis_lignes (
            materiel,
            quantite,
            prix,
            type,
            ordre
          )
        ),
        achats (
          id,
          total_ht,
          statut
        )
      `)
      .order("code", { ascending: true });

    if (error) {
      setError("Erreur lors du chargement des chantiers : " + error.message);
    } else if (data) {
      setChantiers(data);
    }

    setLoading(false);
  };

  // Extraire la liste unique des clients
  useEffect(() => {
    const uniqueClients = Array.from(
      new Set(
        chantiers
          .map(c => c.devis?.client_devis?.client)
          .filter(Boolean)
      )
    ).sort();
    setClients(uniqueClients as string[]);
  }, [chantiers]);




  // Filtrer les chantiers selon le terme de recherche et les filtres
  const filteredChantiers = chantiers.filter(c => {
    // Filtre de recherche textuelle
    const matchesSearch = 
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.devis?.designation && c.devis.designation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.devis?.client_devis?.client && c.devis.client_devis.client.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtre par client
    const matchesClient = !selectedClient || c.devis?.client_devis?.client === selectedClient;

    // Filtre par date
    const chantierDate = new Date(c.created_at);
    const matchesDateFrom = !dateFrom || chantierDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || chantierDate <= new Date(dateTo + 'T23:59:59');

    return matchesSearch && matchesClient && matchesDateFrom && matchesDateTo;
  });

  // Calculer la pagination
  const totalPages = Math.ceil(filteredChantiers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentChantiers = filteredChantiers.slice(startIndex, endIndex);

  // Réinitialiser la page lors du changement de recherche ou filtres
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClient, dateFrom, dateTo, itemsPerPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleViewDevisPDF = (devisId: number) => {
    navigate(`/gestion/devis/${devisId}/pdf`);
  };

  const calculateTotalAchats = (achats?: { total_ht: number; statut: string }[]) => {
    if (!achats) return 0;
    return achats
      .filter(achat => achat.statut !== 'annule')
      .reduce((total, achat) => total + (achat.total_ht || 0), 0);
  };

  const clearFilters = () => {
    setSelectedClient("");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
  };

  const hasActiveFilters = selectedClient || dateFrom || dateTo;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-orange-600">
          Liste des Chantiers
        </h1>

      </div>


      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex flex-col gap-4">
          {/* Première ligne : Recherche et bouton filtres */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Rechercher par code, désignation ou client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
                  hasActiveFilters || showFilters
                    ? 'bg-orange-100 border-orange-300 text-orange-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtres
                {hasActiveFilters && (
                  <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {[selectedClient, dateFrom, dateTo].filter(Boolean).length}
                  </span>
                )}
              </button>
              
              <label className="text-sm text-gray-700 whitespace-nowrap">Afficher:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-700 whitespace-nowrap">par page</span>
            </div>
          </div>

          {/* Filtres avancés (affichés conditionnellement) */}
          {showFilters && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filtre par client */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Client
                  </label>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Tous les clients</option>
                    {clients.map((client) => (
                      <option key={client} value={client}>
                        {client}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtre par date de début */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Filtre par date de fin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Bouton pour effacer les filtres */}
              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Effacer les filtres
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {(searchTerm || hasActiveFilters) && (
          <div className="mt-3 text-sm text-gray-600">
            {filteredChantiers.length} résultat{filteredChantiers.length > 1 ? 's' : ''} trouvé{filteredChantiers.length > 1 ? 's' : ''}
            {hasActiveFilters && (
              <span className="ml-2 text-orange-600">
                (filtres actifs)
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-orange-600 text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Code Chantier</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Client</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Désignation Devis</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Prix Total HT</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Total Achats</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Créé le</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentChantiers.map((c) => {
                    const totalHT = c.devis ? calculateTotalHT(c.devis as any) : 0;
                    const totalAchats = calculateTotalAchats(c.achats);
                    
                    return (
                      <tr key={c.code} className="hover:bg-orange-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-orange-700">
                          {c.code}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="max-w-xs truncate" title={c.devis?.client_devis?.client || undefined}>
                              {c.devis?.client_devis?.client || "Aucun client"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="max-w-xs truncate" title={c.devis?.designation || undefined}>
                              {c.devis?.designation || "Aucune désignation"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-1 text-green-700 font-semibold">
                            <Euro className="w-4 h-4" />
                            {formatNumber(totalHT)} {c.devis?.monetaire?.symbol || "Dhs"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-1 text-blue-700 font-semibold">
                            <ShoppingCart className="w-4 h-4" />
                            {formatNumber(totalAchats)} {c.devis?.monetaire?.symbol || "Dhs"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(c.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {c.devis_id && (
                            <button
                              onClick={() => handleViewDevisPDF(c.devis_id!)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors text-sm font-medium"
                              title="Voir le devis PDF"
                            >
                              <Eye className="w-4 h-4" />
                              Voir Devis
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {currentChantiers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        {searchTerm ? "Aucun chantier trouvé pour cette recherche." : "Aucun chantier trouvé."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {filteredChantiers.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-700">
                Affichage de {startIndex + 1} à {Math.min(endIndex, filteredChantiers.length)} sur {filteredChantiers.length} chantiers
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Page précédente"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`px-3 py-1 rounded-md transition-colors ${
                            currentPage === page
                              ? "bg-orange-600 text-white"
                              : "border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-2">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Page suivante"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </>
      )}


    </div>
  );
}