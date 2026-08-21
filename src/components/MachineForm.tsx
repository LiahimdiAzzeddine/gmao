import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase, Client } from '../lib/supabase';
import { Save, AlertCircle, Plus, X, Upload, ImageIcon, FileText, ExternalLink } from 'lucide-react';
import Select from 'react-select';
import { Domaine, PosteTechnique, Secteur, Site } from '../types/posteTechnique';
import SitePopup from './postetechnique/SitePopup';
import { MachineState, ALL_MACHINE_STATES, getMachineStateConfig, normalizeMachineState } from '../types/machineState';

type MachineFormData = {
  nom: string;
  modele: string;
  numero_serie: string;
  qte: number | undefined;
  annee: number;
  fabricant: string;
  etat: string;
  puissance: string;
  tension: string;
  manuel_url: string;
  image_url: string | null;
  client_id: string;
  poste_technique_id: string;
};


export default function MachineForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== 'new';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [machineImageFile, setMachineImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [machineDocumentFile, setMachineDocumentFile] = useState<File | null>(null);


  const [formData, setFormData] = useState<MachineFormData>({
    nom: '',
    modele: '',
    numero_serie: '',
    qte: 1,
    annee: new Date().getFullYear(),
    fabricant: '',
    etat: MachineState.EN_SERVICE,
    puissance: '',
    tension: '',
    manuel_url: '',
    image_url: null,
    client_id: '',
    poste_technique_id: '',
  });

  const [lots, setLots] = useState<{ id: string, nom: string }[]>([]);
  const [postesTechniques, setPostesTechniques] = useState<PosteTechnique[]>([]);
  
  // État pour la création de poste technique
  const [showCreatePoste, setShowCreatePoste] = useState(false);
  const [creatingPoste, setCreatingPoste] = useState(false);
  const [createPosteError, setCreatePosteError] = useState('');
  
  // Données pour la création de poste
  const [sites, setSites] = useState<Site[]>([]);
  const [domaines, setDomaines] = useState<Domaine[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
     const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleSiteCreated = (newSite: Site) => {
    setSites([...sites, newSite]);
    console.log('Nouveau site créé:', newSite);
  };
  
  const [newPosteData, setNewPosteData] = useState({
    site_id: '',
    domaine_id: '',
    lot_id: '',
    secteur_id: '',
    code_pt: '',
    batiment:'',
  });

  async function loadLots() {
    const { data } = await supabase
      .from('lots')
      .select('id, nom')
      .order('nom');

    if (data && data.length > 0) {
      setLots(data);

      if (!isEdit) {
        setFormData(prev => ({ ...prev, lot_id: data[0].id }));
      }
    }
  }

  async function loadPostesTechniques() {
    const { data, error } = await supabase
      .from('postes_techniques')
      .select(`
        id,
        code_pt,
        site_id,
        domaine_id,
        lot_id,
        secteur_id,
        sites (nom),
        batiment,
        domaines (libelle),
        lots (nom),
        secteurs (libelle)
      `)
      .order('code_pt');

    if (!error && data) {
      setPostesTechniques(data as PosteTechnique[]);
    }
  }

  async function loadReferenceData() {
    // Charger sites
    const { data: sitesData } = await supabase
      .from('sites')
      .select('*')
      .order('nom');
    if (sitesData) setSites(sitesData);

    // Charger domaines
    const { data: domainesData } = await supabase
      .from('domaines')
      .select('*')
      .order('code');
    if (domainesData) setDomaines(domainesData);

    // Charger secteurs
    const { data: secteursData } = await supabase
      .from('secteurs')
      .select('*')
      .order('code');
    if (secteursData) setSecteurs(secteursData);
  }

  useEffect(() => {
    loadClients();
    loadLots();
    loadPostesTechniques();
    loadReferenceData();
    if (isEdit) {
      loadMachine();
    }
  }, [id]);

  useEffect(() => {
    if (formData.image_url && !machineImageFile) {
      setPreviewImageUrl(formData.image_url);
    }
  }, [formData.image_url, machineImageFile]);

  useEffect(() => {
    return () => {
      if (previewImageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  async function loadClients() {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('prenom');

    if (data) {
      setClients(data);
    }
  }

  async function loadMachine() {
    if (!id || id === 'new') return;

    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      setFormData({
        nom: data.nom,
        modele: data.modele,
        numero_serie: data.numero_serie,
        annee: data.annee,
        qte: data.qte || undefined,
        fabricant: data.fabricant,
        etat: normalizeMachineState(data.etat),
        puissance: data.puissance || '',
        tension: data.tension || '',
        manuel_url: data.manuel_url || '',
        image_url: data.image_url || null,
        client_id: data.client_id || '',
        poste_technique_id: data.poste_technique_id || '',
      });
    }
  }

  function handleMachineImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez choisir un fichier image valide.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("L'image ne doit pas dÃ©passer 5 Mo.");
      return;
    }

    if (previewImageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewImageUrl);
    }

    setError('');
    setMachineImageFile(file);
    setPreviewImageUrl(URL.createObjectURL(file));
  }

  function removeMachineImage() {
    if (previewImageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewImageUrl);
    }

    setMachineImageFile(null);
    setPreviewImageUrl(null);
    setFormData(prev => ({ ...prev, image_url: null }));
  }

  async function uploadMachineImage(prefixId: string): Promise<string | null> {
    if (!machineImageFile) return formData.image_url;

    const ext = machineImageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `machines/machine_${prefixId}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('gmao-photos')
      .upload(fileName, machineImageFile, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('gmao-photos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  function handleMachineDocumentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('La documentation doit être un PDF ou une image JPG, PNG ou WebP.');
      e.target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('La documentation ne doit pas dépasser 15 Mo.');
      e.target.value = '';
      return;
    }

    setError('');
    setMachineDocumentFile(file);
  }

  async function uploadMachineDocument(prefixId: string): Promise<string | null> {
    if (!machineDocumentFile) return formData.manuel_url || null;

    const ext = machineDocumentFile.name.split('.').pop()?.toLowerCase() || 'pdf';
    const safeName = machineDocumentFile.name
      .replace(/\.[^/.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'documentation';
    const fileName = `machines/documentation/${prefixId}/${Date.now()}-${safeName}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('gmao-photos')
      .upload(fileName, machineDocumentFile, {
        contentType: machineDocumentFile.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('gmao-photos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }
const generateCodePT = () => {
  const site = sites.find(s => s.id === newPosteData.site_id);
  const domaine = domaines.find(d => d.id === newPosteData.domaine_id);
  const lot = lots.find(l => l.id === newPosteData.lot_id);
  
  if (!site || !domaine || !newPosteData.batiment || !lot || !formData.nom) {
    return '';
  }
  
  // Nettoyer et formater les codes
  const lotCode = lot.nom.replace(/\s+/g, '').replace(/[^A-Z0-9_]/gi, '').toUpperCase();
  const machineCode = formData.nom.replace(/\s+/g, '').replace(/[^A-Z0-9_]/gi, '').toUpperCase();
  
  return `${site.code}_${domaine.code}_${newPosteData.batiment.replace(/\s+/g, '').replace(/[^A-Z0-9_]/gi, '').toUpperCase()}_${lotCode}_${machineCode}`;
};

// 3. Dans handleCreatePoste, la validation devient :
async function handleCreatePoste(e: React.FormEvent) {
  e.preventDefault();
  setCreatingPoste(true);
  setCreatePosteError('');

  try {
    //const generatedCode = generateCodePT();
    
    // Validation - vérifier aussi formData.nom
    if (!newPosteData.site_id || !newPosteData.domaine_id || !newPosteData.lot_id || !newPosteData.batiment || !formData.nom) {
      throw new Error('Veuillez remplir tous les champs obligatoires, y compris le nom de la machine');
    }

    const posteData = {
      site_id: newPosteData.site_id,
      domaine_id: newPosteData.domaine_id,
      lot_id: newPosteData.lot_id,
      secteur_id: newPosteData.secteur_id || null,
      batiment: newPosteData.batiment,
    };

    const { data: newPoste, error } = await supabase
      .from('postes_techniques')
      .insert(posteData)
      .select(`
        id,
        code_pt,
        site_id,
        domaine_id,
        lot_id,
        secteur_id,
        batiment,
        sites (nom, code),
        domaines (libelle, code),
        lots (nom),
        secteurs (libelle, code)
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Ce code de poste technique existe déjà');
      }
      throw error;
    }

    setPostesTechniques(prev => [...prev, newPoste as PosteTechnique]);
    setFormData(prev => ({ ...prev, poste_technique_id: newPoste.id }));
    
    setNewPosteData({
      site_id: '',
      domaine_id: '',
      lot_id: '',
      secteur_id: '',
      batiment: '',
      code_pt: '',
    });
    setShowCreatePoste(false);
  } catch (err: any) {
    setCreatePosteError(err.message || 'Erreur lors de la création du poste technique');
  } finally {
    setCreatingPoste(false);
  }
}
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const storagePrefixId = isEdit && id ? id : crypto.randomUUID();
      const imageUrl = await uploadMachineImage(storagePrefixId);
      const documentUrl = await uploadMachineDocument(storagePrefixId);

      const machineData = {
        ...formData,
        puissance: formData.puissance || null,
        tension: formData.tension || null,
        manuel_url: documentUrl,
        image_url: imageUrl,
        client_id: formData.client_id || null,
        poste_technique_id: formData.poste_technique_id || null,
        qte: formData.qte ?? null,
        updated_at: new Date().toISOString(),
      };

      let machineId = id;

      if (isEdit && id !== 'new') {
        const { error } = await supabase
          .from('machines')
          .update(machineData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { data: newMachine, error } = await supabase
          .from('machines')
          .insert(machineData)
          .select()
          .single();

        if (error) throw error;
        machineId = newMachine.id;
      }

      navigate('/admin/machines');
    } catch (err) {
      let userFriendlyMessage = 'Erreur lors de la sauvegarde';

      if (err) {
        const pgError = err as any;

        if (pgError.code === '23505' && pgError.message.includes('unique_active_preventive_per_machine')) {
          userFriendlyMessage = 'Une demande préventive active existe déjà pour cette machine.';
        } else {
          userFriendlyMessage = pgError.message;
        }
      }

      setError(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  }

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.raison_sociale
      ? client.raison_sociale
      : `${client.prenom} ${client.nom}`,
  }));

  const posteOptions = postesTechniques.map(poste => ({
    value: poste.id,
    label: `${poste.code_pt}`,
  }));


const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    width: '100%',
    minHeight: '45px',
    borderRadius: '0.5rem',
    borderColor: state.isFocused ? '#ee6b1a' : '#cbd5e1',
    boxShadow: state.isFocused
      ? '0 0 0 2px rgba(238,107,26,0.25)'
      : 'none',
    transition: 'all 150ms ease',
    '&:hover': {
      borderColor: '#ee6b1a',
    },
  }),

  valueContainer: (base: any) => ({
    ...base,
    padding: '0 1rem',
  }),

  input: (base: any) => ({
    ...base,
    margin: 0,
    padding: 0,
  }),

  placeholder: (base: any) => ({
    ...base,
    color: '#94a3b8',
    fontSize: '0.9rem',
  }),

  singleValue: (base: any) => ({
    ...base,
    color: '#0f172a',
    fontWeight: 600,
  }),

  menu: (base: any) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    zIndex: 50,
    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
  }),

  option: (base: any, state: any) => ({
    ...base,
    padding: '0.75rem 1rem',
    backgroundColor: state.isSelected
      ? '#ee6b1a'
      : state.isFocused
        ? '#fff3e0'
        : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#0f172a',
    fontWeight: state.isSelected ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 120ms ease',

    ':active': {
      backgroundColor: '#ee6b1a',
      color: '#ffffff',
    },
  }),

  indicatorSeparator: () => ({
    display: 'none',
  }),

  dropdownIndicator: (base: any, state: any) => ({
    ...base,
    color: state.isFocused ? '#ee6b1a' : '#64748b',
    ':hover': {
      color: '#ee6b1a',
    },
  }),
};

const filteredSecteurs = newPosteData.domaine_id
  ? secteurs.filter(secteur => secteur.domaine_id === newPosteData.domaine_id)
  : secteurs;

  return (
    <>
      <div className="max-w-6xl mx-auto py-8">
        <div className="space-y-6">

          {/* Informations générales */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#fff3e0] to-[#ffe0b2] px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Informations générales</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Image de la machine
                  </label>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative group h-32 w-32 overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50">
                      {previewImageUrl ? (
                        <>
                          <img
                            src={previewImageUrl}
                            alt="Machine"
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={removeMachineImage}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow-md transition-all hover:bg-red-700 group-hover:opacity-100"
                            title="Supprimer l'image"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                          <ImageIcon size={34} />
                          <span className="mt-2 text-xs font-medium">Aucune image</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#ee6b1a] px-5 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-[#f57c00]">
                        <Upload size={18} />
                        Choisir une image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMachineImageChange}
                          className="hidden"
                        />
                      </label>
                      <p className="mt-2 text-xs text-slate-500">
                        Formats acceptés : PNG, JPG, WEBP. Taille max : 5 Mo.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom de la machine <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all"
                    placeholder="Ex: Compresseur principal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Client <span className="text-red-500">*</span>
                  </label>
                  <Select
                    options={clientOptions}
                    placeholder="Sélectionner un client..."
                    isClearable
                    isSearchable
                    value={clientOptions.find(
                      option => option.value === formData.client_id
                    )}
                    onChange={(option) =>
                      setFormData({
                        ...formData,
                        client_id: option ? option.value : '',
                      })
                    }
                    styles={selectStyles}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Modèle <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.modele}
                    onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all"
                    placeholder="Ex: XC-2000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Numéro de série <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.numero_serie}
                    onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all"
                    placeholder="Ex: SN123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fabricant <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fabricant}
                    onChange={(e) => setFormData({ ...formData, fabricant: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all"
                    placeholder="Ex: Atlas Copco"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Année <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.annee}
                    onChange={(e) => setFormData({ ...formData, annee: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quantité
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.qte ?? ''}
                    onChange={(e) => setFormData({ ...formData, qte: e.target.value ? parseInt(e.target.value) : 1 })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all"
                    placeholder="1"
                  />
                </div>
{/* 
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Localisation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.localisation}
                    onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all"
                    placeholder="Ex: Atelier A - Zone 2"
                  />
                </div> */}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    État <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.etat}
                    onChange={(e) => setFormData({ ...formData, etat: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all bg-white"
                  >
                    {ALL_MACHINE_STATES.map((state) => {
                      const config = getMachineStateConfig(state);
                      return (
                        <option key={state} value={state}>
                          {config.icon} {config.label}
                        </option>
                      );
                    })}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    {getMachineStateConfig(formData.etat).description}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Puissance
                  </label>
                  <input
                    type="text"
                    value={formData.puissance}
                    onChange={(e) => setFormData({ ...formData, puissance: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all"
                    placeholder="Ex: 15 kW"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tension
                  </label>
                  <input
                    type="text"
                    value={formData.tension}
                    onChange={(e) => setFormData({ ...formData, tension: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all"
                    placeholder="Ex: 400V"
                  />
                </div>

                {/* Poste Technique */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Poste Technique <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select
                        options={posteOptions}
                        placeholder="Sélectionner un poste technique..."
                        isClearable
                        isSearchable
                        value={posteOptions.find(
                          option => option.value === formData.poste_technique_id
                        )}
                        onChange={(option) =>
                          setFormData({
                            ...formData,
                            poste_technique_id: option ? option.value : '',
                          })
                        }
                        styles={selectStyles}
                        menuPortalTarget={document.body}
  menuPosition="fixed"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCreatePoste(!showCreatePoste)}
                      className="px-4 py-2 bg-[#ee6b1a] text-white rounded-lg hover:bg-[#f57c00] transition-all flex items-center gap-2"
                    >
                      {showCreatePoste ? <X size={18} /> : <Plus size={18} />}
                      {showCreatePoste ? 'Annuler' : 'Créer'}
                    </button>
                  </div>
                </div>

                {/* Formulaire de création de poste technique */}
{showCreatePoste && (
  <div className="lg:col-span-3 bg-slate-50 rounded-lg p-6 border-2 border-dashed border-slate-300">
    <h3 className="text-lg font-semibold text-slate-800 mb-4">
      Créer un nouveau poste technique
    </h3>
    
    {createPosteError && (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mb-4">
        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-red-700">{createPosteError}</p>
      </div>
    )}

    {/* Message info si le nom de la machine n'est pas rempli */}
    {!formData.nom && (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 mb-4">
        <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-amber-700">
          Veuillez d'abord renseigner le <strong>nom de la machine</strong> ci-dessus pour générer le code du poste technique.
        </p>
      </div>
    )}
   
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Site avec bouton + */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Site <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <select
            value={newPosteData.site_id}
            onChange={(e) => setNewPosteData({ ...newPosteData, site_id: e.target.value })}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all bg-white"
          >
            <option value="">Sélectionner un site...</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>
                {site.code} - {site.nom}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setIsPopupOpen(true)}
            className="px-3 py-2 bg-[#ee6b1a] text-white rounded-lg hover:bg-[#f57c00] transition-all"
            title="Ajouter un nouveau site"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Bâtiment */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Bâtiment <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={newPosteData.batiment}
          onChange={(e) => setNewPosteData({ ...newPosteData, batiment: e.target.value.toUpperCase() })}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all"
          placeholder="Ex: BAT01"
        />
      </div>

      {/* Domaine */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Domaine <span className="text-red-500">*</span>
        </label>
        <select
          value={newPosteData.domaine_id}
          onChange={(e) => setNewPosteData({ ...newPosteData, domaine_id: e.target.value })}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all bg-white"
        >
          <option value="">Sélectionner un domaine...</option>
          {domaines.map(domaine => (
            <option key={domaine.id} value={domaine.id}>
              {domaine.code} - {domaine.libelle}
            </option>
          ))}
        </select>
      </div>

      {/* Lot */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Lot <span className="text-red-500">*</span>
        </label>
        <select
          value={newPosteData.lot_id}
          onChange={(e) => setNewPosteData({ ...newPosteData, lot_id: e.target.value })}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all bg-white"
        >
          <option value="">Sélectionner un lot...</option>
          {lots.map(lot => (
            <option key={lot.id} value={lot.id}>
              {lot.nom}
            </option>
          ))}
        </select>
      </div>

      {/* Secteur */}
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Secteur <span className="text-slate-400">(optionnel)</span>
        </label>
        <select
  value={newPosteData.secteur_id}
  onChange={(e) => setNewPosteData({ ...newPosteData, secteur_id: e.target.value })}
  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all bg-white"
>
  <option value="">Aucun secteur</option>
  {filteredSecteurs.map(secteur => (
    <option key={secteur.id} value={secteur.id}>
      {secteur.code} - {secteur.libelle}
    </option>
  ))}
</select>

      </div>
    </div>

    {/* Aperçu du Code PT généré */}
    {generateCodePT() && (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-1">
              Code du poste technique généré :
            </h4>
            <code className="text-sm font-mono bg-white px-3 py-2 rounded border border-blue-200 inline-block text-blue-800 break-all">
              {generateCodePT()}
            </code>
            <p className="text-xs text-blue-700 mt-2">
              Basé sur le nom de la machine : <strong>{formData.nom}</strong>
            </p>
          </div>
        </div>
      </div>
    )}

    <div className="flex gap-3">
      <button
        type="button"
        onClick={handleCreatePoste}
        disabled={creatingPoste || !generateCodePT()}
        className="px-6 py-2.5 bg-[#ee6b1a] text-white rounded-lg hover:bg-[#f57c00] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {creatingPoste ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Création...
          </>
        ) : (
          <>
            <Plus size={18} />
            Créer le poste
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          setShowCreatePoste(false);
          setCreatePosteError('');
          setNewPosteData({
            site_id: '',
            domaine_id: '',
            lot_id: '',
            secteur_id: '',
            batiment: '',
            code_pt: '',
          });
        }}
        className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all"
      >
        Annuler
      </button>
    </div>
  </div>
)}

                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Documentation de la machine
                  </label>
                  <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-slate-600 transition-all hover:border-[#ee6b1a] hover:bg-orange-50">
                    <Upload size={22} className="text-[#ee6b1a]" />
                    <span className="text-sm font-semibold">
                      {machineDocumentFile ? machineDocumentFile.name : 'Ajouter un PDF ou une image'}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      onChange={handleMachineDocumentChange}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-2 text-xs text-slate-500">
                    Formats acceptés : PDF, JPG, PNG et WebP — 15 Mo maximum.
                  </p>

                  {(machineDocumentFile || formData.manuel_url) && (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText size={20} className="flex-shrink-0 text-[#ee6b1a]" />
                        <span className="truncate text-sm font-medium text-slate-700">
                          {machineDocumentFile?.name || 'Documentation actuelle'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!machineDocumentFile && formData.manuel_url && (
                          <a
                            href={formData.manuel_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-slate-600 hover:bg-white hover:text-[#ee6b1a]"
                            title="Ouvrir la documentation"
                          >
                            <ExternalLink size={18} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setMachineDocumentFile(null);
                            setFormData(prev => ({ ...prev, manuel_url: '' }));
                          }}
                          className="rounded-lg p-2 text-red-600 hover:bg-white"
                          title="Retirer la documentation"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="mb-2 block text-xs font-medium text-slate-600">
                      Ou renseigner une URL externe
                    </label>
                    <input
                      type="url"
                      value={formData.manuel_url}
                      onChange={(e) => {
                        setMachineDocumentFile(null);
                        setFormData({ ...formData, manuel_url: e.target.value });
                      }}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ee6b1a] focus:border-[#ee6b1a] transition-all"
                      placeholder="https://example.com/documentation.pdf"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Messages d'erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-red-800">Erreur</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}
          {/* Boutons d'action */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-[#ee6b1a] to-[#f57c00] text-white py-3.5 rounded-xl font-semibold hover:from-[#f15c00] hover:to-[#ff8800] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Enregistrer la machine
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => alert('Annulation')}
              className="px-8 py-3.5 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold transition-all"
            >
              Annuler
            </button>
          </div>

        </div>
      </div>
       <SitePopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onSiteCreated={handleSiteCreated}
      />
    </>
  );
}
