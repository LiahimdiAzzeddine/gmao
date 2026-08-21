import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Client, supabase } from "../lib/supabase";
import { Devis } from "../types/devis";
import toast from 'react-hot-toast';

export function useDevisTable() {
  const [devis, setDevis] = useState<Devis[]>([]);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  // État pour la prévisualisation PDF
  const [isPDFPreviewOpen, setIsPDFPreviewOpen] = useState(false);
  const [previewDevis, setPreviewDevis] = useState<Devis | null>(null);
  const [afficherTTC, setAfficherTTC] = useState(true);

  // Pagination et filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const navigate = useNavigate();

  const activeFiltersCount = [
    filterClient !== 'all',
    filterStatut !== 'all',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilterClient('all');
    setFilterStatut('all');
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Effet pour recharger les devis quand les filtres ou la pagination changent
  useEffect(() => {
    fetchDevis();
  }, [currentPage, itemsPerPage, filterClient, filterStatut, searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, filterClient, filterStatut]);

  const goToPDFGeneratorPage = (id: number) => {
    navigate(`/gestion/devis/${id}/pdf`);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase.from("clients_devis").select("*").order("created_at", { ascending: true });
    if (!error && data) setClientsList(data);
  };

  const fetchAllFilteredDevis = useCallback(async () => {
    try {
      // Construction de la requête de base (même que fetchDevis mais sans pagination)
      let query = supabase
        .from("devis")
        .select(`
          id,
          num_devis,
          ht_ttc,
          client_devis_id,
          clients_devis:client_devis_id (*),
          contact:contact_num (*),
          emetteur:emetteur_id (*),
          type_devis:type_devis_id (*),
          domaines_activite:domaine_id (*),
          monetaire:monetaire_id (*),
          bons_livraison (*),
          chantiers (*),
          factures(*),
          date_devis,
          kg_mo,
          kg_mat,
          mois,
          annee,
          statut,
          designation,
          date_paye,
          devis_lignes (
            materiel,
            quantite,
            prix,
            type,
            ordre
          )
        `);

      // Application des mêmes filtres que fetchDevis
      if (filterClient !== "all") {
        query = query.eq('client_devis_id', Number(filterClient));
      }

      if (filterStatut !== "all") {
        query = query.eq('statut', filterStatut);
      }

      // Recherche textuelle
      if (searchTerm.trim()) {
        query = query.or(`num_devis.ilike.%${searchTerm}%,designation.ilike.%${searchTerm}%`);
      }

      // Pas de pagination - récupérer toutes les données
      query = query.order("date_devis", { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (data) {
        return data.map((d) => ({
          id: d.id,
          bons_livraison: d.bons_livraison as any || [],
          factures: d.factures[0] as any || null,
          num_devis: d.num_devis,
          client_devis_id: d.client_devis_id,
          clients_devis: d.clients_devis as any || null,
          contact: d.contact as any || null,
          emetteur: d.emetteur,
          date_devis: d.date_devis,
          kg_mo: d.kg_mo,
          kg_mat: d.kg_mat,
          date_paye: d.date_paye,
          mois: d.mois,
          annee: d.annee,
          ht_ttc: d.ht_ttc,
          statut: d.statut,
          chantiers: d.chantiers as any || null,
          monetaire: d.monetaire as any || null,
          designation: d.designation,
          type_devis: d.type_devis as any || null,
          domaines_activite: d.domaines_activite as any || null,
          lignes: (d.devis_lignes || []).map((l: any) => ({
            id: l.id,
            type: l.type || 'materiel',
            materiel: l.materiel,
            quantite: l.quantite,
            prix: l.prix,
            ordre: l.ordre,
            unite: l.unite,
          })),
        }));
      }

      return [];
    } catch (err: any) {
      console.error("Erreur lors du chargement de tous les devis filtrés :", err.message);
      return [];
    }
  }, [filterClient, filterStatut, searchTerm]);

  const fetchDevis = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Construction de la requête de base
      let query = supabase
        .from("devis")
        .select(`
          id,
          num_devis,
          ht_ttc,
          client_devis_id,
          clients_devis:client_devis_id (*),
          contact:contact_num (*),
          emetteur:emetteur_id (*),
          type_devis:type_devis_id (*),
          domaines_activite:domaine_id (*),
          monetaire:monetaire_id (*),
          bons_livraison (*),
          chantiers (*),
          factures(*),
          date_devis,
          kg_mo,
          kg_mat,
          mois,
          annee,
          statut,
          designation,
          date_paye,
          devis_lignes (
            materiel,
            quantite,
            prix,
            type,
            ordre
          )
        `, { count: 'exact' });

      // Application des filtres
      if (filterClient !== "all") {
        query = query.eq('client_devis_id', Number(filterClient));
      }

      if (filterStatut !== "all") {
        query = query.eq('statut', filterStatut);
      }

      // Recherche textuelle
      if (searchTerm.trim()) {
        // Pour la recherche dans les tables liées, nous devons faire plusieurs requêtes ou utiliser textSearch
        // Simplifions d'abord avec les champs directs
        query = query.or(`num_devis.ilike.%${searchTerm}%,designation.ilike.%${searchTerm}%`);
      }

      // Pagination
      const startIndex = (currentPage - 1) * itemsPerPage;
      query = query
        .order("date_devis", { ascending: false })
        .range(startIndex, startIndex + itemsPerPage - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      if (data) {
        setTotalCount(count || 0);
        setDevis(
          data.map((d) => ({
            id: d.id,
            bons_livraison: d.bons_livraison as any || [],
            factures: d.factures[0] as any || null,
            num_devis: d.num_devis,
            client_devis_id: d.client_devis_id,
            clients_devis: d.clients_devis as any || null,
            contact: d.contact as any || null,
            emetteur: d.emetteur,
            date_devis: d.date_devis,
            kg_mo: d.kg_mo,
            kg_mat: d.kg_mat,
            date_paye:d.date_paye,
            mois: d.mois,
            annee: d.annee,
            ht_ttc: d.ht_ttc,
            statut: d.statut,
            chantiers: d.chantiers as any || null,
            monetaire: d.monetaire as any || null,
            designation: d.designation,
            type_devis: d.type_devis as any || null,
            domaines_activite: d.domaines_activite as any || null,
            lignes: (d.devis_lignes || []).map((l: any) => ({
              id: l.id,
              type: l.type || 'materiel',
              materiel: l.materiel,
              quantite: l.quantite,
              prix: l.prix,
              ordre: l.ordre,
              unite: l.unite,
            })),
          }))
        );
      }
    } catch (err: any) {
      setError("Erreur lors du chargement des devis : " + err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, filterClient, filterStatut, searchTerm]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    const devisItem = devis.find(d => d.id === id);
    if (!devisItem) return;

    if (!["payé", "annule"].includes(newStatus)) {
      setError("Vous ne pouvez changer le statut que vers Facturé, Payé ou Annulé.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setUpdatingStatus(id);
    try {
      const { error } = await supabase
        .from("devis")
        .update({ statut: newStatus })
        .eq("id", id);

      if (error) throw error;

      // Recharger les données pour maintenir la cohérence
      await fetchDevis();
    } catch (err: any) {
      setError("Erreur lors de la mise à jour du statut : " + err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const reactiverDevis = async (devisItem: any) => {
    if (!devisItem) return;

    // Déterminer le nouveau statut
    let newStatus = "en_attente";
    if (devisItem.factures) {
      newStatus = "facturé";
    } else if (devisItem.bons_livraison?.length > 0) {
      newStatus = "terminé";
    } else if (devisItem.chantiers) {
      newStatus = "en_cours";
    }

    setUpdatingStatus(devisItem.id);

    try {
      const { error } = await supabase
        .from("devis")
        .update({ statut: newStatus })
        .eq("id", devisItem.id);

      if (error) throw error;

      // Recharger les données pour maintenir la cohérence
      await fetchDevis();

      toast.success(`Le devis ${devisItem.num_devis} est maintenant "${newStatus}"`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erreur lors de la réactivation : ${err.message}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const openPDFPreview = (devis: Devis) => {
    setAfficherTTC(devis.ht_ttc === 'TTC');
    setPreviewDevis(devis);
    setIsPDFPreviewOpen(true);
  };

  const closePDFPreview = () => {
    setIsPDFPreviewOpen(false);
    setPreviewDevis(null);
  };

  const handleDelete = async (id: number, chantierCode?: string) => {
    // Cas : devis lié à un chantier
    if (chantierCode && chantierCode.trim() !== '') {
      toast.error("Impossible de supprimer un devis lié à un chantier.");
      return;
    }

    // Confirmation utilisateur
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible."
    );
    if (!confirmed) return;

    const toastId = toast.loading("Suppression du devis...");

    try {
      const { error } = await supabase
        .from("devis")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Recharger les données après suppression
      await fetchDevis();

      toast.success("Devis supprimé avec succès.", { id: toastId });
    } catch (err: any) {
      toast.error(
        err?.message || "Erreur lors de la suppression du devis.",
        { id: toastId }
      );
    }
  };

  // Calculs pour la pagination côté client (maintenant basés sur totalCount)
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount);
  const currentDevis = devis; // Les données sont déjà paginées côté serveur
  const filteredDevisFinal = devis; // Les données sont déjà filtrées côté serveur

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Fonction de recherche avec debounce
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);
  
  const handleSearchChange = (term: string) => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }
    
    const timeout = setTimeout(() => {
      setSearchTerm(term);
    }, 500); // Attendre 500ms après la dernière frappe
    
    setSearchDebounce(timeout);
  };

  return {
    // Data
    devis,
    clientsList,
    currentDevis,
    filteredDevisFinal,
    totalCount,
    
    // Loading states
    loading,
    error,
    updatingStatus,
    
    // PDF Preview
    isPDFPreviewOpen,
    previewDevis,
    afficherTTC,
    
    // Filters and pagination
    searchTerm,
    filterClient,
    filterStatut,
    showFilters,
    selectedClient,
    currentPage,
    itemsPerPage,
    totalPages,
    startIndex,
    endIndex,
    activeFiltersCount,
    
    // Actions
    setSearchTerm,
    setFilterClient,
    setFilterStatut,
    setShowFilters,
    setSelectedClient,
    setCurrentPage,
    setItemsPerPage,
    resetFilters,
    goToPage,
    goToPDFGeneratorPage,
    handleStatusChange,
    reactiverDevis,
    openPDFPreview,
    closePDFPreview,
    handleDelete,
    fetchDevis,
    fetchAllFilteredDevis,
    handleSearchChange,
  };
}