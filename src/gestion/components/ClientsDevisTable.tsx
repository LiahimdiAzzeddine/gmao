import { useEffect, useState } from "react";
import { X, Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, User } from "lucide-react";
import { supabase } from "../../lib/supabase";

export type ClientDevis = {
  id: number;
  client: string | null;
  ice: string | null;
  created_at: string;
  numero_fournisseur: string | null;
  site_code: string | null;
};

export type Contact = {
  num_contact: number;
  nom: string | null;
  adresse: string | null;
  tel: string | null;
  adresse_facturation: string | null;
  created_at: string;
  client_id: number;
  email: string | null;
};
export type SiteDevis = {
  code: string;
  libelle: string;
}


type ClientFormData = Omit<ClientDevis, "id" | "created_at">;
type ContactFormData = Omit<Contact, "num_contact" | "created_at" | "client_id">;

const initialClientFormData: ClientFormData = {
  client: "",
  ice: "",
  site_code: "",
  numero_fournisseur: ""
};

const initialContactFormData: ContactFormData = {
  nom: "",
  adresse: "",
  tel: "",
  adresse_facturation: "",
  email: ""
};

export default function ClientsDevisTable() {
  const [clients, setClients] = useState<ClientDevis[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientModalMode, setClientModalMode] = useState<"add" | "edit">("add");
  const [selectedClient, setSelectedClient] = useState<ClientDevis | null>(null);
  const [clientFormData, setClientFormData] = useState<ClientFormData>(initialClientFormData);

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactModalMode, setContactModalMode] = useState<"add" | "edit">("add");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactFormData, setContactFormData] = useState<ContactFormData>(initialContactFormData);
  const [contactClientId, setContactClientId] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set());

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sites, setSites] = useState<SiteDevis[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");

    const [clientsResult, contactsResult, sites] = await Promise.all([
      supabase.from("clients_devis").select("*").order("id", { ascending: true }),
      supabase.from("contacts").select("*").order("num_contact", { ascending: true }),
      supabase.from("sites_client").select("*").order("code", { ascending: true }),
    ]);

    if (clientsResult.error) {
      setError("Erreur lors du chargement des clients : " + clientsResult.error.message);
    } else if (clientsResult.data) {
      setClients(clientsResult.data);
    }

    if (contactsResult.error) {
      setError("Erreur lors du chargement des contacts : " + contactsResult.error.message);
    } else if (contactsResult.data) {
      setContacts(contactsResult.data);
    }
    if (sites.error) {
      setError("Erreur lors du chargement des sites : " + sites.error.message);
    } else if (sites.data) {
      setSites(sites.data);
    }

    setLoading(false);
  };

  const filteredClients = clients.filter(c => {
    const clientContacts = contacts.filter(contact => contact.client_id === c.id);
    return (
      (c.client && c.client.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.ice && c.ice.toLowerCase().includes(searchTerm.toLowerCase())) ||
      clientContacts.some(contact =>
        (contact.nom && contact.nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.tel && contact.tel.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.adresse && contact.adresse.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    );
  });

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const toggleExpandClient = (clientId: number) => {
    setExpandedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const openAddClientModal = () => {
    setClientModalMode("add");
    setClientFormData(initialClientFormData);
    setSelectedClient(null);
    setIsClientModalOpen(true);
  };

  const openEditClientModal = (client: ClientDevis) => {
    setClientModalMode("edit");
    setSelectedClient(client);
    setClientFormData({
      client: client.client || "",
      site_code: client.site_code || "",
      ice: client.ice || "",
      numero_fournisseur: client.numero_fournisseur || ""
    });
    setIsClientModalOpen(true);
  };

  const closeClientModal = () => {
    setIsClientModalOpen(false);
    setSelectedClient(null);
    setClientFormData(initialClientFormData);
    setError("");
  };

  const handleClientInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setClientFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClientSubmit = async () => {
    if (!clientFormData.client) {
      setError("Le nom du client est obligatoire");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (clientModalMode === "add") {
        const { data, error } = await supabase
          .from("clients_devis")
          .insert([clientFormData])
          .select();

        if (error) throw error;
        if (data) {
          setClients(prev => [...prev, ...data].sort((a, b) => a.id - b.id));
        }
      } else {
        const { data, error } = await supabase
          .from("clients_devis")
          .update(clientFormData)
          .eq("id", selectedClient!.id)
          .select();

        if (error) throw error;
        if (data) {
          setClients(prev =>
            prev.map(c => (c.id === selectedClient!.id ? data[0] : c))
          );
        }
      }

      closeClientModal();
    } catch (err: any) {
      setError("Erreur lors de la sauvegarde : " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async (id: number) => {
    const clientContacts = contacts.filter(c => c.client_id === id);
    if (clientContacts.length > 0) {
      if (!confirm(`Ce client a ${clientContacts.length} contact(s). Êtes-vous sûr de vouloir supprimer ce client et tous ses contacts ?`)) {
        return;
      }
    } else if (!confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) {
      return;
    }

    try {
      await supabase.from("contacts").delete().eq("client_id", id);

      const { error } = await supabase
        .from("clients_devis")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setClients(prev => prev.filter(c => c.id !== id));
      setContacts(prev => prev.filter(c => c.client_id !== id));
    } catch (err: any) {
      setError("Erreur lors de la suppression : " + err.message);
    }
  };

  const openAddContactModal = (clientId: number) => {
    setContactModalMode("add");
    setContactFormData(initialContactFormData);
    setSelectedContact(null);
    setContactClientId(clientId);
    setIsContactModalOpen(true);
  };

  const openEditContactModal = (contact: Contact) => {
    setContactModalMode("edit");
    setSelectedContact(contact);
    setContactFormData({
      nom: contact.nom || "",
      adresse: contact.adresse || "",
      tel: contact.tel || "",
      adresse_facturation: contact.adresse_facturation || "",
      email: contact.email || ""
    });
    setContactClientId(contact.client_id);
    setIsContactModalOpen(true);
  };

  const closeContactModal = () => {
    setIsContactModalOpen(false);
    setSelectedContact(null);
    setContactFormData(initialContactFormData);
    setContactClientId(null);
    setError("");
  };

  const handleContactInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContactFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = async () => {
    if (!contactFormData.nom) {
      setError("Le nom du contact est obligatoire");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (contactModalMode === "add") {
        const { data, error } = await supabase
          .from("contacts")
          .insert([{ ...contactFormData, client_id: contactClientId! }])
          .select();

        if (error) throw error;
        if (data) {
          setContacts(prev => [...prev, ...data].sort((a, b) => a.num_contact - b.num_contact));
        }
      } else {
        const { data, error } = await supabase
          .from("contacts")
          .update(contactFormData)
          .eq("num_contact", selectedContact!.num_contact)
          .select();

        if (error) throw error;
        if (data) {
          setContacts(prev =>
            prev.map(c => (c.num_contact === selectedContact!.num_contact ? data[0] : c))
          );
        }
      }

      closeContactModal();
    } catch (err: any) {
      setError("Erreur lors de la sauvegarde : " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContact = async (numContact: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce contact ?")) return;

    try {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("num_contact", numContact);

      if (error) throw error;
      setContacts(prev => prev.filter(c => c.num_contact !== numContact));
    } catch (err: any) {
      setError("Erreur lors de la suppression : " + err.message);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getClientContacts = (clientId: number) => {
    return contacts.filter(c => c.client_id === clientId);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-orange-600">
          Gestion des Clients et Contacts
        </h1>
        <button
          onClick={openAddClientModal}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors shadow-md"
        >
          <Plus size={20} />
          Ajouter un client
        </button>
      </div>

      {error && !isClientModalOpen && !isContactModalOpen && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher par client,ICE, contact..."
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
            {filteredClients.length} résultat{filteredClients.length > 1 ? 's' : ''} trouvé{filteredClients.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {currentClients.map((client) => {
              const clientContacts = getClientContacts(client.id);
              const isExpanded = expandedClients.has(client.id);

              return (
                <div key={client.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="p-4 hover:bg-orange-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <button
                          onClick={() => toggleExpandClient(client.id)}
                          className="text-orange-600 hover:text-orange-800 transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                          <div>
                            <span className="text-xs text-gray-500 block">Client</span>
                            <span className="font-semibold text-gray-900">{client.client || "-"}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block">ICE</span>
                            <span className="text-gray-700">{client.ice || "-"}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block">Contacts</span>
                            <span className="flex items-center gap-1 text-orange-600 font-medium">
                              <User size={16} />
                              {clientContacts.length}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block">Site code</span>
                            <span className="flex items-center gap-1 text-orange-600 font-medium">
                              {client.site_code || "-"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => openAddContactModal(client.id)}
                          className="text-green-600 hover:text-green-800 transition-colors p-2 hover:bg-green-50 rounded-md"
                          title="Ajouter un contact"
                        >
                          <Plus size={18} />
                        </button>
                        <button
                          onClick={() => openEditClientModal(client)}
                          className="text-blue-600 hover:text-blue-800 transition-colors p-2 hover:bg-blue-50 rounded-md"
                          title="Modifier le client"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          className="text-red-600 hover:text-red-800 transition-colors p-2 hover:bg-red-50 rounded-md"
                          title="Supprimer le client"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Contacts ({clientContacts.length})
                        </h3>
                        <button
                          onClick={() => openAddContactModal(client.id)}
                          className="flex items-center gap-1 text-sm bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors"
                        >
                          <Plus size={16} />
                          Ajouter
                        </button>
                      </div>

                      {clientContacts.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          Aucun contact pour ce client.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full bg-white rounded-lg overflow-hidden">
                            <thead className="bg-gray-200">
                              <tr>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Nom</th>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Téléphone</th>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Adresse (site)</th>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Adresse Facturation</th>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Email</th>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {clientContacts.map((contact) => (
                                <tr key={contact.num_contact} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm font-medium">{contact.nom || "-"}</td>
                                  <td className="px-4 py-2 text-sm">{contact.tel || "-"}</td>
                                  <td className="px-4 py-2 text-sm">{contact.adresse || "-"}</td>
                                  <td className="px-4 py-2 text-sm">{contact.adresse_facturation || "-"}</td>
                                  <td className="px-4 py-2 text-sm">{contact.email || "-"}</td>
                                  <td className="px-4 py-2 text-sm">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => openEditContactModal(contact)}
                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                        title="Modifier"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteContact(contact.num_contact)}
                                        className="text-red-600 hover:text-red-800 transition-colors"
                                        title="Supprimer"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {currentClients.length === 0 && (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
                {searchTerm ? "Aucun client trouvé pour cette recherche." : "Aucun client trouvé. Cliquez sur \"Ajouter un client\" pour commencer."}
              </div>
            )}
          </div>

          {filteredClients.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-700">
                Affichage de {startIndex + 1} à {Math.min(endIndex, filteredClients.length)} sur {filteredClients.length} clients
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

      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-orange-600">
                {clientModalMode === "add" ? "Ajouter un client" : "Modifier le client"}
              </h2>
              <button
                onClick={closeClientModal}
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
                    Nom du Client *
                  </label>
                  <input
                    type="text"
                    name="client"
                    value={clientFormData.client || ""}
                    onChange={handleClientInputChange}
                    placeholder="Ex: ONCF"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code du Site </label>
                  <select
                    name="site_code"
                    value={clientFormData.site_code || ""}
                    onChange={handleClientInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Sélectionner un site</option>
                    {sites.map((site) => (
                      <option key={site.code} value={site.code}>
                        {site.code} - {site.libelle}
                      </option>
                    ))}
                  </select>
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ICE
                  </label>
                  <input
                    type="text"
                    name="ice"
                    value={clientFormData.ice || ""}
                    onChange={handleClientInputChange}
                    placeholder="Ex: 123456789012345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de fournisseur</label>
                  <input
                    type="text"
                    name="numero_fournisseur"
                    value={clientFormData.numero_fournisseur || ""}
                    onChange={handleClientInputChange}
                    placeholder="Ex: F12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeClientModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleClientSubmit}
                  disabled={submitting}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Enregistrement..." : clientModalMode === "add" ? "Ajouter" : "Modifier"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-orange-600">
                {contactModalMode === "add" ? "Ajouter un contact" : "Modifier le contact"}
              </h2>
              <button
                onClick={closeContactModal}
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
                    Nom du Contact *
                  </label>
                  <input
                    type="text"
                    name="nom"
                    value={contactFormData.nom || ""}
                    onChange={handleContactInputChange}
                    placeholder="Ex: Mohammed Alami"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Email
  </label>
  <input
    type="email"
    name="email"
    value={contactFormData.email || ""}
    onChange={handleContactInputChange}
    placeholder="Ex: exemple@mail.com"
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
  />
</div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="tel"
                    value={contactFormData.tel || ""}
                    onChange={handleContactInputChange}
                    placeholder="Ex: 0522-445566"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse (site)
                  </label>
                  <textarea
                    name="adresse"
                    value={contactFormData.adresse || ""}
                    onChange={handleContactInputChange}
                    placeholder="Ex: Boulevard Mohammed V, Casablanca"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse de Facturation
                  </label>
                  <textarea
                    name="adresse_facturation"
                    value={contactFormData.adresse_facturation || ""}
                    onChange={handleContactInputChange}
                    placeholder="Ex: Même adresse ou différente"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeContactModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleContactSubmit}
                  disabled={submitting}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Enregistrement..." : contactModalMode === "add" ? "Ajouter" : "Modifier"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
