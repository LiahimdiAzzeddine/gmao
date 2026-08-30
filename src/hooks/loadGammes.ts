import { useEffect, useState } from 'react';
import {  supabase } from '../lib/supabase';
import { GammeMaintenance } from '../types/gammes';

 
export function useGammes() {
  const [gammes, setGammes] = useState<GammeMaintenance[]>([]);
  const [filteredGammes, setFilteredGammes] = useState<GammeMaintenance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const loadGammes = async (): Promise<void> => {
    setLoading(true);

    const { data, error } = await supabase
      .from('gammes_maintenance')
      .select('*')
      .order('nom');

    if (error) {
      setError(error);
      setGammes([]);
      setFilteredGammes([]);
    } else {
      const result = (data ?? []) as GammeMaintenance[];
      setGammes(result);
      setFilteredGammes(result);
      setError(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadGammes();
  }, []);

  return {
    gammes,
    filteredGammes,
    setFilteredGammes,
    loading,
    error,
    reload: loadGammes
  };
}
