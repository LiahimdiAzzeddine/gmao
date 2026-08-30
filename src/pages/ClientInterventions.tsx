import { useEffect, useMemo, useState } from 'react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardList,
  Eye,
  Search,
  User,
  Wrench,
  X,
  XCircle,
  MessageSquare,
  Download,
  Loader2,
  Zap,
} from 'lucide-react';
import EmptyState from '../components/Ui/EmptyState';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ClientInterventionValidationModal from '../components/ClientInterventionValidationModal';
import ClientLayout from '../components/ClientLayout';
import { generateOTPdfReact } from '../utils/generateOTPdfReact';
import { generateOTCPdfReact } from '../utils/generateOTCPdfReact';
import { generateOTPdf } from '../utils/generateOTPdf';
import type { OrdreTravailDetail } from '../types/ot';
import { getInterventionValidationConfig } from '../utils/interventionStatus';

type ClientIntervention = {
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
    machine: {
      id: string;
      nom: string;
      modele: string | null;
      numero_serie: string | null;
    } | null;
    plan: {
      gamme?: {
        nom?: string | null;
        type?: string | null;
      } | null;
    } | null;
  } | null;
  technicien: {
    id: string;
    nom: string;
  } | null;
};

type ValidationFilter = 'tous' | 'valide' | 'non_valide';
type PdfTypeFilter = 'tous' | 'preventif' | 'correctif';
type PdfTemplate = 'modern' | 'classic';

type PdfFilters = {
  dateDebut: string;
  dateFin: string;
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

type ClientOTSummary = {
  id: string;
  type: string | null;
  interventions?: PdfIntervention[];
};

function formatDate(dateString: string | null) {
  if (!dateString) return 'Non définie';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
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

function getResultConfig(resultat: string | null) {
  const configs: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
    réussi: {
      label: 'Réussie',
      icon: CheckCircle2,
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    partiel: {
      label: 'Partielle',
      icon: AlertCircle,
      className: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    échec: {
      label: 'Échec',
      icon: XCircle,
      className: 'bg-red-100 text-red-800 border-red-200',
    },
  };

  return configs[resultat || ''] || {
    label: resultat || 'Non renseigné',
    icon: Clock,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

function getTypeClass(type: string | null) {
  const configs: Record<string, string> = {
    préventive: 'bg-purple-100 text-purple-800 border-purple-200',
    preventive: 'bg-purple-100 text-purple-800 border-purple-200',
    corrective: 'bg-orange-100 text-orange-800 border-orange-200',
    curative: 'bg-red-100 text-red-800 border-red-200',
  };

  return configs[type || ''] || 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function ClientInterventions() {
  const { profile, client } = useAuth();
  const navigate = useNavigate();
  
  // Calculer les dates de début et fin de l'année actuelle
  const currentYear = new Date().getFullYear();
  const defaultDateDebut = `${currentYear}-01-01`;
  const defaultDateFin = `${currentYear}-12-31`;
  
  const [interventions, setInterventions] = useState<ClientIntervention[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateDebut, setDateDebut] = useState(defaultDateDebut);
  const [dateFin, setDateFin] = useState(defaultDateFin);
  const [filterValidation, setFilterValidation] = useState('tous');
  const [clientMachineIds, setClientMachineIds] = useState<string[]>([]);
  const [savingClientValidationId, setSavingClientValidationId] = useState<string | null>(null);
  const [selectedClientValidation, setSelectedClientValidation] = useState<ClientIntervention | null>(null);

  // États pour le modal PDF
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [loadingPdfOrdres, setLoadingPdfOrdres] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplate>('modern');
  const [pdfOrdres, setPdfOrdres] = useState<ClientOTSummary[]>([]);
  const [pdfFilters, setPdfFilters] = useState<PdfFilters>({
    dateDebut: defaultDateDebut,
    dateFin: defaultDateFin,
    validationClient: 'tous',
    type: 'tous',
  });

  const observerTarget = React.useRef<HTMLDivElement>(null);
  const itemsPerPage = 20;

  useEffect(() => {
    // Réinitialiser et charger la première page quand les filtres changent
    setInterventions([]);
    setCurrentPage(0);
    setHasMore(true);
    loadClientInterventions(0, true);
  }, [profile?.id, client?.id, dateDebut, dateFin]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadClientInterventions(currentPage + 1, false);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, loadingMore, currentPage]);

  async function loadClientInterventions(page: number, reset: boolean) {
    if (!profile) return;

    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

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
        setInterventions([]);
        setHasMore(false);
        return;
      }

      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select('id')
        .eq('client_id', clientId);

      if (machinesError) throw machinesError;

      const machineIds = (machinesData || []).map((machine) => machine.id);
      setClientMachineIds(machineIds);
      if (machineIds.length === 0) {
        setInterventions([]);
        setHasMore(false);
        return;
      }

      // Requête de base avec pagination et count
      const from = page * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('interventions')
        .select(`
          *,
          ordre_travail:ordres_travail!interventions_ot_fkey(
            id,
            numot,
            type,
            statut,
            date_programmee,
            machine:machines(
              id,
              nom,
              modele,
              numero_serie
            ),
            plan:plans_maintenance(
              gamme:gammes_maintenance(
                nom,
                type
              )
            )
          ),
          technicien:profiles!interventions_technicien_fkey(
            id,
            nom
          )
        `, { count: 'exact' })
        .in('machine_id', machineIds);

      // Filtre par date de début (année actuelle par défaut)
      if (dateDebut) {
        query = query.gte('date_debut', dateDebut);
      }

      // Filtre par date de fin
      if (dateFin) {
        // Ajouter 23:59:59 à la date de fin
        const endDate = new Date(dateFin);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('date_debut', endDate.toISOString());
      }

      const { data, error: interventionsError, count } = await query
        .order('date_debut', { ascending: false })
        .range(from, to);

      if (interventionsError) throw interventionsError;

      const newInterventions = (data || []) as ClientIntervention[];
      
      if (reset) {
        setInterventions(newInterventions);
        setTotalCount(count || 0);
      } else {
        setInterventions((prev) => [...prev, ...newInterventions]);
      }

      setCurrentPage(page);
      setHasMore(newInterventions.length === itemsPerPage);
    } catch (err) {
      console.error('Erreur chargement interventions client:', err);
      setError('Impossible de charger les interventions du client.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const filteredInterventions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return interventions.filter((intervention) => {
      const ot = intervention.ordre_travail;
      const matchesSearch = !query ||
        intervention.id.toLowerCase().includes(query) ||
        String(ot?.numot || '').toLowerCase().includes(query) ||
        ot?.machine?.nom?.toLowerCase().includes(query) ||
        ot?.machine?.modele?.toLowerCase().includes(query) ||
        intervention.technicien?.nom?.toLowerCase().includes(query) ||
        ot?.plan?.gamme?.nom?.toLowerCase().includes(query) ||
        intervention.commentaire?.toLowerCase().includes(query);

      // Filtre par validation client
      const matchesValidation = filterValidation === 'tous'
        ? true
        : filterValidation === 'validees'
          ? intervention.client_valide
          : !intervention.client_valide;

      return matchesSearch && matchesValidation;
    });
  }, [interventions, searchTerm, filterValidation]);

  const stats = {
    total: interventions.length,
    valideesAdmin: interventions.filter((intervention) => intervention.valide).length,
    valideesClient: interventions.filter((intervention) => intervention.client_valide).length,
    attenteClient: interventions.filter((intervention) => !intervention.client_valide).length,
    reussies: interventions.filter((intervention) => intervention.resultat === 'réussi').length,
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDateDebut(defaultDateDebut);
    setDateFin(defaultDateFin);
    setFilterValidation('tous');
  };

  const hasFilters = searchTerm.trim() || dateDebut !== defaultDateDebut || dateFin !== defaultDateFin || filterValidation !== 'tous';

  async function handleClientValidate(interventionId: string, commentaireClient: string) {
    const intervention = interventions.find((item) => item.id === interventionId);
    if (!intervention || intervention.client_valide) return;

    try {
      setSavingClientValidationId(interventionId);

      const { data, error: updateError } = await supabase
        .from('interventions')
        .update({
          client_valide: true,
          commentaire_client: commentaireClient.trim() || null,
        })
        .eq('id', interventionId)
        .in('machine_id', clientMachineIds)
        .select('id, client_valide, commentaire_client')
        .single();

      if (updateError) throw updateError;

      setInterventions((current) =>
        current.map((item) =>
          item.id === interventionId
            ? {
                ...item,
                client_valide: data?.client_valide ?? true,
                commentaire_client: data?.commentaire_client ?? (commentaireClient.trim() || null),
              }
            : item
        )
      );
      setSelectedClientValidation(null);
    } catch (err) {
      console.error('Erreur validation client:', err);
      setError("Impossible d'enregistrer la validation client.");
    } finally {
      setSavingClientValidationId(null);
    }
  }

  // ==================== FONCTIONS POUR MODAL PDF ====================

  async function openPdfModal() {
    setPdfError(null);
    setShowPdfModal(true);

    if (pdfOrdres.length > 0) return;

    try {
      setLoadingPdfOrdres(true);
      
      // Récupérer le client_id
      let clientId = client?.id;
      if (!clientId && profile) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();
        clientId = clientData?.id;
      }

      if (!clientId) {
        setPdfError('Client non trouvé.');
        return;
      }

      // Récupérer les machines du client
      const { data: machinesData } = await supabase
        .from('machines')
        .select('id')
        .eq('client_id', clientId);

      const machineIds = (machinesData || []).map((m) => m.id);

      if (machineIds.length === 0) {
        setPdfOrdres([]);
        return;
      }

      // Récupérer les OT des machines du client
      const { data, error } = await supabase
        .from('ordres_travail')
        .select(`
          id,
          type,
          interventions:interventions!interventions_ot_fkey(
            id,
            date_debut,
            date_fin,
            valide,
            client_valide
          )
        `)
        .in('machine_id', machineIds)
        .order('date_programmee', { ascending: false });

      if (error) throw error;
      setPdfOrdres((data || []) as ClientOTSummary[]);
    } catch (err) {
      console.error('Erreur chargement OT pour PDF:', err);
      setPdfError('Impossible de charger les OT pour le téléchargement.');
    } finally {
      setLoadingPdfOrdres(false);
    }
  }

  const updatePdfFilter = <K extends keyof PdfFilters>(key: K, value: PdfFilters[K]) => {
    setPdfFilters((current) => ({ ...current, [key]: value }));
    setPdfError(null);
  };

  const ordresForPdf = filterOrdresForPdf(pdfOrdres, pdfFilters);

  const handleGenerateMassPdf = async () => {
    const matchingOrdres = filterOrdresForPdf(pdfOrdres, pdfFilters);

    if (matchingOrdres.length === 0) {
      setPdfError('Aucun OT ne correspond aux filtres sélectionnés.');
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
        const matchingInterventions = (ordre.interventions || []).filter((intervention: any) =>
          matchesPdfFilters(intervention, pdfFilters)
        );

        const ordreForPdf: any = {
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
      console.error('Erreur génération PDF client:', err);
      setPdfError('Erreur lors de la génération du fichier ZIP.');
    } finally {
      setGeneratingPdf(false);
      setPdfProgress({ current: 0, total: 0 });
    }
  };

  return (
    <ClientLayout>
      {/* En-tête page - Style Dashboard */}
      <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 md:text-2xl lg:text-3xl">Mes interventions</h1>
          <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm">
            Consultez et validez les interventions de vos machines
          </p>
        </div>
        <div className="hidden rounded-lg border border-[#ff6b57]/30 bg-white px-3 py-1.5 text-xs font-bold text-[#ff6b57] md:block md:px-4 md:py-2 md:text-sm">
          {filteredInterventions.length} / {totalCount} interventions
        </div>
      </div>

      {/* Actions Rapides */}
      <div className="mb-4 md:mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 ring-1 ring-slate-100">
          <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2 md:text-lg">
            <Zap size={18} className="text-[#ff6b57]" />
            Actions Rapides
          </h2>
          <button
            onClick={openPdfModal}
            className="inline-flex items-center gap-3 w-full sm:w-auto px-4 py-3 bg-gradient-to-r from-[#ff6b57] to-[#f04438] text-white rounded-lg hover:from-[#f04438] hover:to-[#ff6b57] font-semibold text-sm transition-all shadow-sm hover:shadow-md"
          >
            <Download size={18} />
            <div className="text-left">
              <div className="font-bold">Télécharger PDF OT</div>
              <div className="text-xs opacity-90">Exporter les interventions dans un ZIP</div>
            </div>
          </button>
        </div>
      </div>

        {/* Filtres et recherche - Style Dashboard amélioré */}
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher par intervention, machine, technicien, OT..."
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#ff6b57] focus:border-transparent text-sm transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(event) => setDateDebut(event.target.value)}
                  placeholder="Date de début"
                  className="w-full sm:w-44 pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#ff6b57] focus:border-transparent text-sm bg-white transition-all"
                />
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  value={dateFin}
                  onChange={(event) => setDateFin(event.target.value)}
                  placeholder="Date de fin"
                  className="w-full sm:w-44 pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#ff6b57] focus:border-transparent text-sm bg-white transition-all"
                />
              </div>

              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  value={filterValidation}
                  onChange={(event) => setFilterValidation(event.target.value)}
                  className="w-full sm:w-44 pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#ff6b57] focus:border-transparent text-sm bg-white transition-all"
                >
                  <option value="tous">Toutes</option>
                  <option value="validees">Validées client</option>
                  <option value="attente">En attente client</option>
                </select>
              </div>

              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold text-sm transition-colors"
                >
                  <X size={16} />
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 text-xs font-semibold text-slate-500 sm:text-sm">
            {filteredInterventions.length} intervention{filteredInterventions.length > 1 ? 's' : ''} affichée{filteredInterventions.length > 1 ? 's' : ''}
          </div>
        </div>

        {error && (
          <div className="mt-4 md:mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-4 md:mt-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="space-y-3 animate-pulse">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="h-14 bg-slate-100 rounded-lg" />
              ))}
            </div>
          </div>
        ) : filteredInterventions.length === 0 ? (
          <div className="mt-4 md:mt-6">
            <EmptyState
              title={hasFilters ? 'Aucune intervention trouvée' : 'Aucune intervention'}
              message={hasFilters ? 'Aucune intervention ne correspond à vos filtres.' : "Aucune intervention n'est rattachée à vos machines."}
            />
          </div>
        ) : (
          <>
            {/* Cartes mobile - Style Dashboard */}
            <div className="mt-4 md:mt-6 md:hidden space-y-3">
              {filteredInterventions.map((intervention) => (
                <InterventionCard
                  key={intervention.id}
                  intervention={intervention}
                  onOpenIntervention={() => navigate(`/mes-interventions/${intervention.id}`)}
                  onOpenClientValidation={() => setSelectedClientValidation(intervention)}
                />
              ))}
            </div>

            {/* Tableau desktop */}
            <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:mt-6 md:block">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Liste des interventions</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Suivi des réalisations et des validations</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {filteredInterventions.length} affichée{filteredInterventions.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px]">
                  <thead className="border-b border-slate-200 bg-slate-50/90">
                    <tr>
                      <Th>Intervention / OT</Th>
                      <Th>Machine / Gamme</Th>
                      <Th>Type</Th>
                      <Th>Technicien</Th>
                      <Th>Exécution</Th>
                      <Th>Résultat</Th>
                      <Th>Validations</Th>
                      <Th align="center" sticky>Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInterventions.map((intervention) => (
                      <InterventionRow
                        key={intervention.id}
                        intervention={intervention}
                        onOpenIntervention={() => navigate(`/mes-interventions/${intervention.id}`)}
                        onOpenClientValidation={() => setSelectedClientValidation(intervention)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="mt-4 flex justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#ff6b57]"></div>
                  Chargement...
                </div>
              )}
              {!hasMore && filteredInterventions.length > 0 && (
                <div className="text-sm text-slate-500 py-4">
                  Toutes les interventions sont affichées
                </div>
              )}
            </div>
          </>
        )}

      <ClientInterventionValidationModal
        isOpen={Boolean(selectedClientValidation)}
        intervention={selectedClientValidation ? {
          id: selectedClientValidation.id,
          client_valide: selectedClientValidation.client_valide,
          commentaire_client: selectedClientValidation.commentaire_client,
          title: `Intervention #${selectedClientValidation.id.slice(0, 8)}`,
          subtitle: selectedClientValidation.ordre_travail?.machine?.nom || undefined,
        } : null}
        isSaving={savingClientValidationId === selectedClientValidation?.id}
        onClose={() => setSelectedClientValidation(null)}
        onConfirm={handleClientValidate}
      />

      {/* Modal PDF OT */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Télécharger les PDF OT</h3>
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
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${pdfTemplate === 'modern' ? 'border-[#ff6b57] bg-[#ff6b57]/10 text-[#d93c2b]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                  >
                    <span className="block text-sm font-bold">Template moderne</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfTemplate('classic')}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${pdfTemplate === 'classic' ? 'border-[#ff6b57] bg-[#ff6b57]/10 text-[#d93c2b]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
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
                  <span className="text-sm font-semibold text-slate-700">Date début</span>
                  <input
                    type="date"
                    value={pdfFilters.dateDebut}
                    onChange={(event) => updatePdfFilter('dateDebut', event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#ff6b57] focus:ring-2 focus:ring-[#ff6b57]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Date fin</span>
                  <input
                    type="date"
                    value={pdfFilters.dateFin}
                    onChange={(event) => updatePdfFilter('dateFin', event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#ff6b57] focus:ring-2 focus:ring-[#ff6b57]"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Validation client</span>
                  <select
                    value={pdfFilters.validationClient}
                    onChange={(event) => updatePdfFilter('validationClient', event.target.value as ValidationFilter)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#ff6b57] focus:ring-2 focus:ring-[#ff6b57]"
                  >
                    <option value="tous">Toutes</option>
                    <option value="valide">Validées par moi</option>
                    <option value="non_valide">Non validées par moi</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Type d'OT</span>
                  <select
                    value={pdfFilters.type}
                    onChange={(event) => updatePdfFilter('type', event.target.value as PdfTypeFilter)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#ff6b57] focus:ring-2 focus:ring-[#ff6b57]"
                  >
                    <option value="tous">Préventif et correctif</option>
                    <option value="preventif">Préventif uniquement</option>
                    <option value="correctif">Correctif uniquement</option>
                  </select>
                </label>
              </div>

              <div className="rounded-lg border border-[#ff6b57]/30 bg-[#ff6b57]/10 px-4 py-3 text-sm font-medium text-[#ff6b57]">
                {loadingPdfOrdres
                  ? 'Chargement des OT...'
                  : `${ordresForPdf.length} OT avec intervention correspondante seront téléchargés.`}
              </div>

              {pdfError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {pdfError}
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
                disabled={generatingPdf || loadingPdfOrdres || ordresForPdf.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ff6b57] to-[#f04438] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:from-[#f04438] hover:to-[#ff6b57] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {generatingPdf ? 'Génération...' : 'Télécharger'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de progression */}
      {generatingPdf && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-2xl">
            <Loader2 size={42} className="mx-auto mb-4 animate-spin text-[#ff6b57]" />
            <h3 className="mb-2 text-lg font-bold text-slate-900">Génération en cours...</h3>
            <p className="mb-4 text-sm text-slate-600">
              {pdfProgress.current} / {pdfProgress.total} PDF générés
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-gradient-to-r from-[#ff6b57] to-[#f04438] transition-all duration-300"
                style={{
                  width: `${pdfProgress.total > 0 ? (pdfProgress.current / pdfProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </ClientLayout>
  );
}

function Th({ children, align = 'left', sticky = false }: { children: React.ReactNode; align?: 'left' | 'center'; sticky?: boolean }) {
  return (
    <th className={`px-5 py-3.5 ${align === 'center' ? 'text-center' : 'text-left'} ${sticky ? 'sticky right-0 bg-slate-50 shadow-[-5px_0_10px_-8px_rgba(15,23,42,0.35)]' : ''} text-[11px] font-black uppercase tracking-[0.08em] text-slate-500`}>
      {children}
    </th>
  );
}

function InterventionRow({
  intervention,
  onOpenIntervention,
  onOpenClientValidation,
}: {
  intervention: ClientIntervention;
  onOpenIntervention: () => void;
  onOpenClientValidation: () => void;
}) {
  const ot = intervention.ordre_travail;
  const result = getResultConfig(intervention.resultat);
  const ResultIcon = result.icon;
  const adminValidation = getInterventionValidationConfig(intervention.valide, 'admin');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      
      // Récupérer l'OT complet
      const ordre = await fetchFullOrdreForPdf(intervention.ordre_travail_id);
      
      // Générer le PDF selon le type
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

  return (
    <tr className="group transition-colors hover:bg-orange-50/30">
      <td className="px-5 py-4 align-top">
        <button type="button" onClick={onOpenIntervention} className="text-left">
          <span className="block font-mono text-sm font-black text-slate-900 transition group-hover:text-[#d93f34]">
            #{intervention.id.slice(0, 8)}
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-slate-500">
            <ClipboardList size={12} /> OT #{ot?.numot || intervention.ordre_travail_id?.slice(0, 8) || '-'}
          </span>
        </button>
      </td>
      <td className="max-w-[280px] px-5 py-4 align-top">
        <div className="truncate text-sm font-black text-slate-900" title={ot?.machine?.nom || undefined}>{ot?.machine?.nom || 'Machine inconnue'}</div>
        <div className="mt-1 truncate text-xs text-slate-500">{ot?.machine?.modele || ot?.machine?.numero_serie || 'Modèle non renseigné'}</div>
        <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600" title={ot?.plan?.gamme?.nom || undefined}>
          <Wrench size={12} className="flex-shrink-0" />
          <span className="truncate">{ot?.plan?.gamme?.nom || 'Gamme non renseignée'}</span>
        </div>
      </td>
      <td className="px-5 py-4 align-top">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${getTypeClass(ot?.type || null)}`}>
          {ot?.type || 'Non défini'}
        </span>
      </td>
      <td className="px-5 py-4 align-top">
        {intervention.technicien ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500"><User size={14} /></span>
            <span className="max-w-36 truncate" title={intervention.technicien.nom}>{intervention.technicien.nom}</span>
          </div>
        ) : <span className="text-sm italic text-slate-400">Non assigné</span>}
      </td>
      <td className="px-5 py-4 align-top">
        <div className="flex items-start gap-2 text-sm font-semibold text-slate-700">
          <Calendar size={15} className="mt-0.5 flex-shrink-0 text-slate-400" />
          <span>{formatDate(intervention.date_debut)}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2 pl-[23px] text-xs font-medium text-slate-500">
          <Clock size={13} /> {formatDuration(intervention.duree_minutes)}
        </div>
      </td>
      <td className="px-5 py-4 align-top">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${result.className}`}>
          <ResultIcon size={12} /> {result.label}
        </span>
      </td>
      <td className="min-w-[190px] px-5 py-4 align-top">
        <div className="space-y-2">
          <div>
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Administrateur</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${adminValidation.className}`}>
              {intervention.valide ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}{adminValidation.label}
            </span>
          </div>
          <div>
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Client</span>
            <ClientValidationStatus intervention={intervention} onOpen={onOpenClientValidation} />
          </div>
        </div>
      </td>
      <td className="sticky right-0 bg-white px-4 py-4 align-top shadow-[-5px_0_10px_-8px_rgba(15,23,42,0.35)]">
        <div className="flex justify-center gap-1.5">
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            title="Télécharger PDF OT"
          >
            {downloadingPdf ? (
              <div className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-blue-300 border-t-blue-600"></div>
            ) : (
              <Download size={18} />
            )}
          </button>
          <button
            onClick={onOpenIntervention}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff6b57] text-white transition hover:bg-[#e54838]"
            title="Voir détails intervention"
          >
            <Eye size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function InterventionCard({
  intervention,
  onOpenIntervention,
  onOpenClientValidation,
}: {
  intervention: ClientIntervention;
  onOpenIntervention: () => void;
  onOpenClientValidation?: () => void;
}) {
  const ot = intervention.ordre_travail;
  const result = getResultConfig(intervention.resultat);
  const ResultIcon = result.icon;
  const adminValidation = getInterventionValidationConfig(intervention.valide, 'admin');

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-orange-200 hover:shadow-md">
      <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="font-mono text-xs font-black text-[#d93f34]">#{intervention.id.slice(0, 8)}</div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getTypeClass(ot?.type || null)}`}>
              {ot?.type || '-'}
            </span>
          </div>
          <div className="mt-2 truncate text-base font-black text-slate-900">{ot?.machine?.nom || 'Machine inconnue'}</div>
          <div className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500">
            <Wrench size={12} />
            <span className="truncate">{ot?.plan?.gamme?.nom || 'Gamme non renseignée'}</span>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border ${result.className}`}>
          <ResultIcon size={14} />
          {result.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2 text-slate-700">
          <Calendar size={15} className="text-slate-400" />
          <span className="font-medium">{formatDate(intervention.date_debut)}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <ClipboardList size={15} className="text-slate-400" />
          <span className="font-medium">OT #{ot?.numot || intervention.ordre_travail_id?.slice(0, 8) || '-'}</span>
        </div>
        {intervention.technicien && (
          <div className="flex items-center gap-2 text-slate-700">
            <User size={15} className="text-slate-400" />
            <span className="font-medium">{intervention.technicien.nom}</span>
          </div>
        )}
        <div className="flex items-center gap-2 sm:col-span-2">
          <div className="flex-1 flex items-center gap-2">
            {intervention.valide ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={12} />
                {adminValidation.label}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle size={12} />
                {adminValidation.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {onOpenClientValidation && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <ClientValidationStatus intervention={intervention} onOpen={onOpenClientValidation} />
        </div>
      )}
      </div>

      <button
        onClick={onOpenIntervention}
        className="inline-flex w-full items-center justify-center gap-2 border-t border-orange-100 bg-orange-50 px-3 py-3 text-sm font-black text-[#d93f34] transition hover:bg-orange-100"
      >
        <Eye size={16} />
        Voir détails
      </button>
    </article>
  );
}

function ClientValidationStatus({
  intervention,
  onOpen,
}: {
  intervention: ClientIntervention;
  onOpen: () => void;
}) {
  const [showCommentaire, setShowCommentaire] = useState(false);

  if (intervention.client_valide) {
    const hasCommentaire = intervention.commentaire_client && intervention.commentaire_client.trim();

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => hasCommentaire && setShowCommentaire(!showCommentaire)}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 ${
            hasCommentaire ? 'cursor-pointer hover:bg-emerald-100 transition-colors' : 'cursor-default'
          }`}
          title={hasCommentaire ? 'Cliquer pour voir le commentaire' : undefined}
        >
          <CheckCircle2 size={12} />
          {getInterventionValidationConfig(true, 'client').label}
          {hasCommentaire && <MessageSquare size={11} className="text-emerald-600" />}
        </button>

        {/* Popup commentaire */}
        {showCommentaire && hasCommentaire && (
          <>
            {/* Overlay pour fermer au clic extérieur */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowCommentaire(false)}
            />
            
            {/* Popup */}
            <div className="absolute top-full left-0 mt-2 z-50 w-64 rounded-lg border border-emerald-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50 px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <MessageSquare size={13} />
                  Commentaire client
                </div>
                <button
                  onClick={() => setShowCommentaire(false)}
                  className="text-emerald-600 hover:text-emerald-800 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-3">
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {intervention.commentaire_client}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all hover:from-emerald-600 hover:to-emerald-700 shadow-sm"
    >
      <CheckCircle2 size={14} />
      Valider
    </button>
  );
}

// ==================== FONCTIONS UTILITAIRES POUR PDF ====================

function normalizeOtType(type: string | null | undefined): PdfTypeFilter | 'autre' {
  const normalized = (type || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized.includes('prevent')) return 'preventif';
  if (normalized.includes('correct')) return 'correctif';

  return 'autre';
}

function matchesPdfFilters(intervention: PdfIntervention, filters: PdfFilters): boolean {
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

  if (filters.validationClient === 'valide' && intervention.client_valide !== true) return false;
  if (filters.validationClient === 'non_valide' && intervention.client_valide === true) return false;

  return true;
}

function filterOrdresForPdf(ordres: ClientOTSummary[], filters: PdfFilters): ClientOTSummary[] {
  return ordres.filter((ot) =>
    matchesPdfTypeFilter(ot, filters.type) &&
    (ot.interventions || []).some((intervention) => matchesPdfFilters(intervention, filters))
  );
}

function matchesPdfTypeFilter(ot: Pick<ClientOTSummary, 'type'>, typeFilter: PdfTypeFilter): boolean {
  if (typeFilter === 'tous') return true;

  const normalizedType = normalizeOtType(ot.type);
  return normalizedType === typeFilter;
}

function buildZipFileName(filters: PdfFilters): string {
  const parts = ['OT'];
  if (filters.dateDebut) parts.push(`du_${filters.dateDebut}`);
  if (filters.dateFin) parts.push(`au_${filters.dateFin}`);
  parts.push(`${new Date().toISOString().slice(0, 10)}`);
  return `${parts.join('_')}.zip`;
}

function buildPdfFileName(ordre: OrdreTravailDetail, index: number): string {
  const numot = ordre.numot || `OT_${index + 1}`;
  const type = normalizeOtType(ordre.type);
  return `${numot}_${type}_${ordre.id.slice(0, 8)}.pdf`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Fonction pour récupérer l'OT complet avec toutes ses relations
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
    type_intervention: null,
  } as any;
}
