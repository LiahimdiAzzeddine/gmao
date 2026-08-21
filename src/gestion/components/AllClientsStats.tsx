import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Download, Calendar, TrendingUp, FileText, DollarSign, Users, PieChart, BarChart3, Search } from 'lucide-react';
import { calculateTotalHT, calculateTotalTTC, formatNumber, getStatutColor, statutLabels } from '../../utils/gestionMethode';
import { exportAllClientsStatsToExcel } from '../../utils/createDetailsSheetAllClient';
import { Devis } from '../../types/devis';

interface StatutStats {
  count: number;
  totalHT: number;
  totalTTC: number;
}

interface ClientStats {
  clientName: string;
  count: number;
  totalHT: number;
  totalTTC: number;
}

interface Stats {
  [key: string]: StatutStats;
}

interface AllClientsStatsProps {
  onBack?: () => void;
  supabase: any;
}

export default function AllClientsStats({ onBack, supabase }: AllClientsStatsProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>({});
  const [clientStats, setClientStats] = useState<ClientStats[]>([]);
  const [totalGeneral, setTotalGeneral] = useState({ count: 0, totalHT: 0, totalTTC: 0 });
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [loading, setLoading] = useState(false);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [topClientsCount, setTopClientsCount] = useState(10);

  // Générer les années (10 ans en arrière et 1 an en avant)
  const years = Array.from({ length: 12 }, (_, i) => currentYear - 10 + i);
  
  // Mois de l'année
  const months = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' },
  ];

  const fetchDevis = useCallback(async () => {
    if (!supabase) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('devis')
        .select(`
          *,
          monetaire:monetaire_id (*),
          type_devis ( libelle ),
          domaines_activite ( libelle ),
          lignes:devis_lignes ( quantite, prix, type ),
          clients_devis:client_devis_id(*)
        `)
        .neq('statut', 'annule');

      // Filtrer par année et mois
      if (selectedMonth) {
        // Si un mois est sélectionné, filtrer par ce mois spécifique
        const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
        query = query.gte('date_devis', startDate).lte('date_devis', endDate);
      } else {
        // Si aucun mois n'est sélectionné, filtrer par toute l'année
        const startDate = `${selectedYear}-01-01`;
        const endDate = `${selectedYear}-12-31`;
        query = query.gte('date_devis', startDate).lte('date_devis', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      setDevis(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des devis:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchDevis();
  }, [fetchDevis]);

  const handleExport = () => {
    const periodLabel = selectedMonth 
      ? `${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}`
      : `Annee_${selectedYear}`;
    
    exportAllClientsStatsToExcel(
      devis.filter(d => d.statut !== 'annule'),
      stats,
      clientStats,
      periodLabel,
      periodLabel
    );
  };

  const calculateStats = (devisData: Devis[]) => {
    const statsTemp: Stats = {};
    const clientStatsTemp: { [key: string]: ClientStats } = {};
    let totalCount = 0;
    let totalHTSum = 0;
    let totalTTCSum = 0;

    devisData.forEach((d) => {
      if (d.statut === 'annule') return;
      
      const totalHT = calculateTotalHT(d);
      const totalTTC = d.ht_ttc === 'HT' ? totalHT : calculateTotalTTC(totalHT);

      // Stats par statut
      if (!statsTemp[d.statut]) {
        statsTemp[d.statut] = { count: 0, totalHT: 0, totalTTC: 0 };
      }
      statsTemp[d.statut].count++;
      statsTemp[d.statut].totalHT += totalHT;
      statsTemp[d.statut].totalTTC += totalTTC;

      // Stats par client
      const clientName = d.clients_devis?.client || 'Client inconnu';
      if (!clientStatsTemp[clientName]) {
        clientStatsTemp[clientName] = { clientName, count: 0, totalHT: 0, totalTTC: 0 };
      }
      clientStatsTemp[clientName].count++;
      clientStatsTemp[clientName].totalHT += totalHT;
      clientStatsTemp[clientName].totalTTC += totalTTC;

      totalCount++;
      totalHTSum += totalHT;
      totalTTCSum += totalTTC;
    });

    setStats(statsTemp);
    setClientStats(Object.values(clientStatsTemp).sort((a, b) => b.totalTTC - a.totalTTC));
    setTotalGeneral({ count: totalCount, totalHT: totalHTSum, totalTTC: totalTTCSum });
  };

  const allDevisAreHT = devis.every(d => d.ht_ttc === 'HT');
  const currencySymbol = devis[0]?.monetaire?.symbol || 'Dhs';

  const filteredClientStats = clientStats.filter(client =>
    client.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topClients = filteredClientStats.slice(0, topClientsCount);

  const getPeriodLabel = () => {
    if (selectedMonth) {
      return `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;
    }
    return `Année ${selectedYear}`;
  };

  const PieChartComponent = () => {
    const total = Object.values(stats).reduce((sum, s) => sum + s.totalTTC, 0);
    let currentAngle = 0;

    return (
      <div className="flex items-center justify-center gap-8">
        <svg width="280" height="280" viewBox="0 0 280 280" className="transform -rotate-90">
          <circle cx="140" cy="140" r="100" fill="#f3f4f6" />
          {Object.entries(stats).map(([statut, data]) => {
            const percentage = (data.totalTTC / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;

            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = 140 + 100 * Math.cos(startRad);
            const y1 = 140 + 100 * Math.sin(startRad);
            const x2 = 140 + 100 * Math.cos(endRad);
            const y2 = 140 + 100 * Math.sin(endRad);

            const largeArc = angle > 180 ? 1 : 0;

            const path = `M 140 140 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`;

            currentAngle = endAngle;

            return (
              <path
                key={statut}
                d={path}
                fill={getStatutColor(statut).chart}
                stroke="white"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            );
          })}
          <circle cx="140" cy="140" r="60" fill="white" />
        </svg>

        <div className="space-y-2">
          {Object.entries(stats).map(([statut, data]) => {
            const percentage = ((data.totalTTC / total) * 100).toFixed(1);
            return (
              <div key={statut} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getStatutColor(statut).chart }}
                />
                <div className="text-sm">
                  <div className="font-medium text-gray-700">
                    {statutLabels[statut]} ({data.count})
                  </div>
                  <div className="text-gray-500 text-xs">
                    {percentage}% - {formatNumber(data.totalTTC)} {currencySymbol}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const BarChartComponent = () => {
    const maxValue = Math.max(...Object.values(stats).map(s => s.totalTTC));

    return (
      <div className="space-y-4">
        {Object.entries(stats).map(([statut, data]) => {
          const percentage = (data.totalTTC / maxValue) * 100;
          return (
            <div key={statut} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700">
                  {statutLabels[statut]} ({data.count})
                </span>
                <span className="text-gray-600 font-semibold">
                  {formatNumber(data.totalTTC)} {currencySymbol}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                <div
                  className="h-full flex items-center justify-end pr-3 text-white text-xs font-medium transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: getStatutColor(statut).chart
                  }}
                >
                  {percentage > 20 && `${percentage.toFixed(0)}%`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg rounded-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack || (() => window.history.back())}
                className="text-white hover:bg-orange-700 rounded-full p-2 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <TrendingUp size={32} />
                  Statistiques Globales des Devis
                </h1>
                <p className="text-orange-100 mt-1">Tous les clients - {getPeriodLabel()}</p>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={loading || devis.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
            >
              <Download size={20} />
              Exporter en Excel
            </button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtres année et mois */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline mr-2" size={16} />
                Année
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline mr-2" size={16} />
                Mois (optionnel)
              </label>
              <select
                value={selectedMonth || ''}
                onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Toute l'année</option>
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setSelectedYear(currentYear);
                setSelectedMonth(null);
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Résumé global */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-300 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="text-orange-600" size={24} />
                  <p className="text-sm text-orange-800 font-medium">Nombre total de devis</p>
                </div>
                <p className="text-4xl font-bold text-orange-600">{totalGeneral.count}</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-300 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="text-green-600" size={24} />
                  <p className="text-sm text-green-800 font-medium">Montant Total HT</p>
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {formatNumber(totalGeneral.totalHT)} {currencySymbol}
                </p>
              </div>

              {!allDevisAreHT && (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-300 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="text-blue-600" size={24} />
                    <p className="text-sm text-blue-800 font-medium">Montant Total TTC</p>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatNumber(totalGeneral.totalTTC)} {currencySymbol}
                  </p>
                </div>
              )}

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-300 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="text-purple-600" size={24} />
                  <p className="text-sm text-purple-800 font-medium">Nombre de clients</p>
                </div>
                <p className="text-4xl font-bold text-purple-600">{clientStats.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Graphiques par statut */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-800">
                    Répartition par Statut
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setChartType('pie')}
                      className={`p-2 rounded-lg transition-colors ${
                        chartType === 'pie'
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <PieChart size={20} />
                    </button>
                    <button
                      onClick={() => setChartType('bar')}
                      className={`p-2 rounded-lg transition-colors ${
                        chartType === 'bar'
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <BarChart3 size={20} />
                    </button>
                  </div>
                </div>

                {Object.keys(stats).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Aucun devis trouvé pour cette période
                  </div>
                ) : chartType === 'pie' ? (
                  <PieChartComponent />
                ) : (
                  <BarChartComponent />
                )}
              </div>

              {/* Détails par statut */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <DollarSign size={20} />
                  Détails par Statut
                </h3>

                {Object.keys(stats).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucun devis trouvé pour cette période
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(stats)
                      .sort((a, b) => b[1].totalTTC - a[1].totalTTC)
                      .map(([statut, data]) => {
                        const colors = getStatutColor(statut);
                        const percentageOfTotal = ((data.totalTTC / totalGeneral.totalTTC) * 100).toFixed(1);

                        return (
                          <div
                            key={statut}
                            className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:shadow-lg transition-all"
                          >
                            <div className={`${colors.bg} p-4`}>
                              <div className="flex items-center justify-between">
                                <span
                                  className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 ${colors.bg} ${colors.text} ${colors.border}`}
                                >
                                  {statutLabels[statut] || statut}
                                </span>
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-gray-800">
                                    {data.count}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    devis ({percentageOfTotal}%)
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 bg-gradient-to-br from-gray-50 to-white">
                              {allDevisAreHT ? (
                                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                                  <p className="text-xs text-gray-500 mb-1 font-medium">Montant HT</p>
                                  <p className="text-xl font-bold text-green-600">
                                    {formatNumber(data.totalHT)} {currencySymbol}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Moy: {formatNumber(data.totalHT / data.count)} {currencySymbol}
                                  </p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1 font-medium">Montant HT</p>
                                    <p className="text-xl font-bold text-green-600">
                                      {formatNumber(data.totalHT)} {currencySymbol}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      Moy: {formatNumber(data.totalHT / data.count)} {currencySymbol}
                                    </p>
                                  </div>
                                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1 font-medium">Montant TTC</p>
                                    <p className="text-xl font-bold text-blue-600">
                                      {formatNumber(data.totalTTC)} {currencySymbol}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      Moy: {formatNumber(data.totalTTC / data.count)} {currencySymbol}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Top clients */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Users size={20} />
                  Top Clients
                </h3>
                <div className="flex gap-4 items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Rechercher un client..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={topClientsCount}
                    onChange={(e) => setTopClientsCount(Number(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                    <option value={20}>Top 20</option>
                    <option value={50}>Top 50</option>
                    <option value={clientStats.length}>Tous</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Nb Devis</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total HT</th>
                      {!allDevisAreHT && (
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total TTC</th>
                      )}
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Moy/Devis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClients.map((client, index) => (
                      <tr key={client.clientName} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-600">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {client.clientName}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {client.count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-right text-green-600">
                          {formatNumber(client.totalHT)} {currencySymbol}
                        </td>
                        {!allDevisAreHT && (
                          <td className="px-4 py-3 text-sm font-semibold text-right text-blue-600">
                            {formatNumber(client.totalTTC)} {currencySymbol}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {formatNumber(client.totalTTC / client.count)} {currencySymbol}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredClientStats.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Aucun client trouvé
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}