import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  supabase,
  Lot,
  Machine,
  DemandeIntervention,
  Intervention,
  PlanningItem,
} from '../lib/supabase';
import { generatePlanningFromDemandes } from '../utils/planningUtils';

export function useMaintenancePlanning() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [demandes, setDemandes] = useState<DemandeIntervention[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  /* =======================
     LOAD GLOBAL
  ======================= */
  const loadData = useCallback(async () => {
    setLoading(true);

    await Promise.all([
      loadLots(),
      loadDemandesAndMachines(),
      loadInterventions(currentYear),
    ]);

    setLoading(false);
  }, [currentYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* =======================
     DATA DERIVÉE
  ======================= */
  const machines: Machine[] = useMemo(() => {
    const list = demandes
      .map((d: any) => d.machine)
      .filter(Boolean);

    return Array.from(new Map(list.map(m => [m.id, m])).values());
  }, [demandes]);

  const planningData: PlanningItem[] = useMemo(() => {
    if (!demandes.length || !machines.length) return [];

    return generatePlanningFromDemandes(
      demandes,
      machines,
      interventions,
      currentYear
    );
  }, [demandes, machines, interventions, currentYear]);

  /* =======================
     LOADERS
  ======================= */
  async function loadLots() {
    const { data } = await supabase.from('lots').select('*').order('nom');
    if (data) setLots(data);
  }

  async function loadDemandesAndMachines() {
    const { data, error } = await supabase
      .from('demande_intervention')
      .select(`
        *,
        machine:machines (
          id,
          nom,
          lot_id,
          client:clients (id, prenom, raison_sociale, telephone, logo_url)
        )
      `)
      .eq('type_intervention', 'preventive')
      .order('date_intervention');

    if (error) {
      console.error(error);
      return;
    }

    setDemandes(data ?? []);
  }

  async function loadInterventions(year: number) {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        demande:demande_intervention!inner (
          id,
          type_intervention
        )
      `)
      .eq('demande.type_intervention', 'preventive')
      .gte('date_intervention', `${year}-01-01`)
      .lte('date_intervention', `${year}-12-31`)
      .order('date_intervention');

    if (!error) setInterventions(data ?? []);
  }

  return {
    lots,
    machines,
    demandes,
    interventions,
    planningData,
    loading,
    currentYear,
    setCurrentYear,
    reload: loadData,
  };
}
