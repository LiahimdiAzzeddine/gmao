import { useState, useCallback } from 'react';
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

  const loadGammes = useCallback(async (params: UseGammesParams = {}) => {
    setLoading(true);
    const { page = 1, pageSize = 10, searchTerm = '', filterType = 'tous' } = params;

    try {
      let query = supabase
        .from('gammes_maintenance')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.or(`nom.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (filterType !== 'tous') {
        query = query.eq('type', filterType);
      }

      const { data: gammesData, error: gammesError, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (gammesError) throw gammesError;

      if (gammesData) {
        const gammesWithEtapes = await Promise.all(
          gammesData.map(async (gamme) => {
            const { data: etapesData } = await supabase
              .from('etapes_gamme')
              .select('*')
              .eq('gamme_id', gamme.id)
              .order('ordre', { ascending: true });

            return {
              ...gamme,
              etapes: etapesData || [],
            };
          })
        );

        setGammes(gammesWithEtapes);
        setTotalCount(count || 0);
        setTotalPages(Math.ceil((count || 0) / pageSize));
      }
    } catch (error) {
      console.error('Error loading gammes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(() => {
    loadGammes();
  }, [loadGammes]);

  return {
    gammes,
    loading,
    totalCount,
    totalPages,
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
  const promises = etapes.map(({ id, ordre }) =>
    supabase.from('etapes_gamme').update({ ordre }).eq('id', id)
  );

  await Promise.all(promises);
}
