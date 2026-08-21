import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Upload, X, AlertCircle, MessageCircle, Camera, Image as ImageIcon, Clock, Wrench, Package, ShieldAlert } from 'lucide-react';
import Loading from './Ui/Loading';
import { StatutIcon } from './StatutIcon';

import { MachineState, ALL_MACHINE_STATES, normalizeMachineState } from '../types/machineState';
import { StatutEtapeGamme, ALL_STATUTS_ETAPE, getStatutEtapeConfig } from '../types/etapeGamme';

interface EtapeGamme {
  etape_id: string;
  ordre: number;
  description: string;
  statut: StatutEtapeGamme;
  commentaire: string;
  duree_estimee?: number | null;
  outil?: string | null;
  piece?: string | null;
  consigne_securite?: string | null;
}

interface PieceRemplacee {
  piece_id: string;
  nom: string;
  quantite: number;
  reference: string;
  commentaire: string;
}

interface FormData {
  commentaire: string;
  etat_machine_apres: MachineState;
  date_debut: string;
  duree_minutes: string;
}

function sortEtapesByOrdre<T extends { ordre?: number | null }>(etapes: T[] = []): T[] {
  return [...etapes].sort((a, b) => {
    const ordreA = typeof a.ordre === 'number' ? a.ordre : Number.MAX_SAFE_INTEGER;
    const ordreB = typeof b.ordre === 'number' ? b.ordre : Number.MAX_SAFE_INTEGER;
    return ordreA - ordreB;
  });
}

function formatDurationPreview(value: string): string {
  const minutes = Number(value);
  if (!minutes || minutes <= 0) return '';

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} h`;
  return `${hours} h ${remainingMinutes} min`;
}

export default function InterventionForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const ordreId = searchParams.get('ordre_id');
  const interventionId = searchParams.get('intervention_id');
  const isEditMode = !!interventionId;

  // États principaux
  const [ordre, setOrdre] = useState<any>(null);
  const [machine, setMachine] = useState<any>(null);
  const [intervention, setIntervention] = useState<any>(null);

  // États UI
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // États du formulaire
  const [formData, setFormData] = useState<FormData>({
    commentaire: '',
    etat_machine_apres: MachineState.EN_SERVICE,
    date_debut: new Date().toISOString(),
    duree_minutes: '',
  });

  // États pour les étapes de gamme et pièces
  const [etapesGamme, setEtapesGamme] = useState<EtapeGamme[]>([]);
  const [piecesRemplacees, setPiecesRemplacees] = useState<PieceRemplacee[]>([]);
  const [nouvellePiece, setNouvellePiece] = useState({
    nom: '',
    quantite: 1,
    reference: '',
    commentaire: ''
  });

  // États pour les images
  const [imageInputs, setImageInputs] = useState({
    avant: [] as File[],
    apres: [] as File[],
  });

  const [existingImages, setExistingImages] = useState({
    avant: [] as string[],
    apres: [] as string[],
  });

  // ============= EFFETS =============

  useEffect(() => {
    if (isEditMode) {
      loadInterventionData();
    } else if (ordreId) {
      loadOrdreData();
    } else {
      setError('Paramètres manquants');
      setLoading(false);
    }
  }, [ordreId, interventionId]);

  // ============= FONCTIONS DE CHARGEMENT =============

  async function loadInterventionData() {
    if (!interventionId) return;

    try {
      const { data: interventionData, error: interventionError } = await supabase
        .from('interventions')
        .select(`
          *,
          ordre_travail:ordres_travail!interventions_ot_fkey(
            *,
            machine:machines(*),
            plan:plans_maintenance(
              *,
              gamme:gammes_maintenance(
                *,
                etapes_gamme(*)
              )
            )
          )
        `)
        .eq('id', interventionId)
        .single();

      if (interventionError || !interventionData) {
        setError('Intervention non trouvée');
        setLoading(false);
        return;
      }

      setIntervention(interventionData);
      setOrdre(interventionData.ordre_travail);
      setMachine(interventionData.ordre_travail.machine);

      // Charger les données existantes
      setFormData({
        commentaire: interventionData.commentaire || '',
        etat_machine_apres: normalizeMachineState(interventionData.etat_machine_apres),
        date_debut: interventionData.date_debut || new Date().toISOString(),
        duree_minutes: interventionData.duree_minutes ? String(interventionData.duree_minutes) : '',
      });

      // Charger les étapes de gamme
      if (interventionData.etapes_gamme_checkees) {
        setEtapesGamme(sortEtapesByOrdre(interventionData.etapes_gamme_checkees));
      }

      // Charger les pièces remplacées
      if (interventionData.pieces_remplacees) {
        setPiecesRemplacees(interventionData.pieces_remplacees);
      }

      // Charger les images existantes
      setExistingImages({
        avant: interventionData.image_avant_urls || [],
        apres: interventionData.image_apres_urls || [],
      });

      setLoading(false);
    } catch (err) {
      console.error('Erreur lors du chargement de l\'intervention:', err);
      setError('Erreur lors du chargement');
      setLoading(false);
    }
  }

  async function loadOrdreData() {
    if (!ordreId) return;

    try {
      const { data: ordreData, error: ordreError } = await supabase
        .from('ordres_travail')
        .select(`
          *,
          machine:machines(*),
          plan:plans_maintenance(
            *,
            gamme:gammes_maintenance(
              *,
              etapes_gamme(*)
            )
          )
        `)
        .eq('id', ordreId)
        .single();

      if (ordreError || !ordreData) {
        setError('Ordre de travail non trouvé');
        setLoading(false);
        return;
      }

      setOrdre(ordreData);
      setMachine(ordreData.machine);

      // Initialiser l'état de la machine
      setFormData(prev => ({
        ...prev,
        etat_machine_apres: normalizeMachineState(ordreData.machine?.etat)
      }));

      // Si c'est un ordre préventif avec une gamme, charger les étapes
      if (ordreData.plan?.gamme) {
        let etapes = sortEtapesByOrdre(ordreData.plan.gamme.etapes_gamme || []).map((etape: any) => ({
          etape_id: etape.id,
          ordre: etape.ordre,
          description: etape.description,
          statut: StatutEtapeGamme.CONFORME,
          commentaire: '',
          duree_estimee: etape.duree_estimee,
          outil: etape.outil,
          piece: etape.piece,
          consigne_securite: etape.consigne_securite,
          disabled: false // Par défaut, toutes les étapes sont activées
        })) || [];

        // Si c'est un OT de replanification, gérer les étapes spécifiquement
        if (ordreData.etapes_reportees && ordreData.etapes_reportees.length > 0) {
          etapes = etapes.map((etape: any) => {
            // Vérifier si cette étape était reportée
            const etapeReportee = ordreData.etapes_reportees.find((er: any) => er.etape_id === etape.etape_id);
            // Vérifier si cette étape était déjà faite
            const etapeDejaFaite = ordreData.etapes_deja_faites?.find((edf: any) => edf.etape_id === etape.etape_id);
            
            if (etapeReportee) {
              // Étape reportée : à refaire, donc activée avec le statut reporté par défaut
              return {
                ...etape,
                statut: StatutEtapeGamme.CONFORME, // Le technicien peut changer le statut
                commentaire: etapeReportee.commentaire || '',
                disabled: false,
                isReported: true
              };
            } else if (etapeDejaFaite) {
              // Étape déjà faite : désactivée et marquée comme conforme
              return {
                ...etape,
                statut: StatutEtapeGamme.CONFORME,
                commentaire: etapeDejaFaite.commentaire || 'Étape réalisée lors de l\'intervention précédente',
                disabled: true,
                isAlreadyDone: true
              };
            } else {
              // Étape normale (cas d'un OT préventif classique)
              return etape;
            }
          });
        }
        
        setEtapesGamme(sortEtapesByOrdre(etapes));
      }

      setLoading(false);
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError('Erreur lors du chargement');
      setLoading(false);
    }
  }

  // ============= GESTION DES ÉTAPES ET PIÈCES =============

  const updateEtapeGamme = (index: number, field: keyof EtapeGamme, value: any) => {
    setEtapesGamme(prev => prev.map((etape, i) => 
      i === index ? { ...etape, [field]: value } : etape
    ));
  };

  const ajouterPiece = () => {
    if (!nouvellePiece.nom.trim()) return;
    
    const piece: PieceRemplacee = {
      piece_id: crypto.randomUUID(),
      nom: nouvellePiece.nom,
      quantite: nouvellePiece.quantite,
      reference: nouvellePiece.reference,
      commentaire: nouvellePiece.commentaire
    };
    
    setPiecesRemplacees(prev => [...prev, piece]);
    setNouvellePiece({ nom: '', quantite: 1, reference: '', commentaire: '' });
  };

  const supprimerPiece = (index: number) => {
    setPiecesRemplacees(prev => prev.filter((_, i) => i !== index));
  };

  // ============= GESTION DES IMAGES =============

  function handleImageUpload(files: FileList | null, type: 'avant' | 'apres') {
    if (!files) return;
    const newFiles = Array.from(files);
    setImageInputs((prev) => ({
      ...prev,
      [type]: [...prev[type], ...newFiles],
    }));
  }

  function removeNewImage(type: 'avant' | 'apres', index: number) {
    setImageInputs((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  }

  function removeExistingImage(type: 'avant' | 'apres', index: number) {
    setExistingImages((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  }

  async function uploadImages(files: File[], folder: string): Promise<string[]> {
    const urls: string[] = [];

    for (const file of files) {
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`;
      const filePath = `interventions/${folder}/${fileName}`;

      const { error } = await supabase.storage
        .from('gmao-photos')
        .upload(filePath, file);

      if (!error) {
        const { data } = supabase.storage
          .from('gmao-photos')
          .getPublicUrl(filePath);

        if (data?.publicUrl) {
          urls.push(data.publicUrl);
        }
      }
    }

    return urls;
  }

  // ============= SOUMISSION DU FORMULAIRE =============

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!ordre || !profile) {
      setError('Données manquantes');
      return;
    }



    const isCorrectiveOt = ordre.type === 'correctif';
    const dureeMinutes = formData.duree_minutes.trim() ? Number(formData.duree_minutes) : null;

    if (isCorrectiveOt && (!dureeMinutes || dureeMinutes <= 0)) {
      setError('Veuillez renseigner la duree realisee pour cet OT correctif.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Upload des nouvelles images
      let imageAvantUrls: string[] = [...existingImages.avant];
      let imageApresUrls: string[] = [...existingImages.apres];

      if (imageInputs.avant.length > 0) {
        const newUrls = await uploadImages(imageInputs.avant, 'avant');
        imageAvantUrls = [...imageAvantUrls, ...newUrls];
      }

      if (imageInputs.apres.length > 0) {
        const newUrls = await uploadImages(imageInputs.apres, 'apres');
        imageApresUrls = [...imageApresUrls, ...newUrls];
      }

      const dateFinCorrective = isCorrectiveOt && dureeMinutes
        ? new Date(new Date(formData.date_debut).getTime() + dureeMinutes * 60 * 1000).toISOString()
        : null;

      // Préparer les données de l'intervention
      const interventionData = {
        ordre_travail_id: ordre.id,
        machine_id: ordre.machine_id,
        // En mode édition, conserver le technicien d'origine
        // En mode création, utiliser l'utilisateur actuel
        technicien_id: isEditMode && intervention?.technicien_id 
          ? intervention.technicien_id 
          : profile.id,
        date_debut: formData.date_debut,
        date_fin: isCorrectiveOt
          ? dateFinCorrective
          : (isEditMode && intervention?.date_fin ? intervention.date_fin : null),
        commentaire: formData.commentaire || null,
        etat_machine_apres: formData.etat_machine_apres,
        pieces_remplacees: piecesRemplacees,
        etapes_gamme_checkees: etapesGamme,
        image_avant_urls: imageAvantUrls,
        image_apres_urls: imageApresUrls,
        resultat: 'réussi', // Par défaut
      };

      // Créer ou mettre à jour l'intervention
      let savedInterventionId = interventionId;
      
      if (isEditMode && interventionId) {
        const { error: updateError } = await supabase
          .from('interventions')
          .update(interventionData)
          .eq('id', interventionId);

        if (updateError) throw updateError;
      } else {
        const { data: newIntervention, error: insertError } = await supabase
          .from('interventions')
          .insert([interventionData])
          .select()
          .single();

        if (insertError) throw insertError;
        
        // Récupérer l'ID de la nouvelle intervention
        savedInterventionId = newIntervention.id;

        // Mettre à jour le statut de l'ordre de travail
        await supabase
          .from('ordres_travail')
          .update({ 
            statut: 'en_cours',
            date_execution: new Date().toISOString()
          })
          .eq('id', ordre.id);
      }

      // Note: L'état de la machine sera mis à jour uniquement lors de la validation par l'admin
      // Pas de mise à jour immédiate ici

      // Redirection selon le rôle
      if (profile?.role === 'admin') {
        // Admin → Page de visualisation de l'intervention
        navigate(`/admin/intervention/${savedInterventionId}`);
      } else if (machine?.id) {
        // Technicien → Page de la machine avec l'onglet historique
        navigate(`/machine/${machine.id}/?tab=historique`);
      } else {
        // Fallback si pas de machine
        navigate(-1);
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
      setSubmitting(false);
    }
  }

  // ============= RENDU =============

  if (loading) {
    return <Loading message="Chargement..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* En-tête */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-[#f15c00] mb-3 transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            Retour
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                {isEditMode ? 'Modifier l\'intervention' : 'Nouvelle intervention'}
              </h1>
              {machine && (
                <>
                <p className="text-slate-600 mt-2 flex items-center gap-2">
                  <span className="font-semibold">{machine.nom}</span>
                  <span className="text-slate-400">•</span>
                  <span>{machine.localisation}</span>
                </p>
                {ordre?.plan?.gamme?.nom && (
                  <p className="mt-2 inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-[#f15c00]">
                    Gamme: {ordre.plan.gamme.nom}
                  </p>
                )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Formulaire */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Message d'erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 font-medium flex items-center gap-3">
              <AlertCircle size={20} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Informations sur l'OT de replanification */}
          {ordre?.type === 'préventif' && ordre?.etapes_reportees && ordre.etapes_reportees.length > 0 && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-blue-900 mb-2">
                    OT de Replanification
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Cet OT préventif a été créé suite à des étapes reportées lors d'une intervention précédente. 
                    Seules les étapes reportées nécessitent votre attention, les autres ont déjà été réalisées avec succès.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-900 mb-2">
                  📅 Étapes à refaire ({ordre.etapes_reportees.length}) :
                </h4>
                {ordre.etapes_reportees.map((etape: any, index: number) => (
                  <div key={index} className="bg-white border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded flex-shrink-0 mt-0.5">
                        Étape {etape.ordre}
                      </span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-1">
                          {etape.description}
                        </h4>
                        {etape.commentaire && (
                          <div className="flex items-start gap-2 mt-2">
                            <MessageCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-700 italic">
                              💬 {etape.commentaire}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {ordre.etapes_deja_faites && ordre.etapes_deja_faites.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-green-800 mb-2">
                    ✅ Étapes déjà réalisées ({ordre.etapes_deja_faites.length}) :
                  </h4>
                  <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      {ordre.etapes_deja_faites.map((etape: any) => `Étape ${etape.ordre}`).join(', ')} - 
                      Ces étapes sont automatiquement marquées comme conformes et ne nécessitent pas d'intervention.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  ℹ️ Concentrez-vous uniquement sur les étapes reportées. Les étapes déjà réalisées sont désactivées dans le formulaire ci-dessous.
                </p>
              </div>
            </div>
          )}

          {/* Informations sur l'OT correctif */}
          {ordre?.type === 'correctif' && ordre?.etapes_non_conformes && ordre.etapes_non_conformes.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-red-900 mb-2">
                    Non-conformités à traiter
                  </h3>
                  <p className="text-sm text-red-700 mb-4">
                    Cet OT correctif a été créé suite à des non-conformités détectées lors d'une intervention préventive. 
                    Voici les étapes qui nécessitent une action corrective :
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                {ordre.etapes_non_conformes.map((etape: any, index: number) => (
                  <div key={index} className="bg-white border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex-shrink-0 mt-0.5">
                        Étape {etape.ordre}
                      </span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-900 mb-1">
                          {etape.description}
                        </h4>
                        {etape.commentaire && (
                          <div className="flex items-start gap-2 mt-2">
                            <MessageCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 italic">
                              💬 {etape.commentaire}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ Assurez-vous de traiter toutes ces non-conformités lors de votre intervention corrective.
                </p>
              </div>
            </div>
          )}

          {/* Durée pour OT correctif */}
          {ordre?.type === 'correctif' && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#f15c00]" />
                Duree realisee
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Temps passe sur l'intervention <span className="text-[#f15c00]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={formData.duree_minutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, duree_minutes: e.target.value }))}
                      placeholder="Ex: 90"
                      className="w-full px-4 py-3 pr-20 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all hover:border-slate-400 font-medium"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                      min
                    </span>
                  </div>
                </div>

                {formatDurationPreview(formData.duree_minutes) && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-[#f15c00]">
                    {formatDurationPreview(formData.duree_minutes)}
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Cette duree sera utilisee dans la version electronique remplie de l'OT correctif.
              </p>
            </div>
          )}

          {/* État de la machine */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-[#f15c00] rounded-full"></div>
              État de la machine
            </h3>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                État après intervention <span className="text-[#f15c00]">*</span>
              </label>
              <select
                value={formData.etat_machine_apres}
                onChange={(e) => setFormData(prev => ({ ...prev, etat_machine_apres: e.target.value as MachineState }))}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all bg-white hover:border-slate-400 font-medium cursor-pointer"
              >
                {ALL_MACHINE_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Étapes de gamme */}
          {etapesGamme.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 bg-[#f15c00] rounded-full"></div>
                <h3 className="text-lg font-bold text-slate-800">
                  Étapes de la gamme
                </h3>
                {ordre?.plan?.gamme?.nom && (
                  <span className="hidden sm:inline text-sm font-semibold text-slate-600">
                    {ordre.plan.gamme.nom}
                  </span>
                )}
                <span className="ml-auto bg-[#f15c00] text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {etapesGamme.length} étape{etapesGamme.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-4">
                {etapesGamme.map((etape, index) => {
                  const statutConfig = getStatutEtapeConfig(etape.statut);
                  const isDisabled = (etape as any).disabled;
                  const isReported = (etape as any).isReported;
                  const isAlreadyDone = (etape as any).isAlreadyDone;
                  
                  return (
                    <div key={etape.etape_id} className={`rounded-xl p-5 border-2 transition-all hover:shadow-md ${
                      isDisabled 
                        ? 'bg-gray-50 border-gray-200 opacity-75' 
                        : isReported
                        ? 'bg-blue-50 border-blue-300'
                        : `${statutConfig.bgColor} ${statutConfig.borderColor}`
                    }`}>
                      <div className="flex items-start gap-3">
                        <span className={`text-white text-xs font-bold px-2 py-1 rounded flex-shrink-0 mt-1 ${
                          isDisabled 
                            ? 'bg-gray-400' 
                            : isReported
                            ? 'bg-blue-600'
                            : 'bg-[#f15c00]'
                        }`}>
                          {etape.ordre}
                        </span>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <span className="font-medium text-slate-800 block mb-2">{etape.description}</span>
                            {isReported && (
                              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                                📅 À refaire
                              </span>
                            )}
                            {isAlreadyDone && (
                              <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                                ✅ Déjà fait
                              </span>
                            )}
                          </div>

                          {(etape.duree_estimee || etape.outil || etape.piece || etape.consigne_securite) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white/70 p-3 text-xs">
                              {etape.duree_estimee && (
                                <InfoItem
                                  icon={<Clock size={14} />}
                                  label="Duree estimee"
                                  value={`${etape.duree_estimee} min`}
                                />
                              )}
                              {etape.outil && (
                                <InfoItem
                                  icon={<Wrench size={14} />}
                                  label="Outil necessaire"
                                  value={etape.outil}
                                />
                              )}
                              {etape.piece && (
                                <InfoItem
                                  icon={<Package size={14} />}
                                  label="Piece de rechange"
                                  value={etape.piece}
                                />
                              )}
                              {etape.consigne_securite && (
                                <InfoItem
                                  icon={<ShieldAlert size={14} />}
                                  label="Consignes de securite"
                                  value={etape.consigne_securite}
                                  className="sm:col-span-2 text-orange-700"
                                />
                              )}
                            </div>
                          )}

                          <div className="relative">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Statut de l'étape <span className="text-[#f15c00]">*</span>
                            </label>
                            <select
                              value={etape.statut}
                              onChange={(e) => updateEtapeGamme(index, 'statut', e.target.value as StatutEtapeGamme)}
                              disabled={isDisabled}
                              className={`w-full px-3 py-2 border-2 rounded-lg text-sm font-medium transition-all ${
                                isDisabled
                                  ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-white border-slate-300 focus:ring-2 focus:ring-[#f15c00] focus:border-transparent'
                              }`}
                            >
                              {ALL_STATUTS_ETAPE.map((statut) => {
                                const config = getStatutEtapeConfig(statut);
                                return (
                                  <option key={statut} value={statut}>
                                    {config.label}
                                  </option>
                                );
                              })}
                            </select>
                            {/* Afficher l'icône du statut sélectionné */}
                            <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                              <StatutIcon statut={etape.statut} size={18} />
                            </div>
                          </div>
                          <input
                            type="text"
                            value={etape.commentaire}
                            onChange={(e) => updateEtapeGamme(index, 'commentaire', e.target.value)}
                            disabled={isDisabled}
                            placeholder={isDisabled ? "Commentaire de l'intervention précédente" : "Commentaire (optionnel)"}
                            className={`w-full px-3 py-2 border rounded-lg text-sm transition-all ${
                              isDisabled
                                ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                                : 'border-slate-300 focus:ring-2 focus:ring-[#f15c00] focus:border-transparent'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pièces remplacées */}
          <div className="pt-8 border-t-2 border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-[#f15c00] to-[#ff7a2f] rounded-full"></div>
              <h3 className="text-xl font-bold text-slate-800">
                Pièces remplacées
              </h3>
            </div>
            
            {/* Formulaire d'ajout de pièce */}
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <input
                  type="text"
                  value={nouvellePiece.nom}
                  onChange={(e) => setNouvellePiece(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="Nom de la pièce"
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent text-sm"
                />
                <input
                  type="number"
                  value={nouvellePiece.quantite}
                  onChange={(e) => setNouvellePiece(prev => ({ ...prev, quantite: parseInt(e.target.value) || 1 }))}
                  placeholder="Quantité"
                  min="1"
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent text-sm"
                />
                <input
                  type="text"
                  value={nouvellePiece.reference}
                  onChange={(e) => setNouvellePiece(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Référence"
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent text-sm"
                />
                <button
                  type="button"
                  onClick={ajouterPiece}
                  className="px-4 py-2 bg-[#f15c00] text-white rounded-lg hover:bg-[#d14d00] transition-colors text-sm font-medium"
                >
                  Ajouter
                </button>
              </div>
              <input
                type="text"
                value={nouvellePiece.commentaire}
                onChange={(e) => setNouvellePiece(prev => ({ ...prev, commentaire: e.target.value }))}
                placeholder="Commentaire (optionnel)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent text-sm"
              />
            </div>

            {/* Liste des pièces ajoutées */}
            {piecesRemplacees.length > 0 && (
              <div className="space-y-2">
                {piecesRemplacees.map((piece, index) => (
                  <div key={piece.piece_id} className="bg-white rounded-lg p-3 border border-slate-200 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-800">{piece.nom}</span>
                        <span className="text-sm text-slate-600">Qté: {piece.quantite}</span>
                        {piece.reference && (
                          <span className="text-sm text-slate-600">Réf: {piece.reference}</span>
                        )}
                      </div>
                      {piece.commentaire && (
                        <p className="text-sm text-slate-500 mt-1">{piece.commentaire}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => supprimerPiece(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section Photos */}
          <div className="pt-8 border-t-2 border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-[#f15c00] to-[#ff7a2f] rounded-full"></div>
              <h3 className="text-xl font-bold text-slate-800">Photos</h3>
            </div>

            <div className="space-y-6">
              {/* Photos avant intervention */}
              <ImageSection
                title="Photos avant intervention"
                type="avant"
                existingImages={existingImages.avant}
                newImages={imageInputs.avant}
                onUpload={(files) => handleImageUpload(files, 'avant')}
                onRemoveExisting={(idx) => removeExistingImage('avant', idx)}
                onRemoveNew={(idx) => removeNewImage('avant', idx)}
              />

              {/* Photos après intervention */}
              <ImageSection
                title="Photos après intervention"
                type="apres"
                existingImages={existingImages.apres}
                newImages={imageInputs.apres}
                onUpload={(files) => handleImageUpload(files, 'apres')}
                onRemoveExisting={(idx) => removeExistingImage('apres', idx)}
                onRemoveNew={(idx) => removeNewImage('apres', idx)}
              />
            </div>
          </div>

          {/* Commentaire général */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Commentaire général
            </label>
            <textarea
              value={formData.commentaire}
              onChange={(e) => setFormData(prev => ({ ...prev, commentaire: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all hover:border-slate-300 resize-none"
              placeholder="Observations générales, recommandations..."
            />
          </div>

          {/* Date d'intervention (Admin uniquement) */}
          {profile?.role === 'admin' && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-blue-900 mb-1">
                    Modification de la date (Admin)
                  </h3>
                  <p className="text-xs text-blue-700">
                    En tant qu'administrateur, vous pouvez modifier la date de l'intervention
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 mb-2 block">
                  Date de l'intervention
                </label>
                <input
                  type="datetime-local"
                  value={formData.date_debut.slice(0, 16)}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value).toISOString();
                    setFormData(prev => ({ ...prev, date_debut: newDate }));
                  }}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all hover:border-slate-300"
                />
                <p className="text-xs text-slate-500">
                  Date actuelle: {new Date(formData.date_debut).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-400 font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-[#f15c00] text-white rounded-lg hover:bg-[#d14d00] disabled:bg-slate-400 font-semibold transition-colors shadow-sm hover:shadow-md disabled:cursor-not-allowed"
              >
                {submitting
                  ? isEditMode ? 'Modification en cours...' : 'Création en cours...'
                  : isEditMode ? 'Modifier l\'intervention' : 'Créer l\'intervention'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

// ============= COMPOSANT POUR LA SECTION IMAGES =============

function InfoItem({
  icon,
  label,
  value,
  className = ''
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-2 text-slate-700 ${className}`}>
      <span className="mt-0.5 flex-shrink-0 text-slate-500">{icon}</span>
      <span>
        <span className="font-bold">{label}: </span>
        <span>{value}</span>
      </span>
    </div>
  );
}

interface ImageSectionProps {
  title: string;
  type: string;
  existingImages: string[];
  newImages: File[];
  onUpload: (files: FileList | null) => void;
  onRemoveExisting: (index: number) => void;
  onRemoveNew: (index: number) => void;
}

function ImageSection({
  title,
  type,
  existingImages,
  newImages,
  onUpload,
  onRemoveExisting,
  onRemoveNew,
}: ImageSectionProps) {
  return (
    <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
      <label className="text-base font-bold text-[#f15c00] mb-4 flex items-center gap-2">
        <div className="w-2 h-2 bg-[#f15c00] rounded-full"></div>
        {title}
      </label>

      {/* Images existantes */}
      {existingImages.length > 0 && (
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {existingImages.map((url, idx) => (
            <div key={idx} className="relative group">
              <img
                src={url}
                alt={`${type} ${idx + 1}`}
                className="w-full h-32 object-cover rounded-lg border-2 border-slate-200 shadow-sm group-hover:shadow-md transition-all"
              />
              <button
                type="button"
                onClick={() => onRemoveExisting(idx)}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg transform hover:scale-110"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Zone d'upload */}
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 sm:hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-orange-100 text-[#f15c00] flex items-center justify-center">
            <Upload size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Ajouter des photos</p>
            <p className="text-xs text-slate-500">Choisir une image existante ou prendre une photo.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex min-h-[92px] cursor-pointer items-center gap-3 rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-3 transition-all hover:border-[#f15c00] hover:bg-orange-50">
            <div className="w-11 h-11 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
              <ImageIcon size={22} />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-bold text-slate-900">Depuis la galerie</span>
              <span className="block text-xs text-slate-500 mt-0.5">Selectionner une ou plusieurs images</span>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                onUpload(e.currentTarget.files);
                e.currentTarget.value = '';
              }}
              className="hidden"
            />
          </label>

          <label className="flex min-h-[92px] cursor-pointer items-center gap-3 rounded-lg border-2 border-[#f15c00]/30 bg-orange-50 px-4 py-3 transition-all hover:border-[#f15c00] hover:bg-orange-100">
            <div className="w-11 h-11 rounded-lg bg-white border border-orange-200 flex items-center justify-center text-[#f15c00]">
              <Camera size={22} />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-bold text-slate-900">Prendre une photo</span>
              <span className="block text-xs text-slate-500 mt-0.5">Ouvrir l'appareil photo du smartphone</span>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                onUpload(e.currentTarget.files);
                e.currentTarget.value = '';
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>
      <div className="hidden sm:block border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-[#f15c00] hover:bg-orange-50/30 transition-all group cursor-pointer">
        <label className="cursor-pointer">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#f15c00] transition-all">
              <Upload size={32} className="text-[#f15c00] group-hover:text-white transition-colors" />
            </div>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-[#f15c00] transition-colors">
              Cliquez pour ajouter des photos
            </span>
            <span className="text-xs text-slate-500 mt-1">
              ou glissez-déposez vos fichiers
            </span>
          </div>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => onUpload(e.currentTarget.files)}
            className="hidden"
          />
        </label>
      </div>

      {/* Nouvelles images à uploader */}
      {newImages.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {newImages.map((file, idx) => (
            <div key={idx} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt={`${type} ${idx + 1}`}
                className="w-full h-32 object-cover rounded-lg border-2 border-green-300 shadow-sm group-hover:shadow-md transition-all"
              />
              <span className="absolute top-2 left-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold px-2 py-1 rounded-lg shadow-md">
                Nouveau
              </span>
              <button
                type="button"
                onClick={() => onRemoveNew(idx)}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg transform hover:scale-110"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
