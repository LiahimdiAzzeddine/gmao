import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  Filter,
  PlayCircle,
  Search,
  User,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import MainHeader from '../components/MainHeader';
import EmptyState from '../components/Ui/EmptyState';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ClientOtPdfDownloadButton from '../components/ClientOtPdfDownloadButton';

type ClientOT = {
  id: string;
  numot?: string | null;
  statut: string;
  type: string;
  date_programmee: string | null;
  date_execution: string | null;
  created_at: string;
  observations: string | null;
  machine: {
    id: string;
    nom: string;
    modele: string | null;
    numero_serie: string | null;
  } | null;
  technicien: {
    id: string;
    nom: string;
  } | null;
  plans_maintenance: {
    gamme?: {
      nom?: string | null;
      type?: string | null;
    } | null;
  } | null;
  interventions?: Array<{
    id: string;
    valide: boolean;
    valide_le: string | null;
    date_debut: string | null;
    date_fin: string | null;
    client_valide: boolean;
  }>;
};

const closedStatuses = ['terminé', 'clôturé_avec_anomalie'];

function formatDate(dateString: string | null) {
  if (!dateString) return 'Non définie';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

function getStatusConfig(statut: string) {
  const configs: Record<string, { label: string; icon: typeof Clock; className: string }> = {
    prévu: {
      label: 'À faire',
      icon: Clock,
      className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    en_cours: {
      label: 'En cours',
      icon: PlayCircle,
      className: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    terminé: {
      label: 'Clôturé',
      icon: CheckCircle2,
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    clôturé_avec_anomalie: {
      label: 'Clôturé avec anomalie',
      icon: AlertCircle,
      className: 'bg-orange-100 text-orange-800 border-orange-200',
    },
    annulé: {
      label: 'Annulé',
      icon: XCircle,
      className: 'bg-red-100 text-red-800 border-red-200',
    },
  };

  return configs[statut] || {
    label: statut || 'Inconnu',
    icon: Clock,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

function getTypeClass(type: string) {
  const configs: Record<string, string> = {
    préventive: 'bg-purple-100 text-purple-800 border-purple-200',
    preventive: 'bg-purple-100 text-purple-800 border-purple-200',
    corrective: 'bg-orange-100 text-orange-800 border-orange-200',
    curative: 'bg-red-100 text-red-800 border-red-200',
  };

  return configs[type] || 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function ClientOrdresTravail() {
  const { profile, client } = useAuth();
  const navigate = useNavigate();
  const [ordres, setOrdres] = useState<ClientOT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterType, setFilterType] = useState('tous');

  useEffect(() => {
    loadClientOT();
  }, [profile?.id, client?.id]);

  async function loadClientOT() {
    if (!profile) return;

    try {
      setLoading(true);
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
        setOrdres([]);
        return;
      }

      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select('id')
        .eq('client_id', clientId);

      if (machinesError) throw machinesError;

      const machineIds = (machinesData || []).map((machine) => machine.id);
      if (machineIds.length === 0) {
        setOrdres([]);
        return;
      }

      const { data, error: ordresError } = await supabase
        .from('ordres_travail')
        .select(`
          *,
          machine:machines(
            id,
            nom,
            modele,
            numero_serie
          ),
          technicien:profiles(id, nom),
          plans_maintenance:plan_id(
            gamme:gammes_maintenance(
              nom,
              type
            )
          ),
          interventions:interventions!interventions_ot_fkey(
            id,
            valide,
            valide_le,
            date_debut,
            date_fin,
            client_valide
          )
        `)
        .in('machine_id', machineIds)
        .order('date_programmee', { ascending: false });

      if (ordresError) throw ordresError;
      setOrdres((data || []) as ClientOT[]);
    } catch (err) {
      console.error('Erreur chargement OT client:', err);
      setError("Impossible de charger les ordres de travail du client.");
    } finally {
      setLoading(false);
    }
  }

  const filteredOrdres = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return ordres.filter((ot) => {
      const matchesSearch = !query ||
        ot.id.toLowerCase().includes(query) ||
        ot.numot?.toLowerCase().includes(query) ||
        ot.machine?.nom?.toLowerCase().includes(query) ||
        ot.machine?.modele?.toLowerCase().includes(query) ||
        ot.technicien?.nom?.toLowerCase().includes(query) ||
        ot.plans_maintenance?.gamme?.nom?.toLowerCase().includes(query);

      const matchesStatus = filterStatut === 'tous'
        ? true
        : ot.statut === filterStatut;

      const matchesType = filterType === 'tous' || ot.type === filterType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [ordres, searchTerm, filterStatut, filterType]);

  const stats = {
    total: ordres.length,
    aFaire: ordres.filter((ot) => ot.statut === 'prévu').length,
    enCours: ordres.filter((ot) => ot.statut === 'en_cours').length,
    clotures: ordres.filter((ot) => closedStatuses.includes(ot.statut)).length,
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatut('tous');
    setFilterType('tous');
  };

  const hasFilters = searchTerm.trim() || filterStatut !== 'tous' || filterType !== 'tous';
  return (
    <div className="min-h-screen bg-slate-50">
      <MainHeader
        title="Mes OT"
        showAdminButton={false}
        customActions={
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 shadow-sm flex-shrink-0 backdrop-blur-sm border border-white/10"
            title="Retour"
          >
            <ArrowLeft size={20} />
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-orange-700 mb-2">
                <ClipboardList size={18} />
                Tous les ordres de travail client
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                {client?.raison_sociale || client?.prenom || profile?.nom || 'Client'}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Consultez les OT de toutes vos machines dans une seule table.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <ClientOtPdfDownloadButton />
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold transition-colors"
              >
                Tableau de bord
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total OT" value={stats.total} color="slate" />
          <StatCard label="À faire" value={stats.aFaire} color="orange" />
          <StatCard label="En cours" value={stats.enCours} color="amber" />
          <StatCard label="Clôturés" value={stats.clotures} color="emerald" />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher par OT, machine, technicien, gamme..."
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  value={filterStatut}
                  onChange={(event) => setFilterStatut(event.target.value)}
                  className="w-full sm:w-48 pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="tous">Tous les statuts</option>
                  <option value="prévu">À faire</option>
                  <option value="en_cours">En cours</option>
                  <option value="terminé">Clôturé</option>
                  <option value="clôturé_avec_anomalie">Clôturé avec anomalie</option>
                  <option value="annulé">Annulé</option>
                </select>
              </div>

              <select
                value={filterType}
                onChange={(event) => setFilterType(event.target.value)}
                className="w-full sm:w-44 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white"
              >
                <option value="tous">Tous les types</option>
                <option value="préventive">Préventive</option>
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="curative">Curative</option>
              </select>

              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
                >
                  <X size={16} />
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 text-sm text-slate-600">
            {filteredOrdres.length} OT affiché{filteredOrdres.length > 1 ? 's' : ''} sur {ordres.length}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="space-y-3 animate-pulse">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="h-14 bg-slate-100 rounded-lg" />
              ))}
            </div>
          </div>
        ) : filteredOrdres.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'Aucun OT trouvé' : 'Aucun ordre de travail'}
            message={hasFilters ? 'Aucun OT ne correspond à vos filtres.' : "Aucun OT n'est rattaché à vos machines."}
          />
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {filteredOrdres.map((ot) => (
                <OTCard key={ot.id} ot={ot} onOpen={() => navigate(`/ordres-travail/${ot.id}`)} />
              ))}
            </div>

            <div className="hidden md:block bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <Th>OT / Gamme</Th>
                      <Th>Machine</Th>
                      <Th>Type</Th>
                      <Th>Statut</Th>
                      <Th>Technicien</Th>
                      <Th>Date programmée</Th>
                      <Th>Intervention</Th>
                      <Th align="center">Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredOrdres.map((ot) => (
                      <OTRow key={ot.id} ot={ot} onOpen={() => navigate(`/ordres-travail/${ot.id}`)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'slate' | 'orange' | 'amber' | 'emerald' }) {
  const colors = {
    slate: 'bg-slate-50 text-slate-800 border-slate-200',
    orange: 'bg-orange-50 text-orange-800 border-orange-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };

  return (
    <div className={`rounded-lg border p-5 ${colors[color]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm font-semibold mt-1">{label}</div>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'center' }) {
  return (
    <th className={`px-4 py-3 ${align === 'center' ? 'text-center' : 'text-left'} text-xs font-semibold text-slate-700 uppercase tracking-wider`}>
      {children}
    </th>
  );
}

function OTRow({ ot, onOpen }: { ot: ClientOT; onOpen: () => void }) {
  const status = getStatusConfig(ot.statut);
  const StatusIcon = status.icon;
  const intervention = ot.interventions?.[0] || null;

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <div className="font-semibold text-slate-900">#{ot.numot || ot.id.slice(0, 8)}</div>
        {ot.plans_maintenance?.gamme?.nom && (
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
            <Wrench size={12} />
            {ot.plans_maintenance.gamme.nom}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900">{ot.machine?.nom || 'Machine inconnue'}</div>
        <div className="text-xs text-slate-500">{ot.machine?.modele || ot.machine?.numero_serie || '-'}</div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getTypeClass(ot.type)}`}>
          {ot.type || '-'}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.className}`}>
          <StatusIcon size={14} />
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {ot.technicien ? (
          <div className="flex items-center gap-2 text-sm text-slate-900">
            <User size={14} className="text-slate-400" />
            {ot.technicien.nom}
          </div>
        ) : (
          <span className="text-sm text-slate-400">Non assigné</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-900">
          <Calendar size={14} className="text-slate-400" />
          {formatDate(ot.date_programmee)}
        </div>
      </td>
      <td className="px-4 py-3">
        {intervention ? (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            intervention.valide
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : 'bg-amber-100 text-amber-800 border-amber-200'
          }`}>
            {intervention.valide ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {intervention.valide ? 'Validée' : 'En attente'}
          </span>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-center">
          <button
            onClick={onOpen}
            className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"
            title="Voir détails"
          >
            <Eye size={17} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function OTCard({ ot, onOpen }: { ot: ClientOT; onOpen: () => void }) {
  const status = getStatusConfig(ot.statut);
  const StatusIcon = status.icon;
  const intervention = ot.interventions?.[0] || null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold text-slate-900">#{ot.numot || ot.id.slice(0, 8)}</div>
          <div className="text-sm text-slate-600 mt-1">{ot.machine?.nom || 'Machine inconnue'}</div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${status.className}`}>
          <StatusIcon size={12} />
          {status.label}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-700">
          <Calendar size={14} className="text-slate-400" />
          {formatDate(ot.date_programmee)}
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <ClipboardList size={14} className="text-slate-400" />
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getTypeClass(ot.type)}`}>
            {ot.type || '-'}
          </span>
        </div>
        {ot.technicien && (
          <div className="flex items-center gap-2 text-slate-700">
            <User size={14} className="text-slate-400" />
            {ot.technicien.nom}
          </div>
        )}
        {intervention && (
          <div className="flex items-center gap-2 text-slate-700">
            {intervention.valide ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertCircle size={14} className="text-amber-600" />}
            {intervention.valide ? 'Intervention validée' : 'Intervention en attente'}
          </div>
        )}
      </div>

      <button
        onClick={onOpen}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm transition-colors"
      >
        <Eye size={16} />
        Détails
      </button>
    </div>
  );
}
