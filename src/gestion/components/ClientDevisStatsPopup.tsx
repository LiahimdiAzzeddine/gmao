import { useState, useCallback, useEffect } from 'react';
import { X, Download, TrendingUp, FileText, DollarSign, CheckSquare, Square, PieChart, BarChart3, Calendar, Package, Receipt, Percent, Clock, ShoppingCart, TrendingDown } from 'lucide-react';
import { Client, Devis } from '../../types/devis';
import { calculateTotalHT, calculateTotalTTC, formatNumber, getStatutColor, statutLabels } from '../../utils/gestionMethode';
import { exportDevisStatsToExcel } from '../../utils/createDetailsSheet';
import { useDevis } from '../../hooks/useDevis';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart as RechartsPie, Pie, Cell, ComposedChart, Area } from 'recharts';

interface ClientDevisStatsPopupProps {
  client: Client;
  onClose: () => void;
  supabase: any;
}

interface StatutStats {
  count: number;
  totalHT: number;
  totalTTC: number;
  totalAchatsHT: number;
}

interface Stats {
  [key: string]: StatutStats;
}

interface DepenseTypeStats {
  fourniture: number;
  transport: number;
  main_oeuvre: number;
  transit: number;
}

interface MonthlyData {
  month: string;
  ventes: number;
  achats: number;
  marge: number;
  count: number;
}

export default function ClientDevisStatsPopup({ client, onClose, supabase }: ClientDevisStatsPopupProps) {
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [stats, setStats] = useState<Stats>({});
  const [totalGeneral, setTotalGeneral] = useState({ count: 0, totalHT: 0, totalTTC: 0, totalAchatsHT: 0 });
  const [selectedStatuts, setSelectedStatuts] = useState<string[]>([]);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [depenseStats, setDepenseStats] = useState<DepenseTypeStats>({ fourniture: 0, transport: 0, main_oeuvre: 0, transit: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [kpiData, setKpiData] = useState({
    tauxConversion: 0,
    panierMoyen: 0,
    margeMoyenne: 0,
    nombreFactures: 0,
    montantFacture: 0,
    nombreBL: 0
  });

  useEffect(() => {
    let startDate: Date;
    let endDate: Date;

    if (selectedMonth === null) {
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear, 11, 31);
    } else {
      startDate = new Date(selectedYear, selectedMonth, 1);
      endDate = new Date(selectedYear, selectedMonth + 1, 0);
    }

    setDateDebut(startDate.toISOString().slice(0, 10));
    setDateFin(endDate.toISOString().slice(0, 10));
  }, [selectedYear, selectedMonth]);

  const calculateStats = useCallback((devisData: Devis[]) => {
    const statsTemp: Stats = {};
    let totalCount = 0;
    let totalHTSum = 0;
    let totalTTCSum = 0;
    let totalAchatsHT = 0;

    const depenses: DepenseTypeStats = { fourniture: 0, transport: 0, main_oeuvre: 0, transit: 0 };
    const monthlyMap: { [key: string]: { ventes: number; achats: number; count: number } } = {};

    let devisAcceptes = 0;
    let nombreFactures = 0;
    let montantFacture = 0;
    let nombreBL = 0;

    devisData.forEach((d) => {
      if (d.statut === 'annule' || d.statut === 'en_attente') return;

      const totalHT = calculateTotalHT(d);
      const totalTTC = d.ht_ttc === 'HT' ? totalHT : calculateTotalTTC(totalHT);

      const achatsHT = (d.chantiers?.achats || [])
        .filter(a => a.statut !== 'annule')
        .reduce((sum, a) => sum + Number(a.total_ht || 0), 0);

      (d.chantiers?.achats || [])
        .filter(a => a.statut !== 'annule')
        .forEach(a => {
          const type = a.type_depense || 'fourniture';
          if (type in depenses) {
            depenses[type as keyof DepenseTypeStats] += Number(a.total_ht || 0);
          }
        });

      if (d.date_devis) {
        const date = new Date(d.date_devis);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { ventes: 0, achats: 0, count: 0 };
        }
        monthlyMap[monthKey].ventes += totalHT;
        monthlyMap[monthKey].achats += achatsHT;
        monthlyMap[monthKey].count += 1;
      }

      if (d.statut === 'accepte' || d.statut === 'facturé' || d.statut === 'terminé' || d.statut === 'payé') {
        devisAcceptes++;
      }

      if (d.factures) {
        nombreFactures += 1;
            montantFacture += totalHT;
      }

      if (d.bons_livraison) {
        nombreBL += 1;
      }

      if (!statsTemp[d.statut]) {
        statsTemp[d.statut] = { count: 0, totalHT: 0, totalTTC: 0, totalAchatsHT: 0 };
      }

      statsTemp[d.statut].count++;
      statsTemp[d.statut].totalHT += totalHT;
      statsTemp[d.statut].totalTTC += totalTTC;
      statsTemp[d.statut].totalAchatsHT += achatsHT;

      totalCount++;
      totalHTSum += totalHT;
      totalTTCSum += totalTTC;
      totalAchatsHT += achatsHT;
    });

    const monthlyArray: MonthlyData[] = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: month.split('-')[1] + '/' + month.split('-')[0].slice(2),
        ventes: data.ventes,
        achats: data.achats,
        marge: data.ventes - data.achats,
        count: data.count
      }));

    setStats(statsTemp);
    setTotalGeneral({ count: totalCount, totalHT: totalHTSum, totalTTC: totalTTCSum, totalAchatsHT });
    setDepenseStats(depenses);
    setMonthlyData(monthlyArray);
    setKpiData({
      tauxConversion: totalCount > 0 ? (devisAcceptes / totalCount) * 100 : 0,
      panierMoyen: totalCount > 0 ? totalHTSum / totalCount : 0,
      margeMoyenne: totalHTSum > 0 ? ((totalHTSum - totalAchatsHT) / totalHTSum) * 100 : 0,
      nombreFactures,
      montantFacture,
      nombreBL
    });
  }, []);

  const { devis, loading } = useDevis(supabase, { clientId: client.id, dateDebut, dateFin }, calculateStats);

  const allDevisAreHT = devis.every(d => d.ht_ttc === 'HT');

  const toggleStatut = (statut: string) => {
    setSelectedStatuts(prev => prev.includes(statut) ? prev.filter(s => s !== statut) : [...prev, statut]);
  };

  const toggleAllStatuts = () => {
    setSelectedStatuts(selectedStatuts.length === Object.keys(stats).length ? [] : Object.keys(stats));
  };

  const exportToExcel = () => {
    exportDevisStatsToExcel(client, devis, stats, selectedStatuts, dateDebut, dateFin);
    console.log('Export to Excel triggered', client, devis, stats, selectedStatuts, dateDebut, dateFin);
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
                <div className="w-4 h-4 rounded" style={{ backgroundColor: getStatutColor(statut).chart }} />
                <div className="text-sm">
                  <div className="font-medium text-gray-700">{statutLabels[statut]} ({data.count})</div>
                  <div className="text-gray-500 text-xs">{percentage}% - {formatNumber(data.totalTTC)} {devis[0]?.monetaire?.symbol || 'Dhs'}</div>
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
                <span className="font-medium text-gray-700">{statutLabels[statut]} ({data.count})</span>
                <span className="text-gray-600 font-semibold">{formatNumber(data.totalTTC)} {devis[0]?.monetaire?.symbol || 'Dhs'}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                <div
                  className="h-full flex items-center justify-end pr-3 text-white text-xs font-medium transition-all duration-500"
                  style={{ width: `${percentage}%`, backgroundColor: getStatutColor(statut).chart }}
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

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
  const depenseLabels = { fourniture: 'Fournitures', transport: 'Transport', main_oeuvre: 'Main d\'œuvre', transit: 'Transit' };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] max-h-[97vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp size={28} />
              Statistiques Devis - Analyse Avancée
            </h2>
            <p className="text-orange-100 mt-1">Client: {client.client}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-orange-700 rounded-full p-2 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Mois</label>
              <div className="relative">
                <select
                  value={selectedMonth ?? ''}
                  onChange={(e) => setSelectedMonth(e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
                >
                  <option value="">Tous les mois</option>
                  {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((m, index) => (
                    <option key={m} value={index}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Année</label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
                >
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => { setSelectedYear(currentYear); setSelectedMonth(null); }}
              className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <Percent className="text-green-600" size={24} />
                    <span className="text-xs font-semibold text-green-700 bg-green-200 px-2 py-1 rounded-full">KPI</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Taux de Conversion</p>
                  <p className="text-2xl font-bold text-green-700">{kpiData.tauxConversion.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 mt-1">Devis acceptés/total</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <ShoppingCart className="text-blue-600" size={24} />
                    <span className="text-xs font-semibold text-blue-700 bg-blue-200 px-2 py-1 rounded-full">KPI</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Panier Moyen</p>
                  <p className="text-2xl font-bold text-blue-700">{formatNumber(kpiData.panierMoyen)}</p>
                  <p className="text-xs text-gray-500 mt-1">{devis[0]?.monetaire?.symbol || 'Dhs'} par devis</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border-2 border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingDown className="text-orange-600" size={24} />
                    <span className="text-xs font-semibold text-orange-700 bg-orange-200 px-2 py-1 rounded-full">KPI</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Marge Moyenne</p>
                  <p className="text-2xl font-bold text-orange-700">{kpiData.margeMoyenne.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 mt-1">Sur tous les devis</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <Receipt className="text-purple-600" size={24} />
                    <span className="text-xs font-semibold text-purple-700 bg-purple-200 px-2 py-1 rounded-full">KPI</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Factures Émises</p>
                  <p className="text-2xl font-bold text-purple-700">{kpiData.nombreFactures}</p>
                  <p className="text-xs text-gray-500 mt-1">{kpiData.nombreBL} bons de livraison</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border-2 border-orange-300">
                    <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                      <FileText size={20} />
                      Résumé Global
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">Nombre de devis</p>
                        <p className="text-3xl font-bold text-orange-600">{totalGeneral.count}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">Vente Total HT</p>
                        <p className="text-xl font-bold text-green-600">{formatNumber(Number(totalGeneral.totalHT.toFixed(2)))} {devis[0]?.monetaire?.symbol || 'Dhs'}</p>
                      </div>
                      {!allDevisAreHT && (
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-sm text-gray-600 mb-1">Vente Total TTC</p>
                          <p className="text-xl font-bold text-blue-600">{formatNumber(Number(totalGeneral.totalTTC.toFixed(2)))} {devis[0]?.monetaire?.symbol || 'Dhs'}</p>
                        </div>
                      )}
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">Total Achats HT</p>
                        <p className="text-xl font-bold text-red-600">{formatNumber(Number(totalGeneral.totalAchatsHT.toFixed(2)))} {devis[0]?.monetaire?.symbol || 'Dhs'}</p>
                        <p className="text-xs text-gray-500 mt-1">{totalGeneral.totalHT > 0 ? `${((totalGeneral.totalAchatsHT / totalGeneral.totalHT) * 100).toFixed(1)}%` : '0%'} du total</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 shadow-sm border-2 border-dashed border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">Marge Globale</p>
                        <p className={`text-xl font-bold ${totalGeneral.totalHT - totalGeneral.totalAchatsHT >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatNumber(Number((totalGeneral.totalHT - totalGeneral.totalAchatsHT).toFixed(2)))} {devis[0]?.monetaire?.symbol || 'Dhs'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{totalGeneral.totalHT > 0 ? `${(((totalGeneral.totalHT - totalGeneral.totalAchatsHT) / totalGeneral.totalHT) * 100).toFixed(1)}%` : '0%'} du total</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Package size={20} />
                        Répartition des Dépenses
                      </h3>
                    </div>
                    {Object.values(depenseStats).every(v => v === 0) ? (
                      <div className="text-center py-8 text-gray-500">Aucune dépense enregistrée</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPie>
                          <Pie
                            data={Object.entries(depenseStats)
                              .filter(([, value]) => value > 0)
                              .map(([key, value]) => ({
                                name: depenseLabels[key as keyof typeof depenseLabels],
                                value: value
                              }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${typeof percent === 'number' ? (percent * 100).toFixed(0) : '0'}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {Object.entries(depenseStats).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatNumber(value) + ' ' + (devis[0]?.monetaire?.symbol || 'Dhs') : ''} />
                        </RechartsPie>
                      </ResponsiveContainer>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {Object.entries(depenseStats).map(([key, value], index) => (
                        <div key={key} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[index] }} />
                          <div className="flex-1">
                            <p className="text-xs text-gray-600">{depenseLabels[key as keyof typeof depenseLabels]}</p>
                            <p className="text-sm font-bold text-gray-800">{formatNumber(value)} {devis[0]?.monetaire?.symbol || 'Dhs'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-800">Répartition par Statut</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setChartType('pie')}
                          className={`p-2 rounded-lg transition-colors ${chartType === 'pie' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          <PieChart size={20} />
                        </button>
                        <button
                          onClick={() => setChartType('bar')}
                          className={`p-2 rounded-lg transition-colors ${chartType === 'bar' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          <BarChart3 size={20} />
                        </button>
                      </div>
                    </div>
                    {Object.keys(stats).length === 0 ? (
                      <div className="text-center py-12 text-gray-500">Aucun devis trouvé pour cette période</div>
                    ) : chartType === 'pie' ? (
                      <PieChartComponent />
                    ) : (
                      <BarChartComponent />
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {monthlyData.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Calendar size={20} />
                        Évolution Mensuelle
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatNumber(value) : ''} />
                          <Legend />
                          <Area type="monotone" dataKey="marge" fill="#10b981" stroke="#10b981" fillOpacity={0.3} name="Marge" />
                          <Bar dataKey="ventes" fill="#3b82f6" name="Ventes" />
                          <Bar dataKey="achats" fill="#ef4444" name="Achats" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <BarChart3 size={20} />
                      Budget vs Achats
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={[{ name: 'Total devis HT', value: totalGeneral.totalHT }, { name: 'Total Achats HT', value: totalGeneral.totalAchatsHT }]} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatNumber(value) : ''} />
                        <Bar dataKey="value" fill="#FFA500" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-800">Sélectionner les statuts à exporter</h3>
                      <button onClick={toggleAllStatuts} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                        {selectedStatuts.length === Object.keys(stats).length ? (
                          <><CheckSquare size={16} />Tout désélectionner</>
                        ) : (
                          <><Square size={16} />Tout sélectionner</>
                        )}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(stats).map(statut => (
                        <button
                          key={statut}
                          onClick={() => toggleStatut(statut)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${selectedStatuts.includes(statut) ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white hover:border-blue-300'}`}
                        >
                          {selectedStatuts.includes(statut) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-gray-400" />}
                          <span className={`text-sm font-medium ${selectedStatuts.includes(statut) ? 'text-blue-700' : 'text-gray-700'}`}>{statutLabels[statut]} ({stats[statut].count})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <DollarSign size={20} />
                      Détails par Statut
                    </h3>
                    {Object.keys(stats).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">Aucun devis trouvé pour cette période</div>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(stats).sort((a, b) => b[1].totalTTC - a[1].totalTTC).map(([statut, data]) => {
                          const colors = getStatutColor(statut);
                          const percentageOfTotal = ((data.totalTTC / totalGeneral.totalTTC) * 100).toFixed(1);
                          const percentageAchats = data.totalHT > 0 ? ((data.totalAchatsHT / data.totalHT) * 100).toFixed(1) : '0.0';
                          const margeStatut = data.totalHT - data.totalAchatsHT;
                          const percentageRestant = data.totalHT > 0 ? ((margeStatut / data.totalHT) * 100).toFixed(1) : '0.0';

                          return (
                            <div key={statut} className={`bg-white rounded-xl border-2 overflow-hidden hover:shadow-lg transition-all ${selectedStatuts.includes(statut) ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'}`}>
                              <div className={`${colors.bg} p-3`}>
                                <div className="flex items-center justify-between">
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold border-2 ${colors.bg} ${colors.text} ${colors.border}`}>{statutLabels[statut] || statut}</span>
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-gray-800">{data.count}</div>
                                    <div className="text-xs text-gray-600">devis ({percentageOfTotal}%)</div>
                                  </div>
                                </div>
                              </div>
                              <div className="p-3 bg-gradient-to-br from-gray-50 to-white">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1 font-medium">Vente HT</p>
                                    <p className="text-lg font-bold text-green-600">{formatNumber(Number(data.totalHT.toFixed(2)))} {devis[0]?.monetaire?.symbol || 'Dhs'}</p>
                                  </div>
                                  <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1 font-medium">Achats HT</p>
                                    <p className="text-lg font-bold text-red-600">{formatNumber(Number(data.totalAchatsHT.toFixed(2)))} {devis[0]?.monetaire?.symbol || 'Dhs'}</p>
                                    <p className="text-xs font-semibold text-orange-600">{percentageAchats}%</p>
                                  </div>
                                </div>
                                <div className="mt-2 bg-white rounded-lg p-2 shadow-sm border border-gray-100">
                                  <p className="text-xs text-gray-500 mb-1 font-medium">Marge</p>
                                  <p className={`text-lg font-bold ${margeStatut >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatNumber(Number(margeStatut.toFixed(2)))} {devis[0]?.monetaire?.symbol || 'Dhs'}</p>
                                  <p className={`text-xs font-semibold ${margeStatut >= 0 ? 'text-green-600' : 'text-red-600'}`}>{percentageRestant}%</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedStatuts.length > 0 && <span className="font-medium">{selectedStatuts.length} statut(s) sélectionné(s) pour l'export</span>}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium">Fermer</button>
            <button
              onClick={exportToExcel}
              disabled={selectedStatuts.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              Exporter Excel ({selectedStatuts.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
