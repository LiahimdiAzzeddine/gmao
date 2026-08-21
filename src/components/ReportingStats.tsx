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
import { supabaseGes } from '../lib/supagestion';

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" />
          <p className="text-slate-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-3">Reporting & Statistiques</h1>
                <p className="text-purple-100 text-lg">
                  Analyses, rapports et exports de données pour une gestion optimale
                </p>
              </div>
              <div className="hidden md:block">
                <div className="bg-white bg-opacity-20 p-4 rounded-xl">
                  <BarChart3 size={64} className="text-white opacity-80" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs font-medium mb-0.5">Machines</p>
                <p className="text-xl font-bold text-slate-800">{stats.totalMachines}</p>
                <p className="text-xs text-slate-500">{stats.machinesActives} actives</p>
              </div>
              <div className="bg-blue-50 p-2 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-emerald-500">
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

          <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs font-medium mb-0.5">Interventions</p>
                <p className="text-xl font-bold text-slate-800">{stats.totalInterventions}</p>
                <p className="text-xs text-slate-500">{stats.interventionsValidees} validées</p>
              </div>
              <div className="bg-purple-50 p-2 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs font-medium mb-0.5">Plans Actifs</p>
                <p className="text-xl font-bold text-slate-800">{stats.plansActifs}</p>
                <p className="text-xs text-slate-500">Maintenance préventive</p>
              </div>
              <div className="bg-orange-50 p-2 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Rapports et Analyses */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Activity className="text-indigo-600" size={28} />
            Rapports et Analyses
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {maintenanceReports.map((report, index) => {
              const colorStyles: Record<string, string> = {
                indigo: 'from-indigo-500 to-indigo-600',
                rose: 'from-rose-500 to-rose-600',
                amber: 'from-amber-500 to-amber-600',
                blue: 'from-blue-500 to-blue-600',
                emerald: 'from-emerald-500 to-emerald-600',
                purple: 'from-purple-500 to-purple-600'
              };

              return (
                <button
                  key={index}
                  onClick={() => navigate(report.route)}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-left"
                >
                  <div className={`bg-gradient-to-br ${colorStyles[report.color]} p-5 text-white`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="opacity-80">
                        {report.icon}
                      </div>
                      <TrendingUp size={18} className="opacity-60" />
                    </div>
                    {report.count !== undefined && (
                      <div className="text-3xl font-bold mb-1">{report.count}</div>
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
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <RefreshCw className="text-slate-600" size={22} />
            Actions Rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/admin/planification-clients')}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg hover:from-orange-100 hover:to-amber-100 transition-all"
            >
              <div className="flex items-center gap-3">
                <Calendar className="text-orange-600" size={20} />
                <span className="font-medium text-slate-700">Planification Clients</span>
              </div>
              <ArrowRight className="text-slate-400" size={18} />
            </button>

            <button
              onClick={() => navigate('/admin/plans-maintenance/new')}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg hover:from-purple-100 hover:to-indigo-100 transition-all"
            >
              <div className="flex items-center gap-3">
                <Calendar className="text-purple-600" size={20} />
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
