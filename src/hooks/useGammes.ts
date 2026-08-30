import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { GammeMaintenance, EtapeGamme, GammeWithEtapes } from '../types/gammes';

interface UseGammesParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  filterType?: string;
}

export function useGammes() {
  const [gammes, setGammes] = useState<GammeWithEtapes[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const lastParamsRef = useRef<UseGammesParams>({});
  const requestIdRef = useRef(0);

  const loadGammes = useCallback(async (params: UseGammesParams = {}) => {
    lastParamsRef.current = params;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    const { page = 1, pageSize = 10, searchTerm = '', filterType = 'tous' } = params;

    try {
      let query = supabase
        .from('gammes_maintenance')
        .select('*, etapes:etapes_gamme(*)', { count: 'exact' });

      if (searchTerm) {
        const safeSearchTerm = searchTerm.replace(/[,%()]/g, ' ').trim();
        if (safeSearchTerm) {
          query = query.or(`nom.ilike.%${safeSearchTerm}%,description.ilike.%${safeSearchTerm}%`);
        }
      }

      if (filterType !== 'tous') {
        query = query.eq('type', filterType);
      }

      const { data: gammesData, error: gammesError, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (gammesError) throw gammesError;

      if (requestId !== requestIdRef.current) return;

      const gammesWithEtapes = (gammesData || []).map((gamme: any) => ({
        ...gamme,
        etapes: [...(gamme.etapes || [])].sort((a, b) => a.ordre - b.ordre),
      })) as GammeWithEtapes[];

      setGammes(gammesWithEtapes);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
      return gammesWithEtapes;
    } catch (error) {
      console.error('Error loading gammes:', error);
      if (requestId === requestIdRef.current) {
        setError('Impossible de charger les gammes de maintenance.');
        setGammes([]);
        setTotalCount(0);
        setTotalPages(0);
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  const reload = useCallback(() => {
    return loadGammes(lastParamsRef.current);
  }, [loadGammes]);

  return {
    gammes,
    loading,
    totalCount,
    totalPages,
    error,
    loadGammes,
    reload,
  };
}

export async function createGamme(gamme: Omit<GammeMaintenance, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('gammes_maintenance')
    .insert([gamme])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGamme(id: string, gamme: Partial<GammeMaintenance>) {
  const { data, error } = await supabase
    .from('gammes_maintenance')
    .update(gamme)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGamme(id: string) {
  const { count, error: dependencyError } = await supabase
    .from('plans_maintenance')
    .select('id', { count: 'exact', head: true })
    .eq('gamme_id', id);

  if (dependencyError) throw dependencyError;
  if ((count || 0) > 0) {
    throw new Error(`Cette gamme est utilisée par ${count} plan${count && count > 1 ? 's' : ''} de maintenance.`);
  }

  const { error: stepsError } = await supabase
    .from('etapes_gamme')
    .delete()
    .eq('gamme_id', id);

  if (stepsError) throw stepsError;

  const { error } = await supabase
    .from('gammes_maintenance')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function createEtape(etape: Omit<EtapeGamme, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('etapes_gamme')
    .insert([etape])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEtape(id: string, etape: Partial<EtapeGamme>) {
  const { data, error } = await supabase
    .from('etapes_gamme')
    .update(etape)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEtape(id: string) {
  const { error } = await supabase
    .from('etapes_gamme')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderEtapes(etapes: { id: string; ordre: number }[]) {
  const results = await Promise.all(etapes.map(({ id, ordre }) =>
    supabase.from('etapes_gamme').update({ ordre }).eq('id', id)
  ));

  const failedUpdate = results.find((result) => result.error);
  if (failedUpdate?.error) throw failedUpdate.error;
}
