import { useEffect, useMemo, useState } from 'react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  ClipboardList,
  Download,
  Search,
  X,
  Calendar,
  Wrench,
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ClientLayout from '../components/ClientLayout';
import EmptyState from '../components/Ui/EmptyState';

type PlanActionRow = {
  id: string;
  numot: number | null;
  type: string;
  statut: string;
  ot_parent_id: string | null;
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

export default function ClientPlanAction() {
  const { profile, client } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<PlanActionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));

  const observerTarget = React.useRef<HTMLDivElement>(null);
  const itemsPerPage = 20;

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          // Logique de pagination si nécessaire
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, loadingMore, currentPage]);

  useEffect(() => {
    if (client?.id) {
      fetchPlanActions(client.id);
    }
  }, [client?.id]);

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
            poste_technique:postes_techniques(
              code_pt,
              batiment,
              site:sites(nom)
            )
          )
        `, { count: 'exact' })
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

      const finalRows = correctiveRows.filter((row) => {
        const parent = row.ot_parent_id ? nextParentById[row.ot_parent_id] : null;
        return isPreventive(parent?.type);
      });

      setRows(finalRows);
      setTotalCount(finalRows.length);
    } catch (err) {
      console.error('Erreur chargement plan action:', err);
      setError('Impossible de charger le plan d\'action.');
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setSearchTerm('');
    setSelectedYear(String(new Date().getFullYear()));
  }

  const hasFilters = searchTerm.trim() || selectedYear !== String(new Date().getFullYear());

  const stats = {
    total: filteredRows.length,
    cloturees: filteredRows.filter(row => getActionCloturee(row)).length,
    enCours: filteredRows.filter(row => !getActionCloturee(row)).length,
    rpnEleve: filteredRows.filter(row => (row.rpn || 0) >= 60).length,
  };

  function exportToExcel() {
    const clientName = client?.raison_sociale || client?.prenom || 'Client';
    const clientSuffix = `_${clientName.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;
    
    const aoa = [
      ['Plan d\'action correctif', '', '', '', '', '', '', '', '', '', '', '', '', 'Resultats des actions / Action Resultat', '', ''],
      [
        'EQUIPEMENT',
        'Lot',
        'Famille de problemes',
        'Mode de defaillance potentiel',
        'Action recommandee',
        'Gravite productivite de l\'echec',
        'classe',
        'Occurrence d\'echec',
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
        vertical: 'top',
        horizontal: 'left',
        wrapText: true
      }
    };
  }

  return (
    <ClientLayout>
      {/* En-tête */}
      <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 md:text-2xl lg:text-3xl">Mon plan d'action</h1>
          <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm">
            Correctifs issus des OT préventifs
          </p>
        </div>
        <div className="hidden rounded-lg border border-[#ff6b57]/30 bg-white px-3 py-1.5 text-xs font-bold text-[#ff6b57] md:block md:px-4 md:py-2 md:text-sm">
          {filteredRows.length} / {totalCount} actions
        </div>
      </div>

      {/* Filtres */}
      <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher équipement, problème, action..."
              className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#ff6b57] focus:border-transparent text-sm transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="w-full sm:w-36 pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#ff6b57] focus:border-transparent text-sm bg-white transition-all"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <button
              onClick={exportToExcel}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              Excel
            </button>

            {hasFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold text-sm transition-colors"
              >
                <X size={16} />
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 text-xs font-semibold text-slate-500 sm:text-sm">
          {filteredRows.length} action{filteredRows.length > 1 ? 's' : ''} affichée{filteredRows.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mt-4 md:mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Tableau */}
      {loading ? (
        <div className="mt-4 md:mt-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="space-y-3 animate-pulse">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-20 bg-slate-100 rounded-lg" />
            ))}
          </div>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="mt-4 md:mt-6">
          <EmptyState
            title={hasFilters ? 'Aucune action trouvée' : 'Aucune action'}
            message={hasFilters ? 'Aucune action ne correspond à vos filtres.' : "Aucune action corrective issue d'un OT préventif."}
          />
        </div>
      ) : (
        <>
          {/* Table responsive */}
          <div className="mt-4 md:mt-6 rounded-lg bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[1980px] w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th colSpan={13} className="h-8 border border-slate-900 bg-gradient-to-r from-[#ff735f] to-[#f04438] text-white text-center font-bold">
                      Plan d'action correctif
                    </th>
                    <th colSpan={3} className="h-8 border border-slate-900 bg-gradient-to-r from-[#ff735f] to-[#f04438] text-white text-center font-bold">
                      Resultats des actions / Action Resultat
                    </th>
                  </tr>
                  <tr className="bg-gradient-to-r from-[#ff735f] to-[#f04438] text-white">
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[170px]">EQUIPEMENT</th>
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[120px]">Lot</th>
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[170px]">Famille de problemes</th>
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[190px]">Mode de defaillance potentiel</th>
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[280px]">Action recommandee</th>
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[230px]">Gravite productivite de l'echec</th>
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[44px]">classe</th>
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[210px]">Occurrence d'echec</th>
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[44px]">classe</th>
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[210px]">Detectabilite</th>
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[44px]">classe</th>
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[72px]">R.P.N.</th>
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[80px]">date expression</th>
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[88px]">Actions cloturee</th>
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[86px]">date</th>
                    <th className="border border-white/20 px-2 py-3 text-center align-middle font-bold w-[260px]">observation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-blue-50'}>
                      <td className="border border-slate-900 px-2 py-2 align-top leading-relaxed font-bold">{formatEquipment(row)}</td>
                      <td className="border border-slate-900 px-2 py-2 align-top leading-relaxed">{row.lot_defaillance || '-'}</td>
                      <td className="border border-slate-900 px-2 py-2 align-top leading-relaxed">{row.famille_probleme || '-'}</td>
                      <td className="border border-slate-900 px-2 py-2 align-top leading-relaxed">{row.mode_defaillance || '-'}</td>
                      <td className="border border-slate-900 px-2 py-2 align-top leading-relaxed">{row.action_recommandee || '-'}</td>
                      <td className="border border-slate-900 px-2 py-2 align-top leading-relaxed">{row.gravite_libelle || '-'}</td>
                      <td className="border border-slate-900 px-2 py-2 text-center font-semibold">{row.gravite_classe || '-'}</td>
                      <td className="border border-slate-900 px-2 py-2 align-top leading-relaxed">{row.occurrence_libelle || '-'}</td>
                      <td className="border border-slate-900 px-2 py-2 text-center font-semibold">{row.occurrence_classe || '-'}</td>
                      <td className="border border-slate-900 px-2 py-2 align-top leading-relaxed">{row.detectabilite_libelle || '-'}</td>
                      <td className="border border-slate-900 px-2 py-2 text-center font-semibold">{row.detectabilite_classe || '-'}</td>
                      <td className="border border-slate-900 px-2 py-2 text-center">
                        <RpnBadge value={row.rpn} />
                      </td>
                      <td className="border border-slate-900 px-2 py-2 text-center">{formatDate(row.date_expression || row.date_programmee)}</td>
                      <td className={`border border-slate-900 px-2 py-2 text-center font-bold ${getActionCloturee(row) ? 'bg-emerald-500 text-white' : ''}`}>
                        {getActionCloturee(row) ? 'ok' : ''}
                      </td>
                      <td className="border border-slate-900 px-2 py-2 text-center">{formatMonth(getDateClotureAction(row))}</td>
                      <td className="border border-slate-900 px-2 py-2 align-top leading-relaxed">{getObservationResultat(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Infinite scroll trigger */}
          <div ref={observerTarget} className="mt-4 flex justify-center">
            {!hasMore && filteredRows.length > 0 && (
              <div className="text-sm text-slate-500 py-4">
                Toutes les actions sont affichées
              </div>
            )}
          </div>
        </>
      )}
    </ClientLayout>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  subtitle: string;
  color: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className={`rounded-lg bg-gradient-to-br ${color} p-3 text-white shadow-lg shadow-red-200/50 sm:p-4 md:p-5 transition-transform hover:scale-105`}>
      <div className="flex items-start justify-between gap-2 md:gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xl font-black sm:text-2xl md:text-3xl">{value}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wide sm:text-sm md:mt-2">{label}</div>
          <div className="mt-0.5 text-[10px] font-medium text-white/80 sm:text-xs md:mt-1">{subtitle}</div>
        </div>
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm sm:h-11 sm:w-11 md:h-12 md:w-12">
          <Icon size={18} className="sm:w-[20px] sm:h-[20px] md:w-[22px] md:h-[22px]" />
        </div>
      </div>
    </div>
  );
}

function RpnBadge({ value }: { value: number | null }) {
  if (!value) return <span className="text-slate-400">-</span>;

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
