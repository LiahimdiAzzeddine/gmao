import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { AlertCircle, Download, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateOTPdfReact } from '../utils/generateOTPdfReact';
import { generateOTCPdfReact } from '../utils/generateOTCPdfReact';
import { generateOTPdf } from '../utils/generateOTPdf';
import type { OrdreTravailDetail } from '../types/ot';

type ClientOTSummary = {
  id: string;
  numot?: string | null;
  type: string;
  interventions?: PdfIntervention[];
};

type ValidationFilter = 'tous' | 'valide' | 'non_valide';
type PdfTypeFilter = 'tous' | 'preventif' | 'correctif';
type PdfTemplate = 'modern' | 'classic';

type PdfFilters = {
  dateDebut: string;
  dateFin: string;
  validationAdmin: ValidationFilter;
  validationClient: ValidationFilter;
  type: PdfTypeFilter;
};

type PdfIntervention = {
  id?: string;
  date_debut?: string | null;
  date_fin?: string | null;
  valide?: boolean | null;
  client_valide?: boolean | null;
};

type ClientOtPdfDownloadButtonProps = {
  className?: string;
};

export default function ClientOtPdfDownloadButton({ className }: ClientOtPdfDownloadButtonProps) {
  const { profile, client } = useAuth();
  const [ordres, setOrdres] = useState<ClientOTSummary[]>([]);
  const [loadingOrdres, setLoadingOrdres] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplate>('modern');
  const [pdfFilters, setPdfFilters] = useState<PdfFilters>({
    dateDebut: '',
    dateFin: '',
    validationAdmin: 'tous',
    validationClient: 'tous',
    type: 'tous',
  });

  useEffect(() => {
    if (showPdfModal && ordres.length === 0 && !loadingOrdres) {
      loadClientOTForPdf();
    }
  }, [showPdfModal, ordres.length, loadingOrdres, profile?.id, client?.id]);

  const ordresForPdf = useMemo(() => filterOrdresForPdf(ordres, pdfFilters), [ordres, pdfFilters]);

  const updatePdfFilter = <K extends keyof PdfFilters>(key: K, value: PdfFilters[K]) => {
    setPdfFilters((current) => ({ ...current, [key]: value }));
    setPdfError(null);
  };

  async function loadClientOTForPdf() {
    if (!profile) return;

    try {
      setLoadingOrdres(true);
      setPdfError(null);

      let clientId = client?.id;
      if (!clientId) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (clientError) throw clientError;
        clientId = clientData?.id;
      }

      if (!clientId) {
        setOrdres([]);
        return;
      }

      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select('id')
        .eq('client_id', clientId);

      if (machinesError) throw machinesError;

      const machineIds = (machinesData || []).map((machine) => machine.id);
      if (machineIds.length === 0) {
        setOrdres([]);
        return;
      }

      const { data, error: ordresError } = await supabase
        .from('ordres_travail')
        .select(`
          id,
          numot,
          type,
          interventions:interventions!interventions_ot_fkey(
            id,
            valide,
            date_debut,
            date_fin,
            client_valide
          )
        `)
        .in('machine_id', machineIds)
        .order('date_programmee', { ascending: false });

      if (ordresError) throw ordresError;
      setOrdres((data || []) as ClientOTSummary[]);
    } catch (err) {
      console.error('Erreur chargement OT client pour PDF:', err);
      setPdfError('Impossible de charger les OT pour le telechargement.');
    } finally {
      setLoadingOrdres(false);
    }
  }

  const handleGenerateMassPdf = async () => {
    const matchingOrdres = filterOrdresForPdf(ordres, pdfFilters);

    if (matchingOrdres.length === 0) {
      setPdfError('Aucun OT ne correspond aux filtres selectionnes.');
      return;
    }

    setGeneratingPdf(true);
    setPdfProgress({ current: 0, total: matchingOrdres.length });
    setPdfError(null);

    try {
      const zip = new JSZip();

      for (let index = 0; index < matchingOrdres.length; index += 1) {
        const ot = matchingOrdres[index];
        const ordre = await fetchFullOrdreForPdf(ot.id);
        const matchingInterventions = (ordre.interventions || []).filter((intervention) =>
          matchesPdfFilters(intervention, pdfFilters)
        );

        const ordreForPdf = {
          ...ordre,
          interventions: matchingInterventions,
        };
        const isPreventive = normalizeOtType(ordre.type) === 'preventif';
        const pdfBlob = isPreventive
          ? pdfTemplate === 'classic'
            ? await generateOTPdf(ordreForPdf, { download: false })
            : await generateOTPdfReact(ordreForPdf, { download: false })
          : await generateOTCPdfReact(ordreForPdf, { download: false });

        zip.file(buildPdfFileName(ordre, index), pdfBlob);
        setPdfProgress({ current: index + 1, total: matchingOrdres.length });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, buildZipFileName(pdfFilters));
      setShowPdfModal(false);
    } catch (err) {
      console.error('Erreur generation PDF en masse:', err);
      setPdfError('Erreur lors de la generation du fichier ZIP.');
    } finally {
      setGeneratingPdf(false);
      setPdfProgress({ current: 0, total: 0 });
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setPdfError(null);
          setShowPdfModal(true);
        }}
        className={className || 'inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold transition-colors'}
      >
        <Download size={18} />
        Telecharger PDF
      </button>

      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Telecharger les PDF OT</h3>
                <p className="text-sm text-slate-600">
                  Choisir le template et filtrer les interventions avant génération.
                </p>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                disabled={generatingPdf}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                title="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <fieldset disabled={generatingPdf}>
                <legend className="mb-2 text-sm font-semibold text-slate-700">Template PDF</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPdfTemplate('modern')}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${pdfTemplate === 'modern' ? 'border-orange-500 bg-orange-50 text-orange-800' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                  >
                    <span className="block text-sm font-bold">Template moderne</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfTemplate('classic')}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${pdfTemplate === 'classic' ? 'border-orange-500 bg-orange-50 text-orange-800' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                  >
                    <span className="block text-sm font-bold">Template classique</span>
                  </button>
                </div>
                {pdfFilters.type !== 'preventif' && (
                  <p className="mt-2 text-xs text-slate-500">Les OT correctifs conservent leur template correctif adapté.</p>
                )}
              </fieldset>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Date debut</span>
                  <input
                    type="date"
                    value={pdfFilters.dateDebut}
                    onChange={(event) => updatePdfFilter('dateDebut', event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Date fin</span>
                  <input
                    type="date"
                    value={pdfFilters.dateFin}
                    onChange={(event) => updatePdfFilter('dateFin', event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Validation admin</span>
                  <select
                    value={pdfFilters.validationAdmin}
                    onChange={(event) => updatePdfFilter('validationAdmin', event.target.value as ValidationFilter)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="tous">Toutes</option>
                    <option value="valide">Acceptees par admin</option>
                    <option value="non_valide">Non acceptees par admin</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Validation client</span>
                  <select
                    value={pdfFilters.validationClient}
                    onChange={(event) => updatePdfFilter('validationClient', event.target.value as ValidationFilter)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="tous">Toutes</option>
                    <option value="valide">Acceptees par client</option>
                    <option value="non_valide">Non acceptees par client</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">Type d'OT</span>
                <select
                  value={pdfFilters.type}
                  onChange={(event) => updatePdfFilter('type', event.target.value as PdfTypeFilter)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="tous">Preventif et correctif</option>
                  <option value="preventif">Preventif uniquement</option>
                  <option value="correctif">Correctif uniquement</option>
                </select>
              </label>

              <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800">
                {loadingOrdres
                  ? 'Chargement des OT...'
                  : `${ordresForPdf.length} OT avec intervention correspondante seront telecharges.`}
              </div>

              {pdfError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{pdfError}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowPdfModal(false)}
                disabled={generatingPdf}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleGenerateMassPdf}
                disabled={generatingPdf || loadingOrdres || ordresForPdf.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {generatingPdf ? 'Generation...' : 'Telecharger'}
              </button>
            </div>
          </div>
        </div>
      )}

      {generatingPdf && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-2xl">
            <Loader2 size={42} className="mx-auto mb-4 animate-spin text-orange-600" />
            <h3 className="text-lg font-bold text-slate-900">Creation du fichier ZIP</h3>
            <p className="mt-2 text-sm text-slate-600">
              {pdfProgress.total} PDF a creer
            </p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-orange-600 transition-all duration-300"
                style={{
                  width: `${pdfProgress.total > 0 ? Math.round((pdfProgress.current / pdfProgress.total) * 100) : 0}%`,
                }}
              />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">
              {pdfProgress.current} / {pdfProgress.total} PDF genere{pdfProgress.current > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function matchesPdfFilters(intervention: PdfIntervention, filters: PdfFilters) {
  const interventionDate = intervention.date_debut || intervention.date_fin;
  if (!interventionDate) return false;

  const timestamp = new Date(interventionDate).getTime();
  if (Number.isNaN(timestamp)) return false;

  if (filters.dateDebut) {
    const start = new Date(`${filters.dateDebut}T00:00:00`).getTime();
    if (timestamp < start) return false;
  }

  if (filters.dateFin) {
    const end = new Date(`${filters.dateFin}T23:59:59.999`).getTime();
    if (timestamp > end) return false;
  }

  if (filters.validationAdmin === 'valide' && intervention.valide !== true) return false;
  if (filters.validationAdmin === 'non_valide' && intervention.valide === true) return false;
  if (filters.validationClient === 'valide' && intervention.client_valide !== true) return false;
  if (filters.validationClient === 'non_valide' && intervention.client_valide === true) return false;

  return true;
}

function filterOrdresForPdf(ordres: ClientOTSummary[], filters: PdfFilters) {
  return ordres.filter((ot) =>
    matchesPdfTypeFilter(ot, filters.type) &&
    (ot.interventions || []).some((intervention) => matchesPdfFilters(intervention, filters))
  );
}

function matchesPdfTypeFilter(ot: ClientOTSummary, typeFilter: PdfTypeFilter) {
  if (typeFilter === 'tous') return true;

  const normalizedType = normalizeOtType(ot.type);
  return normalizedType === typeFilter;
}

function normalizeOtType(type: string | null | undefined): PdfTypeFilter | 'autre' {
  const normalized = (type || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized.includes('prevent')) return 'preventif';
  if (normalized.includes('correct')) return 'correctif';

  return 'autre';
}

async function fetchFullOrdreForPdf(otId: string) {
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
  if (!ordreData) throw new Error('Ordre de travail non trouve');

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
  } as OrdreTravailDetail & { interventions?: PdfIntervention[] };
}

function buildPdfFileName(ordre: OrdreTravailDetail, index: number) {
  const numot = ordre.numot ? String(ordre.numot) : `sans-numero-${index + 1}`;
  const machineName = sanitizeFileName(ordre.machine?.nom || 'machine');
  const prefix = normalizeOtType(ordre.type) === 'preventif' ? 'OT' : 'OTC';

  return `${String(index + 1).padStart(3, '0')}_${prefix}_${numot}_${machineName}.pdf`;
}

function buildZipFileName(filters: PdfFilters) {
  const start = filters.dateDebut || 'debut';
  const end = filters.dateFin || 'fin';

  return `OT_${start}_${end}.zip`;
}

function sanitizeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
