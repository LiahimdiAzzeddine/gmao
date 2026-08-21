import { useEffect, useState } from "react";
import { X, Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";



export type Emetteur = {
  id: number;
  nom: string | null;
  telephone: string | null;
  portable: string | null;
  email: string | null;
  adresse: string | null;
  created_at: string;
};

type EmetteurFormData = Omit<Emetteur, "id" | "created_at">;

const initialFormData: EmetteurFormData = {
  nom: "",
  telephone: "",
  portable: "",
  email: "",
  adresse: ""
};

export default function EmetteursTable() {
  const [emetteurs, setEmetteurs] = useState<Emetteur[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedEmetteur, setSelectedEmetteur] = useState<Emetteur | null>(null);
  const [formData, setFormData] = useState<EmetteurFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  
  // États pour la pagination et les filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    fetchEmetteurs();
  }, []);

  const fetchEmetteurs = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("emetteurs")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      setError("Erreur lors du chargement des émetteurs : " + error.message);
    } else if (data) {
      setEmetteurs(data);
    }

    setLoading(false);
  };

  // Filtrer les émetteurs selon le terme de recherche
  const filteredEmetteurs = emetteurs.filter(e => 
    (e.nom && e.nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.telephone && e.telephone.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.portable && e.portable.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.adresse && e.adresse.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculer la pagination
  const totalPages = Math.ceil(filteredEmetteurs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmetteurs = filteredEmetteurs.slice(startIndex, endIndex);

  // Réinitialiser la page lors du changement de recherche
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const openAddModal = () => {
    setModalMode("add");
    setFormData(initialFormData);
    setSelectedEmetteur(null);
    setIsModalOpen(true);
  };

  const openEditModal = (emetteur: Emetteur) => {
    setModalMode("edit");
    setSelectedEmetteur(emetteur);
    setFormData({
      nom: emetteur.nom || "",
      telephone: emetteur.telephone || "",
      portable: emetteur.portable || "",
      email: emetteur.email || "",
      adresse: emetteur.adresse || ""
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEmetteur(null);
    setFormData(initialFormData);
    setError("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.nom) {
      setError("Le nom est obligatoire");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (modalMode === "add") {
        const { data, error } = await supabase
          .from("emetteurs")
          .insert([{ ...formData, created_at: new Date().toISOString() }])
          .select();

        if (error) throw error;
        if (data) {
          setEmetteurs(prev => [...prev, ...data]);
        }
      } else {
        const { data, error } = await supabase
          .from("emetteurs")
          .update(formData)
          .eq("id", selectedEmetteur!.id)
          .select();

        if (error) throw error;
        if (data) {
          setEmetteurs(prev =>
            prev.map(e => (e.id === selectedEmetteur!.id ? 
              { ...data[0], id: selectedEmetteur!.id, created_at: selectedEmetteur!.created_at } : e))
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
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet émetteur ?")) return;

    try {
      const { error } = await supabase
        .from("emetteurs")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setEmetteurs(prev => prev.filter(e => e.id !== id));
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
          Liste des Émetteurs
        </h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors shadow-md"
        >
          <Plus size={20} />
          Ajouter un émetteur
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
                placeholder="Rechercher par nom, téléphone ou adresse..."
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
            {filteredEmetteurs.length} résultat{filteredEmetteurs.length > 1 ? 's' : ''} trouvé{filteredEmetteurs.length > 1 ? 's' : ''}
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
                    <th className="px-6 py-3 text-left text-sm font-semibold">#</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Téléphone</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Portable</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Adresse</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Créé le</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentEmetteurs.map((e) => (
                    <tr key={e.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-orange-700">{e.id}</td>
                      <td className="px-6 py-4 text-sm font-medium">{e.nom || "-"}</td>
                      <td className="px-6 py-4 text-sm">{e.telephone || "-"}</td>
                      <td className="px-6 py-4 text-sm">{e.portable || "-"}</td>
                      <td className="px-6 py-4 text-sm">{e.email || "-"}</td>
                      <td className="px-6 py-4 text-sm">{e.adresse || "-"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(e.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(e)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Modifier"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {currentEmetteurs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        {searchTerm ? "Aucun émetteur trouvé pour cette recherche." : "Aucun émetteur trouvé. Cliquez sur \"Ajouter un émetteur\" pour commencer."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {filteredEmetteurs.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-700">
                Affichage de {startIndex + 1} à {Math.min(endIndex, filteredEmetteurs.length)} sur {filteredEmetteurs.length} émetteurs
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-orange-600">
                {modalMode === "add" ? "Ajouter un émetteur" : "Modifier l'émetteur"}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleInputChange}
                    placeholder="Nom de l'émetteur"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleInputChange}
                    placeholder="+212 XXX XXXXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portable
                  </label>
                  <input
                    type="tel"
                    name="portable"
                    value={formData.portable}
                    onChange={handleInputChange}
                    placeholder="+212 6XX XXXXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email de l'émetteur"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
            
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse
                  </label>
                  <textarea
                    name="adresse"
                    value={formData.adresse}
                    onChange={handleInputChange}
                    placeholder="Adresse complète"
                    rows={3}
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