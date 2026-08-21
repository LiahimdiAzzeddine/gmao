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
          machine:machines(
            id,
            nom,
            modele,
            numero_serie,
            client:clients(
              id,
              raison_sociale,
              prenom,
              telephone,
              adresse,
              logo_url
            )
          ),
          lot:lots(nom),
          gamme:gammes_maintenance(nom)
        `, { count: 'exact' })
        .in('type', types)
        .in('machine_id', machineIds);

      // Filtre par statut
      if (filterStatut && filterStatut !== 'tous') {
        query = query.eq('statut', filterStatut);
      }

      // Recherche par nom de machine
      if (searchTerm && searchTerm.trim()) {
        // On doit d'abord récupérer les IDs des machines correspondantes du client
        const { data: machines } = await supabase
          .from('machines')
          .select('id')
          .eq('client_id', clientId)
          .ilike('nom', `%${searchTerm}%`);
        
        if (machines && machines.length > 0) {
          const searchMachineIds = machines.map(m => m.id);
          query = query.in('machine_id', searchMachineIds);
        } else {
          // Aucune machine trouvée, retourner vide
          setPlans([]);
          setTotalCount(0);
          setStats({ total: 0, actifs: 0, preventives: 0 });
          setLoading(false);
          return;
        }
      }

      // Pagination et tri
      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, error: queryError, count } = await query;

      if (queryError) throw queryError;

      const result = data || [];

      setPlans(result);
      setTotalCount(count || 0);
      
      // Charger les stats globales (sans pagination) pour ce client
      const { data: allPlans } = await supabase
        .from('plans_maintenance')
        .select('type, statut')
        .in('type', types)
        .in('machine_id', machineIds);

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
