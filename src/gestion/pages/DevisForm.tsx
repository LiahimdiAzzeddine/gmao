import { useState, useEffect } from 'react';
import { Save, X, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Ligne, Interlocuteur, Emetteur, ClientDevisInsert, Contact, Monetaire, ValidityNote } from '../../types/devis';
import DevisInfosGenerales from '../components/DevisInfosGenerales';
import DevisPeriode from '../components/DevisPeriode';
import DevisLignes from '../components/DevisLignes';
import { useNavigate, useParams } from 'react-router-dom';
import DevisValidityNotes from '../components/DevisValidityNotes';

export default function DevisForm() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const [interlocuteurs, setInterlocuteurs] = useState<Interlocuteur[]>([]);
  const [emetteurs, setEmetteurs] = useState<Emetteur[]>([]);
  const [clients, setClients] = useState<ClientDevisInsert[]>([]);
  const [domaines, setDomaines] = useState<any[]>([]);
  const [monetaires, setMonetaires] = useState<Monetaire[]>([]);
  const [contactOptions, setContactOptions] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [symbol, setSymbol] = useState('DH');
  const [validityNotes, setValidityNotes] = useState<ValidityNote[]>([
    {
      contenu: "✓ Devis valable 15 jours à compter de la date d'émission",
      ordre: 1,
    },
  ]);

  const [formData, setFormData] = useState({
    numDevis: '',
    emetteur: null as number | null,
    client_devis_id: null as number | null,
    contact_num: null as number | null,
    designation: '',
    ht_ttc: 'HT' as 'HT' | 'TTC',
    kgMO: 1,
    kgMAT: 1,
    monetaire_id: null as number | null,
    statut: 'en_attente' as '' | 'en_attente' | 'en_cours' | 'facturé' | 'annule'|'accepte'|'payé'|'terminé',
    type_devis_id: 1 as number | null,
    domaine_id: null as number | null,
    date_devis: '',
    lignes: [{
      materiel: '',
      quantite: '',
      prix: '',
      type: 'materiel' as 'materiel' | 'main_oeuvre',
      unite: '',
      ordre: 1,
    }]
  });

  useEffect(() => {
    loadReferenceData();
    if (isEditMode && id) {
      loadDevisData(id);
    } else {
      fetchNextNumDevis();
    }
  }, [id, isEditMode]);

  const loadDevisData = async (devisId: string) => {
    setLoadingData(true);
    try {
      // Charger les données du devis
      const { data: devisData, error: devisError } = await supabase
        .from('devis')
        .select('*')
        .eq('id', devisId)
        .single();

      if (devisError) throw devisError;

      // Charger les lignes du devis
      const { data: lignesData, error: lignesError } = await supabase
        .from('devis_lignes')
        .select('*')
        .eq('devis_id', devisId)
        .order('ordre');
        
      if (lignesError) throw lignesError;
     

      const { data: notesData } = await supabase
        .from("validity_notes")
        .select("*")
        .eq("devis_id", devisId)
        .order("ordre");

      setValidityNotes(notesData && notesData.length > 0 ? notesData : [
        {
          contenu: "✓ Devis valable 15 jours à compter de la date d'émission",
          ordre: 1,
        },
      ]);

      // Mettre à jour le formulaire
      setFormData({
        numDevis: devisData.num_devis || '',
        emetteur: devisData.emetteur_id,
        ht_ttc: devisData.ht_ttc || 'HT',
        date_devis: devisData.date_devis || '',
        client_devis_id: devisData.client_devis_id,
        contact_num: devisData.contact_num ? parseInt(devisData.contact_num) : null,
        designation: devisData.designation || '',
        kgMO: devisData.kg_mo || 1,
        kgMAT: devisData.kg_mat || 1,
        statut: devisData.statut || 'en_attente',
        monetaire_id: devisData.monetaire_id,
        type_devis_id: devisData.type_devis_id,
        domaine_id: devisData.domaine_id,
        lignes: lignesData && lignesData.length > 0
          ? lignesData.map(l => ({
            materiel: l.materiel || '',
            quantite: String(l.quantite || ''),
            prix: String(l.prix || 0),
            type: l.type || 'materiel',
            unite: l.unite || '',
            ordre: l.ordre || 1,
          }))
          : [{
            materiel: '',
            quantite: '',
            prix: '',
            type: 'materiel' as 'materiel' | 'main_oeuvre',
            unite: '',
          }]
      });
    } catch (err: any) {
      setError('Erreur lors du chargement du devis: ' + (err.message || 'Erreur inconnue'));
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchNextNumDevis = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_next_num_devis');

      if (error) {
        console.error('Erreur récupération numéro devis:', error);
        return;
      }

      if (data) {
        setFormData(prev => ({
          ...prev,
          numDevis: data as string
        }));
      }
    } catch (err: any) {
      console.error('Erreur fetchNextNumDevis:', err);
    }
  };

  const loadReferenceData = async () => {
    setLoadingData(true);
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients_devis')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      setClients(clientsData || []);

      const { data: domainesData, error: domainesError } = await supabase
        .from('domaines_activite')
        .select('*');
      if (domainesError) throw domainesError;
      setDomaines(domainesData || []);

      const { data: interlocuteursData, error: interlocuteursError } = await supabase
        .from('interlocuteurs')
        .select('id, interlocuteur')
        .order('interlocuteur');

      if (interlocuteursError) throw interlocuteursError;

      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*');
      if (contactsError) throw contactsError;

      const { data: emetteursData, error: emetteursError } = await supabase
        .from('emetteurs')
        .select('id, nom')
        .order('nom');

      if (emetteursError) throw emetteursError;

      const { data: monetairesData, error: monetairesError } = await supabase
        .from('monetaire')
        .select('*');
      if (monetairesError) throw monetairesError;

      setMonetaires(monetairesData || []);
      setInterlocuteurs(interlocuteursData || []);
      setEmetteurs(emetteursData || []);
      setContactOptions(contactsData || []);

      if (!isEditMode && emetteursData && emetteursData.length > 0) {
        setFormData(prev => ({
          ...prev,
          emetteur: emetteursData[0].id
        }));
      }
    } catch (err: any) {
      setError('Erreur lors du chargement des données: ' + (err.message || 'Erreur inconnue'));
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const calculateTotal = () => {
    const materielPourcentage = formData.kgMAT;
    const mainOeuvrePourcentage = formData.kgMO;

    return formData.lignes.reduce((total, ligne) => {
      const quantite = parseFloat(ligne.quantite) || 0;
      const prix = parseFloat(ligne.prix) || 0;
      const type = ligne.type;

      if (type === 'materiel') {
        return total + (quantite * prix * materielPourcentage);
      } else {
        return total + (quantite * prix * mainOeuvrePourcentage);
      }
    }, 0);
  };

  const updateLigne = (index: number, field: keyof Ligne, value: string) => {
    const newLignes = [...formData.lignes];
    newLignes[index] = {
      ...newLignes[index],
      [field]: value
    };
    setFormData({ ...formData, lignes: newLignes });
  };
    const reorderLignes = (startIdx: number, endIdx: number) => {
  const newLignes = [...formData.lignes];
  const [movedItem] = newLignes.splice(startIdx, 1);
  newLignes.splice(endIdx, 0, movedItem);
  setFormData({ ...formData, lignes: newLignes });
};


  const addLigne = (type?: string) => {
    const ligneType = (type || 'materiel') as 'materiel' | 'main_oeuvre';

    setFormData({
      ...formData,
      lignes: [
        ...formData.lignes,
        {
          materiel: '',
          quantite: '',
          prix: '',
          type: ligneType,
          unite: ligneType === 'materiel' ? '' : '-',
          ordre: formData.lignes.length + 1,
        }
      ]
    });
  };

  const removeLigne = (index: number) => {
    if (formData.lignes.length > 1) {
      const newLignes = formData.lignes.filter((_, idx) => idx !== index);
      setFormData({ ...formData, lignes: newLignes });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    if (!formData.numDevis || !formData.client_devis_id) {
      setError('Numéro de devis et Client sont obligatoires');
      setLoading(false);
      return;
    }
    if (!formData.domaine_id) {
      setError('Le champ Domaine est obligatoire');
      setLoading(false);
      return;
    }
    if (!formData.monetaire_id) {
      setError('Le champ Monétaire est obligatoire');
      setLoading(false);
      return;
    }
    const lignesFiltered = formData.lignes.filter(l => l.materiel.trim());
    if (lignesFiltered.length === 0) {
      setError('Au moins une ligne de devis avec un matériel est requise');
      setLoading(false);
      return;
    }

    try {
      const devisData = {
        num_devis: formData.numDevis,
        emetteur_id: formData.emetteur || null,
        client_devis_id: formData.client_devis_id,
        contact_num: formData.contact_num || null,
        designation: formData.designation || null,
        kg_mo: formData.kgMO,
        kg_mat: formData.kgMAT,
        domaine_id: formData.domaine_id,
        type_devis_id: formData.type_devis_id,
        ht_ttc: formData.ht_ttc,
        statut: formData.statut || 'en_attente',
        date_devis: formData.date_devis || new Date().toISOString(),
        monetaire_id: formData.monetaire_id,
      };

      let devisInserted;

      if (isEditMode && id) {
        // Mode édition : UPDATE
        const { data, error: devisError } = await supabase
          .from('devis')
          .update(devisData)
          .eq('id', id)
          .select()
          .single();

        if (devisError) throw devisError;
        devisInserted = data;

        // Supprimer les anciennes lignes
        const { error: deleteLignesError } = await supabase
          .from('devis_lignes')
          .delete()
          .eq('devis_id', id);

        if (deleteLignesError) throw deleteLignesError;

        const { error: deleteNotesError } = await supabase
          .from("validity_notes")
          .delete()
          .eq("devis_id", id);

        if (deleteNotesError) throw deleteNotesError;

      } else {
        // Mode création : INSERT
        const { data, error: devisError } = await supabase
          .from('devis')
          .insert([devisData])
          .select()
          .single();

        if (devisError) throw devisError;
        devisInserted = data;
      }

      if (!devisInserted) {
        throw new Error('Erreur lors de la sauvegarde du devis');
      }

      // Insérer les nouvelles lignes
      const lignesData = lignesFiltered.map((l, idx) => ({
        devis_id: devisInserted.id,
        materiel: l.materiel,
        quantite: parseInt(l.quantite) || 0,
        prix: parseFloat(l.prix) || 0,
        ordre: idx + 1,
        type: l.type,
        unite: l.unite,
      }));

      const { error: lignesError } = await supabase
        .from('devis_lignes')
        .insert(lignesData);

      if (lignesError) throw lignesError;

      if (validityNotes.length > 0) {
        const notesData = validityNotes
          .filter(n => n.contenu.trim())
          .map((n, i) => ({
            devis_id: devisInserted.id,
            contenu: n.contenu,
            ordre: i + 1,
          }));

        if (notesData.length > 0) {
          const { error: notesError } = await supabase
            .from("validity_notes")
            .insert(notesData);

          if (notesError) throw notesError;
        }
      }

      setSuccess(isEditMode ? 'Devis modifié avec succès !' : 'Devis créé avec succès !');

      setTimeout(() => {
        navigate('/gestion/devis/' + devisInserted.id + '/pdf');
      }, 1500);

    } catch (err: any) {
      setError('Erreur lors de la sauvegarde: ' + (err.message || 'Erreur inconnue'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (isEditMode && id) {
      loadDevisData(id);
    } else {
      setFormData({
        numDevis: '',
        ht_ttc: 'HT',
        emetteur: null,
        client_devis_id: null,
        contact_num: null,
        designation: '',
        date_devis: '',
        kgMO: 1,
        kgMAT: 1,
        statut: 'en_attente',
        monetaire_id: null,
        type_devis_id: 1,
        domaine_id: null,
        lignes: [{
          materiel: '',
          quantite: '',
          prix: '',
          type: 'materiel',
          unite: '',
          ordre: 1,
        }]
      });
      setValidityNotes([
        {
          contenu: "✓ Devis valable 15 jours à compter de la date d'émission",
          ordre: 1,
        },
      ]);
      fetchNextNumDevis();
    }
    setSuccess('');
    setError('');
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Modifier le Devis' : 'Nouveau Devis'}
            </h1>
            <p className="text-gray-600">
              {isEditMode ? 'Modifier un devis existant' : 'Créer un devis détaillé pour un client'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="text-red-800 font-medium">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg shadow-sm">
          <span className="text-green-800 font-medium">{success}</span>
        </div>
      )}

      {/* Formulaire principal */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-orange-100">
        {/* Section 1: Informations générales */}
        <DevisInfosGenerales
          formData={formData}
          setFormData={setFormData}
          contactOptions={contactOptions}
          clients={clients}
          monetaires={monetaires}
          interlocuteurs={interlocuteurs}
          emetteurs={emetteurs}
          setSymbol={setSymbol}
          domaines={domaines}
        />

        {/* Section 2: Période */}
        <DevisPeriode
          formData={formData}
          setFormData={setFormData}
        />

        {/* Section 4: Désignation */}
        <div className="p-6 bg-white border-b border-orange-100">
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Désignation générale
          </label>
          <textarea
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={3}
            placeholder="Description générale du devis..."
          />
        </div>

        {/* Section 5: Lignes de devis */}
        <div className="p-6 bg-orange-50 border-b border-orange-100">
          <DevisLignes
            lignes={formData.lignes}
            addLigne={addLigne}
            updateLigne={updateLigne}
            removeLigne={removeLigne}
            calculateTotal={calculateTotal}
            monetaires={monetaires}
reorderLignes ={reorderLignes}
            formData={formData}
          />
        </div>

        <div className="p-6 bg-white border-b border-white-100">
          <DevisValidityNotes
            notes={validityNotes}
            setNotes={setValidityNotes}
          />
        </div>

        {/* Actions */}
        <div className="p-6 bg-white border-t border-orange-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Sauvegarde...' : isEditMode ? 'Enregistrer les modifications' : 'Sauvegarder le devis'}
            </button>

            <button
              onClick={resetForm}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <X className="w-5 h-5" />
              {isEditMode ? 'Annuler les modifications' : 'Réinitialiser'}
            </button>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Total HT</div>
            <div className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              {calculateTotal().toFixed(2)} {symbol}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}