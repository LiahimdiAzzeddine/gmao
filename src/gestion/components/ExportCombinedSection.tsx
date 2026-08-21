import { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Calendar,
  BarChart3,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { supabaseGes } from '../../lib/supagestion';
import { supabase } from '../../lib/supabase';
import { exportDevisToExcel } from '../../utils/exportExcel';
import { exportContractPeriodsToExcel } from '../../utils/exportContractPeriodsExcel';

interface CombinedStats {
  p2: {
    count: number;
    totalValue: number;
    clients: number;
  };
  p5: {
    count: number;
    totalValue: number;
    clients: number;
  };
}

export default function ExportCombinedSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CombinedStats>({
    p2: { count: 0, totalValue: 0, clients: 0 },
    p5: { count: 0, totalValue: 0, clients: 0 }
  });
  const [exportingP2, setExportingP2] = useState(false);
  const [exportingP5, setExportingP5] = useState(false);
  const [exportingCombined, setExportingCombined] = useState(false);

  useEffect(() => {
    loadCombinedStats();
  }, []);

  const loadCombinedStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les stats P2 (périodes de contrats)
      const { data: p2Data, error: p2Error } = await supabaseGes
        .from('contract_periods')
        .select(`
          montant,
          contract:contracts!inner (
            client_id,
            client:clients_devis!inner (id)
          )
        `)
        .not('facture_id', 'is', null)
        .eq('contract.statut', 'actif');

      if (p2Error) throw p2Error;

      // Charger les stats P5 (devis)
      const { data: p5Data, error: p5Error } = await supabase
        .from('devis')
        .select(`
          id,
          devis_lignes (prix, quantite),
          client_devis_id
        `);

      if (p5Error) throw p5Error;

      // Calculer les stats P2
      const p2Stats = {
        count: p2Data?.length || 0,
        totalValue: p2Data?.reduce((sum, item) => sum + (item.montant || 0), 0) || 0,
        clients: new Set(p2Data?.map(item => item.contract?.client_id).filter(Boolean)).size || 0
      };

      // Calculer les stats P5
      const p5TotalValue = p5Data?.reduce((sum, devis) => {
        const devisTotal = devis.devis_lignes?.reduce((devisSum: number, ligne: any) => 
          devisSum + (ligne.prix * ligne.quantite), 0) || 0;
        return sum + devisTotal;
      }, 0) || 0;

      const p5Stats = {
        count: p5Data?.length || 0,
        totalValue: p5TotalValue,
        clients: new Set(p5Data?.map(item => item.client_devis_id).filter(Boolean)).size || 0
      };

      setStats({ p2: p2Stats, p5: p5Stats });
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleExportP2 = async () => {
    setExportingP2(true);
    try {
      // Récupérer toutes les données P2
      const { data, error } = await supabaseGes
        .from('contract_periods')
        .select(`
          *,
          contract:contracts!inner (
            *,
            client:clients_devis!inner (
              id,
              client,
              ice,
              numero_fournisseur
            ),
            emetteur:emetteurs (
              id,
              nom,
              telephone,
              email
            ),
            contact:contacts (
              num_contact,
              nom,
              tel,
              email,
              adresse
            ),
            chantier:chantiers (
              code,
              chantier,
              type_devis:type_devis (
                id,
                libelle,
                code
              )
            )
          ),
          facture:factures!inner (*),
          correctifs:contract_period_correctifs (
            id,
            description,
            prix_unitaire,
            quantite,
            total,
            created_at
          )
        `)
        .not('facture_id', 'is', null)
        .eq('contract.statut', 'actif')
        .order('periode_debut', { ascending: false });

      if (error) throw error;

      exportContractPeriodsToExcel(data || [], {
        filename: `export_complet_P2_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Périodes P2 - Complet'
      });
    } catch (error) {
      console.error('Erreur lors de l\'export P2:', error);
      setError('Erreur lors de l\'export P2');
    } finally {
      setExportingP2(false);
    }
  };

  const handleExportP5 = async () => {
    setExportingP5(true);
    try {
      // Récupérer toutes les données P5
      const { data, error } = await supabase
        .from('devis')
        .select(`
          *,
          clients_devis (
            id,
            client,
            ice
          ),
          chantiers (
            code,
            chantier
          ),
          contact:contacts (
            num_contact,
            nom,
            tel
          ),
          emetteurs (
            id,
            nom
          ),
          monetaire (
            id,
            unite,
            symbol
          ),
          type_devis (
            id,
            libelle,
            code
          ),
          domaines_activite (
            id,
            libelle
          ),
          factures (
            id,
            numero_facture,
            date_facture,
            date_echeance,
            statut
          ),
          devis_lignes (
            id,
            materiel,
            quantite,
            prix,
            ordre,
            type,
            unite
          )
        `)
        .order('date_devis', { ascending: false });

      if (error) throw error;

      exportDevisToExcel(data || [], {
        filename: `export_complet_P5_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Devis P5 - Complet'
      });
    } catch (error) {
      console.error('Erreur lors de l\'export P5:', error);
      setError('Erreur lors de l\'export P5');
    } finally {
      setExportingP5(false);
    }
  };

  const handleExportCombined = async () => {
    setExportingCombined(true);
    try {
      // Exporter les deux en même temps avec des noms de fichiers distincts
      await Promise.all([
        handleExportP2(),
        handleExportP5()
      ]);
    } catch (error) {
      console.error('Erreur lors de l\'export combiné:', error);
      setError('Erreur lors de l\'export combiné');
    } finally {
      setExportingCombined(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <p className="text-gray-600 font-medium">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-xl">
            <AlertCircle className="text-red-600" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur de chargement</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={loadCombinedStats}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <RefreshCw size={16} />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Export Combiné P2 & P5</h1>
            <p className="text-indigo-100">
              Exportez toutes vos données de périodes de contrats (P2) et devis (P5) en un clic
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <FileText className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques comparatives */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stats P2 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Périodes P2</h3>
            <div className="p-3 bg-orange-100 rounded-xl">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Nombre de périodes</span>
              <span className="text-xl font-bold text-gray-900">{stats.p2.count}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Valeur totale</span>
              <span className="text-xl font-bold text-green-600">{formatCurrency(stats.p2.totalValue)}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Clients actifs</span>
              <span className="text-xl font-bold text-blue-600">{stats.p2.clients}</span>
            </div>
          </div>

          <button
            onClick={handleExportP2}
            disabled={exportingP2 || stats.p2.count === 0}
            className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl"
          >
            {exportingP2 ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Export P2...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>Exporter P2 ({stats.p2.count} périodes)</span>
              </>
            )}
          </button>
        </div>

        {/* Stats P5 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Devis P5</h3>
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Nombre de devis</span>
              <span className="text-xl font-bold text-gray-900">{stats.p5.count}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Valeur totale</span>
              <span className="text-xl font-bold text-green-600">{formatCurrency(stats.p5.totalValue)}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Clients actifs</span>
              <span className="text-xl font-bold text-blue-600">{stats.p5.clients}</span>
            </div>
          </div>

          <button
            onClick={handleExportP5}
            disabled={exportingP5 || stats.p5.count === 0}
            className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl"
          >
            {exportingP5 ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Export P5...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>Exporter P5 ({stats.p5.count} devis)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Export combiné */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200">
        <div className="text-center">
          <div className="p-4 bg-green-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <BarChart3 className="w-10 h-10 text-green-600" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Export Complet</h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Exportez toutes vos données P2 et P5 en même temps. Vous recevrez deux fichiers Excel séparés 
            avec toutes les informations détaillées.
          </p>
          
          <div className="flex items-center justify-center gap-8 mb-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>{stats.p2.count} périodes P2</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>{stats.p5.count} devis P5</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Données complètes</span>
            </div>
          </div>

          <button
            onClick={handleExportCombined}
            disabled={exportingCombined || (stats.p2.count === 0 && stats.p5.count === 0)}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-all font-semibold text-lg shadow-lg hover:shadow-xl"
          >
            {exportingCombined ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span>Export en cours...</span>
              </>
            ) : (
              <>
                <Download size={24} />
                <span>Exporter Tout ({stats.p2.count + stats.p5.count} éléments)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Informations */}
      <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
        <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Informations sur l'export
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <h5 className="font-semibold mb-2">Export P2 (Périodes)</h5>
            <ul className="space-y-1">
              <li>• Toutes les périodes de contrats actifs</li>
              <li>• Informations complètes des factures</li>
              <li>• Détails des correctifs</li>
              <li>• Contacts et émetteurs</li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold mb-2">Export P5 (Devis)</h5>
            <ul className="space-y-1">
              <li>• Tous les devis avec leurs lignes</li>
              <li>• Informations clients complètes</li>
              <li>• Statuts et dates de paiement</li>
              <li>• Calculs automatiques des totaux</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}