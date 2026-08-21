import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardList,
  Download,
  FileText,
  MapPin,
  Settings,
  Tool,
  User,
  Wrench,
  XCircle,
  Image as ImageIcon,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ClientLayout from '../components/ClientLayout';
import ClientInterventionValidationModal from '../components/ClientInterventionValidationModal';
import { generateOTPdfReact } from '../utils/generateOTPdfReact';
import { generateOTCPdfReact } from '../utils/generateOTCPdfReact';
import type { OrdreTravailDetail } from '../types/ot';

type EtapeGammeAffichee = {
  etape_id?: string;
  id?: string;
  ordre?: number;
  description?: string;
  statut?: string;
  commentaire?: string;
};

type InterventionDetail = {
  id: string;
  ordre_travail_id: string;
  machine_id: string;
  technicien_id: string | null;
  date_debut: string | null;
  date_fin: string | null;
  duree_minutes: number | null;
  resultat: string | null;
  etat_machine_apres: string | null;
  commentaire: string | null;
  pieces_remplacees: string | null;
  etapes_gamme_checkees: EtapeGammeAffichee[] | null;
  image_avant_urls: string[] | null;
  image_apres_urls: string[] | null;
  valide: boolean;
  valide_le: string | null;
  client_valide: boolean;
  commentaire_client: string | null;
  created_at: string;
  ordre_travail: {
    id: string;
    numot?: string | number | null;
    type: string | null;
    statut: string | null;
    date_programmee: string | null;
    observations: string | null;
    machine: {
      id: string;
      nom: string;
      modele: string | null;
      numero_serie: string | null;
      fabricant: string | null;
      localisation: string | null;
      etat: string | null;
    } | null;
    plan: {
      numero: string | null;
      gamme?: {
        nom?: string | null;
        type?: string | null;
        description?: string | null;
        etapes_gamme?: Array<{
          id: string;
          ordre: number;
          description: string;
          duree_estimee: number | null;
          outil: string | null;
          piece: string | null;
          consigne_securite: string | null;
        }>;
      } | null;
    } | null;
  } | null;
  technicien: {
    id: string;
    nom: string;
    email: string | null;
  } | null;
  validateur: {
    id: string;
    nom: string;
  } | null;
};

function formatDate(dateString: string | null) {
  if (!dateString) return 'Non définie';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function formatDuration(minutes: number | null) {
  if (!minutes) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
}

export default function ClientInterventionDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [intervention, setIntervention] = useState<InterventionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [savingValidation, setSavingValidation] = useState(false);

  useEffect(() => {
    loadIntervention();
  }, [id, profile?.id]);

  async function loadIntervention() {
    if (!id || !profile) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('interventions')
        .select(`
          *,
          ordre_travail:ordres_travail!interventions_ot_fkey(
            id,
            numot,
            type,
            statut,
            date_programmee,
            observations,
            machine:machines(
              id,
              nom,
              modele,
              numero_serie,
              fabricant,
              localisation,
              etat
            ),
            plan:plans_maintenance(
              numero,
              gamme:gammes_maintenance(
                nom,
                type,
                description,
                etapes_gamme(
                  id,
                  ordre,
                  description,
                  duree_estimee,
                  outil,
                  piece,
                  consigne_securite
                )
              )
            )
          ),
          technicien:profiles!interventions_technicien_fkey(
            id,
            nom,
            email
          ),
          validateur:profiles!interventions_valide_par_fkey(
            id,
            nom
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setIntervention(data as InterventionDetail);
    } catch (err) {
      console.error('Erreur chargement intervention:', err);
      setError('Impossible de charger les détails de l\'intervention.');
    } finally {
      setLoading(false);
    }
  }

  const handleDownloadPdf = async () => {
    if (!intervention) return;

    try {
      setDownloadingPdf(true);
      const ordre = await fetchFullOrdreForPdf(intervention.ordre_travail_id);
      
      if (ordre.type?.toLowerCase().includes('prévent') || ordre.type?.toLowerCase().includes('prevent')) {
        await generateOTPdfReact(ordre);
      } else {
        await generateOTCPdfReact(ordre);
      }
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleClientValidate = async (interventionId: string, commentaireClient: string) => {
    try {
      setSavingValidation(true);

      const { data, error: updateError } = await supabase
        .from('interventions')
        .update({
          client_valide: true,
          commentaire_client: commentaireClient.trim() || null,
        })
        .eq('id', interventionId)
        .select('id, client_valide, commentaire_client')
        .single();

      if (updateError) throw updateError;

      // Mettre à jour l'état local
      if (intervention) {
        setIntervention({
          ...intervention,
          client_valide: data?.client_valide ?? true,
          commentaire_client: data?.commentaire_client ?? (commentaireClient.trim() || null),
        });
      }

      setShowValidationModal(false);
    } catch (err) {
      console.error('Erreur validation client:', err);
      alert("Impossible d'enregistrer la validation client.");
    } finally {
      setSavingValidation(false);
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-[#ff6b57]"></div>
        </div>
      </ClientLayout>
    );
  }

  if (error || !intervention) {
    return (
      <ClientLayout>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            <span className="font-semibold">{error || 'Intervention introuvable'}</span>
          </div>
        </div>
      </ClientLayout>
    );
  }

  const ot = intervention.ordre_travail;
  const machine = ot?.machine;
  const gamme = ot?.plan?.gamme;
  const etapesGamme: EtapeGammeAffichee[] = intervention.etapes_gamme_checkees?.length
    ? intervention.etapes_gamme_checkees
    : (gamme?.etapes_gamme || []);

  return (
    <ClientLayout>
      {/* En-tête */}
      <div className="mb-4 flex flex-col gap-3 md:mb-6">
        <button
          onClick={() => navigate('/mes-interventions')}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-[#ff6b57]"
        >
          <ArrowLeft size={16} />
          Retour aux interventions
        </button>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 md:text-2xl lg:text-3xl">
              Intervention #{intervention.id.slice(0, 8)}
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm">
              OT #{ot?.numot || intervention.ordre_travail_id.slice(0, 8)}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {!intervention.client_valide && (
              <button
                onClick={() => setShowValidationModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-200/50 transition-all hover:from-emerald-600 hover:to-emerald-700"
              >
                <CheckCircle2 size={18} />
                Valider intervention
              </button>
            )}
            
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200/50 transition-all hover:from-blue-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloadingPdf ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  Génération...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Télécharger PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
        {/* Informations OT */}
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="text-[#ff6b57]" size={20} />
            <h2 className="text-base font-black text-slate-900 md:text-lg">Ordre de Travail</h2>
          </div>

          <div className="space-y-3">
            <InfoRow label="Numéro OT" value={ot?.numot || '-'} />
            <InfoRow label="Type" value={ot?.type || '-'} />
            <InfoRow label="Statut" value={ot?.statut || '-'} />
            <InfoRow label="Date programmée" value={formatDate(ot?.date_programmee)} />
            {ot?.plan?.numero && <InfoRow label="Plan N°" value={ot.plan.numero} />}
            {gamme?.nom && <InfoRow label="Gamme" value={gamme.nom} />}
            {ot?.observations && (
              <div>
                <div className="text-xs font-bold text-slate-700">Observations</div>
                <div className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {ot.observations}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Informations Machine */}
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Settings className="text-[#ff6b57]" size={20} />
            <h2 className="text-base font-black text-slate-900 md:text-lg">Machine</h2>
          </div>

          <div className="space-y-3">
            <InfoRow label="Nom" value={machine?.nom || '-'} />
            <InfoRow label="Modèle" value={machine?.modele || '-'} />
            <InfoRow label="N° série" value={machine?.numero_serie || '-'} />
            <InfoRow label="Fabricant" value={machine?.fabricant || '-'} />
            <InfoRow label="Localisation" value={machine?.localisation || '-'} />
            <InfoRow label="État" value={machine?.etat || '-'} />
          </div>
        </div>

        {/* Gamme et étapes */}
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="text-[#ff6b57]" size={20} />
                <h2 className="text-base font-black text-slate-900 md:text-lg">Étapes de gamme</h2>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {gamme?.nom || 'Gamme non renseignée'}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-slate-500">
              {etapesGamme.length} étape{etapesGamme.length > 1 ? 's' : ''}
            </span>
          </div>

          {etapesGamme.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {[...etapesGamme]
                .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
                .map((etape, index) => (
                  <div key={etape.etape_id || etape.id || index} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {etape.ordre || index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {etape.description || 'Étape sans description'}
                      </p>
                      {etape.commentaire && (
                        <p className="mt-0.5 text-xs text-slate-500">{etape.commentaire}</p>
                      )}
                    </div>
                    {etape.statut && (
                      <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                        {etape.statut}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aucune étape de gamme enregistrée.</p>
          )}
        </div>

        {/* Informations Intervention */}
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Wrench className="text-[#ff6b57]" size={20} />
            <h2 className="text-base font-black text-slate-900 md:text-lg">Intervention</h2>
          </div>

          <div className="space-y-3">
            <InfoRow label="Date début" value={formatDate(intervention.date_debut)} icon={Calendar} />
            <InfoRow label="Date fin" value={formatDate(intervention.date_fin)} icon={Calendar} />
            <InfoRow label="Durée" value={formatDuration(intervention.duree_minutes)} icon={Clock} />
            <InfoRow label="Technicien" value={intervention.technicien?.nom || 'Non assigné'} icon={User} />
            <InfoRow label="Résultat" value={intervention.resultat || 'Non renseigné'} />
            <InfoRow label="État machine après" value={intervention.etat_machine_apres || '-'} />

            {/* Validations */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {intervention.valide ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <AlertCircle size={16} className="text-amber-600" />
                  )}
                  <span className="text-sm font-semibold text-slate-700">
                    {intervention.valide ? 'Validée par admin' : 'En attente admin'}
                  </span>
                </div>
                {intervention.valide && intervention.valide_le && (
                  <span className="text-xs text-slate-500">
                    {formatDate(intervention.valide_le)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {intervention.client_valide ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <AlertCircle size={16} className="text-amber-600" />
                  )}
                  <span className="text-sm font-semibold text-slate-700">
                    {intervention.client_valide ? 'Validée par client' : 'En attente client'}
                  </span>
                </div>
                {intervention.client_valide && intervention.commentaire_client && (
                  <button
                    onClick={() => setShowValidationModal(true)}
                    className="text-xs text-[#ff6b57] hover:underline"
                  >
                    Voir commentaire
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Commentaires et pièces */}
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="text-[#ff6b57]" size={20} />
            <h2 className="text-base font-black text-slate-900 md:text-lg">Détails</h2>
          </div>

          <div className="space-y-4">
            {intervention.commentaire && (
              <div>
                <div className="mb-2 text-xs font-bold text-slate-700">Commentaire technicien</div>
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {intervention.commentaire}
                </div>
              </div>
            )}

            {intervention.commentaire_client && (
              <div>
                <div className="mb-2 text-xs font-bold text-slate-700">Commentaire client</div>
                <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                  {intervention.commentaire_client}
                </div>
              </div>
            )}

            {intervention.pieces_remplacees && (
              <div>
                <div className="mb-2 text-xs font-bold text-slate-700">Pièces remplacées</div>
                <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                  {intervention.pieces_remplacees}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Images */}
      {((intervention.image_avant_urls && intervention.image_avant_urls.length > 0) ||
        (intervention.image_apres_urls && intervention.image_apres_urls.length > 0)) && (
        <div className="mt-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:mt-5 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <ImageIcon className="text-[#ff6b57]" size={20} />
            <h2 className="text-base font-black text-slate-900 md:text-lg">Photos</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {intervention.image_avant_urls && intervention.image_avant_urls.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold text-slate-700">Photos avant</div>
                <div className="grid grid-cols-2 gap-2">
                  {intervention.image_avant_urls.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(url)}
                      className="aspect-square overflow-hidden rounded-lg bg-slate-100 transition-transform hover:scale-105"
                    >
                      <img src={url} alt={`Avant ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {intervention.image_apres_urls && intervention.image_apres_urls.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold text-slate-700">Photos après</div>
                <div className="grid grid-cols-2 gap-2">
                  {intervention.image_apres_urls.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(url)}
                      className="aspect-square overflow-hidden rounded-lg bg-slate-100 transition-transform hover:scale-105"
                    >
                      <img src={url} alt={`Après ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal image */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Agrandie"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Modal de validation client */}
      <ClientInterventionValidationModal
        isOpen={showValidationModal}
        intervention={intervention ? {
          id: intervention.id,
          client_valide: intervention.client_valide,
          commentaire_client: intervention.commentaire_client,
          title: `Intervention #${intervention.id.slice(0, 8)}`,
          subtitle: machine?.nom,
        } : null}
        isSaving={savingValidation}
        onClose={() => setShowValidationModal(false)}
        onConfirm={handleClientValidate}
      />
    </ClientLayout>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-slate-400" />}
        <span className="text-xs font-bold text-slate-700">{label}</span>
      </div>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

// Fonction pour récupérer l'OT complet
async function fetchFullOrdreForPdf(otId: string): Promise<OrdreTravailDetail> {
  const { data: ordreData, error: ordreError } = await supabase
    .from('ordres_travail')
    .select(`
      id,
      type,
      date_programmee,
      date_execution,
      statut,
      numot,
      observations,
      ot_parent_id,
      created_at,
      machine:machine_id (
        id,
        machine_id,
        nom,
        modele,
        numero_serie,
        annee,
        fabricant,
        localisation,
        etat,
        puissance,
        tension,
        qte,
        poste_technique:poste_technique_id (
          id,
          code_pt,
          batiment,
          site:site_id (
            code,
            nom
          ),
          domaine:domaine_id (
            code,
            libelle
          ),
          secteur:secteur_id (
            code,
            libelle
          ),
          lot:lot_id (
            code,
            nom,
            description
          )
        ),
        client:client_id (
          id,
          raison_sociale,
          prenom,
          cin,
          telephone,
          adresse,
          logo_url
        )
      ),
      plans_maintenance:plan_id (
        id,
        numero,
        type_recurrence,
        intervalle,
        jour_semaine,
        semaine_du_mois,
        forcer_jour_semaine,
        date_debut,
        date_fin,
        statut,
        gamme:gamme_id (
          id,
          nom,
          description,
          type,
          etapes_gamme (
            id,
            ordre,
            description,
            duree_estimee,
            outil,
            piece,
            consigne_securite
          )
        )
      ),
      profile:technicien_id (
        id,
        nom,
        email,
        role
      )
    `)
    .eq('id', otId)
    .single();

  if (ordreError) throw ordreError;
  if (!ordreData) throw new Error('Ordre de travail non trouvé');

  const { data: interventionsData, error: interventionsError } = await supabase
    .from('interventions')
    .select(`
      id,
      date_debut,
      date_fin,
      duree_minutes,
      resultat,
      etat_machine_apres,
      pieces_remplacees,
      etapes_gamme_checkees,
      image_avant_urls,
      image_apres_urls,
      commentaire,
      valide,
      valide_par,
      valide_le,
      client_valide,
      commentaire_client,
      created_at,
      updated_at,
      technicien:profiles!interventions_technicien_fkey (
        id,
        nom,
        email
      ),
      validateur:profiles!interventions_valide_par_fkey (
        id,
        nom
      )
    `)
    .eq('ordre_travail_id', otId)
    .order('date_debut', { ascending: false });

  if (interventionsError) throw interventionsError;

  let otParent = null;
  if (ordreData.ot_parent_id) {
    const { data: parentData } = await supabase
      .from('ordres_travail')
      .select('id, numot, type, statut')
      .eq('id', ordreData.ot_parent_id)
      .single();
    otParent = parentData;
  }

  const { data: correctifData } = await supabase
    .from('ordres_travail')
    .select('id, numot, type, statut')
    .eq('ot_parent_id', otId)
    .maybeSingle();

  return {
    ...ordreData,
    interventions: interventionsData || [],
    ot_parent: otParent,
    ot_correctif: correctifData,
  } as OrdreTravailDetail;
}
