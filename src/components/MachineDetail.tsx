import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  supabase,
  Machine,
  Intervention,
  DemandeIntervention,
} from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft, Edit, FileText, ClipboardList, AlertCircle,
  Download, Wrench, Calendar, MapPin, Factory, Hash, Zap, Activity,
  School,
  RefreshCw,
  ImageIcon
} from 'lucide-react';
import DemandeModal from './DemandeModal';
import MachineHistorique from './MachineHistorique';
import { useSearchParams } from "react-router-dom";
import EmptyState from './Ui/EmptyState';
import MachineContent from './machine/MachineContent';
import OrdresTravail from './machine/OrdresTravail';
import { getMachineStateConfig } from '../types/machineState';
import ClientLayout from './ClientLayout';

type Tab = 'fiche' | 'historique';

export default function MachineDetail() {
  const { machineId, demandeId } = useParams<{ machineId: string; demandeId?: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [demandes, setDemandes] = useState<DemandeIntervention[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const tabFromUrl = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabFromUrl || "fiche");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDemandeModal, setShowDemandeModal] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    if (!machineId) return;
    loadMachine();
  }, [machineId]);

  useEffect(() => {
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    async function loadClientId() {
      if (!profile?.id) return;

      const { data, error } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (error) {
        console.error('Erreur récupération client_id:', error);
        return;
      }

      setClientId(data?.id || null);
    }

    loadClientId();
  }, [profile?.id]);

  async function loadMachine() {
    try {
      setLoading(true);

      // 1. Récupérer les données de la machine avec les plans de maintenance
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select(`
          *,
          client:clients(*),
          poste_technique:postes_techniques(
            *,
            site:sites(*),
            domaine:domaines(*),
            lot:lots(*),
            secteur:secteurs(*)
          ),
          plans_maintenance:plans_maintenance(
            *,
            lot:lots(*),
            gamme:gammes_maintenance(*),
            ordres_travail:ordres_travail(
              *,
              technicien:profiles(id, nom)
            )
          )
        `)
        .eq('id', machineId)
        .maybeSingle();

      if (machineError || !machineData) {
        setError('Machine non trouvée');
        setLoading(false);
        return;
      }

      // 2. Récupérer TOUS les ordres de travail de la machine (préventifs, correctifs, curatifs)
      const { data: ordresTravailData, error: ordresError } = await supabase
        .from('ordres_travail')
        .select(`
          *,
          technicien:profiles(id, nom),
          plans_maintenance:plan_id(
            *,
            gamme:gammes_maintenance(*)
          )
        `)
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false });

      if (ordresError) {
        console.error('Erreur récupération ordres de travail:', ordresError);
      }

      // 3. Fusionner les données
      const machineWithAllOrdres = {
        ...machineData,
        // Garder les ordres de travail des plans existants
        plans_maintenance: machineData.plans_maintenance || [],
        // Ajouter tous les ordres de travail directement sur la machine
        ordres_travail: ordresTravailData || []
      };

      setMachine(machineWithAllOrdres);
      setLoading(false);
    } catch (err) {
      console.error('Erreur chargement machine:', err);
      setError('Erreur de chargement des données');
      setLoading(false);
    }
  }



  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <RefreshCw className="animate-spin h-12 w-12 text-[#ff6b57] mx-auto mb-4" />
            <p className="text-slate-600 font-semibold">Chargement de la machine...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (error || !machine) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-white rounded-xl shadow-lg ring-1 ring-slate-200 p-8 text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-red-600" size={32} />
            </div>
            <p className="text-slate-800 text-lg font-semibold mb-4">
              {error || 'Machine non trouvée'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-[#ff6b57] text-white rounded-lg transition-all font-semibold hover:bg-[#f04438] hover:shadow-lg"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </ClientLayout>
    );
  }

  const statusConfig = {
    'En service': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
    'En panne': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200' },
    'Hors service': { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-500', border: 'border-slate-200' },
    opérationnel: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
    'en panne': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200' },
    maintenance: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200' }
  };

  const currentStatus = statusConfig[machine.etat as keyof typeof statusConfig] || statusConfig.opérationnel;
  const currentStatusLabel = getMachineStateConfig(machine.etat).label;

  return (
    <ClientLayout>
      {/* HEADER */}
      <div className="mb-4 md:mb-6">
        {/* Bouton retour */}
        <button
          onClick={() => navigate('/mes-machines')}
          className="mb-4 flex items-center gap-2 text-slate-600 hover:text-[#ff6b57] transition-colors group"
        >
          <div className="p-2 rounded-lg bg-white group-hover:bg-[#ff6b57]/10 transition-colors shadow-sm ring-1 ring-slate-200">
            <ArrowLeft size={18} />
          </div>
          <span className="font-semibold text-sm">Retour aux machines</span>
        </button>

        {/* En-tête machine */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-slate-100 p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {machine.image_url ? (
                <img
                  src={machine.image_url}
                  alt={machine.nom}
                  className="h-14 w-14 flex-shrink-0 rounded-lg border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                  <ImageIcon size={22} />
                </div>
              )}
              <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900">{machine.nom}</h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold border ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border} shadow-sm`}>
                  <span className={`w-2 h-2 rounded-full ${currentStatus.dot} animate-pulse`}></span>
                  {currentStatusLabel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-slate-600">
                <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold">
                  <Wrench size={14} />
                  <span>{machine.modele}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold">
                  <MapPin size={14} />
                  <span>{machine.poste_technique.site.nom + ' ' + machine.poste_technique.batiment}</span>
                </span>
                {machine.annee && (
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold">
                    <Calendar size={14} />
                    <span>{machine.annee}</span>
                  </span>
                )}
              </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-4">
              {(profile?.role === 'consultant' && machine.client_id === clientId) && (
                <button
                  onClick={() => setShowDemandeModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ff735f] to-[#f04438] hover:from-[#f04438] hover:to-[#d93f34] text-white rounded-lg transition-all shadow-lg shadow-red-200/50 hover:shadow-red-300/50 font-semibold text-sm"
                >
                  <AlertCircle size={18} />
                  <span className="hidden sm:inline">Signaler</span>
                </button>
              )}

              {profile?.role === 'admin' && (
                <button
                  onClick={() => navigate(`/admin/machine/${machine.id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-semibold text-sm"
                >
                  <Edit size={18} />
                  <span className="hidden sm:inline">Modifier</span>
                </button>
              )}
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-2 border-t border-slate-100 pt-4 mt-4">
            <button
              onClick={() => setSearchParams({ tab: "fiche" })}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold transition-all rounded-lg text-sm ${activeTab === 'fiche'
                  ? 'bg-[#ff6b57] text-white shadow-lg shadow-red-200/50'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
            >
              <FileText size={18} />
              <span className="hidden sm:inline">Fiche technique</span>
              <span className="sm:hidden">Fiche</span>
            </button>

            <button
              onClick={() => setSearchParams({ tab: "historique" })}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold transition-all rounded-lg text-sm ${activeTab === 'historique'
                  ? 'bg-[#ff6b57] text-white shadow-lg shadow-red-200/50'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
            >
              <ClipboardList size={18} />
              <span className="hidden sm:inline">Ordres de Travail</span>
              <span className="sm:hidden">OT</span>
              {demandes.length > 0 && (
                <span className="px-2 py-0.5 bg-white text-[#ff6b57] text-xs font-black rounded-full shadow-sm">
                  {demandes.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <MachineContent machine={machine} activeTab={activeTab} onReloadMachine={loadMachine} />

      {showDemandeModal && (
        <DemandeModal
          machine={machine}
          onClose={() => setShowDemandeModal(false)}
          onSuccess={loadMachine}
        />
      )}
    </ClientLayout>
  );
}

