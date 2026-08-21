import { useState, useEffect } from 'react';
import {
  supabase,
  Machine,
  DemandeIntervention,
  Intervention,
  PlanningItem
} from '../lib/supabase';
import { generatePlanningFromDemandes } from '../utils/planningUtils';

interface UseClientMaintenancePlanningParams {
  clientId: string;
}

export function UseClientMaintenanceRapportParams({ clientId }: UseClientMaintenancePlanningParams) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [demandes, setDemandes] = useState<DemandeIntervention[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [planningData, setPlanningData] = useState<PlanningItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  /* =======================
     Chargement global
  ======================= */
  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId, currentYear]);

  /* =======================
     Génération planning
  ======================= */
  useEffect(() => {
    if (!demandes.length || !machines.length) return;

    const planning = generatePlanningFromDemandes(
      demandes,
      machines,
      interventions,
      currentYear
    );

    setPlanningData(planning);
  }, [demandes, machines, interventions, currentYear]);

  /* =======================
     DATA LOADER
  ======================= */
  async function loadData() {
    setLoading(true);
    await Promise.all([
      loadMachines(),
      loadDemandes(),
      loadInterventions()
    ]);
    setLoading(false);
  }

  /* =======================
     MACHINES du client
  ======================= */
  async function loadMachines() {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .eq('client_id', clientId)
      .order('nom');

    if (!error && data) {
      setMachines(data);
    }
  }

  /* =======================
     DEMANDES (préventive + corrective)
     pour les machines du client
  ======================= */
  async function loadDemandes() {
    const { data, error } = await supabase
      .from('demande_intervention')
      .select(`
        *,
        machine:machines!inner (
          id,
          nom,
          client_id
        )
      `)
      .eq('machine.client_id', clientId)
      .order('date_intervention');

    if (!error && data) {
      setDemandes(data);
    }
  }

  /* =======================
     INTERVENTIONS
     liées aux demandes du client
  ======================= */
  async function loadInterventions() {
    try {
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          demande:demande_intervention!inner (
            id,
            type_intervention,
            machine:machines!inner (
              id,
              client_id
            )
          )
        `)
        .eq('demande.machine.client_id', clientId)
        .gte('date_intervention', `${currentYear}-01-01`)
        .lte('date_intervention', `${currentYear}-12-31`)
        .order('date_intervention');

      if (error) {
        console.error('Erreur chargement interventions:', error);
        return;
      }

      setInterventions(data ?? []);
    } catch (err) {
      console.error(err);
    }
  }

  return {
    machines,
    demandes,
    interventions,
    planningData,
    loading,
    currentYear,
    setCurrentYear,
    reload: loadData
  };
}