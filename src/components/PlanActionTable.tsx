import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Building2, CheckCircle, Download, FileSpreadsheet, Loader2, Search, Users, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style';
import { supabase } from '../lib/supabase';
import type { Client } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type PlanActionRow = {
  id: string;
  numot: number | null;
  type: string;
  statut: string;
  ot_parent_id: string | null;
  intervention_source_id: string | null;
  date_programmee: string | null;
  lot_defaillance: string | null;
  famille_probleme: string | null;
  mode_defaillance: string | null;
  action_recommandee: string | null;
  gravite_libelle: string | null;
  gravite_classe: number | null;
  occurrence_libelle: string | null;
  occurrence_classe: number | null;
  detectabilite_libelle: string | null;
  detectabilite_classe: number | null;
  rpn: number | null;
  date_expression: string | null;
  interventions?: Array<{
    id: string;
    valide: boolean | null;
    valide_le: string | null;
    date_fin: string | null;
    date_debut: string | null;
    commentaire: string | null;
  }> | null;
  machine: {
    id: string;
    nom: string;
    modele: string;
    localisation: string | null;
    client_id: string | null;
    client?: {
      id: string;
      raison_sociale: string | null;
      prenom: string | null;
      telephone: string | null;
    } | null;
    poste_technique?: {
      code_pt: string | null;
      batiment: string | null;
      site?: { nom: string | null } | null;
    } | null;
  } | null;
};

type ParentOT = {
  id: string;
  numot: number | null;
  type: string;
};

export default function PlanActionTable() {
  const { profile, client } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<PlanActionRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
  const [selectedClientId, setSelectedClientId] = useState(searchParams.get('client') || '');
  const [showClientModal, setShowClientModal] = useState(!searchParams.get('client'));
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const isClientView = profile?.role === 'consultant';

  useEffect(() => {
    if (isClientView) {
      setLoadingClients(false);
      return;
    }

    fetchClients();
  }, [isClientView]);

  useEffect(() => {
    if (!isClientView) return;

    if (client?.id) {
      setSelectedClientId(client.id);
      setShowClientModal(false);
    } else {
      setSelectedClientId('');
      setRows([]);
      setLoading(false);
    }
  }, [isClientView, client?.id]);

  useEffect(() => {
    if (selectedClientId) {
      fetchPlanActions(selectedClientId);
    } else {
      setRows([]);
      setLoading(false);
    }
  }, [selectedClientId]);

  const selectedClient = useMemo(() => {
    if (isClientView) return client;
    return clients.find((client) => client.id === selectedClientId) || null;
  }, [client, clients, isClientView, selectedClientId]);

  const filteredClients = useMemo(() => {
    const term = clientSearchTerm.trim().toLowerCase();
    if (!term) return clients;

    return clients.filter((client) => [
      client.raison_sociale,
      client.prenom,
      client.telephone,
      client.adresse
    ].some((value) => (value || '').toLowerCase().includes(term)));
  }, [clients, clientSearchTerm]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const previousYears = Array.from({ length: 8 }, (_, index) => String(currentYear - index));
    const dataYears = rows
      .map((row) => getRowYear(row))
      .filter(Boolean);

    return Array.from(new Set([...previousYears, ...dataYears]))
      .sort((a, b) => Number(b) - Number(a));
  }, [rows]);

  const periodRows = useMemo(() => {
    return rows.filter((row) => getRowYear(row) === selectedYear);
  }, [rows, selectedYear]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return periodRows;

    return periodRows.filter((row) => {
      const machine = row.machine;
      return [
        machine?.nom,
        machine?.modele,
        machine?.localisation,
        machine?.poste_technique?.code_pt,
        row.lot_defaillance,
        row.famille_probleme,
        row.mode_defaillance,
        row.action_recommandee,
        row.gravite_libelle,
        row.occurrence_libelle,
        row.detectabilite_libelle,
        getObservationResultat(row)
      ].some((value) => (value || '').toLowerCase().includes(term));
    });
  }, [periodRows, searchTerm]);

  async function fetchClients() {
    try {
      setLoadingClients(true);
      const { data, error: clientsError } = await supabase
        .from('clients')
        .select('id, raison_sociale, prenom, telephone, adresse')
        .order('raison_sociale');

      if (clientsError) throw clientsError;
      setClients((data || []) as Client[]);
    } catch (err) {
      console.error('Erreur chargement clients:', err);
      setError(err instanceof Error ? err.message : 'Impossible de charger les clients.');
    } finally {
      setLoadingClients(false);
    }
  }

  async function fetchPlanActions(clientId: string) {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('ordres_travail')
        .select(`
          id,
          numot,
          type,
          statut,
          ot_parent_id,
          intervention_source_id,
          date_programmee,
          lot_defaillance,
          famille_probleme,
          mode_defaillance,
          action_recommandee,
          gravite_libelle,
          gravite_classe,
          occurrence_libelle,
          occurrence_classe,
          detectabilite_libelle,
          detectabilite_classe,
          rpn,
          date_expression,
          interventions:interventions!interventions_ot_fkey(
            id,
            valide,
            valide_le,
            date_fin,
            date_debut,
            commentaire
          ),
          machine:machines!inner(
            id,
            nom,
            modele,
            localisation,
            client_id,
            client:clients(
              id,
              raison_sociale,
              prenom,
              telephone
            ),
            poste_technique:postes_techniques(
              code_pt,
              batiment,
              site:sites(nom)
            )
          )
        `)
        .not('mode_defaillance', 'is', null)
        .eq('machine.client_id', clientId)
        .order('date_programmee', { ascending: false });

      if (fetchError) throw fetchError;

      const correctiveRows = ((data || []) as PlanActionRow[]).filter((row) => {
        return isCorrective(row.type) && Boolean(row.ot_parent_id) && row.machine?.client_id === clientId;
      });

      const parentIds = Array.from(new Set(
        correctiveRows
          .map((row) => row.ot_parent_id)
          .filter(Boolean)
      )) as string[];

      let parents: ParentOT[] = [];
      if (parentIds.length > 0) {
        const { data: parentsData, error: parentsError } = await supabase
          .from('ordres_travail')
          .select('id, numot, type')
          .in('id', parentIds);

        if (parentsError) throw parentsError;
        parents = (parentsData || []) as ParentOT[];
      }

      const nextParentById = parents.reduce<Record<string, ParentOT>>((acc, parent) => {
        acc[parent.id] = parent;
        return acc;
      }, {});

      setRows(correctiveRows.filter((row) => {
        const parent = row.ot_parent_id ? nextParentById[row.ot_parent_id] : null;
        return isPreventive(parent?.type);
      }));
    } catch (err) {
      console.error('Erreur chargement plan action:', err);
      setError(err instanceof Error ? err.message : 'Impossible de charger le plan d action.');
    } finally {
      setLoading(false);
    }
  }

  function handleClientSelection(clientId: string) {
    if (isClientView) return;

    setSelectedClientId(clientId);
    setSearchTerm('');
    setShowClientModal(false);

    const params = new URLSearchParams(searchParams);
    params.set('client', clientId);
    setSearchParams(params, { replace: true });
  }

  function clearClientSelection() {
    if (isClientView) return;

    setSelectedClientId('');
    setRows([]);
    setSearchTerm('');
    setShowClientModal(true);

    const params = new URLSearchParams(searchParams);
    params.delete('client');
    setSearchParams(params, { replace: true });
  }

  function exportToExcel() {
    const clientSuffix = selectedClient
      ? `_${getClientName(selectedClient).replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`
      : '';
    const aoa = [
      ['Plan d action correctif', '', '', '', '', '', '', '', '', '', '', '', '', 'Resultats des actions / Action Resultat', '', ''],
      [
        'EQUIPEMENT',
        'Lot',
        'Famille de problemes',
        'Mode de defaillance potentiel',
        'Action recommandee',
        "Gravite productivite de l'echec",
        'classe',
        "Occurrence d'echec",
        'classe',
        'Detectabilite',
        'classe',
        'R.P.N.',
        'date expression',
        'Actions cloturee',
        'date',
        'observation'
      ],
      ...filteredRows.map((row) => [
        formatEquipment(row),
        row.lot_defaillance || '',
        row.famille_probleme || '',
        row.mode_defaillance || '',
        row.action_recommandee || '',
        row.gravite_libelle || '',
        row.gravite_classe || '',
        row.occurrence_libelle || '',
        row.occurrence_classe || '',
        row.detectabilite_libelle || '',
        row.detectabilite_classe || '',
        row.rpn || '',
        formatDate(row.date_expression || row.date_programmee),
        getActionCloturee(row) ? 'ok' : '',
        formatMonth(getDateClotureAction(row)),
        getObservationResultat(row)
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
      { s: { r: 0, c: 13 }, e: { r: 0, c: 15 } }
    ];
    worksheet['!cols'] = [
      { wch: 32 },
      { wch: 20 },
      { wch: 26 },
      { wch: 30 },
      { wch: 48 },
      { wch: 32 },
      { wch: 14 },
      { wch: 26 },
      { wch: 16 },
      { wch: 32 },
      { wch: 18 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 44 }
    ];
    worksheet['!rows'] = [
      { hpt: 24 },
      { hpt: 58 },
      ...filteredRows.map(() => ({ hpt: 46 }))
    ];

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:P1');
    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        if (!worksheet[cellRef]) {
          worksheet[cellRef] = { t: 's', v: '' };
        }

        worksheet[cellRef].s = getExcelCellStyle(rowIndex, colIndex, worksheet[cellRef].v);
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plan action');
    XLSX.writeFile(workbook, `plan_action${clientSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (isClientView && !client?.id) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
            Retour
          </button>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Aucun client n'est associe a ce compte.
          </div>
        </div>
      </div>
    );
  }

  if (loading && selectedClientId) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <button
          onClick={() => navigate(isClientView ? '/' : -1)}
          className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
          Retour
        </button>
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#f98440]" />
          <p className="mt-3 text-sm font-medium text-slate-600">Chargement du plan d'action...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-2">
      <div className="mx-auto max-w-[1800px] space-y-4">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              {isClientView && (
                <button
                  onClick={() => navigate('/')}
                  className="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={18} />
                  Retour
                </button>
              )}
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#f98440]">
                <FileSpreadsheet size={18} />
                Plan d'action
              </div>
              <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Correctifs issus des OT preventifs</h1>
              <p className="text-sm text-slate-600 mt-1">
                {selectedClient ? `Client: ${getClientName(selectedClient)} - ` : ''}
                {filteredRows.length} action{filteredRows.length > 1 ? 's' : ''} affichee{filteredRows.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {!isClientView && (
                <button
                  onClick={() => setShowClientModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Users size={18} />
                  Changer client
                </button>
              )}
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <div className="relative w-full lg:w-[420px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Rechercher equipement, probleme, action..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
                />
              </div>
              <button
                onClick={exportToExcel}
                disabled={filteredRows.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={18} />
                Excel
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
          <div className="overflow-x-auto">
            <table className="min-w-[1980px] w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  <th colSpan={13} className="h-8 border border-orange-700 bg-[#f98440] text-center font-bold text-white">
                    Plan d'action correctif
                  </th>
                  <th colSpan={3} className="h-8 border border-orange-700 bg-[#f98440] text-center font-bold text-white">
                    Resultats des actions / Action Resultat
                  </th>
                </tr>
                <tr className="bg-[#f98440] text-white">
                  <HeaderCell className="w-[170px]">EQUIPEMENT</HeaderCell>
                  <HeaderCell className="w-[120px]">Lot</HeaderCell>
                  <HeaderCell className="w-[170px]">Famille de problemes</HeaderCell>
                  <HeaderCell className="w-[190px]">Mode de defaillance potentiel</HeaderCell>
                  <HeaderCell className="w-[280px]">Action recommandee</HeaderCell>
                  <HeaderCell className="w-[230px]">Gravite productivite de l'echec</HeaderCell>
                  <HeaderCell className="w-[44px] vertical">classe</HeaderCell>
                  <HeaderCell className="w-[210px]">Occurrence d'echec</HeaderCell>
                  <HeaderCell className="w-[44px] vertical">classe</HeaderCell>
                  <HeaderCell className="w-[210px]">Detectabilite</HeaderCell>
                  <HeaderCell className="w-[44px] vertical">classe</HeaderCell>
                  <HeaderCell className="w-[72px]">R.P.N.</HeaderCell>
                  <HeaderCell className="w-[80px]">date expression</HeaderCell>
                  <HeaderCell className="w-[88px]">Actions cloturee</HeaderCell>
                  <HeaderCell className="w-[86px]">date</HeaderCell>
                  <HeaderCell className="w-[260px]">observation</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="border border-slate-300 px-4 py-12 text-center text-sm text-slate-500">
                      Aucune action corrective issue d'un OT preventif.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-slate-100' : 'bg-orange-50'}>
                      <BodyCell className="font-bold">{formatEquipment(row)}</BodyCell>
                      <BodyCell>{row.lot_defaillance || '-'}</BodyCell>
                      <BodyCell>{row.famille_probleme || '-'}</BodyCell>
                      <BodyCell>{row.mode_defaillance || '-'}</BodyCell>
                      <BodyCell>{row.action_recommandee || '-'}</BodyCell>
                      <BodyCell>{row.gravite_libelle || '-'}</BodyCell>
                      <ClassCell value={row.gravite_classe} />
                      <BodyCell>{row.occurrence_libelle || '-'}</BodyCell>
                      <ClassCell value={row.occurrence_classe} />
                      <BodyCell>{row.detectabilite_libelle || '-'}</BodyCell>
                      <ClassCell value={row.detectabilite_classe} />
                      <BodyCell>
                        <RpnBadge value={row.rpn} />
                      </BodyCell>
                      <BodyCell>{formatDate(row.date_expression || row.date_programmee)}</BodyCell>
                      <BodyCell className={getActionCloturee(row) ? 'bg-emerald-500 text-white font-bold' : ''}>
                        {getActionCloturee(row) ? 'ok' : ''}
                      </BodyCell>
                      <BodyCell>{formatMonth(getDateClotureAction(row))}</BodyCell>
                      <BodyCell>{getObservationResultat(row)}</BodyCell>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!isClientView && showClientModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 bg-[#f98440] px-5 py-4 text-white">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                    <Building2 size={18} />
                    Plan d'action par client
                  </div>
                  <h2 className="mt-1 text-2xl font-bold">Choisir un client</h2>
                  <p className="mt-1 text-sm text-white/80">
                    Selectionnez le client pour recuperer son plan d'action issu des OT preventifs.
                  </p>
                </div>
                {selectedClientId && (
                  <button
                    onClick={() => setShowClientModal(false)}
                    className="rounded-lg p-2 text-white hover:bg-white/10"
                    aria-label="Fermer"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              <div className="space-y-4 p-5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    value={clientSearchTerm}
                    onChange={(event) => setClientSearchTerm(event.target.value)}
                    placeholder="Rechercher un client..."
                    className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm focus:border-[#f98440] focus:ring-2 focus:ring-[#f98440]/30"
                    autoFocus
                  />
                </div>

                <div className="max-h-[52vh] overflow-y-auto rounded-lg border border-slate-200">
                  {loadingClients ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm font-medium text-slate-600">
                      <Loader2 className="h-5 w-5 animate-spin text-[#f98440]" />
                      Chargement des clients...
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-slate-500">
                      Aucun client trouve.
                    </div>
                  ) : (
                    filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleClientSelection(client.id)}
                        className={`flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-orange-50 ${
                          client.id === selectedClientId ? 'bg-orange-50' : 'bg-white'
                        }`}
                      >
                        <span>
                          <span className="block font-semibold text-slate-900">{getClientName(client)}</span>
                          {(client.telephone || client.adresse) && (
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {[client.telephone, client.adresse].filter(Boolean).join(' - ')}
                            </span>
                          )}
                        </span>
                        {client.id === selectedClientId && (
                          <CheckCircle className="h-5 w-5 shrink-0 text-[#f98440]" />
                        )}
                      </button>
                    ))
                  )}
                </div>

                {selectedClientId && (
                  <div className="flex justify-end">
                    <button
                      onClick={clearClientSelection}
                      className="text-sm font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Reinitialiser le client
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HeaderCell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border border-slate-900 px-2 py-3 text-center align-middle font-bold ${className}`}>
      {children}
    </th>
  );
}

function BodyCell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`border border-slate-900 px-2 py-2 align-top leading-relaxed ${className}`}>
      {children}
    </td>
  );
}

function ClassCell({ value }: { value: number | null }) {
  return (
    <BodyCell className="text-center font-semibold">
      {value || '-'}
    </BodyCell>
  );
}

function RpnBadge({ value }: { value: number | null }) {
  if (!value) return <span>-</span>;

  const tone = value >= 60
    ? 'text-red-700'
    : value >= 24
      ? 'text-amber-700'
      : 'text-emerald-700';
  const Icon = value >= 60 ? AlertCircle : CheckCircle;

  return (
    <span className={`inline-flex items-center gap-1 font-bold ${tone}`}>
      <Icon size={13} />
      {value}
    </span>
  );
}

function formatEquipment(row: PlanActionRow): string {
  const machine = row.machine;
  if (!machine) return '-';

  const poste = machine.poste_technique?.code_pt || machine.localisation;
  return [poste, machine.nom, machine.modele].filter(Boolean).join(' : ');
}

function getClientName(client: Pick<Client, 'raison_sociale' | 'prenom'>): string {
  return client.raison_sociale || client.prenom || 'Client sans nom';
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}

function formatMonth(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('fr-FR', {
    month: 'short',
    year: '2-digit'
  }).replace('.', '');
}

function getRowYear(row: PlanActionRow): string {
  const value = row.date_expression || row.date_programmee;
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return String(date.getFullYear());
}

function getClosureIntervention(row: PlanActionRow) {
  return (row.interventions || [])
    .filter((intervention) => intervention.valide)
    .sort((a, b) => new Date(b.valide_le || b.date_fin || b.date_debut || 0).getTime() - new Date(a.valide_le || a.date_fin || a.date_debut || 0).getTime())[0];
}

function getActionCloturee(row: PlanActionRow): boolean {
  return Boolean(getClosureIntervention(row));
}

function getDateClotureAction(row: PlanActionRow): string | null {
  const intervention = getClosureIntervention(row);
  return intervention?.valide_le || intervention?.date_fin || null;
}

function getObservationResultat(row: PlanActionRow): string {
  return getClosureIntervention(row)?.commentaire || '';
}

function normalizeType(value?: string | null): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isCorrective(value?: string | null): boolean {
  return normalizeType(value).includes('correctif');
}

function isPreventive(value?: string | null): boolean {
  return normalizeType(value).includes('preventif');
}

function getExcelCellStyle(rowIndex: number, colIndex: number, value: unknown) {
  const border = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } }
  };

  const base = {
    border,
    alignment: {
      vertical: 'center',
      horizontal: 'left',
      wrapText: true
    },
    font: {
      name: 'Arial',
      sz: 10,
      color: { rgb: '000000' }
    }
  };

  if (rowIndex === 0 || rowIndex === 1) {
    return {
      ...base,
      fill: { patternType: 'solid', fgColor: { rgb: '2B7FC7' } },
      font: { name: 'Arial', sz: rowIndex === 0 ? 12 : 10, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: {
        vertical: 'center',
        horizontal: 'center',
        wrapText: true
      }
    };
  }

  const isEvenDataRow = rowIndex % 2 === 0;
  const fillColor = colIndex === 13 && String(value || '').trim().toLowerCase() === 'ok'
      ? '00B050'
      : isEvenDataRow
        ? 'D9E2F3'
        : 'E7E6E6';

  return {
    ...base,
    fill: { patternType: 'solid', fgColor: { rgb: fillColor } },
    font: {
      ...base.font,
      bold: colIndex === 0 || colIndex === 11,
      color: colIndex === 13 && String(value || '').trim().toLowerCase() === 'ok'
        ? { rgb: 'FFFFFF' }
        : { rgb: '000000' }
    },
    alignment: {
      vertical: 'center',
      horizontal: [6, 8, 10, 11, 12, 13, 14].includes(colIndex) ? 'center' : 'left',
      wrapText: true
    }
  };
}
