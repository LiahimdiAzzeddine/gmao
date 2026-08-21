import { useEffect, useState } from 'react';
import { Machine, supabase } from '../lib/supabase';

 
export function useMachines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMachines = async (): Promise<void> => {
    setLoading(true);

    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('nom');

    if (error) {
      setError(error);
      setMachines([]);
      setFilteredMachines([]);
    } else {
      const result = (data ?? []) as Machine[];
      setMachines(result);
      setFilteredMachines(result);
      setError(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadMachines();
  }, []);

  return {
    machines,
    filteredMachines,
    setFilteredMachines,
    loading,
    error,
    reload: loadMachines
  };
}
