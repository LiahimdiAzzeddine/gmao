import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Loader2, ArrowLeft, FileCheck, Package, Eye, X, Menu, User, Calendar, Building2, CheckCircle } from 'lucide-react';
import { handleGenerateBL, BLPDFPreview } from '../../utils/generateBLPdf';
import { handleGeneratePDF, DevisPDFPreview } from '../../utils/generateDeviPDF';
import { handleGenerateFacture, FacturePDFPreview } from '../../utils/generateFacturePDF';
import { supabase } from '../../lib/supabase';
import { PDFViewer } from '@react-pdf/renderer';
import Sidebar from '../components/Sidebar';
import { Devis, DevisLigne } from '../../types/devis';
import DevisLignesResume from '../components/DevisLignesResume';
import DocumentActionCard from '../components/DocumentActionCard';
import FactureBLInfo from '../components/FactureBLInfo';
import { calculateTotalHT } from '../../utils/gestionMethode';


type PreviewType = 'devis' | 'bl' | 'facture' | null;
const getStatutLabel = (statut: string) => {
  const labels = {
    en_attente: "En attente",
    accepte: "Accepté",
    en_cours: "En cours",
    terminé: "Terminé",
    facturé: "Facturé",
    annule: "Annulé",
    payé: "Payé",
  };
  return labels[statut as keyof typeof labels] || statut;
};
const getStatutColor = (statut: string) => {
  const colors = {
    'en_attente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'accepte': 'bg-green-100 text-green-800 border-green-200',
    'en_cours': 'bg-blue-100 text-blue-800 border-blue-200',
    'terminé': 'bg-red-100 text-red-800 border-red-200',
    'facturé': 'bg-blue-100 text-blue-800 border-blue-200',
    'annule': 'bg-gray-100 text-gray-800 border-gray-200',
    'payé': 'bg-green-100 text-green-800 border-green-200',
  };
  return colors[statut] || 'bg-gray-100 text-gray-800 border-gray-200';
};
export default function PDFGeneratorPage() {
  const { devisId } = useParams<{ devisId: string }>();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<string>('devis-liste');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [devisData, setDevisData] = useState<Devis | null>(null);
  const [afficherTTC, setAfficherTTC] = useState(false);
  const [previewType, setPreviewType] = useState<PreviewType>(null);

  const [showBLPopup, setShowBLPopup] = useState(false);
  const [showFacturePopup, setShowFacturePopup] = useState(false);
  const [existingBL, setExistingBL] = useState<any>(null);
  const [existingFacture, setExistingFacture] = useState<any>(null);
  const [creatingBL, setCreatingBL] = useState(false);
  const [creatingFacture, setCreatingFacture] = useState(false);
  const [updateingDocument, setUpdatingDocument] = useState(false);

  const [blForm, setBLForm] = useState({
    chantier_code: '',
    commentaire: '',
    numero_commande: ''
  });

  const [factureForm, setFactureForm] = useState({
    date_facture: new Date().toISOString().split('T')[0],
    date_echeance: '',
    methode_paiement: ''
  });

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNavigate = (view: string) => {
    if (view === 'devis-liste') {
      navigate('/gestion/devis-liste');
    } else {
      navigate(`/gestion/${view}`);
    }
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    if (devisId) {
      fetchDevisData();
    } else {
      setError('ID de devis manquant');
      setLoading(false);
    }
  }, [devisId, updateingDocument]);

  const fetchDevisData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: devis, error: devisError } = await supabase
        .from('devis')
        .select(`
          *,
          clients_devis:client_devis_id (*),
          contact:contact_num (*),
          emetteur:emetteur_id (*),
          monetaire:monetaire_id (*),
          bons_livraison:bons_livraison (*),
          factures:factures (*),
          chantiers:chantiers (*),
          validity_notes:validity_notes (*),
          lignes:devis_lignes!devis_id (*)
        `)
        .eq('id', devisId)
        .single();

      if (devisError) throw devisError;


     
      if (!devis) {
        throw new Error('Devis non trouvé');
      }

      if (devis.lignes && Array.isArray(devis.lignes)) {
        devis.lignes.sort((a: DevisLigne, b: DevisLigne) => (a.ordre ?? 0) - (b.ordre ?? 0));
      }

      setDevisData(devis as Devis);
      setAfficherTTC(devis?.ht_ttc === 'TTC');
      setBLForm(prev => ({
  ...prev,
  chantier_code: devis.chantiers?.code || ''
}));


      await checkExistingBL(devis.id);
      await checkExistingFacture(devis.id);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des données:', err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingBL = async (devisIdValue: number) => {
    try {
      const { data, error } = await supabase
        .from('bons_livraison')
        .select('*')
        .eq('devis_id', devisIdValue)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setExistingBL(data);
    } catch (err) {
      console.error('Erreur lors de la vérification du BL:', err);
    }
  };

  const checkExistingFacture = async (devisIdValue: number) => {
    try {
      const { data, error } = await supabase
        .from('factures')
        .select('*')
        .eq('devis_id', devisIdValue)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setExistingFacture(data);
    } catch (err) {
      console.error('Erreur lors de la vérification de la facture:', err);
    }
  };

  const handleCreateBL = async () => {
    if (!devisData ) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }

    try {
      setCreatingBL(true);

      const { data: blData, error: blError } = await supabase
        .from('bons_livraison')
        .insert({
          devis_id: devisData.id,
          chantier_code: blForm.chantier_code,
          numero_commande: blForm.numero_commande,
          commentaire: blForm.commentaire || null,
          receptionne: false
        })
        .select()
        .single();

      if (blError) throw blError;

      const { error: updateError } = await supabase
        .from('devis')
        .update({ statut: 'terminé' })
        .eq('id', devisData.id);

      if (updateError) throw updateError;

      setExistingBL(blData);
      setShowBLPopup(false);
      setBLForm({ chantier_code: '', commentaire: '', numero_commande: '' });

      await fetchDevisData();

      alert('Bon de livraison créé avec succès');
    } catch (err: any) {
      console.error('Erreur lors de la création du BL:', err);
      alert(err.message || 'Erreur lors de la création du bon de livraison');
    } finally {
      setCreatingBL(false);
    }
  };

  const handleCreateFacture = async () => {
    if (!devisData || !factureForm.date_facture) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }

    try {
      setCreatingFacture(true);

      const { data: factureData, error: factureError } = await supabase
        .from('factures')
        .insert({
          devis_id: devisData.id,
          date_facture: factureForm.date_facture,
          date_echeance: factureForm.date_echeance || null,
          methode_paiement: factureForm.methode_paiement || null,
          statut: 'brouillon'
        })
        .select()
        .single();

      if (factureError) throw factureError;

      const { error: updateError } = await supabase
        .from('devis')
        .update({ statut: 'facturé' })
        .eq('id', devisData.id);

      if (updateError) throw updateError;

      setExistingFacture(factureData);
      setShowFacturePopup(false);
      setFactureForm({
        date_facture: new Date().toISOString().split('T')[0],
        date_echeance: '',
        methode_paiement: ''
      });

      await fetchDevisData();

      alert('Facture créée avec succès');
    } catch (err: any) {
      console.error('Erreur lors de la création de la facture:', err);
      alert(err.message || 'Erreur lors de la création de la facture');
    } finally {
      setCreatingFacture(false);
    }
  };

  const prepareDevisData = () => {
    if (!devisData) return null;

    return {
      id: devisData.id,
      num_devis: devisData.num_devis,
      date_devis: devisData.date_devis,
      kg_mo: devisData.kg_mo,
      kg_mat: devisData.kg_mat,
      client_devis_id: devisData.client_devis_id,
      designation: devisData.designation,
      chantier: existingBL ? existingBL.chantier_code : null,
      numero_commande_client: 'N/A',
      clients_devis: devisData.clients_devis,
      contact: devisData.contact || '',
      emetteur: devisData.emetteur,
      lignes: devisData.lignes || [],
      afficher_ttc: afficherTTC,
      created_at: devisData.date_devis,
      monetaire: devisData.monetaire || null,
      validity_notes: devisData.validity_notes || [],
    };
  };

  const prepareBLData = () => {
    if (!devisData) return null;
    let mainOeuvreLignesNumber = 0;

    if (devisData.lignes) {
      mainOeuvreLignesNumber = devisData.lignes
        .filter(ligne => ligne.type === "main d'oeuvre")
        .reduce((total, ligne) => {
          return total + (Number(ligne.quantite) || 0);
        }, 0);
    }


    return {
      id: devisData.bons_livraison?.[0]?.numero_bl || 'N/A',
      numero: devisData.num_devis,
      date_bl: devisData.date_devis || new Date().toISOString().split('T')[0],
      numero_commande: devisData.bons_livraison?.[0]?.numero_commande || 'N/A',
      main_oeuvre_total: mainOeuvreLignesNumber,
      reserve:devisData.bons_livraison?.[0]?.commentaire || '',
      client: {
        nom: devisData.clients_devis?.client || 'N/A',
        adresse: devisData.contact?.adresse || '',
        site: devisData.clients_devis?.client || 'N/A',
        telephone: devisData.contact?.tel || '',
        ice: devisData.clients_devis?.ice || ''
      },
      contact: devisData.contact?.nom || '',
      designation: devisData.designation,
      chantier: devisData.bons_livraison?.[0]?.chantier_code || 'N/A',
      bc_numero: 'N/A',
      emetteur: devisData.emetteur,
      lignes: devisData.lignes?.map(ligne => ({
        reference: '',
        designation: ligne.materiel,
        quantite: ligne.quantite
      })) || []
    };
  };

  const prepareFactureData = () => {
    if (!devisData) return null;

    const factures = Array.isArray(devisData.factures) ? devisData.factures : [];



    return {
      num_facture: factures[0]?.numero_facture || 'N/A',
      date_facture: factures[0]?.date_facture || new Date().toISOString().split('T')[0],
      date_echeance: factures[0]?.date_echeance || null,
      kg_mat: devisData.kg_mat,
      kg_mo: devisData.kg_mo,
      designation: devisData.designation || '',
      monetaire: devisData.monetaire || null,
      adresse_facturation: devisData.contact?.adresse_facturation || null,
      client: {
        nom: devisData.clients_devis?.client || 'N/A',
        ice: devisData.clients_devis?.ice || 'N/A',
        adresse: devisData.contact?.adresse || 'N/A',
        site: devisData.clients_devis?.client || null,
        telephone: devisData.contact?.tel || null,
        numero_fournisseur: devisData.clients_devis?.numero_fournisseur || null
      },
      contact: devisData.contact || null,
      telephone: devisData.contact?.tel || '',
      commande_numero: devisData.bons_livraison?.[0]?.numero_commande || 'N/A',
      payment_mode: factures?.[0]?.methode_paiement || 'N/A',
      emetteur: {
        nom: devisData.emetteur?.nom || 'N/A',
        adresse: devisData.emetteur?.adresse || 'N/A'
      },
      ref_cc: existingBL ? existingBL.chantier_code : null,
      lignes: devisData.lignes?.map(ligne => ({
        
        designation: ligne.materiel,
        quantite: ligne.quantite,
        type: ligne.type,
        prix_unit: Number(ligne.prix),
        total: Number(ligne.quantite) * Number(ligne.prix)
      })) || []
    };
  };

  const handleGenerateDevisPDF = () => {
    const data = prepareDevisData();
    if (!data) return;
    handleGeneratePDF(data as any, afficherTTC);
  };

  const handleBLAction = (action: 'preview' | 'download', skip: boolean = false) => {
    if (!existingBL && !skip) {
      setShowBLPopup(true);
      return;
    }

    if (action === 'preview') {
      setPreviewType('bl');
    } else {
      const data = prepareBLData();
      if (data) handleGenerateBL(data as any);
    }
  };

  const handleFactureAction = (action: 'preview' | 'download', skip: boolean = false) => {
    if (!existingFacture && !skip) {
      setShowFacturePopup(true);
      return;
    }

    if (action === 'preview') {
      setPreviewType('facture');
    } else {
      const data = prepareFactureData();
      if (data) handleGenerateFacture(data as any, afficherTTC);
    }
  };

  const calculateTotal = () => {
    if (!devisData?.lignes) return 0;
    return devisData.lignes.reduce((sum, ligne) => sum + (Number(ligne.quantite) * Number(ligne.prix)), 0);
  };
  const renderPreview = () => {
    if (!previewType) return null;

    let PreviewComponent;
    let data;
    let previewProps;

    switch (previewType) {
      case "devis":
        PreviewComponent = DevisPDFPreview;
        data = prepareDevisData();
        previewProps = { devis: data, afficherTTC };
        break;

      case "bl":
        PreviewComponent = BLPDFPreview;
        data = prepareBLData();
        previewProps = { bl: data };
        break;

      case "facture":
        PreviewComponent = FacturePDFPreview;
        data = prepareFactureData();
        previewProps = { facture: data, afficherTTC };
        break;

      default:
        return null;
    }

    if (!data) return null;




    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">

          {/* HEADER */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              Prévisualisation –{" "}
              {previewType === "devis"
                ? "Devis"
                : previewType === "bl"
                  ? "Bon de livraison"
                  : "Facture"}
            </h2>

            <div className="flex items-center gap-4">


              {/* Close */}
              <button
                type="button"
                onClick={() => setPreviewType(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Fermer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* PDF */}
          <div className="flex-1 overflow-hidden">
            <PDFViewer
              width="100%"
              height="100%"
              showToolbar={false}
              key={`${previewType}-${afficherTTC}`}
            >
              <PreviewComponent  {...previewProps} />
            </PDFViewer>
          </div>
        </div>
      </div>
    );
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-red-500 text-center mb-4">
            <FileText className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Erreur</h2>
            <p className="text-gray-600">{error}</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  if (!devisData) {
    return null;
  }

  let total = calculateTotalHT(devisData);
  let Budget=total;
  total=devisData.ht_ttc==="TTC"? total*1.2 : total;
  

  const canAccessBL = devisData?.statut === 'en_cours' || devisData?.statut === 'facturé' || devisData?.statut === 'terminé'|| devisData?.statut=="payé";
  const canAccessFacture =  devisData?.statut === 'facturé' || devisData?.statut === 'payé' || devisData?.statut === 'terminé';


  const renderBLPopup = () => {
    if (!showBLPopup) return null;

    // Styles personnalisés pour react-select
    const customStyles = {
      control: (base: any) => ({
        ...base,
        backgroundColor: 'white',
        borderColor: '#d1d5db',
        borderRadius: '0.5rem',
        padding: '0.125rem',
        boxShadow: 'none',

        '&:hover': {
          borderColor: '#9ca3af',
        },
        '&:focus-within': {
          borderColor: '#3b82f6',
          boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
        },
      }),
      menu: (base: any) => ({
        ...base,
        borderRadius: '0.5rem',
        marginTop: '0.25rem',
        zIndex: 99999, // Augmenté
      }),
      menuPortal: (base: any) => ({
        ...base,
        zIndex: 99999 // Ajouté pour le portal
      }),
      option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected
          ? '#3b82f6'
          : state.isFocused
            ? '#dbeafe'
            : 'white',
        color: state.isSelected ? 'white' : '#1f2937',
        '&:active': {
          backgroundColor: '#2563eb',
        },
      }),
    };
  


    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">Créer un bon de livraison</h2>
            <button
              onClick={() => setShowBLPopup(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Code chantier <span className="text-red-500">*</span>
              </label>
              <input                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 disabled  value={blForm.chantier_code}/>

            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Numéro de commande    </label>
              <input
                type="text"
                value={blForm.numero_commande}
                onChange={(e) => setBLForm({ ...blForm, numero_commande: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Numéro de commande"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Commentaire
              </label>
              <textarea
                value={blForm.commentaire}
                onChange={(e) => setBLForm({ ...blForm, commentaire: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Commentaire optionnel"
              />
            </div>
          </div>

          <div className="flex gap-3 p-4 border-t bg-gray-50">
            <button
              onClick={() => setShowBLPopup(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => { handleBLAction('preview', true), setShowBLPopup(false); }}
              className="flex-1 px-4 py-2 border border-green-300 rounded-lg hover:bg-green-100 transition-colors"
            >
              visulaiser
            </button>
            <button
              onClick={handleCreateBL}
              disabled={creatingBL || !blForm.chantier_code}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creatingBL ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };
  const renderFacturePopup = () => {
    if (!showFacturePopup) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">Créer une facture</h2>
            <button
              onClick={() => setShowFacturePopup(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2"> Methode de paiement </label>
              <input
                type="text"
                value={factureForm.methode_paiement}
                onChange={(e) => setFactureForm({ ...factureForm, methode_paiement: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date de facture <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={factureForm.date_facture}
                onChange={(e) => setFactureForm({ ...factureForm, date_facture: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date d'échéance
              </label>
              <input
                type="date"
                value={factureForm.date_echeance}
                onChange={(e) => setFactureForm({ ...factureForm, date_echeance: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="flex gap-3 p-4 border-t bg-gray-50">
            <button
              onClick={() => setShowFacturePopup(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => { handleFactureAction('preview', true), setShowFacturePopup(false); }}
              className="flex-1 px-4 py-2 border border-green-300 rounded-lg hover:bg-green-100 transition-colors"
            >
              visulaiser
            </button>
            <button
              onClick={handleCreateFacture}
              disabled={creatingFacture || !factureForm.date_facture}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creatingFacture ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleAcceptDevis = async () => {
    const { error } = await supabase
      .from("devis")
      .update({ statut: "accepte" })
      .eq("id", devisData.id);

    if (error) {
      console.error(error);
      alert("Erreur lors de l’acceptation du devis");
      return;
    }

    setUpdatingDocument(!updateingDocument);
  };

  return (

    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <button
        onClick={handleToggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-orange-600 text-white rounded-lg shadow-lg hover:bg-orange-700 transition-colors"
        aria-label="Toggle menu"
      >
        <Menu size={24} />
      </button>

      {/* Overlay pour mobile */}
      {isSidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={handleCloseSidebar}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        onToggle={handleToggleSidebar}
      />

      <main className={`
        flex-1 overflow-y-auto p-4 md:p-6 transition-all duration-300
        ${isMobile ? 'pt-16' : 'pt-6'}
      `}>
        {renderPreview()}
        {renderBLPopup()}
        {renderFacturePopup()}

        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 rounded-md">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-white/90 hover:text-white transition-all hover:gap-3"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Retour</span>
              </button>

              <div className="flex items-center gap-3 text-white">
                <FileText className="w-6 h-6" />
                <h1 className="text-2xl font-bold">
                  {devisData.num_devis}
                </h1>
              </div>

              {devisData.statut === "en_attente" && (
                <button
                  onClick={handleAcceptDevis}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-300 text-white rounded-lg hover:bg-green-400 transition-all shadow-lg hover:shadow-xl font-medium"
                >
                  <CheckCircle className="w-5 h-5" />
                  Accepter le devis
                </button>
              )}

              {devisData.statut !== "en_attente" && <div className="w-32" />}
            </div>
          </div>

          {/* Informations du devis */}
          <div className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Statut */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="font-medium">Statut</span>
                </div>
                <div className="flex items-center">
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold border ${getStatutColor(devisData.statut)}`}>
                    {getStatutLabel(devisData.statut) || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Client */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">Client</span>
                </div>
                <p className="text-gray-900 font-semibold text-lg truncate">
                  {devisData.clients_devis?.client || 'N/A'}
                </p>
              </div>

              {/* Contact */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Contact</span>
                </div>
                <p className="text-gray-900 font-semibold text-lg truncate">
                  {devisData.contact?.nom || '-'}
                </p>
              </div>

              {/* Date */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Date</span>
                </div>
                <p className="text-gray-900 font-semibold text-lg">
                  {devisData.date_devis
                    ? new Date(devisData.date_devis).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Options de génération */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DocumentActionCard
              title="Devis"
              description="Générer le devis au format PDF avec toutes les informations"
              icon={<FileText className="w-6 h-6 text-orange-600" />}
              canAccess={true}
              onPreview={() => setPreviewType("devis")}
              onDownload={handleGenerateDevisPDF}
              onEdit={() => navigate(`/gestion/devis/${devisId}/edit`)}
              downloadLabel="Télécharger le devis"
              colorClasses={{
                bgLight: "bg-orange-100",
                text: "text-orange-700",
                btnLight: "bg-orange-100 hover:bg-orange-200",
                btnSolid: "bg-orange-500 hover:bg-orange-600",
              }}
              infoBlock={
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  Conversion automatique du devis en PDF
                </div>
              }
            />

            {/* Bon de livraison */}
            <DocumentActionCard
              title="Bon de livraison"
              description="Générer le bon de livraison basé sur ce devis"
              icon={
                <Package
                  className={`w-6 h-6 ${canAccessBL ? "text-blue-600" : "text-gray-400"}`}
                />
              }
              canAccess={canAccessBL}
              onPreview={() => handleBLAction("preview")}
              onDownload={() => handleBLAction("download")}
              downloadLabel={existingBL ? "Télécharger le BL" : "Créer et télécharger"}
              colorClasses={{
                bgLight: "bg-blue-100",
                text: "text-blue-700",
                btnLight: "bg-blue-100 hover:bg-blue-200",
                btnSolid: "bg-blue-500 hover:bg-blue-600",
              }}
              infoBlock={
                !canAccessBL ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    Le bon de livraison n'est accessible que lorsque le devis est en statut "En attente"
                  </div>
                ) : existingBL ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    BL créé : {existingBL.numero_bl}
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    Créez d'abord un BL dans la base de données
                  </div>
                )
              }
            />

            {/* Facture */}
            <DocumentActionCard
              title="Facture"
              description="Générer la facture basée sur ce devis"
              icon={
                <FileCheck
                  className={`w-6 h-6 ${canAccessFacture ? "text-green-600" : "text-gray-400"}`}
                />
              }
              canAccess={canAccessFacture}
              onPreview={() => handleFactureAction("preview")}
              onDownload={() => handleFactureAction("download")}
              downloadLabel={
                existingFacture ? "Télécharger la facture" : "Créer et télécharger"
              }
              colorClasses={{
                bgLight: "bg-green-100",
                text: "text-green-700",
                btnLight: "bg-green-100 hover:bg-green-200",
                btnSolid: "bg-green-500 hover:bg-green-600",
              }}
              infoBlock={
                !canAccessFacture ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    La facture n'est accessible que lorsque le devis est en statut "En cours"
                  </div>
                ) : existingFacture ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    Facture créée : {existingFacture.numero_facture}
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    Créez d'abord une facture dans la base de données
                  </div>
                )
              }
            />
          </div>
          {devisId && (
            <FactureBLInfo
              devis_id={devisId ? parseInt(devisId) : 0}
              devis={devisData}
              facture={Array.isArray(devisData.factures) ? devisData.factures[0] : devisData.factures}
              bonLivraison={devisData.bons_livraison?.[0]}
              chantier={devisData.chantiers || null}
              total={Budget}
              onUpdate={() => setUpdatingDocument(prev => !prev)}
            />)}

          {/* Résumé des lignes */}
          {/* <DevisLignesResume
            lignes={devisData.lignes || []}
            total={total}
            kg_mat={devisData.kg_mat}
            kg_mo={devisData.kg_mo}
            symbol={devisData.monetaire?.symbol || 'DH'}
            afficherTTC={afficherTTC}
          /> */}
        </div>
      </main>
    </div>
  );
}