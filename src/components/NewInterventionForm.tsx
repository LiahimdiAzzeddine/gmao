import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, Upload, X, Wrench, AlertCircle } from 'lucide-react';
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
}

interface PieceRemplacee {
  piece_id: string;
  nom: string;
  quantite: number;
  reference: string;
  commentaire: string;
}

interface NewInterventionFormProps {
  ordreId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function NewInterventionForm({ ordreId, onClose, onSuccess }: NewInterventionFormProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // États principaux
  const [ordre, setOrdre] = useState<any>(null);
  const [machine, setMachine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // États du formulaire
  const [formData, setFormData] = useState({
    commentaire: '',
    etat_machine_apres: MachineState.EN_SERVICE,
  });

  // États pour les étapes de gamme
  const [etapesGamme, setEtapesGamme] = useState<EtapeGamme[]>([]);
  
  // États pour les pièces remplacées
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

  // Chargement initial
  useEffect(() => {
    loadOrdreData();
  }, [ordreId]);

  async function loadOrdreData() {
    try {
      // Charger l'ordre de travail avec ses relations
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
      
      setFormData(prev => ({
        ...prev,
        etat_machine_apres: normalizeMachineState(ordreData.machine?.etat)
      }));

      // Si c'est un ordre préventif avec une gamme, charger les étapes
      if (ordreData.plan?.gamme) {
        const etapes = ordreData.plan.gamme.etapes_gamme?.map((etape: any) => ({
          etape_id: etape.id,
          ordre: etape.ordre,
          description: etape.description,
          statut: StatutEtapeGamme.CONFORME,
          commentaire: ''
        })) || [];
        setEtapesGamme(etapes);
      }

      setLoading(false);
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError('Erreur lors du chargement');
      setLoading(false);
    }
  }

  // Gestion des étapes de gamme
  const updateEtapeGamme = (index: number, field: keyof EtapeGamme, value: any) => {
    setEtapesGamme(prev => prev.map((etape, i) => 
      i === index ? { ...etape, [field]: value } : etape
    ));
  };

  // Gestion des pièces remplacées
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

  // Gestion des images
  const handleImageUpload = (files: FileList | null, type: 'avant' | 'apres') => {
    if (!files) return;
    const newFiles = Array.from(files);
    setImageInputs(prev => ({
      ...prev,
      [type]: [...prev[type], ...newFiles]
    }));
  };

  const removeImage = (type: 'avant' | 'apres', index: number) => {
    setImageInputs(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  // Upload des images
  async function uploadImages(files: File[], folder: string): Promise<string[]> {
    const urls: string[] = [];

    for (const file of files) {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${file.name}`;
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

  // Soumission du formulaire
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!ordre || !profile) {
      setError('Données manquantes');
      return;
    }



    setSubmitting(true);
    setError('');

    try {
      // Upload des images
      let imageAvantUrls: string[] = [];
      let imageApresUrls: string[] = [];

      if (imageInputs.avant.length > 0) {
        imageAvantUrls = await uploadImages(imageInputs.avant, 'avant');
      }

      if (imageInputs.apres.length > 0) {
        imageApresUrls = await uploadImages(imageInputs.apres, 'apres');
      }

      // Créer l'intervention
      const interventionData = {
        ordre_travail_id: ordre.id,
        machine_id: ordre.machine_id,
        technicien_id: profile.id,
        date_debut: new Date().toISOString(),
        commentaire: formData.commentaire || null,
        etat_machine_apres: formData.etat_machine_apres,
        pieces_remplacees: piecesRemplacees,
        etapes_gamme_checkees: etapesGamme,
        image_avant_urls: imageAvantUrls,
        image_apres_urls: imageApresUrls,
        resultat: 'réussi', // Par défaut, peut être modifié plus tard
      };

      const { error: interventionError } = await supabase
        .from('interventions')
        .insert([interventionData])
        .select()
        .single();

      if (interventionError) throw interventionError;

      // Mettre à jour le statut de l'ordre de travail
      const { error: updateOTError } = await supabase
        .from('ordres_travail')
        .update({ 
          statut: 'en_cours',
          date_execution: new Date().toISOString()
        })
        .eq('id', ordre.id);

      if (updateOTError) throw updateOTError;

      // Note: L'état de la machine sera mis à jour uniquement lors de la validation par l'admin
      // Pas de mise à jour immédiate ici

      // Appeler onSuccess pour recharger les données
      if (onSuccess) {
        onSuccess();
      }

      onClose();
      navigate(`/machine/${machine?.id}`);
    } catch (err) {
      console.error('Erreur lors de la création:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Loading message="Chargement..." />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl min-h-screen sm:min-h-0 sm:max-h-[95vh] flex flex-col">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-[#f15c00] to-[#ff7a2f] text-white p-4 sm:p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Wrench size={20} className="sm:w-6 sm:h-6 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold truncate">Démarrer l'intervention</h2>
                <p className="text-orange-100 text-sm truncate">
                  OT #{ordre?.id?.slice(0, 8)} - {machine?.nom}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 ml-2"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
            {/* Message d'erreur */}
            {error && (
              <div className="p-3 sm:p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 font-medium flex items-start gap-2">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base">{error}</span>
              </div>
            )}

            {/* État de la machine après intervention */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-800">
                État de la machine après intervention <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.etat_machine_apres}
                onChange={(e) => setFormData(prev => ({ ...prev, etat_machine_apres: e.target.value as MachineState }))}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all bg-white text-sm sm:text-base"
              >
                {ALL_MACHINE_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Étapes de gamme (si préventif) */}
            {etapesGamme.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#f15c00] flex-shrink-0" />
                  Étapes de la gamme
                </h3>
                <div className="space-y-3">
                  {etapesGamme.map((etape, index) => {
                    const statutConfig = getStatutEtapeConfig(etape.statut);
                    return (
                      <div key={etape.etape_id} className={`rounded-lg p-3 sm:p-4 border-2 ${statutConfig.bgColor} ${statutConfig.borderColor}`}>
                        <div className="flex items-start gap-3">
                          <span className="bg-[#f15c00] text-white text-xs font-bold px-2 py-1 rounded flex-shrink-0 mt-1">
                            {etape.ordre}
                          </span>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <span className="font-medium text-slate-800 text-sm sm:text-base break-words block">{etape.description}</span>
                            </div>
                            <div className="relative">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Statut <span className="text-[#f15c00]">*</span>
                              </label>
                              <select
                                value={etape.statut}
                                onChange={(e) => updateEtapeGamme(index, 'statut', e.target.value as StatutEtapeGamme)}
                                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent text-sm font-medium bg-white"
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
                              placeholder="Commentaire (optionnel)"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent text-sm"
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
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Wrench size={18} className="text-[#f15c00] flex-shrink-0" />
                Pièces remplacées
              </h3>
              
              {/* Formulaire d'ajout de pièce */}
              <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
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
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={nouvellePiece.reference}
                    onChange={(e) => setNouvellePiece(prev => ({ ...prev, reference: e.target.value }))}
                    placeholder="Référence"
                    className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f15c00] focus:border-transparent text-sm"
                  />
                  <input
                    type="text"
                    value={nouvellePiece.commentaire}
                    onChange={(e) => setNouvellePiece(prev => ({ ...prev, commentaire: e.target.value }))}
                    placeholder="Commentaire"
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
              </div>

              {/* Liste des pièces ajoutées */}
              {piecesRemplacees.length > 0 && (
                <div className="space-y-2">
                  {piecesRemplacees.map((piece, index) => (
                    <div key={piece.piece_id} className="bg-white rounded-lg p-3 border border-slate-200 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-800 text-sm sm:text-base">{piece.nom}</span>
                          <span className="text-xs sm:text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">Qté: {piece.quantite}</span>
                          {piece.reference && (
                            <span className="text-xs sm:text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">Réf: {piece.reference}</span>
                          )}
                        </div>
                        {piece.commentaire && (
                          <p className="text-xs sm:text-sm text-slate-500 mt-1 break-words">{piece.commentaire}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => supprimerPiece(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Photos */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800">Photos</h3>
              
              <div className="grid grid-cols-1 gap-6">
                {/* Photos avant */}
                <ImageSection
                  title="Photos avant intervention"
                  type="avant"
                  images={imageInputs.avant}
                  onUpload={(files) => handleImageUpload(files, 'avant')}
                  onRemove={(idx) => removeImage('avant', idx)}
                />

                {/* Photos après */}
                <ImageSection
                  title="Photos après intervention"
                  type="apres"
                  images={imageInputs.apres}
                  onUpload={(files) => handleImageUpload(files, 'apres')}
                  onRemove={(idx) => removeImage('apres', idx)}
                />
              </div>
            </div>

            {/* Commentaire général */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-800">
                Commentaire général
              </label>
              <textarea
                value={formData.commentaire}
                onChange={(e) => setFormData(prev => ({ ...prev, commentaire: e.target.value }))}
                rows={3}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all resize-none text-sm sm:text-base"
                placeholder="Observations générales, recommandations..."
              />
            </div>
          </form>
        </div>

        {/* Boutons d'action - Fixés en bas */}
        <div className="flex-shrink-0 border-t border-slate-200 p-4 sm:p-6 bg-white rounded-b-2xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 sm:px-6 py-3 sm:py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-all text-sm sm:text-base"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              onClick={handleSubmit}
              className="flex-1 px-4 sm:px-6 py-3 sm:py-3 bg-gradient-to-r from-[#f15c00] to-[#ff7a2f] text-white rounded-lg hover:from-[#d14d00] hover:to-[#f15c00] disabled:from-slate-400 disabled:to-slate-500 font-medium transition-all disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {submitting ? 'Création en cours...' : 'Démarrer l\'intervention'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant pour la section images
interface ImageSectionProps {
  title: string;
  type: string;
  images: File[];
  onUpload: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}

function ImageSection({ title, type, images, onUpload, onRemove }: ImageSectionProps) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-slate-800 text-sm sm:text-base">{title}</h4>
      
      {/* Zone d'upload - Optimisée mobile */}
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-6 text-center hover:border-[#f15c00] hover:bg-orange-50/30 transition-all cursor-pointer touch-manipulation">
        <label className="cursor-pointer block">
          <div className="flex flex-col items-center">
            <Upload size={20} className="sm:w-6 sm:h-6 text-[#f15c00] mb-2 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-slate-700 text-center">
              Ajouter des photos
            </span>
            <span className="text-xs text-slate-500 mt-1 hidden sm:block">
              Appuyez pour sélectionner
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

      {/* Images ajoutées - Grille responsive */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {images.map((file, idx) => (
            <div key={idx} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt={`${type} ${idx + 1}`}
                className="w-full h-20 sm:h-24 object-cover rounded-lg border border-slate-200 touch-manipulation"
              />
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute top-1 right-1 bg-red-500 text-white p-1.5 sm:p-1 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation shadow-lg"
                style={{ minWidth: '28px', minHeight: '28px' }}
              >
                <X size={12} className="sm:w-3 sm:h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
