import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plan } from '../types/plan';

type Stats = {
  total: number;
  actifs: number;
  preventives: number;
};

interface UseMaintenancePlansParams {
  typeFilter?: string;
  searchTerm?: string;
  filterStatut?: string;
  page?: number;
  pageSize?: number;
  clientId?: string;
}

export function useMaintenancePlans(params: UseMaintenancePlansParams) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    actifs: 0,
    preventives: 0,
  });

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { typeFilter = 'préventive', searchTerm = '', filterStatut = 'tous', page = 1, pageSize = 10, clientId } = params;
      
      // Si pas de clientId, ne rien charger
      if (!clientId) {
        setPlans([]);
        setTotalCount(0);
        setStats({ total: 0, actifs: 0, preventives: 0 });
        setLoading(false);
        return;
      }
      
      const types = typeFilter === 'all'
        ? ['préventive', 'corrective']
        : [typeFilter];

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // D'abord, récupérer les machines du client
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select('id')
        .eq('client_id', clientId);

      if (machinesError) throw machinesError;

      const machineIds = machinesData?.map(m => m.id) || [];

      if (machineIds.length === 0) {
        setPlans([]);
        setTotalCount(0);
        setStats({ total: 0, actifs: 0, preventives: 0 });
        setLoading(false);
        return;
      }

      let query = supabase
        .from('plans_maintenance')
        .select(`
          *,
          matching_links:plan_machines!inner(machine_id),
          plan_machines(
            machine_id,
            machine:machines!inner(
              id, nom, modele, numero_serie, client_id,
              client:clients(id, raison_sociale, prenom, telephone, adresse, logo_url)
            )
          ),
          plan_failure_modes(
            failure_mode_id,
            mode:plan_action_failure_modes(
              id, nom,
              family:plan_action_problem_families(
                id, nom,
                lot:plan_action_lots(id, nom)
              )
            )
          ),
          lot:lots(nom),
          gamme:gammes_maintenance(nom)
        `, { count: 'exact' })
        .in('type', types)
        .in('matching_links.machine_id', machineIds);

      // Filtre par statut
      if (filterStatut && filterStatut !== 'tous') {
        query = query.eq('statut', filterStatut);
      }

      // Recherche par numéro/UUID du plan ou par nom de machine.
      if (searchTerm && searchTerm.trim()) {
        const normalizedSearch = searchTerm.trim().replace(/^#/, '');
        const matchingPlanIds = new Set<string>();

        const { data: matchingMachines, error: matchingMachinesError } = await supabase
          .from('machines')
          .select('id')
          .eq('client_id', clientId)
          .ilike('nom', `%${normalizedSearch}%`);

        if (matchingMachinesError) throw matchingMachinesError;

        if (matchingMachines?.length) {
          const { data: machineLinks, error: machineLinksError } = await supabase
            .from('plan_machines')
            .select('plan_id')
            .in('machine_id', matchingMachines.map(machine => machine.id));

          if (machineLinksError) throw machineLinksError;
          machineLinks?.forEach(link => matchingPlanIds.add(link.plan_id));
        }

        if (/^\d+$/.test(normalizedSearch)) {
          const { data: plansByNumber, error: plansByNumberError } = await supabase
            .from('plans_maintenance')
            .select('id')
            .eq('numero', Number(normalizedSearch));

          if (plansByNumberError) throw plansByNumberError;
          plansByNumber?.forEach(plan => matchingPlanIds.add(plan.id));
        }

        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedSearch)) {
          const { data: plansById, error: plansByIdError } = await supabase
            .from('plans_maintenance')
            .select('id')
            .eq('id', normalizedSearch);

          if (plansByIdError) throw plansByIdError;
          plansById?.forEach(plan => matchingPlanIds.add(plan.id));
        }

        if (matchingPlanIds.size === 0) {
          setPlans([]);
          setTotalCount(0);
          setStats({ total: 0, actifs: 0, preventives: 0 });
          setLoading(false);
          return;
        }

        query = query.in('id', Array.from(matchingPlanIds));
      }

      // Pagination et tri
      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, error: queryError, count } = await query;

      if (queryError) throw queryError;

      const result = (data || []).map((plan: any) => {
        const associatedMachines = (plan.plan_machines || [])
          .map((link: any) => link.machine)
          .filter(Boolean);
        return {
          ...plan,
          machines: associatedMachines,
          machine: associatedMachines[0],
        };
      });

      setPlans(result);
      setTotalCount(count || 0);
      
      // Charger les stats globales (sans pagination) pour ce client
      const { data: allPlans } = await supabase
        .from('plans_maintenance')
        .select('type, statut, matching_links:plan_machines!inner(machine_id)')
        .in('type', types)
        .in('matching_links.machine_id', machineIds);

      setStats({
        total: allPlans?.length || 0,
        actifs: allPlans?.filter(p => p.statut === 'actif').length || 0,
        preventives: allPlans?.filter(p => p.type === 'préventive').length || 0,
      });
    } catch (err: any) {
      console.error(err);
      setError('Erreur lors du chargement des plans');
    } finally {
      setLoading(false);
    }
  }, [params.typeFilter, params.searchTerm, params.filterStatut, params.page, params.pageSize, params.clientId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  return {
    plans,
    loading,
    error,
    totalCount,
    stats,
    reload: loadPlans,
  };
}
