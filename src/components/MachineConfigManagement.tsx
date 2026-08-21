import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Plus, Edit, Trash2, Save, X, Building2, MapPin, Package, Grid3x3 } from "lucide-react";
import { toast } from "react-toastify";

interface Site {
  id: string;
  code: string;
  nom: string;
  created_at?: string;
}

interface Domaine {
  id: string;
  code: string;
  libelle: string;
  created_at?: string;
}

interface Lot {
  id: string;
  code: string;
  nom: string;
  description?: string;
  created_at?: string;
}

interface Secteur {
  id: string;
  code: string;
  libelle: string;
  domaine_id?: string;
  created_at?: string;
}

type TabType = "sites" | "domaines" | "lots" | "secteurs";

export default function MachineConfigManagement() {
  const [activeTab, setActiveTab] = useState<TabType>("sites");
  const [sites, setSites] = useState<Site[]>([]);
  const [domaines, setDomaines] = useState<Domaine[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingCode, setEditingCode] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemCode, setNewItemCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  
  // États pour la modal de détails d'utilisation
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageDetails, setUsageDetails] = useState<{
    message: string;
    posteTechniques?: Array<{id: string, code_pt: string}>;
  } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    await Promise.all([
      loadSites(),
      loadDomaines(),
      loadLots(),
      loadSecteurs(),
    ]);
    setLoading(false);
  }

  async function loadSites() {
    const { data, error } = await supabase
      .from("sites")
      .select("*")
      .order("nom");
    if (!error && data) {
      setSites(data);
      await loadUsageCounts("site_id", data);
    }
  }

  async function loadDomaines() {
    const { data, error } = await supabase
      .from("domaines")
      .select("*")
      .order("libelle");
    
    if (error) {
      console.error("Erreur lors du chargement des domaines:", error);
      toast.error(`Erreur lors du chargement des domaines: ${error.message}`);
    }
    
    if (!error && data) {
      console.log("Domaines chargés:", data);
      setDomaines(data);
      await loadUsageCounts("domaine_id", data);
    }
  }

  async function loadLots() {
    const { data, error } = await supabase
      .from("lots")
      .select("*")
      .order("nom");
    if (!error && data) {
      setLots(data);
      await loadUsageCounts("lot_id", data);
    }
  }

  async function loadSecteurs() {
    const { data, error } = await supabase
      .from("secteurs")
      .select("*")
      .order("libelle");
    
    if (error) {
      console.error("Erreur lors du chargement des secteurs:", error);
      toast.error(`Erreur lors du chargement des secteurs: ${error.message}`);
    }
    
    if (!error && data) {
      console.log("Secteurs chargés:", data);
      setSecteurs(data);
      await loadUsageCounts("secteur_id", data);
    }
  }

  async function loadUsageCounts(columnName: string, items: any[]) {
    const counts: Record<string, number> = {};
    
    for (const item of items) {
      const { count } = await checkIfUsed(item.id);
      counts[item.id] = count;
    }
    
    setUsageCounts(counts);
  }

  function getColumnNameForTab(tab: TabType): string {
    switch (tab) {
      case "sites":
        return "site_id";
      case "domaines":
        return "domaine_id";
      case "lots":
        return "lot_id";
      case "secteurs":
        return "secteur_id";
    }
  }

  async function checkIfUsed(id: string): Promise<{ 
    isUsed: boolean; 
    count: number; 
    details: string;
    posteTechniques?: Array<{id: string, code_pt: string}>;
  }> {
    let totalCount = 0;
    const details: string[] = [];
    let posteTechniques: Array<{id: string, code_pt: string}> = [];

    switch (activeTab) {
      case "sites": {
        // Vérifier postes_techniques
        const { data: ptData, count: ptCount } = await supabase
          .from("postes_techniques")
          .select("id, code_pt", { count: "exact" })
          .eq("site_id", id);
        
        if (ptCount && ptCount > 0) {
          totalCount += ptCount;
          details.push(`${ptCount} poste${ptCount > 1 ? "s" : ""} technique${ptCount > 1 ? "s" : ""}`);
          posteTechniques = ptData || [];
        }
        break;
      }

      case "domaines": {
        // Vérifier postes_techniques
        const { data: ptData, count: ptCount } = await supabase
          .from("postes_techniques")
          .select("id, code_pt", { count: "exact" })
          .eq("domaine_id", id);
        
        if (ptCount && ptCount > 0) {
          totalCount += ptCount;
          details.push(`${ptCount} poste${ptCount > 1 ? "s" : ""} technique${ptCount > 1 ? "s" : ""}`);
          posteTechniques = ptData || [];
        }

        // Vérifier secteurs
        const { count: sectCount } = await supabase
          .from("secteurs")
          .select("*", { count: "exact", head: true })
          .eq("domaine_id", id);
        
        if (sectCount && sectCount > 0) {
          totalCount += sectCount;
          details.push(`${sectCount} secteur${sectCount > 1 ? "s" : ""}`);
        }
        break;
      }

      case "lots": {
        // Vérifier machines
        const { count: machCount } = await supabase
          .from("machines")
          .select("*", { count: "exact", head: true })
          .eq("lot_id", id);
        
        if (machCount && machCount > 0) {
          totalCount += machCount;
          details.push(`${machCount} machine${machCount > 1 ? "s" : ""}`);
        }

        // Vérifier postes_techniques
        const { data: ptData, count: ptCount } = await supabase
          .from("postes_techniques")
          .select("id, code_pt", { count: "exact" })
          .eq("lot_id", id);
        
        if (ptCount && ptCount > 0) {
          totalCount += ptCount;
          details.push(`${ptCount} poste${ptCount > 1 ? "s" : ""} technique${ptCount > 1 ? "s" : ""}`);
          posteTechniques = ptData || [];
        }

        // Vérifier plans_maintenance
        const { count: planCount } = await supabase
          .from("plans_maintenance")
          .select("*", { count: "exact", head: true })
          .eq("lot_id", id);
        
        if (planCount && planCount > 0) {
          totalCount += planCount;
          details.push(`${planCount} plan${planCount > 1 ? "s" : ""} de maintenance`);
        }
        break;
      }

      case "secteurs": {
        // Vérifier postes_techniques
        const { data: ptData, count: ptCount } = await supabase
          .from("postes_techniques")
          .select("id, code_pt", { count: "exact" })
          .eq("secteur_id", id);
        
        if (ptCount && ptCount > 0) {
          totalCount += ptCount;
          details.push(`${ptCount} poste${ptCount > 1 ? "s" : ""} technique${ptCount > 1 ? "s" : ""}`);
          posteTechniques = ptData || [];
        }
        break;
      }
    }

    return { 
      isUsed: totalCount > 0, 
      count: totalCount,
      details: details.join(", "),
      posteTechniques: posteTechniques.length > 0 ? posteTechniques : undefined
    };
  }

  async function handleAdd() {
    if (!newItemName.trim()) {
      toast.error("Le nom ne peut pas être vide");
      return;
    }

    if (!newItemCode.trim()) {
      toast.error("Le code ne peut pas être vide");
      return;
    }

    const tableName = activeTab;
    const insertData: any = { code: newItemCode.trim() };
    
    // Pour les domaines et secteurs, utiliser "libelle" au lieu de "nom"
    if (activeTab === "domaines" || activeTab === "secteurs") {
      insertData.libelle = newItemName.trim();
    } else {
      insertData.nom = newItemName.trim();
    }

    const { error } = await supabase
      .from(tableName)
      .insert(insertData);

    if (error) {
      if (error.code === "23505") {
        toast.error("Ce code existe déjà. Veuillez en choisir un autre.");
      } else {
        toast.error(`Erreur lors de l'ajout: ${error.message}`);
      }
    } else {
      toast.success("Élément ajouté avec succès");
      setNewItemName("");
      setNewItemCode("");
      reloadCurrentTab();
    }
  }

  async function handleUpdate(id: string) {
    if (!editingValue.trim()) {
      toast.error("Le nom ne peut pas être vide");
      return;
    }

    if (!editingCode.trim()) {
      toast.error("Le code ne peut pas être vide");
      return;
    }

    const { isUsed, count, details } = await checkIfUsed(id);
    if (isUsed) {
      toast.error(
        `Impossible de modifier: cet élément est utilisé par ${details}`,
        { autoClose: 6000 }
      );
      return;
    }

    const tableName = activeTab;
    const updateData: any = { code: editingCode.trim() };
    
    // Pour les domaines et secteurs, utiliser "libelle" au lieu de "nom"
    if (activeTab === "domaines" || activeTab === "secteurs") {
      updateData.libelle = editingValue.trim();
    } else {
      updateData.nom = editingValue.trim();
    }

    const { error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq("id", id);

    if (error) {
      if (error.code === "23505") {
        toast.error("Ce code existe déjà. Veuillez en choisir un autre.");
      } else {
        toast.error(`Erreur lors de la modification: ${error.message}`);
      }
    } else {
      toast.success("Élément modifié avec succès");
      setEditingId(null);
      setEditingValue("");
      setEditingCode("");
      reloadCurrentTab();
    }
  }

  async function handleDelete(id: string) {
    const { isUsed, count, details, posteTechniques } = await checkIfUsed(id);
    
    if (isUsed) {
      setUsageDetails({
        message: `Impossible de supprimer: cet élément est utilisé par ${details}`,
        posteTechniques
      });
      setShowUsageModal(true);
      return;
    }

    if (!confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) return;

    const tableName = activeTab;
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    } else {
      toast.success("Élément supprimé avec succès");
      reloadCurrentTab();
    }
  }

  function reloadCurrentTab() {
    switch (activeTab) {
      case "sites":
        loadSites();
        break;
      case "domaines":
        loadDomaines();
        break;
      case "lots":
        loadLots();
        break;
      case "secteurs":
        loadSecteurs();
        break;
    }
  }

  async function startEdit(id: string, currentName: string, currentCode?: string) {
    const { isUsed, count, details, posteTechniques } = await checkIfUsed(id);
    
    if (isUsed) {
      setUsageDetails({
        message: `Attention: cet élément est utilisé par ${details}. La modification est désactivée.`,
        posteTechniques
      });
      setShowUsageModal(true);
      return;
    }
    
    setEditingId(id);
    setEditingValue(currentName);
    setEditingCode(currentCode || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingValue("");
    setEditingCode("");
  }

  function getCurrentData() {
    switch (activeTab) {
      case "sites":
        return sites;
      case "domaines":
        return domaines;
      case "lots":
        return lots;
      case "secteurs":
        return secteurs;
    }
  }

  function getTabIcon(tab: TabType) {
    switch (tab) {
      case "sites":
        return <Building2 size={20} />;
      case "domaines":
        return <MapPin size={20} />;
      case "lots":
        return <Package size={20} />;
      case "secteurs":
        return <Grid3x3 size={20} />;
    }
  }

  function getTabLabel(tab: TabType) {
    switch (tab) {
      case "sites":
        return "Sites";
      case "domaines":
        return "Domaines";
      case "lots":
        return "Lots";
      case "secteurs":
        return "Secteurs";
    }
  }

  const currentData = getCurrentData();

  // Debug
  console.log("Active Tab:", activeTab);
  console.log("Current Data:", currentData);
  console.log("Sites:", sites.length, "Domaines:", domaines.length, "Lots:", lots.length, "Secteurs:", secteurs.length);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Configuration des Machines
        </h1>
        <p className="text-slate-600">
          Gérez les sites, domaines, lots et secteurs de vos machines
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="border-b border-slate-200">
          <div className="flex overflow-x-auto">
            {(["sites", "domaines", "lots", "secteurs"] as TabType[]).map((tab) => {
              const tabData = tab === "sites" ? sites : tab === "domaines" ? domaines : tab === "lots" ? lots : secteurs;
              
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? "text-[#f15c00] border-b-2 border-[#f15c00]"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  {getTabIcon(tab)}
                  {getTabLabel(tab)}
                  <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                    {tabData.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Add New Item */}
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Code..."
              value={newItemCode}
              onChange={(e) => setNewItemCode(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAdd()}
              className="w-32 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent"
            />
            <input
              type="text"
              placeholder={
                activeTab === "domaines" || activeTab === "secteurs"
                  ? "Libellé..." 
                  : `Nom du ${getTabLabel(activeTab).toLowerCase().slice(0, -1)}...`
              }
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent"
            />
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-6 py-2 bg-[#f15c00] text-white rounded-lg hover:bg-[#d14d00] transition-colors"
            >
              <Plus size={20} />
              Ajouter
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f15c00] mx-auto"></div>
              <p className="text-slate-600 mt-2">Chargement...</p>
            </div>
          ) : currentData.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 mb-2">{getTabIcon(activeTab)}</div>
              <p className="text-slate-600">Aucun élément trouvé</p>
              <p className="text-slate-500 text-sm mt-1">
                Ajoutez votre premier {getTabLabel(activeTab).toLowerCase().slice(0, -1)}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentData.map((item) => {
                const usageCount = usageCounts[item.id] || 0;
                const isUsed = usageCount > 0;
                const hasCode = "code" in item;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-4 bg-white border rounded-lg transition-all ${
                      isUsed
                        ? "border-amber-200 bg-amber-50/30"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {editingId === item.id ? (
                      <>
                        <div className="flex gap-2 flex-1">
                          {hasCode && (
                            <input
                              type="text"
                              value={editingCode}
                              onChange={(e) => setEditingCode(e.target.value)}
                              onKeyPress={(e) => e.key === "Enter" && handleUpdate(item.id)}
                              placeholder="Code"
                              className="w-32 px-3 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent"
                            />
                          )}
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleUpdate(item.id)}
                            placeholder="Nom"
                            className="flex-1 px-3 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent"
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={() => handleUpdate(item.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Enregistrer"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="Annuler"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 flex-1">
                          {hasCode && (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono font-medium">
                              {(item as any).code}
                            </span>
                          )}
                          <span className="text-slate-800 font-medium">
                            {activeTab === "domaines" || activeTab === "secteurs" 
                              ? (item as Domaine | Secteur).libelle 
                              : item.nom}
                          </span>
                          {isUsed && (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                              Utilisé ({usageCount})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(
                              item.id, 
                              activeTab === "domaines" || activeTab === "secteurs"
                                ? (item as Domaine | Secteur).libelle 
                                : item.nom,
                              hasCode ? (item as any).code : undefined
                            )}
                            disabled={isUsed}
                            className={`p-2 rounded-lg transition-all ${
                              isUsed
                                ? "text-slate-400 cursor-not-allowed opacity-50"
                                : "text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                            }`}
                            title={isUsed ? "Impossible de modifier (élément utilisé)" : "Modifier"}
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={isUsed}
                            className={`p-2 rounded-lg transition-all ${
                              isUsed
                                ? "text-slate-400 cursor-not-allowed opacity-50"
                                : "text-slate-600 hover:text-red-600 hover:bg-red-50"
                            }`}
                            title={isUsed ? "Impossible de supprimer (élément utilisé)" : "Supprimer"}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de détails d'utilisation */}
      {showUsageModal && usageDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col" style={{ maxHeight: '85vh' }}>
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  {usageDetails.message.includes('Impossible') ? '⚠️ Suppression impossible' : '⚠️ Modification désactivée'}
                </h3>
                <button
                  onClick={() => setShowUsageModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800">
                  {usageDetails.message}
                </p>
              </div>

              {usageDetails.posteTechniques && usageDetails.posteTechniques.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Postes techniques concernés ({usageDetails.posteTechniques.length}) :
                  </h4>
                  <div className="space-y-2">
                    {usageDetails.posteTechniques.map((pt) => (
                      <div
                        key={pt.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <MapPin size={16} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{pt.code_pt}</p>
                          <p className="text-xs text-gray-500">ID: {pt.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => setShowUsageModal(false)}
                className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
