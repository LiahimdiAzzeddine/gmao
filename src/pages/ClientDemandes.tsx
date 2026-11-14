import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageSquareWarning,
  RefreshCw,
  Search,
  Wrench,
  XCircle,
} from 'lucide-react';
import ClientLayout from '../components/ClientLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type ClientRequest = {
  id: string;
  label: string | null;
  description: string | null;
  type_intervention: 'preventive' | 'corrective';
  urgence: string;
  statut: string;
  date_demande: string;
  machine: {
    id: string;
    nom: string;
    modele: string | null;
  } | null;
};

const statusConfig: Record<string, { label: string; classes: string; icon: typeof Clock3 }> = {
  'en attente': {
    label: 'En attente',
    classes: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: Clock3,
  },
  'validée': {
    label: 'Validée',
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },
  'annulée': {
    label: 'Annulée',
    classes: 'border-red-200 bg-red-50 text-red-700',
    icon: XCircle,
  },
};

function getStatusConfig(status: string) {
  return statusConfig[status] || {
    label: status,
    classes: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: AlertCircle,
  };
}

export default function ClientDemandes() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('tous');

  useEffect(() => {
    if (profile?.id) loadRequests();
  }, [profile?.id]);

  async function loadRequests() {
    if (!profile?.id) return;

    try {
      setLoading(true);
      setError('');

      const { data, error: requestError } = await supabase
        .from('demande_intervention')
        .select(`
          id,
          label,
          description,
          type_intervention,
          urgence,
          statut,
          date_demande,
          machine:machine_id (id, nom, modele)
        `)
        .eq('created_by', profile.id)
        .order('date_demande', { ascending: false });

      if (requestError) throw requestError;
      setRequests((data || []) as unknown as ClientRequest[]);
    } catch (loadError) {
      console.error('Erreur chargement demandes client:', loadError);
      setError('Impossible de charger vos demandes pour le moment.');
    } finally {
      setLoading(false);
    }
  }

  const counts = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((request) => request.statut === 'en attente').length,
    accepted: requests.filter((request) => request.statut === 'validée').length,
    cancelled: requests.filter((request) => request.statut === 'annulée').length,
  }), [requests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');

    return requests.filter((request) => {
      const matchesStatus = status === 'tous' || request.statut === status;
      const matchesSearch = !query || [
        request.label,
        request.description,
        request.machine?.nom,
        request.machine?.modele,
      ].some((value) => value?.toLocaleLowerCase('fr').includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [requests, search, status]);

  return (
    <ClientLayout>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 lg:text-3xl">Mes demandes</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Suivez l'état des problèmes signalés sur vos machines.
          </p>
        </div>
        <button
          type="button"
          onClick={loadRequests}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Total', counts.total, MessageSquareWarning, 'text-[#ff6b57] bg-orange-50'],
          ['En attente', counts.pending, Clock3, 'text-amber-700 bg-amber-50'],
          ['Validées', counts.accepted, CheckCircle2, 'text-emerald-700 bg-emerald-50'],
          ['Annulées', counts.cancelled, XCircle, 'text-red-700 bg-red-50'],
        ].map(([label, count, Icon, colors]) => {
          const StatIcon = Icon as typeof Clock3;
          return (
            <div key={label as string} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-500 sm:text-sm">{label as string}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{count as number}</p>
                </div>
                <div className={`rounded-lg p-2 ${colors as string}`}><StatIcon size={20} /></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une machine ou une demande..."
            aria-label="Rechercher dans mes demandes"
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-[#ff6b57]"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filtrer par statut"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 focus:border-transparent focus:ring-2 focus:ring-[#ff6b57] sm:w-48"
        >
          <option value="tous">Tous les statuts</option>
          <option value="en attente">En attente</option>
          <option value="validée">Validée</option>
          <option value="annulée">Annulée</option>
        </select>
      </div>

      {loading ? (
        <div className="mt-5 rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-slate-100">
          <RefreshCw className="mx-auto animate-spin text-[#ff6b57]" size={32} />
          <p className="mt-3 text-sm font-semibold text-slate-500">Chargement de vos demandes...</p>
        </div>
      ) : error ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-700">
          <AlertCircle className="mx-auto" size={30} />
          <p className="mt-2 font-semibold">{error}</p>
          <button type="button" onClick={loadRequests} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white">Réessayer</button>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="mt-5 rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-slate-100">
          <MessageSquareWarning className="mx-auto text-slate-300" size={46} />
          <h2 className="mt-3 text-lg font-black text-slate-800">Aucune demande trouvée</h2>
          <p className="mt-1 text-sm text-slate-500">
            {requests.length ? 'Aucune demande ne correspond à vos filtres.' : "Vous n'avez pas encore signalé de problème."}
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {filteredRequests.map((request) => {
            const currentStatus = getStatusConfig(request.statut);
            const StatusIcon = currentStatus.icon;

            return (
              <article key={request.id} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-black text-slate-900 sm:text-lg">
                      {request.label || 'Problème signalé'}
                    </h2>
                    <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500">
                      <Wrench size={15} className="shrink-0" />
                      <span className="truncate">{request.machine?.nom || 'Machine non renseignée'}</span>
                      {request.machine?.modele && <span className="truncate text-slate-400">· {request.machine.modele}</span>}
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${currentStatus.classes}`}>
                    <StatusIcon size={13} />
                    {currentStatus.label}
                  </span>
                </div>

                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {request.description || 'Aucune description.'}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-xs font-bold">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                    {request.type_intervention === 'preventive' ? 'Préventive' : 'Corrective'}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 ${request.urgence === 'élevée' ? 'bg-red-50 text-red-700' : request.urgence === 'moyenne' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    Urgence : {request.urgence}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-slate-500">
                    <CalendarDays size={14} />
                    {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.date_demande))}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </ClientLayout>
  );
}
