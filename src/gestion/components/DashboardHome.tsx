import { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  Building2,
  Contact,
  UserCircle,
  Truck,
  DollarSign,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  FileSignature,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseGes } from '../../lib/supagestion';
import { useNavigate } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number;
    type: 'up' | 'down' | 'neutral';
    label: string;
  };
  color: string;
  loading?: boolean;
  subtitle?: string;
}

interface DashboardHomeProps {
  onNavigate: (view: string) => void;
}



interface ActivityMetrics {
  newDevisThisMonth: number;
  newClientsThisMonth: number;
  activeContracts: number;
  paidWorks: number;
}


function StatCard({ title, value, icon: Icon, trend, color, loading, subtitle }: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.type) {
      case 'up':
        return <ArrowUpRight size={16} className="text-green-600" />;
      case 'down':
        return <ArrowDownRight size={16} className="text-red-600" />;
      default:
        return <Minus size={16} className="text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return '';
    switch (trend.type) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-gray-600 text-sm font-medium">{title}</p>
          </div>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
              {subtitle && <div className="h-4 w-16 bg-gray-200 animate-pulse rounded" />}
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
              {subtitle && (
                <p className="text-xs text-gray-500">{subtitle}</p>
              )}
            </>
          )}
          {trend && !loading && (
            <div className={`flex items-center gap-1 mt-2 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-medium">{trend.value > 0 ? '+' : ''}{trend.value}%</span>
              <span className="text-xs text-gray-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color} shadow-sm`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}

interface ManagementCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;}

function ManagementCard({ title, description, icon: Icon, onClick }: ManagementCardProps) {
  return (
    <button
      onClick={() => onClick()}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 hover:scale-[1.02] text-left w-full group hover:border-orange-200"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl group-hover:from-orange-500 group-hover:to-orange-600 transition-all duration-200 shadow-sm">
          <Icon size={24} className="text-orange-600 group-hover:text-white transition-colors duration-200" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors duration-200 mb-1">
            {title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </button>
  );
}

interface StatusCardProps {
  title: string;
  count: number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}

function StatusCard({ title, count, icon: Icon, color, loading }: StatusCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${color} shadow-sm`}>
          <Icon size={20} className="text-white" />
        </div>
        <div className="flex-1">
          {loading ? (
            <div className="space-y-1">
              <div className="h-6 w-12 bg-gray-200 animate-pulse rounded" />
              <div className="h-4 w-16 bg-gray-200 animate-pulse rounded" />
            </div>
          ) : (
            <>
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="text-gray-600 text-sm">{title}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalDevis: 0,
    clientsActifs: 0,
    chantiers: 0,
    contracts: 0,
    fournisseurs: 0,
    enAttente: 0,
    enCours: 0,
    factures: 0,
    annules: 0,
    accepte: 0,
    paye: 0,
    termine: 0,
  });

  const [activityMetrics, setActivityMetrics] = useState<ActivityMetrics>({
    newDevisThisMonth: 0,
    newClientsThisMonth: 0,
    activeContracts: 0,
    paidWorks: 0,
  });

  const [contractPeriods, setContractPeriods] = useState({
    total: 0,
    payees: 0,
    enAttente: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBasicStats(),
        fetchActivityMetrics(),
        fetchContractPeriods(),
      ]);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBasicStats = async () => {
    // Récupérer le total des devis
    const { count: devisCount } = await supabase
      .from('devis')
      .select('*', { count: 'exact', head: true });

    // Récupérer le nombre de clients uniques
    const { data: devisData } = await supabase
      .from('devis')
      .select('client_devis_id');
    const uniqueClients = new Set(devisData?.map(d => d.client_devis_id).filter(Boolean));

    // Récupérer le nombre de chantiers
    const { count: chantiersCount } = await supabase
      .from('chantiers')
      .select('*', { count: 'exact', head: true });

    // Récupérer le nombre de contrats depuis supabaseGes
    const { count: contractsCount } = await supabaseGes
      .from('contracts')
      .select('*', { count: 'exact', head: true });

    // Récupérer le nombre de fournisseurs
    const { count: fournisseursCount } = await supabase
      .from('fournisseurs')
      .select('*', { count: 'exact', head: true });

    // Récupérer les statuts des devis
    const statusCounts = await Promise.all([
      supabase.from('devis').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente'),
      supabase.from('devis').select('*', { count: 'exact', head: true }).eq('statut', 'en_cours'),
      supabase.from('devis').select('*', { count: 'exact', head: true }).eq('statut', 'facturé'),
      supabase.from('devis').select('*', { count: 'exact', head: true }).eq('statut', 'annule'),
      supabase.from('devis').select('*', { count: 'exact', head: true }).eq('statut', 'accepte'),
      supabase.from('devis').select('*', { count: 'exact', head: true }).eq('statut', 'payé'),
      supabase.from('devis').select('*', { count: 'exact', head: true }).eq('statut', 'terminé'),
    ]);

    setStats({
      totalDevis: devisCount || 0,
      clientsActifs: uniqueClients.size,
      chantiers: chantiersCount || 0,
      contracts: contractsCount || 0,
      fournisseurs: fournisseursCount || 0,
      enAttente: statusCounts[0].count || 0,
      enCours: statusCounts[1].count || 0,
      factures: statusCounts[2].count || 0,
      annules: statusCounts[3].count || 0,
      accepte: statusCounts[4].count || 0,
      paye: statusCounts[5].count || 0,
      termine: statusCounts[6].count || 0,
    });
  };



  const fetchActivityMetrics = async () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Nouveaux devis ce mois
    const { count: newDevisCount } = await supabase
      .from('devis')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(currentYear, currentMonth, 1).toISOString())
      .lt('created_at', new Date(currentYear, currentMonth + 1, 1).toISOString());

    // Nouveaux clients ce mois
    const { data: newClientsData } = await supabase
      .from('clients_devis')
      .select('created_at')
      .gte('created_at', new Date(currentYear, currentMonth, 1).toISOString())
      .lt('created_at', new Date(currentYear, currentMonth + 1, 1).toISOString());

    // Contrats actifs depuis supabaseGes
    const { count: activeContractsCount } = await supabaseGes
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'actif');

    // Travaux payés
    const { count: paidWorksCount } = await supabase
      .from('devis')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'payé');

    setActivityMetrics({
      newDevisThisMonth: newDevisCount || 0,
      newClientsThisMonth: newClientsData?.length || 0,
      activeContracts: activeContractsCount || 0,
      paidWorks: paidWorksCount || 0,
    });
  };

  const fetchContractPeriods = async () => {
    try {
      // Récupérer les périodes de contrats depuis supabaseGes
      const { data: periodsData } = await supabaseGes
        .from('contract_periods')
        .select('*');

      if (periodsData) {
        const total = periodsData.length;
        const payees = periodsData.filter(p => p.statut === 'payee').length;
        const enAttente = periodsData.filter(p => p.statut === 'en_attente').length;

        setContractPeriods({
          total,
          payees,
          enAttente,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des périodes de contrats:', error);
    }
  };



  const managementSections = [
    {
      id: 'devis-liste',
      title: 'Gestion P5 (Devis)',
      description: 'Gérer vos devis et factures P5',
      icon: FileText,
      rote: 'devis-liste'
    },
    {
      id: 'devis-p2',
      title: 'Gestion P2 (Périodes)',
      description: 'Gérer les périodes de contrats P2',
      icon: Calendar,
      rote: 'devis-p2'
    },
    {
      id: 'export-combine',
      title: 'Export Combiné',
      description: 'Vue unifiée et export P2 & P5',
      icon: BarChart3,
      rote: 'export-combine'
    },
    {
      id: 'contracts',
      title: 'Contrats',
      description: 'Gérer vos contrats clients',
      icon: FileSignature,
      rote: 'contracts'
    },
    {
      id: 'clients',
      title: 'Clients',
      description: 'Base de données clients',
      icon: Users,
      rote: 'clients'
    },
    {
      id: 'chantiers',
      title: 'Chantiers',
      description: 'Suivre vos chantiers',
      icon: Building2,
      rote: 'chantiers'
    },
    {
      id: 'fournisseurs',
      title: 'Fournisseurs',
      description: 'Gérer vos fournisseurs',
      icon: Truck,
      rote: 'fournisseurs'
    },
    {
      id: 'emetteurs',
      title: 'Émetteurs',
      description: 'Gérer les émetteurs',
      icon: UserCircle,
      rote: 'emetteurs'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Tableau de Bord Gestion</h1>
                <p className="text-orange-100">
                  Vue d'ensemble de votre activité commerciale et financière
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <Activity className="w-8 h-8" />
                </div>
                <button
                  onClick={() => navigate('/gestion/devis/config')}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all duration-200"
                >
                  <Settings size={20} />
                  Configuration
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Métriques d'activité */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Activité & Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Devis"
              value={stats.totalDevis}
              subtitle="Tous statuts"
              icon={FileText}
              color="bg-gradient-to-br from-indigo-500 to-indigo-600"
              loading={loading}
            />
            <StatCard
              title="Clients Actifs"
              value={stats.clientsActifs}
              subtitle="Clients uniques"
              icon={Users}
              color="bg-gradient-to-br from-cyan-500 to-cyan-600"
              loading={loading}
            />
            <StatCard
              title="Contrats Actifs"
              value={activityMetrics.activeContracts}
              subtitle="En cours"
              icon={FileSignature}
              color="bg-gradient-to-br from-emerald-500 to-emerald-600"
              loading={loading}
            />
            <StatCard
              title="Travaux Payés"
              value={activityMetrics.paidWorks}
              subtitle="Devis payés"
              icon={CheckCircle}
              color="bg-gradient-to-br from-teal-500 to-teal-600"
              loading={loading}
            />
          </div>
        </div>

        {/* Métriques P2 (Périodes de contrats) */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-orange-600" />
            Gestion P2 - Périodes de Contrats
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Périodes P2"
              value={contractPeriods.total}
              subtitle="Toutes périodes"
              icon={Calendar}
              color="bg-gradient-to-br from-orange-500 to-orange-600"
              loading={loading}
            />
            <StatCard
              title="Périodes Payées"
              value={contractPeriods.payees}
              subtitle="Factures réglées"
              icon={CheckCircle}
              color="bg-gradient-to-br from-green-500 to-green-600"
              loading={loading}
            />
            <StatCard
              title="En Attente P2"
              value={contractPeriods.enAttente}
              subtitle="À facturer"
              icon={Clock}
              color="bg-gradient-to-br from-amber-500 to-amber-600"
              loading={loading}
            />
            <StatCard
              title="Nouveaux ce Mois"
              value={activityMetrics.newDevisThisMonth}
              subtitle={`${activityMetrics.newClientsThisMonth} nouveaux clients`}
              icon={TrendingUp}
              color="bg-gradient-to-br from-purple-500 to-purple-600"
              loading={loading}
            />
          </div>
        </div>

        {/* Statuts des devis P5 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-purple-600" />
            Statuts Devis P5
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <StatusCard
              title="En attente"
              count={stats.enAttente}
              icon={Clock}
              color="bg-gradient-to-br from-yellow-500 to-yellow-600"
              loading={loading}
            />
            <StatusCard
              title="En cours"
              count={stats.enCours}
              icon={Activity}
              color="bg-gradient-to-br from-blue-500 to-blue-600"
              loading={loading}
            />
            <StatusCard
              title="Acceptés"
              count={stats.accepte}
              icon={CheckCircle}
              color="bg-gradient-to-br from-green-500 to-green-600"
              loading={loading}
            />
            <StatusCard
              title="Facturés"
              count={stats.factures}
              icon={FileText}
              color="bg-gradient-to-br from-indigo-500 to-indigo-600"
              loading={loading}
            />
            <StatusCard
              title="Payés"
              count={stats.paye}
              icon={CheckCircle}
              color="bg-gradient-to-br from-emerald-500 to-emerald-600"
              loading={loading}
            />
            <StatusCard
              title="Terminés"
              count={stats.termine}
              icon={Target}
              color="bg-gradient-to-br from-teal-500 to-teal-600"
              loading={loading}
            />
            <StatusCard
              title="Annulés"
              count={stats.annules}
              icon={AlertCircle}
              color="bg-gradient-to-br from-red-500 to-red-600"
              loading={loading}
            />
          </div>
        </div>

        {/* Sections de gestion */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Settings className="w-7 h-7 text-orange-600" />
            Modules de Gestion
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {managementSections.map((section) => (
              <ManagementCard
                key={section.id}
                title={section.title}
                description={section.description}
                icon={section.icon}
                onClick={() => onNavigate(section.rote)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardHome;