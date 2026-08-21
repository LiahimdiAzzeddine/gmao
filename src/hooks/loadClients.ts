import { useEffect, useState } from 'react';
import { Client, supabase } from '../lib/supabase';


export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const loadClients = async (): Promise<void> => {
    setLoading(true);

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('raison_sociale');

    if (error) {
      setError(error);
      setClients([]);
    } else {
      setClients((data ?? []) as Client[]);
      setError(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadClients();
  }, []);

  return {
    clients,
    loading,
    error,
    reload: loadClients
  };
}
