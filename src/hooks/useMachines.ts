import { useCallback, useEffect, useState } from 'react';
import { Machine, supabase } from '../lib/supabase';

interface UseMachinesParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  filterEtat?: string;
  filterLot?: string;
  filterClient?: string;
}

interface UseMachinesReturn {
  machines: Machine[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  totalPages: number;
  reload: () => void;
  loadMachines: (params: UseMachinesParams) => Promise<void>;
}

export function useMachines(autoLoad: boolean = true): UseMachinesReturn {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentParams, setCurrentParams] = useState<UseMachinesParams>({
    page: 1,
    pageSize: 10,
    searchTerm: '',
    filterEtat: 'tous',
    filterLot: 'tous',
    filterClient: 'tous',
  });

  const loadMachines = useCallback(async (params: UseMachinesParams) => {
    setLoading(true);
    setError(null);
    setCurrentParams(params);

    try {
      const page = params.page || 1;
      const pageSize = params.pageSize || 10;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Construction de la requête de base
      let query = supabase
        .from('machines')
        .select(`
          *,
          client:clients (
            id,
            prenom,
            raison_sociale,
            telephone
          ),
          poste_technique:postes_techniques (
            id,
            code_pt,
            batiment,
            site:sites (
              code,
              nom
            ),
            domaine:domaines (
              code,
              libelle
            ),
            secteur:secteurs (
              code,
              libelle
            ),
            lot:lots (
              code,
              nom
            )
          )
        `, { count: 'exact' });

      // Filtres
      if (params.searchTerm && params.searchTerm.trim() !== '') {
        const searchLower = params.searchTerm.toLowerCase();
        query = query.or(
          `nom.ilike.%${searchLower}%,` +
          `modele.ilike.%${searchLower}%,` +
          `localisation.ilike.%${searchLower}%,` +
          `machine_id.ilike.%${searchLower}%`
        );
      }

      if (params.filterEtat && params.filterEtat !== 'tous') {
        query = query.eq('etat', params.filterEtat);
      }

      if (params.filterLot && params.filterLot !== 'tous') {
        query = query.eq('lot_id', params.filterLot);
      }

      if (params.filterClient && params.filterClient !== 'tous') {
        query = query.eq('client_id', params.filterClient);
      }

      // Tri et pagination
      query = query.order('nom').range(from, to);

      const { data, error: queryError, count } = await query;

      if (queryError) {
        setError(queryError.message);
        setMachines([]);
        setTotalCount(0);
      } else {
        setMachines((data ?? []) as Machine[]);
        setTotalCount(count || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setMachines([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(() => {
    loadMachines(currentParams);
  }, [loadMachines, currentParams]);

  const totalPages = Math.ceil(totalCount / (currentParams.pageSize || 10));

  useEffect(() => {
    if (autoLoad) {
      loadMachines(currentParams);
    }
  }, [autoLoad, loadMachines, currentParams]);

  return {
    machines,
    loading,
    error,
    totalCount,
    totalPages,
    reload,
    loadMachines,
  };
}