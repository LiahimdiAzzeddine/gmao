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
  X,
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
  workOrders: Array<{
    id: string;
    numot: number | null;
    statut: string;
    interventions: RequestIntervention[];
  }>;
};

type RequestIntervention = {
  id: string;
  ordre_travail_id: string;
  date_debut: string | null;
  date_fin: string | null;
  duree_minutes: number | null;
  resultat: string | null;
  etat_machine_apres: string | null;
  commentaire: string | null;
  pieces_remplacees: string | null;
  valide: boolean | null;
  technicien: { nom: string | null } | null;
};

type RequestWorkOrder = {
  id: string;
  numot: number | null;
  statut: string;
  demande_id: string;
  interventions: RequestIntervention[];
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

const workOrderStatusConfig: Record<string, { label: string; classes: string }> = {
  'prévu': { label: 'Prévu', classes: 'border-blue-200 bg-blue-50 text-blue-700' },
  'en_cours': { label: 'En cours', classes: 'border-amber-200 bg-amber-50 text-amber-700' },
  'terminé': { label: 'Clôturé', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  'clôturé_avec_anomalie': { label: 'Clôturé avec anomalie', classes: 'border-orange-200 bg-orange-50 text-orange-700' },
  'annulé': { label: 'Annulé', classes: 'border-red-200 bg-red-50 text-red-700' },
};

function getWorkOrderStatusConfig(status: string) {
  return workOrderStatusConfig[status] || {
    label: status.replaceAll('_', ' '),
    classes: 'border-slate-200 bg-slate-50 text-slate-700',
  };
}

export default function ClientDemandes() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('tous');
  const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);

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

      const requestRows = data || [];
      const requestIds = requestRows.map((request) => request.id);
      let workOrders: RequestWorkOrder[] = [];

      if (requestIds.length > 0) {
        const { data: workOrderData, error: workOrderError } = await supabase
          .from('ordres_travail')
          .select('id, numot, statut, demande_id')
          .in('demande_id', requestIds)
          .order('created_at', { ascending: false });

        if (workOrderError) throw workOrderError;
        const workOrderRows = (workOrderData || []) as Omit<RequestWorkOrder, 'interventions'>[];
        const workOrderIds = workOrderRows.map((workOrder) => workOrder.id);
        let interventions: RequestIntervention[] = [];

        if (workOrderIds.length > 0) {
          const { data: interventionData, error: interventionError } = await supabase
            .from('interventions')
            .select(`
              id,
              ordre_travail_id,
              date_debut,
              date_fin,
              duree_minutes,
              resultat,
              etat_machine_apres,
              commentaire,
              pieces_remplacees,
              valide,
              technicien:profiles!interventions_technicien_fkey (nom)
            `)
            .in('ordre_travail_id', workOrderIds)
            .order('date_debut', { ascending: false });

          if (interventionError) throw interventionError;
          interventions = (interventionData || []) as unknown as RequestIntervention[];
        }

        const interventionsByWorkOrder = interventions.reduce<Record<string, RequestIntervention[]>>((grouped, intervention) => {
          (grouped[intervention.ordre_travail_id] ||= []).push(intervention);
          return grouped;
        }, {});

        workOrders = workOrderRows.map((workOrder) => ({
          ...workOrder,
          interventions: interventionsByWorkOrder[workOrder.id] || [],
        }));
      }

      const workOrdersByRequest = workOrders.reduce<Record<string, RequestWorkOrder[]>>((grouped, workOrder) => {
        (grouped[workOrder.demande_id] ||= []).push(workOrder);
        return grouped;
      }, {});

      setRequests(requestRows.map((request) => ({
        ...request,
        workOrders: workOrdersByRequest[request.id] || [],
      })) as unknown as ClientRequest[]);
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
        ...request.workOrders.flatMap((workOrder) => [workOrder.numot?.toString(), workOrder.statut]),
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
              <article
                key={request.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRequest(request)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedRequest(request);
                  }
                }}
                className="cursor-pointer rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-[#ff6b57]/30 focus:outline-none focus:ring-2 focus:ring-[#ff6b57] sm:p-5"
                aria-label={`Afficher les détails de ${request.label || 'la demande'}`}
              >
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
                  {request.workOrders.map((workOrder) => {
                    const workOrderStatus = getWorkOrderStatusConfig(workOrder.statut);
                    return (
                      <span
                        key={workOrder.id}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${workOrderStatus.classes}`}
                        title="Statut de l'ordre de travail lié"
                      >
                        <Wrench size={13} />
                        OT{workOrder.numot ? ` #${workOrder.numot}` : ''} : {workOrderStatus.label}
                      </span>
                    );
                  })}
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

      {selectedRequest && (
        <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
      )}
    </ClientLayout>
  );
}

function RequestDetailsModal({ request, onClose }: { request: ClientRequest; onClose: () => void }) {
  const requestStatus = getStatusConfig(request.statut);
  const RequestStatusIcon = requestStatus.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-details-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Détails de la demande</p>
            <h2 id="request-details-title" className="mt-1 truncate text-lg font-black text-slate-900 sm:text-xl">
              {request.label || 'Problème signalé'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Référence : {request.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 p-4 sm:p-6">
          <section>
            <h3 className="mb-3 font-bold text-slate-900">Informations de la demande</h3>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${requestStatus.classes}`}>
                <RequestStatusIcon size={13} />
                Demande : {requestStatus.label}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                {request.type_intervention === 'preventive' ? 'Préventive' : 'Corrective'}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                Urgence : {request.urgence}
              </span>
            </div>

            <dl className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
              <DetailItem label="Machine" value={[request.machine?.nom, request.machine?.modele].filter(Boolean).join(' · ') || 'Non renseignée'} />
              <DetailItem label="Date de demande" value={formatDateTime(request.date_demande)} />
            </dl>
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Description</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{request.description || 'Aucune description.'}</p>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-5">
            <div>
              <h3 className="font-bold text-slate-900">Ordres de travail et interventions</h3>
              <p className="mt-1 text-xs text-slate-500">Suivi des opérations associées à cette demande</p>
            </div>
            {request.workOrders.length === 0 ? (
              <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Aucun ordre de travail n’a encore été créé pour cette demande.</p>
            ) : (
              <div className="mt-3 space-y-4">
                {request.workOrders.map((workOrder) => {
                  const workOrderStatus = getWorkOrderStatusConfig(workOrder.statut);
                  return (
                    <div key={workOrder.id} className="overflow-hidden rounded-lg border border-slate-200">
                      <div className="bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-bold text-slate-900">OT{workOrder.numot ? ` #${workOrder.numot}` : ''}</h4>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${workOrderStatus.classes}`}>{workOrderStatus.label}</span>
                      </div>
                      </div>

                      {workOrder.interventions.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500">Aucune intervention associée à cet OT.</p>
                      ) : (
                        <div className={`grid gap-3 p-4 ${workOrder.interventions.length > 1 ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                          {workOrder.interventions.map((intervention, index) => (
                            <div
                              key={intervention.id}
                              className={`rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm ${
                                workOrder.interventions.length > 1 &&
                                workOrder.interventions.length % 2 === 1 &&
                                index === workOrder.interventions.length - 1
                                  ? 'lg:col-span-2'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-slate-800">Intervention {index + 1}</p>
                                <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${intervention.valide ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                  {intervention.valide ? 'Validée' : 'À valider'}
                                </span>
                              </div>
                              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                                <DetailItem label="Technicien" value={intervention.technicien?.nom || 'Non renseigné'} />
                                <DetailItem label="Résultat" value={intervention.resultat || 'Non renseigné'} />
                                <DetailItem label="Début" value={formatDateTime(intervention.date_debut)} />
                                <DetailItem label="Fin" value={formatDateTime(intervention.date_fin)} />
                                <DetailItem label="Durée" value={formatDuration(intervention.duree_minutes)} />
                                <DetailItem label="État de la machine après" value={intervention.etat_machine_apres || 'Non renseigné'} />
                                <DetailItem label="Pièces remplacées" value={intervention.pieces_remplacees || 'Aucune'} />
                              </dl>
                              {intervention.commentaire && (
                                <div className="mt-3 border-t border-slate-200 pt-3">
                                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Commentaire</p>
                                  <p className="mt-1 whitespace-pre-line text-slate-700">{intervention.commentaire}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return 'Non renseignée';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatDuration(minutes: number | null) {
  if (!minutes) return 'Non renseignée';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours} h ${remainingMinutes} min` : `${remainingMinutes} min`;
}
