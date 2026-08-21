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
import { supabase } from '../lib/supabase';
import { generateOTPdfReact } from '../utils/generateOTPdfReact';
import { generateOTCPdfReact } from '../utils/generateOTCPdfReact';
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

export default function AdminPanel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showPdfModal, setShowPdfModal] = useState(false);
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
  const [stats, setStats] = useState<AdminStats>({
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

  async function loadStats() {
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

      setStats({
        machines: machines.count ?? 0,
        clients: clients.count ?? 0,
        demandes: demandes.count ?? 0,
        interventions: interventions.count ?? 0,
        techniciens: techniciens.count ?? 0,
        ordresTravail: ordresTravail.count ?? 0,
        plansActifs: plansActifs.count ?? 0,
        interventionsValidees: interventionsValidees.count ?? 0,
        machinesActives: machinesActives.count ?? 0
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  }

  async function openPdfModal() {
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
        const pdfBlob = normalizeOtType(ordre.type) === 'preventif'
          ? await generateOTPdfReact(ordreForPdf, { download: false })
          : await generateOTCPdfReact(ordreForPdf, { download: false });

        zip.file(buildPdfFileName(ordre, index), pdfBlob);
        setPdfProgress({ current: index + 1, total: matchingOrdres.length });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, buildZipFileName(pdfFilters));
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
          <RefreshCw className="animate-spin h-12 w-12 text-[#f15c00] mx-auto mb-4" />
          <p className="text-slate-600">Chargement du panneau d'administration...</p>
        </div>
      </div>
    </div>
  );

  const HeroSection = () => (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-gradient-to-r from-[#f15c00] to-[#d14d00] rounded-xl p-6 shadow-xl text-white mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Panneau d'Administration</h1>
              <p className="text-orange-100 text-base max-w-2xl">
                Gérez efficacement vos machines, clients, interventions et équipes techniques
              </p>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={loadStats}
                  className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1.5 rounded-lg transition-all text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Actualiser
                </button>
                <div className="flex items-center gap-2 text-orange-100">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm">Accès Administrateur</span>
                </div>
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
        iconColor: 'text-[#f15c00]',
        borderColor: 'border-[#f15c00]'
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
      <div className="max-w-7xl mx-auto px-4 mb-8">
        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {primaryStats.map((stat, index) => {
            const Icon = stat.icon.type;
            return (
              <div key={index} className={`bg-white rounded-lg shadow-sm p-3 border-l-4 ${stat.borderColor} hover:shadow-md transition-all duration-300 hover:-translate-y-1`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-slate-600 text-xs font-medium mb-0.5">{stat.label}</p>
                    <p className="text-xl font-bold text-slate-800 mb-0.5">{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.subtitle}</p>
                  </div>
                  <div className={`${stat.bgColor} p-2 rounded-lg`}>
                    <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Statistiques secondaires */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {secondaryStats.map((stat, index) => {
            const Icon = stat.icon.type;
            const colorStyles: Record<'indigo' | 'rose' | 'amber', string> = {
              indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-200',
              rose: 'from-rose-500 to-rose-600 shadow-rose-200',
              amber: 'from-amber-500 to-amber-600 shadow-amber-200',
            };
            
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300">
                <div className={`bg-gradient-to-br ${colorStyles[stat.color]} p-3 text-white`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="opacity-80">
                      <Icon size={18} />
                    </div>
                    <TrendingUp size={14} className="opacity-60" />
                  </div>
                  <div className="text-xl font-bold mb-0.5">{stat.value}</div>
                  <div className="text-xs opacity-90 font-medium">{stat.label}</div>
                </div>
              </div>
            );
          })}
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
        onClick: openPdfModal,
        icon: <Download size={20} />,
        title: 'Télécharger PDF OT',
        description: 'Exporter les OT filtrés dans un ZIP',
        color: 'orange' as const
      }
    ];

    return (
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Zap size={20} className="text-[#f15c00]" />
            Actions Rapides
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
      <QuickActions />
      <NavigationGrid />

      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Télécharger les PDF OT</h3>
                <p className="text-sm text-slate-600">
                  Filtrer les OT avant génération du ZIP.
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
    blue: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-200',
    emerald: 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-200',
    orange: 'bg-gradient-to-r from-[#f15c00] to-[#d14d00] hover:from-orange-700 hover:to-orange-800 shadow-orange-200',
    purple: 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-purple-200',
    red: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-200',
    indigo: 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-200',
  };

  return (
    <button
      onClick={onClick}
      className={`group relative ${colorStyles[color]} text-white rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-white bg-opacity-20 rounded-lg">
            {icon}
          </div>
          <h3 className="font-bold text-base">{title}</h3>
        </div>
        <p className="text-xs text-white text-opacity-90 leading-relaxed">{description}</p>
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
          ? 'bg-gradient-to-br from-[#f15c00] to-[#d14d00] text-white shadow-lg hover:shadow-xl'
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
          <div className="w-1.5 h-1.5 rounded-full bg-[#f15c00]"></div>
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
