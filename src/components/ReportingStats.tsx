import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  FileText,
  Download,
  RefreshCw,
  ArrowRight,
  PieChart,
  Activity,
  Target
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReportingStats {
  totalInterventions: number;
  interventionsValidees: number;
  totalMachines: number;
  machinesActives: number;
  totalClients: number;
  ordresTravail: number;
  plansActifs: number;
}

export default function ReportingStats() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportingStats>({
    totalInterventions: 0,
    interventionsValidees: 0,
    totalMachines: 0,
    machinesActives: 0,
    totalClients: 0,
    ordresTravail: 0,
    plansActifs: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [
        interventions,
        interventionsValidees,
        machines,
        machinesActives,
        clients,
        ordresTravail,
        plansActifs
      ] = await Promise.all([
        supabase.from('interventions').select('*', { count: 'exact', head: true }),
        supabase.from('interventions').select('*', { count: 'exact', head: true }).eq('valide', true),
        supabase.from('machines').select('*', { count: 'exact', head: true }),
        supabase.from('machines').select('*', { count: 'exact', head: true }).eq('statut', 'actif'),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('ordres_travail').select('*', { count: 'exact', head: true }),
        supabase.from('plans_maintenance').select('*', { count: 'exact', head: true }).eq('statut', 'actif')
      ]);

      setStats({
        totalInterventions: interventions.count ?? 0,
        interventionsValidees: interventionsValidees.count ?? 0,
        totalMachines: machines.count ?? 0,
        machinesActives: machinesActives.count ?? 0,
        totalClients: clients.count ?? 0,
        ordresTravail: ordresTravail.count ?? 0,
        plansActifs: plansActifs.count ?? 0
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const maintenanceReports = [
    {
      title: 'Interventions',
      description: 'Historique et suivi des interventions',
      icon: <Activity className="w-5 h-5" />,
      route: '/admin/interventions',
      count: stats.totalInterventions,
      subtitle: `${stats.interventionsValidees} validées`,
      color: 'indigo'
    },
    {
      title: 'Ordres de Travail',
      description: 'OT préventifs et correctifs',
      icon: <Target className="w-5 h-5" />,
      route: '/admin/ot-correctifs',
      count: stats.ordresTravail,
      subtitle: 'OT générés',
      color: 'rose'
    },
    {
      title: 'Plans Maintenance',
      description: 'Planification préventive',
      icon: <Calendar className="w-5 h-5" />,
      route: '/admin/plans-maintenance',
      count: stats.plansActifs,
      subtitle: 'Plans actifs',
      color: 'amber'
    },
    {
      title: 'Machines',
      description: 'Parc machines et équipements',
      icon: <Activity className="w-5 h-5" />,
      route: '/admin/machines',
      count: stats.totalMachines,
      subtitle: `${stats.machinesActives} actives`,
      color: 'blue'
    },
    {
      title: 'Clients',
      description: 'Base clients et contrats',
      icon: <Users className="w-5 h-5" />,
      route: '/admin/clients',
      count: stats.totalClients,
      subtitle: 'Clients enregistrés',
      color: 'emerald'
    },
    {
      title: 'Gammes',
      description: 'Procédures de maintenance',
      icon: <FileText className="w-5 h-5" />,
      route: '/admin/gammeslist',
      subtitle: 'Gammes disponibles',
      color: 'purple'
    }
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-12 w-12 animate-spin text-[#f98440]" />
          <p className="text-slate-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl py-2">
        {/* Header */}
        <div className="mb-5">
          <div className="rounded-lg bg-[#f98440] p-5 text-white shadow-lg shadow-orange-200 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black md:text-2xl">Reporting & Statistiques</h1>
                <p className="mt-1 text-sm font-medium text-white/80 md:text-base">
                  Analyses, rapports et exports de données pour une gestion optimale
                </p>
              </div>
              <div className="hidden md:block">
                <div className="rounded-lg bg-black/10 p-3">
                  <BarChart3 size={48} className="text-white opacity-90" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <div className="rounded-lg bg-[#f98440] p-3 text-white shadow-lg shadow-orange-200 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-0.5 text-xs font-bold text-white/80">Machines</p>
                <p className="text-2xl font-black text-white">{stats.totalMachines}</p>
                <p className="text-xs text-white/70">{stats.machinesActives} actives</p>
              </div>
              <div className="rounded-lg bg-black/10 p-2">
                <Activity className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-100 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs font-medium mb-0.5">Clients</p>
                <p className="text-xl font-bold text-slate-800">{stats.totalClients}</p>
                <p className="text-xs text-slate-500">Clients actifs</p>
              </div>
              <div className="bg-emerald-50 p-2 rounded-lg">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-100 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs font-medium mb-0.5">Interventions</p>
                <p className="text-xl font-bold text-slate-800">{stats.totalInterventions}</p>
                <p className="text-xs text-slate-500">{stats.interventionsValidees} validées</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-2">
                <Target className="h-5 w-5 text-[#f98440]" />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-100 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs font-medium mb-0.5">Plans Actifs</p>
                <p className="text-xl font-bold text-slate-800">{stats.plansActifs}</p>
                <p className="text-xs text-slate-500">Maintenance préventive</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-2">
                <Calendar className="h-5 w-5 text-[#f98440]" />
              </div>
            </div>
          </div>
        </div>

        {/* Rapports et Analyses */}
        <div className="mb-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
            <Activity className="text-[#f98440]" size={22} />
            Rapports et Analyses
          </h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {maintenanceReports.map((report, index) => {
              const colorStyles: Record<string, string> = {
                indigo: 'from-[#d95f24] to-[#f98440]',
                rose: 'from-[#e86d2f] to-[#ff9d63]',
                amber: 'from-[#c94f18] to-[#e97435]',
                blue: 'from-[#ef7b3f] to-[#ffad7d]',
                emerald: 'from-[#d95f24] to-[#f58b4d]',
                purple: 'from-[#b94412] to-[#dc642b]'
              };

              return (
                <button
                  key={index}
                  onClick={() => navigate(report.route)}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className={`bg-gradient-to-l ${colorStyles[report.color]} p-4 text-white`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="opacity-80">
                        {report.icon}
                      </div>
                      <TrendingUp size={18} className="opacity-60" />
                    </div>
                    {report.count !== undefined && (
                      <div className="mb-1 text-2xl font-black">{report.count}</div>
                    )}
                    <div className="text-sm opacity-90 font-medium mb-1">{report.title}</div>
                    {report.subtitle && (
                      <div className="text-xs opacity-75">{report.subtitle}</div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-slate-600">{report.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions rapides */}
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <RefreshCw className="text-slate-600" size={22} />
            Actions Rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/admin/planification-clients')}
              className="flex items-center justify-between rounded-lg bg-orange-50 p-3 transition-all hover:bg-orange-100"
            >
              <div className="flex items-center gap-3">
                <Calendar className="text-[#f98440]" size={20} />
                <span className="font-medium text-slate-700">Planification Clients</span>
              </div>
              <ArrowRight className="text-slate-400" size={18} />
            </button>

            <button
              onClick={() => navigate('/admin/plans-maintenance/new')}
              className="flex items-center justify-between rounded-lg bg-orange-50 p-3 transition-all hover:bg-orange-100"
            >
              <div className="flex items-center gap-3">
                <Calendar className="text-[#f98440]" size={20} />
                <span className="font-medium text-slate-700">Nouveau Plan Maintenance</span>
              </div>
              <ArrowRight className="text-slate-400" size={18} />
            </button>

            <button
              onClick={() => navigate('/admin')}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg hover:from-slate-100 hover:to-slate-200 transition-all"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="text-slate-600" size={20} />
                <span className="font-medium text-slate-700">Retour Administration</span>
              </div>
              <ArrowRight className="text-slate-400" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
