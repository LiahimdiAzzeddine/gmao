import { useEffect, useState } from 'react';
import { addDays, addMonths, differenceInCalendarMonths, format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';

export type Period = { start: string; end: string };
export type ReportingRow = {
  intervention_id: string;
  date_debut: string;
  problem_lot_id: string | null;
  lot_defaillance: string | null;
  famille_probleme: string | null;
  mode_defaillance: string | null;
};
export type ReportProps = { rows: ReportingRow[]; period: Period };
export const REPORT_COLORS = ['#ea7b3c', '#475569', '#0f766e', '#8b5cf6', '#0284c7', '#ca8a04', '#be123c', '#64748b'];

type InterventionRecord = {
  id: string;
  date_debut: string;
  ordre_travail: {
    classifications: Array<{
      mode: {
        nom: string;
        famille: {
          nom: string;
          lot: { id: string; nom: string } | null;
        } | null;
      } | null;
    }>;
  };
};

export function normalizeInterventions(interventions: InterventionRecord[]): ReportingRow[] {
  return interventions.flatMap((intervention) => {
    const classifications = intervention.ordre_travail.classifications;
    // Conserver aussi les interventions dont la défaillance n'est pas classée.
    return (classifications.length ? classifications : [{ mode: null }]).map(({ mode }) => ({
      intervention_id: intervention.id,
      date_debut: intervention.date_debut,
      problem_lot_id: mode?.famille?.lot?.id || null,
      lot_defaillance: mode?.famille?.lot?.nom || null,
      famille_probleme: mode?.famille?.nom || null,
      mode_defaillance: mode?.nom || null,
    }));
  });
}

export function monthKey(date: string) {
  return format(new Date(date), 'yyyy-MM');
}

export function buildMonths(period: Period) {
  const first = startOfMonth(new Date(`${period.start}T00:00:00`));
  const last = startOfMonth(new Date(`${period.end}T00:00:00`));
  const count = differenceInCalendarMonths(last, first) + 1;
  if (!Number.isFinite(count) || count < 1) return [];
  return Array.from({ length: count }, (_, index) => {
    const date = addMonths(first, index);
    return { key: format(date, 'yyyy-MM'), label: format(date, 'MMM yy', { locale: fr }).replace('.', '') };
  });
}

export function useReportingRows(period: Period, refresh: number) {
  const [rows, setRows] = useState<ReportingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const result: ReportingRow[] = [];
        const pageSize = 1000;
        const endExclusive = format(addDays(new Date(`${period.end}T00:00:00`), 1), 'yyyy-MM-dd');
        for (let offset = 0; ; offset += pageSize) {
          const { data, error: queryError } = await supabase
            .from('interventions')
            .select(`
              id, date_debut,
              ordre_travail:ordres_travail!interventions_ot_fkey!inner(
                classifications:work_order_failure_modes!work_order_failure_modes_ordre_travail_id_fkey(
                  mode:plan_action_failure_modes(
                    nom,
                    famille:plan_action_problem_families(nom, lot:plan_action_lots(id, nom))
                  )
                )
              )
            `)
            .eq('ordre_travail.type', 'correctif')
            .gte('date_debut', `${period.start}T00:00:00`)
            .lt('date_debut', `${endExclusive}T00:00:00`)
            .order('date_debut').order('id')
            .range(offset, offset + pageSize - 1)
            .abortSignal(controller.signal)
            .returns<InterventionRecord[]>();
          if (controller.signal.aborted) return;
          if (queryError) throw queryError;
          const page = data || [];
          result.push(...normalizeInterventions(page));
          if (page.length < pageSize) break;
        }
        setRows(result);
      } catch (caught) {
        if (controller.signal.aborted) return;
        console.error('Erreur chargement reporting:', caught);
        setError(true);
        setRows([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [period.start, period.end, refresh]);

  return { rows, loading, error };
}
