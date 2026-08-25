import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { 
  Plus, 
  Wrench, 
  List, 
  Users, 
  Cpu, 
  TrendingUp, 
  Clock, 
  UserCog, 
  ClipboardList,
  Settings,
  Zap,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Shield,
  Database,
  Gauge,
  FileSpreadsheet,
  Download,
  Loader2,
  X
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '../lib/supabase';
import { generateOTPdfReact } from '../utils/generateOTPdfReact';
import { generateOTCPdfReact } from '../utils/generateOTCPdfReact';
import { generateOTPdf } from '../utils/generateOTPdf';
import type { OrdreTravailDetail } from '../types/ot';

interface AdminStats {
  machines: number;
  clients: number;
  demandes: number;
  interventions: number;
  techniciens: number;
  ordresTravail: number;
  plansActifs: number;
  interventionsValidees: number;
  machinesActives: number;
}

type ValidationFilter = 'tous' | 'valide' | 'non_valide';
type PdfTypeFilter = 'tous' | 'preventif' | 'correctif';
type PdfTemplate = 'react' | 'classic';

type PdfFilters = {
  dateDebut: string;
  dateFin: string;
  clientId: string;
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

type AdminOTSummary = {
  id: string;
  type: string | null;
  machine?: {
    client_id: string | null;
  } | null;
  interventions?: PdfIntervention[];
};

type AdminPdfClient = {
  id: string;
  raison_sociale: string | null;
  prenom: string | null;
};

type InterventionValidationStats = {
  preventif: { total: number; adminValide: number; clientValide: number };
  correctif: { total: number; adminValide: number; clientValide: number };
};

type OtChartPoint = {
  month: string;
  preventif: number;
  correctif: number;
  avecIntervention: number;
  sansIntervention: number;
};

type ClientInterventionPoint = { client: string; interventions: number };

let adminStatsCache: AdminStats | null = null;
const otChartCache = new Map<number, OtChartPoint[]>();
const validationCache = new Map<number, {
  validation: InterventionValidationStats;
  clients: ClientInterventionPoint[];
}>();
let selectedAdminYearCache = new Date().getFullYear();

export default function AdminPanel() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const initialSelectedOtYear = selectedAdminYearCache;
  const cachedCurrentValidation = validationCache.get(initialSelectedOtYear);
  const [loading, setLoading] = useState(adminStatsCache === null);
  const [selectedOtYear, setSelectedOtYear] = useState(initialSelectedOtYear);
  const [loadingOtChart, setLoadingOtChart] = useState(!otChartCache.has(initialSelectedOtYear));
  const [otChartData, setOtChartData] = useState<OtChartPoint[]>(otChartCache.get(initialSelectedOtYear) || []);
  const [validationByType, setValidationByType] = useState<InterventionValidationStats>({
    preventif: cachedCurrentValidation?.validation.preventif || { total: 0, adminValide: 0, clientValide: 0 },
    correctif: cachedCurrentValidation?.validation.correctif || { total: 0, adminValide: 0, clientValide: 0 },
  });
  const [interventionsByClient, setInterventionsByClient] = useState<ClientInterventionPoint[]>(cachedCurrentValidation?.clients || []);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplate>('react');
  const [loadingPdfOrdres, setLoadingPdfOrdres] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfOrdres, setPdfOrdres] = useState<AdminOTSummary[]>([]);
  const [pdfClients, setPdfClients] = useState<AdminPdfClient[]>([]);
  const [pdfFilters, setPdfFilters] = useState<PdfFilters>({
    dateDebut: '',
    dateFin: '',
    clientId: 'tous',
    validationAdmin: 'tous',
    validationClient: 'tous',
    type: 'tous',
  });
  const [stats, setStats] = useState<AdminStats>(adminStatsCache || {
    machines: 0,
    clients: 0,
    demandes: 0,
    interventions: 0,
    techniciens: 0,
    ordresTravail: 0,
    plansActifs: 0,
    interventionsValidees: 0,
    machinesActives: 0
  });

  // Charger les statistiques
  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    selectedAdminYearCache = selectedOtYear;
    loadOtChart(selectedOtYear);
    loadValidationByType(selectedOtYear);
  }, [selectedOtYear]);

  async function loadOtChart(year: number, force = false) {
    const cached = otChartCache.get(year);
    if (cached && !force) {
      setOtChartData(cached);
      setLoadingOtChart(false);
      return;
    }
    setLoadingOtChart(true);
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const monthlyData = months.map((month) => ({
      month,
      preventif: 0,
      correctif: 0,
      avecIntervention: 0,
      sansIntervention: 0,
    }));

    try {
      const startDate = `${year}-01-01T00:00:00.000Z`;
      const endDate = `${year + 1}-01-01T00:00:00.000Z`;
      const { data, error } = await supabase
        .from('ordres_travail')
        .select('type, created_at, interventions:interventions!interventions_ot_fkey(id)')
        .gte('created_at', startDate)
        .lt('created_at', endDate);

      if (error) throw error;

      (data || []).forEach((ordre) => {
        if (!ordre.created_at) return;
        const monthIndex = new Date(ordre.created_at).getMonth();
        const type = normalizeOtType(ordre.type);
        if (type === 'preventif') monthlyData[monthIndex].preventif += 1;
        if (type === 'correctif') monthlyData[monthIndex].correctif += 1;
        const interventions = Array.isArray(ordre.interventions) ? ordre.interventions : [];
        if (interventions.length > 0) monthlyData[monthIndex].avecIntervention += 1;
        else monthlyData[monthIndex].sansIntervention += 1;
      });
      otChartCache.set(year, monthlyData);
      setOtChartData(monthlyData);
    } catch (error) {
      console.error('Erreur lors du chargement du graphique OT:', error);
      setOtChartData(monthlyData);
    } finally {
      setLoadingOtChart(false);
    }
  }

  async function loadValidationByType(year: number, force = false) {
    const cached = validationCache.get(year);
    if (cached && !force) {
      setValidationByType(cached.validation);
      setInterventionsByClient(cached.clients);
      return;
    }
    try {
      const startDate = `${year}-01-01T00:00:00.000Z`;
      const endDate = `${year + 1}-01-01T00:00:00.000Z`;
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          valide,
          client_valide,
          created_at,
          ordre:ordres_travail!interventions_ot_fkey(
            type,
            machine:machines(
              client:clients(id, raison_sociale, prenom)
            )
          )
        `)
        .gte('created_at', startDate)
        .lt('created_at', endDate);

      if (error) throw error;

      const nextStats: InterventionValidationStats = {
        preventif: { total: 0, adminValide: 0, clientValide: 0 },
        correctif: { total: 0, adminValide: 0, clientValide: 0 },
      };
      const clientCounts = new Map<string, number>();

      (data || []).forEach((intervention: any) => {
        const ordre = Array.isArray(intervention.ordre) ? intervention.ordre[0] : intervention.ordre;
        const machine = Array.isArray(ordre?.machine) ? ordre.machine[0] : ordre?.machine;
        const client = Array.isArray(machine?.client) ? machine.client[0] : machine?.client;
        const clientName = client?.raison_sociale || client?.prenom || 'Client non renseigné';
        clientCounts.set(clientName, (clientCounts.get(clientName) || 0) + 1);
        const type = normalizeOtType(ordre?.type);
        if (type !== 'preventif' && type !== 'correctif') return;
        nextStats[type].total += 1;
        if (intervention.valide === true) nextStats[type].adminValide += 1;
        if (intervention.client_valide === true) nextStats[type].clientValide += 1;
      });

      const clientData = Array.from(clientCounts, ([client, interventions]) => ({ client, interventions }))
        .sort((a, b) => b.interventions - a.interventions);
      validationCache.set(year, { validation: nextStats, clients: clientData });
      setValidationByType(nextStats);
      setInterventionsByClient(clientData);
    } catch (error) {
      console.error('Erreur lors du chargement des validations par type:', error);
    }
  }

  async function loadStats(force = false) {
    if (adminStatsCache && !force) {
      setStats(adminStatsCache);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [
        machines, 
        clients, 
        demandes, 
        interventions, 
        techniciens,
        ordresTravail,
        plansActifs,
        interventionsValidees,
        machinesActives
      ] = await Promise.all([
        supabase.from('machines').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('demande_intervention').select('*', { count: 'exact', head: true }),
        supabase.from('interventions').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'technicien'),
        supabase.from('ordres_travail').select('*', { count: 'exact', head: true }),
        supabase.from('plans_maintenance').select('*', { count: 'exact', head: true }).eq('statut', 'actif'),
        supabase.from('interventions').select('*', { count: 'exact', head: true }).eq('valide', true),
        supabase.from('machines').select('*', { count: 'exact', head: true }).eq('statut', 'actif')
      ]);

      const nextStats = {
        machines: machines.count ?? 0,
        clients: clients.count ?? 0,
        demandes: demandes.count ?? 0,
        interventions: interventions.count ?? 0,
        techniciens: techniciens.count ?? 0,
        ordresTravail: ordresTravail.count ?? 0,
        plansActifs: plansActifs.count ?? 0,
        interventionsValidees: interventionsValidees.count ?? 0,
        machinesActives: machinesActives.count ?? 0
      };
      adminStatsCache = nextStats;
      setStats(nextStats);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  }

  async function openPdfModal(template: PdfTemplate = 'react') {
    setPdfTemplate(template);
    setPdfError(null);
    setShowPdfModal(true);

    if (pdfOrdres.length > 0 && pdfClients.length > 0) return;

    try {
      setLoadingPdfOrdres(true);
      const [ordresResult, clientsResult] = await Promise.all([
        supabase
          .from('ordres_travail')
          .select(`
            id,
            type,
            machine:machines(client_id),
            interventions:interventions!interventions_ot_fkey(
              id,
              date_debut,
              date_fin,
              valide,
              client_valide
            )
          `)
          .order('date_programmee', { ascending: false }),
        supabase
          .from('clients')
          .select('id, raison_sociale, prenom')
          .order('raison_sociale', { ascending: true }),
      ]);

      if (ordresResult.error) throw ordresResult.error;
      if (clientsResult.error) throw clientsResult.error;
      setPdfOrdres((ordresResult.data || []) as AdminOTSummary[]);
      setPdfClients((clientsResult.data || []) as AdminPdfClient[]);
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
        const matchingInterventions = (ordre.interventions || []).filter((intervention) =>
          matchesPdfFilters(intervention, pdfFilters)
        );

        const ordreForPdf = {
          ...ordre,
          interventions: matchingInterventions,
        };
        const pdfBlob = pdfTemplate === 'classic'
          ? await generateOTPdf(ordreForPdf, { download: false })
          : normalizeOtType(ordre.type) === 'preventif'
            ? await generateOTPdfReact(ordreForPdf, { download: false })
            : await generateOTCPdfReact(ordreForPdf, { download: false });

        zip.file(buildPdfFileName(ordre, index), pdfBlob);
        setPdfProgress({ current: index + 1, total: matchingOrdres.length });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, buildZipFileName(pdfFilters, pdfTemplate));
      setShowPdfModal(false);
    } catch (err) {
      console.error('Erreur génération PDF admin:', err);
      setPdfError('Erreur lors de la génération du fichier ZIP.');
    } finally {
      setGeneratingPdf(false);
      setPdfProgress({ current: 0, total: 0 });
    }
  };

  // ==================== COMPOSANTS DE RENDU ====================

  const LoadingState = () => (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-[#f98440] mx-auto mb-4" />
          <p className="text-slate-600">Chargement du panneau d'administration...</p>
        </div>
      </div>
    </div>
  );

  const HeroSection = () => (
    <div className="mx-auto max-w-7xl px-4 pt-5 md:pt-7">
      <div className="mb-5 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#f98440] text-white shadow-lg shadow-orange-200 md:h-16 md:w-16">
            <Shield size={26} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 md:text-2xl lg:text-3xl">Hello, Administrateur</h1>
            <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm">Pilotage du parc machines et de la maintenance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadStats(true);
              loadOtChart(selectedOtYear, true);
              loadValidationByType(selectedOtYear, true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-[#f98440]/40 bg-white px-3 py-2 text-xs font-bold text-[#f98440] transition-colors hover:bg-orange-50 md:text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <div className="hidden rounded-lg border border-[#f98440]/40 bg-white px-4 py-2 text-sm font-bold text-[#f98440] md:block">
            {new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}
          </div>
        </div>
      </div>
      <div className="relative mb-6 overflow-hidden rounded-lg bg-[#f98440] p-5 text-white shadow-lg shadow-orange-200 md:p-6">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h2 className="mb-2 text-xl font-black md:text-2xl">Vue d'ensemble</h2>
              <p className="max-w-2xl text-sm font-medium text-white/80 md:text-base">
                Gérez efficacement vos machines, clients, interventions et équipes techniques
              </p>
              <div className="mt-3 flex items-center gap-2 text-white/80">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm">Accès Administrateur</span>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white bg-opacity-10 p-3 rounded-lg">
                <Settings size={48} className="text-white opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const StatsGrid = () => {
    const primaryStats = [
      {
        label: 'Machines Totales',
        value: stats.machines,
        subtitle: `${stats.machinesActives} actives`,
        icon: <Cpu />,
        color: 'blue',
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-600',
        borderColor: 'border-blue-500'
      },
      {
        label: 'Clients',
        value: stats.clients,
        subtitle: 'Clients enregistrés',
        icon: <Users />,
        color: 'emerald',
        bgColor: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
        borderColor: 'border-emerald-500'
      },
      {
        label: 'Ordres de Travail',
        value: stats.ordresTravail,
        subtitle: 'OT générés',
        icon: <ClipboardList />,
        color: 'orange',
        bgColor: 'bg-orange-50',
        iconColor: 'text-[#f98440]',
        borderColor: 'border-[#f98440]'
      },
      {
        label: 'Interventions',
        value: stats.interventions,
        subtitle: `${stats.interventionsValidees} validées`,
        icon: <Wrench />,
        color: 'purple',
        bgColor: 'bg-purple-50',
        iconColor: 'text-purple-600',
        borderColor: 'border-purple-500'
      }
    ];

    const secondaryStats = [
      {
        label: 'Plans Actifs',
        value: stats.plansActifs,
        icon: <Calendar />,
        color: 'indigo' as const
      },
      {
        label: 'Techniciens',
        value: stats.techniciens,
        icon: <UserCog />,
        color: 'rose' as const
      },
      {
        label: 'Demandes',
        value: stats.demandes,
        icon: <Clock />,
        color: 'amber' as const
      }
    ];

    return (
      <div className="mx-auto mb-6 max-w-7xl px-4">
        {/* Statistiques principales */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {primaryStats.map((stat, index) => {
            const Icon = stat.icon.type;
            return (
              <div key={index} className="rounded-lg bg-[#f98440] p-3 text-white shadow-lg shadow-orange-200 transition-transform duration-300 hover:-translate-y-1 sm:p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="mb-0.5 text-xs font-bold text-white/90">{stat.label}</p>
                    <p className="mb-0.5 text-2xl font-black">{stat.value}</p>
                    <p className="text-[10px] font-medium text-white/75 sm:text-xs">{stat.subtitle}</p>
                  </div>
                  <div className="rounded-lg bg-black/20 p-2">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Statistiques secondaires */}
        <div className="grid grid-cols-3 gap-3 md:gap-5">
          {secondaryStats.map((stat, index) => {
            const Icon = stat.icon.type;
            return (
              <div key={index} className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:shadow-md">
                <div className="p-3 text-slate-900 md:p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="rounded-lg bg-orange-50 p-2 text-[#f98440]">
                      <Icon size={18} />
                    </div>
                    <TrendingUp size={14} className="opacity-60" />
                  </div>
                  <div className="mb-0.5 text-xl font-black">{stat.value}</div>
                  <div className="text-[10px] font-semibold text-slate-500 sm:text-xs">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const ChartsSection = () => {
    const yearlyInterventions = validationByType.preventif.total + validationByType.correctif.total;
    const yearlyAdminValidated = validationByType.preventif.adminValide + validationByType.correctif.adminValide;
    const validationRate = yearlyInterventions > 0
      ? Math.round((yearlyAdminValidated / yearlyInterventions) * 100)
      : 0;
    const availableYears = Array.from({ length: 5 }, (_, index) => currentYear - index);
    const otTotal = otChartData.reduce((total, month) => total + month.preventif + month.correctif, 0);
    const otAvecIntervention = otChartData.reduce((total, month) => total + month.avecIntervention, 0);
    const otSansIntervention = otChartData.reduce((total, month) => total + month.sansIntervention, 0);

    return (
      <div className="mx-auto mb-6 grid max-w-7xl grid-cols-1 gap-4 px-4 md:gap-5 xl:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-[#f98440]" size={18} />
              <div>
                <h2 className="text-base font-black text-slate-900 md:text-lg">OT par type et par année</h2>
                <p className="text-xs font-semibold text-slate-500">{otTotal} OT en {selectedOtYear}</p>
              </div>
            </div>
            <select
              value={selectedOtYear}
              onChange={(event) => setSelectedOtYear(Number(event.target.value))}
              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-[#f98440] outline-none focus:ring-2 focus:ring-[#f98440]/30"
              aria-label="Année du graphique OT"
            >
              {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div className="h-64">
            {loadingOtChart ? (
              <div className="flex h-full items-center justify-center"><RefreshCw className="h-7 w-7 animate-spin text-[#f98440]" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 256 }}>
                <BarChart data={otChartData} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#fff7ed' }} />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                  <Bar dataKey="preventif" name="Préventifs" fill="#f98440" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="correctif" name="Correctifs" fill="#334155" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wrench className="text-[#f98440]" size={18} />
              <div>
                <h2 className="text-base font-black text-slate-900 md:text-lg">Validation des interventions</h2>
                <p className="text-xs font-semibold text-slate-500">Année {selectedOtYear}</p>
              </div>
            </div>
            <select
              value={selectedOtYear}
              onChange={(event) => setSelectedOtYear(Number(event.target.value))}
              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-[#f98440] outline-none focus:ring-2 focus:ring-[#f98440]/30"
              aria-label="Année des validations"
            >
              {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-black text-slate-900">{validationRate}%</div>
              <p className="mt-1 text-xs font-semibold text-slate-500">{yearlyAdminValidated} sur {yearlyInterventions} validées par l’admin</p>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#f98440]">Suivi global</span>
          </div>
          <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#f98440] transition-all duration-500" style={{ width: `${validationRate}%` }} />
          </div>
          <div className="mt-5 space-y-3">
            {([
              { key: 'preventif' as const, label: 'Préventives', color: 'bg-[#f98440]' },
              { key: 'correctif' as const, label: 'Correctives', color: 'bg-slate-700' },
            ]).map(({ key, label, color }) => {
              const item = validationByType[key];
              const pending = Math.max(item.total - item.clientValide, 0);
              const clientRate = item.total > 0 ? Math.round((item.clientValide / item.total) * 100) : 0;
              return (
                <div key={key} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                      <span className="text-xs font-black text-slate-800">{label}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{item.total} interventions</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-emerald-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Client validé</p>
                      <p className="mt-0.5 text-lg font-black text-emerald-900">{item.clientValide} <span className="text-xs font-bold text-emerald-600">({clientRate}%)</span></p>
                    </div>
                    <div className="rounded-md bg-amber-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Non validé</p>
                      <p className="mt-0.5 text-lg font-black text-amber-900">{pending}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="text-[#f98440]" size={18} />
              <div>
                <h2 className="text-base font-black text-slate-900 md:text-lg">Suivi d’exécution des OT</h2>
                <p className="text-xs font-semibold text-slate-500">{otAvecIntervention} avec intervention · {otSansIntervention} sans intervention</p>
              </div>
            </div>
            <select
              value={selectedOtYear}
              onChange={(event) => setSelectedOtYear(Number(event.target.value))}
              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-[#f98440] outline-none focus:ring-2 focus:ring-[#f98440]/30"
              aria-label="Année du suivi d’exécution des OT"
            >
              {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div className="h-64">
            {loadingOtChart ? (
              <div className="flex h-full items-center justify-center"><RefreshCw className="h-7 w-7 animate-spin text-[#f98440]" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 256 }}>
                <BarChart data={otChartData} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#fff7ed' }} />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                  <Bar dataKey="avecIntervention" name="Avec intervention" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="sansIntervention" name="Sans intervention" fill="#f98440" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="text-[#f98440]" size={18} />
              <div>
                <h2 className="text-base font-black text-slate-900 md:text-lg">Interventions par client</h2>
                <p className="text-xs font-semibold text-slate-500">{interventionsByClient.length} client{interventionsByClient.length > 1 ? 's' : ''} en {selectedOtYear}</p>
              </div>
            </div>
            <select
              value={selectedOtYear}
              onChange={(event) => setSelectedOtYear(Number(event.target.value))}
              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-[#f98440] outline-none focus:ring-2 focus:ring-[#f98440]/30"
              aria-label="Année des interventions par client"
            >
              {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          {interventionsByClient.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg bg-slate-50 text-sm font-semibold text-slate-500">
              Aucune intervention pour cette année
            </div>
          ) : (
            <div style={{ height: Math.max(260, interventionsByClient.length * 42) }}>
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: Math.max(260, interventionsByClient.length * 42) }}>
                <BarChart data={interventionsByClient} layout="vertical" margin={{ top: 5, right: 25, left: 35, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="client" width={130} tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#fff7ed' }} />
                  <Bar dataKey="interventions" name="Interventions" fill="#f98440" radius={[0, 5, 5, 0]} barSize={22} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    );
  };

  const QuickActions = () => {
    const actions = [
      {
        onClick: () => navigate('/admin/machine/new'),
        icon: <Plus size={20} />,
        title: 'Nouvelle Machine',
        description: 'Ajouter une nouvelle machine au système',
        color: 'blue' as const
      },
      {
        onClick: () => navigate('/admin/client/new'),
        icon: <Users size={20} />,
        title: 'Nouveau Client',
        description: 'Créer un nouveau profil client',
        color: 'emerald' as const
      },
      {
        onClick: () => navigate('/admin/plans-maintenance/new'),
        icon: <Calendar size={20} />,
        title: 'Nouveau Plan',
        description: 'Créer un plan de maintenance',
        color: 'orange' as const
      },
      {
        onClick: () => navigate('/admin/addOT'),
        icon: <Zap size={20} />,
        title: 'Générer OT',
        description: 'Générer des ordres de travail',
        color: 'purple' as const
      },
      {
        onClick: () => navigate('/admin/demande-maintenance/new'),
        icon: <AlertTriangle size={20} />,
        title: 'Demande Correctif',
        description: 'Créer une demande corrective',
        color: 'red' as const
      },
      {
        onClick: () => navigate('/admin/techniciens'),
        icon: <UserCog size={20} />,
        title: 'Gérer Techniciens',
        description: 'Administrer les comptes techniciens',
        color: 'indigo' as const
      },
      {
        onClick: () => openPdfModal('react'),
        icon: <Download size={20} />,
        title: 'Télécharger PDF OT',
        description: 'Exporter les OT filtrés dans un ZIP',
        color: 'orange' as const
      },
      {
        onClick: () => openPdfModal('classic'),
        icon: <FileSpreadsheet size={20} />,
        title: 'PDF OT classique',
        description: 'Exporter en masse avec le template jsPDF',
        color: 'blue' as const
      }
    ];

    return (
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Zap size={20} className="text-[#f98440]" />
            Actions Rapides
          </h2>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {actions.map((action, index) => (
              <ActionButton key={index} {...action} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const NavigationGrid = () => {
    const navigationItems = [
      {
        onClick: () => navigate('/admin/machines'),
        icon: <Cpu size={20} />,
        title: 'Machines',
        count: stats.machines,
        description: 'Gérer le parc machines'
      },
      {
        onClick: () => navigate('/admin/clients'),
        icon: <Users size={20} />,
        title: 'Clients',
        count: stats.clients,
        description: 'Base clients'
      },
      {
        onClick: () => navigate('/admin/demandes'),
        icon: <AlertTriangle size={20} />,
        title: 'Demandes clients',
        count: stats.demandes,
        description: 'Demandes à examiner'
      },
      {
        onClick: () => navigate('/admin/planification-clients'),
        icon: <Calendar size={20} />,
        title: 'Planification Clients',
        description: 'Vue OT par client/semaine',
        highlight: true
      },
      {
        onClick: () => navigate('/admin/gammeslist'),
        icon: <List size={20} />,
        title: 'Gammes',
        description: 'Procédures maintenance'
      },
      {
        onClick: () => navigate('/admin/plans-maintenance'),
        icon: <Calendar size={20} />,
        title: 'Plans Maintenance',
        count: stats.plansActifs,
        description: 'Planification préventive'
      },
      {
        onClick: () => navigate('/admin/ot-preventif'),
        icon: <ClipboardList size={20} />,
        title: 'OT Préventifs',
        description: 'Suivi des OT préventifs'
      },
      {
        onClick: () => navigate('/admin/ot-correctifs'),
        icon: <AlertTriangle size={20} />,
        title: 'OT Correctifs',
        description: 'Ordres correctifs'
      },
      {
        onClick: () => navigate('/admin/plan-action'),
        icon: <FileSpreadsheet size={20} />,
        title: 'Plan d\'action',
        description: 'Actions issues des OT correctifs',
        highlight: true
      },
      {
        onClick: () => navigate('/admin/interventions', { state: { showFiltersPopup: true } }),
        icon: <Wrench size={20} />,
        title: 'Interventions',
        count: stats.interventions,
        description: 'Suivi interventions'
      },
      {
        onClick: () => navigate('/admin/techniciens'),
        icon: <UserCog size={20} />,
        title: 'Techniciens',
        count: stats.techniciens,
        description: 'Équipe technique'
      },
      {
        onClick: () => navigate('/admin/reporting'),
        icon: <BarChart3 size={20} />,
        title: 'Reporting & Stats',
        description: 'Analyses et rapports'
      },
    ];

    return (
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Database size={20} className="text-slate-600" />
            Navigation & Gestion
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {navigationItems.map((item, index) => (
              <NavButton key={index} {...item} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ==================== RENDU PRINCIPAL ====================

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <HeroSection />
      <StatsGrid />
      <ChartsSection />
      <QuickActions />
      <NavigationGrid />

      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {pdfTemplate === 'classic' ? 'Télécharger les PDF OT classiques' : 'Télécharger les PDF OT'}
                </h3>
                <p className="text-sm text-slate-600">
                  {pdfTemplate === 'classic'
                    ? 'Génération en masse avec le template generateOTPdf.ts.'
                    : 'Filtrer les OT avant génération du ZIP.'}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Date début</span>
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

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">Client</span>
                <select
                  value={pdfFilters.clientId}
                  onChange={(event) => updatePdfFilter('clientId', event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="tous">Tous les clients</option>
                  {pdfClients.map((pdfClient) => (
                    <option key={pdfClient.id} value={pdfClient.id}>
                      {pdfClient.raison_sociale || pdfClient.prenom || 'Client sans nom'}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Validation admin</span>
                  <select
                    value={pdfFilters.validationAdmin}
                    onChange={(event) => updatePdfFilter('validationAdmin', event.target.value as ValidationFilter)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="tous">Toutes</option>
                    <option value="valide">Acceptées par admin</option>
                    <option value="non_valide">Non acceptées par admin</option>
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
                    <option value="valide">Acceptées par client</option>
                    <option value="non_valide">Non acceptées par client</option>
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
                  <option value="tous">Préventif et correctif</option>
                  <option value="preventif">Préventif uniquement</option>
                  <option value="correctif">Correctif uniquement</option>
                </select>
              </label>

              <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800">
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
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {generatingPdf ? 'Génération...' : 'Télécharger'}
              </button>
            </div>
          </div>
        </div>
      )}

      {generatingPdf && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-2xl">
            <Loader2 size={42} className="mx-auto mb-4 animate-spin text-orange-600" />
            <h3 className="text-lg font-bold text-slate-900">Création du fichier ZIP</h3>
            <p className="mt-2 text-sm text-slate-600">
              {pdfProgress.total} PDF à créer
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
              {pdfProgress.current} / {pdfProgress.total} PDF généré{pdfProgress.current > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== COMPOSANTS UTILITAIRES ====================

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'blue' | 'emerald' | 'orange' | 'purple' | 'red' | 'indigo';
}

function ActionButton({ onClick, icon, title, description, color }: ActionButtonProps) {
  const colorStyles = {
    blue: 'bg-gradient-to-l from-[#d95f24] to-[#f98440] hover:from-[#cb541c] hover:to-[#ed7738]',
    emerald: 'bg-gradient-to-l from-[#e86d2f] to-[#ff9d63] hover:from-[#d96127] hover:to-[#f58d51]',
    orange: 'bg-gradient-to-l from-[#c94f18] to-[#e97435] hover:from-[#b94412] hover:to-[#da672d]',
    purple: 'bg-gradient-to-l from-[#ef7b3f] to-[#ffad7d] hover:from-[#df6d33] hover:to-[#f69b67]',
    red: 'bg-gradient-to-l from-[#b94412] to-[#dc642b] hover:from-[#a73a0d] hover:to-[#cc5722]',
    indigo: 'bg-gradient-to-l from-[#d95f24] to-[#f58b4d] hover:from-[#c9521c] hover:to-[#e77b3f]',
  };

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-lg p-3 text-left text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${colorStyles[color]}`}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-md bg-black/10 p-1.5">
            {icon}
          </div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
        <p className="text-[11px] leading-snug text-white/80">{description}</p>
      </div>
    </button>
  );
}

interface NavButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  count?: number;
  description?: string;
  badge?: string;
  highlight?: boolean;
}

function NavButton({ onClick, icon, title, count, description, badge, highlight }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative ${highlight
          ? 'bg-[#f98440] text-white shadow-lg hover:bg-[#e97435] hover:shadow-xl'
          : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:shadow-md'
        } rounded-lg p-4 transition-all duration-300 hover:-translate-y-1 text-left overflow-hidden`}
    >
      {badge && (
        <span className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
          {badge}
        </span>
      )}

      <div className={`flex items-center gap-2 mb-2 ${highlight ? 'text-white' : 'text-slate-700'}`}>
        <div className={`p-1.5 rounded-lg ${highlight
            ? 'bg-white bg-opacity-20'
            : 'bg-slate-100 group-hover:bg-slate-200'
          } transition-colors`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base truncate">{title}</h3>
          {description && (
            <p className={`text-xs mt-0.5 ${highlight ? 'text-orange-100' : 'text-slate-500'}`}>
              {description}
            </p>
          )}
        </div>
      </div>

      {count !== undefined && !highlight && (
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#f98440]"></div>
          <span className="text-xs font-semibold text-slate-600">
            {count} élément{count > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {highlight && (
        <div className="flex items-center gap-2 text-orange-100">
          <Gauge className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Vue principale</span>
        </div>
      )}
    </button>
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

function filterOrdresForPdf(ordres: AdminOTSummary[], filters: PdfFilters) {
  return ordres.filter((ot) =>
    (filters.clientId === 'tous' || ot.machine?.client_id === filters.clientId) &&
    matchesPdfTypeFilter(ot, filters.type) &&
    (ot.interventions || []).some((intervention) => matchesPdfFilters(intervention, filters))
  );
}

function matchesPdfTypeFilter(ot: Pick<AdminOTSummary, 'type'>, typeFilter: PdfTypeFilter) {
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
  } as OrdreTravailDetail & { interventions?: PdfIntervention[] };
}

function buildPdfFileName(ordre: OrdreTravailDetail, index: number) {
  const numot = ordre.numot ? String(ordre.numot) : `sans-numero-${index + 1}`;
  const machineName = sanitizeFileName(ordre.machine?.nom || 'machine');
  const prefix = normalizeOtType(ordre.type) === 'preventif' ? 'OT' : 'OTC';

  return `${String(index + 1).padStart(3, '0')}_${prefix}_${numot}_${machineName}.pdf`;
}

function buildZipFileName(filters: PdfFilters, template: PdfTemplate) {
  const start = filters.dateDebut || 'debut';
  const end = filters.dateFin || 'fin';
  const suffix = template === 'classic' ? '_classique' : '';

  return `OT_${start}_${end}${suffix}.zip`;
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
