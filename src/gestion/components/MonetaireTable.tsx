import { useEffect, useState } from "react";
import { X, Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";

export type Monetaire = {
  id: number;
  unite: string | null;
  symbol: string | null;
  created_at: string;
};

type MonetaireFormData = Omit<Monetaire, "id" | "created_at">;

const initialFormData: MonetaireFormData = {
  unite: "",
  symbol: "",
};

export default function MonetaireTable() {
  const [monetaires, setMonetaires] = useState<Monetaire[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedMonetaire, setSelectedMonetaire] = useState<Monetaire | null>(null);
  const [formData, setFormData] = useState<MonetaireFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  
  // États pour la pagination et les filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    fetchMonetaires();
  }, []);

  const fetchMonetaires = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("monetaire")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      setError("Erreur lors du chargement des unités monétaires : " + error.message);
    } else if (data) {
      setMonetaires(data);
    }

    setLoading(false);
  };

  // Filtrer les unités monétaires selon le terme de recherche
  const filteredMonetaires = monetaires.filter(m => 
    m.unite && m.unite.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculer la pagination
  const totalPages = Math.ceil(filteredMonetaires.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMonetaires = filteredMonetaires.slice(startIndex, endIndex);

  // Réinitialiser la page lors du changement de recherche
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const openAddModal = () => {
    setModalMode("add");
    setFormData(initialFormData);
    setSelectedMonetaire(null);
    setIsModalOpen(true);
  };

  const openEditModal = (monetaire: Monetaire) => {
    setModalMode("edit");
    setSelectedMonetaire(monetaire);
    setFormData({
      unite: monetaire.unite || "",
      symbol: monetaire.symbol || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMonetaire(null);
    setFormData(initialFormData);
    setError("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.unite) {
      setError("L'unité monétaire est obligatoire");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (modalMode === "add") {
        const { data, error } = await supabase
          .from("monetaire")
          .insert([{ unite: formData.unite, symbol: formData.symbol }])
          .select();

        if (error) throw error;
        if (data) {
          setMonetaires(prev => [...prev, ...data].sort((a, b) => a.id - b.id));
        }
      } else {
        const { data, error } = await supabase
          .from("monetaire")
          .update({ unite: formData.unite, symbol: formData.symbol })
          .eq("id", selectedMonetaire!.id)
          .select();

        if (error) throw error;
        if (data) {
          setMonetaires(prev =>
            prev.map(m => (m.id === selectedMonetaire!.id ? { ...data[0], created_at: selectedMonetaire!.created_at } : m))
          );
        }
      }

      closeModal();
    } catch (err: any) {
      setError("Erreur lors de la sauvegarde : " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette unité monétaire ?")) return;

    try {
      const { error } = await supabase
        .from("monetaire")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setMonetaires(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      setError("Erreur lors de la suppression : " + err.message);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-orange-600">
          Liste des Unités Monétaires
        </h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors shadow-md"
        >
          <Plus size={20} />
          Ajouter une unité
        </button>
      </div>

      {error && !isModalOpen && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher une unité..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
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
        
        {searchTerm && (
          <div className="mt-3 text-sm text-gray-600">
            {filteredMonetaires.length} résultat{filteredMonetaires.length > 1 ? 's' : ''} trouvé{filteredMonetaires.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

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
                    <th className="px-6 py-3 text-left text-sm font-semibold">ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Unité</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">symbol</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Créé le</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentMonetaires.map((m) => (
                    <tr key={m.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-orange-700">{m.id}</td>
                      <td className="px-6 py-4 text-sm">{m.unite || "-"}</td>
                      <td className="px-6 py-4 text-sm">{m.symbol || "-"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(m.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(m)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Modifier"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {currentMonetaires.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        {searchTerm ? "Aucune unité monétaire trouvée pour cette recherche." : "Aucune unité monétaire trouvée. Cliquez sur \"Ajouter une unité\" pour commencer."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {filteredMonetaires.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-700">
                Affichage de {startIndex + 1} à {Math.min(endIndex, filteredMonetaires.length)} sur {filteredMonetaires.length} unités
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-orange-600">
                {modalMode === "add" ? "Ajouter une unité monétaire" : "Modifier l'unité monétaire"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unité monétaire *
                  </label>
                  <input
                    type="text"
                    name="unite"
                    value={formData.unite||""}
                    onChange={handleInputChange}
                    placeholder="Ex: MAD, EUR, USD"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Symbole monétaire
                  </label>  
                  <input
                    type="text"
                    name="symbol"
                    value={formData.symbol||""}
                    onChange={handleInputChange}
                    placeholder="Ex: €, $, د.م."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Enregistrement..." : modalMode === "add" ? "Ajouter" : "Modifier"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}