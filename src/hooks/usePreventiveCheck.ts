import { useState } from 'react';
import { DemandeIntervention, supabase } from '../lib/supabase';

export function usePreventiveCheck() {
  const [existingPreventives, setExistingPreventives] =
    useState<DemandeIntervention[]>([]);
  const [checking, setChecking] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const checkExistingPreventives = async (
    machineIds: string[]
  ): Promise<DemandeIntervention[]> => {
    if (!machineIds.length) {
      setExistingPreventives([]);
      return [];
    }

    setChecking(true);

    const { data, error } = await supabase
      .from('demande_intervention')
      .select('*')
      .in('machine_id', machineIds)
      .eq('type_intervention', 'preventive')
      .neq('statut', 'annulée');

    if (error) {
      setError(error);
      setExistingPreventives([]);
      setChecking(false);
      return [];
    }

    const result = (data ?? []) as DemandeIntervention[];
    setExistingPreventives(result);
    setError(null);
    setChecking(false);

    return result;
  };

  return {
    existingPreventives,
    checking,
    error,
    setExistingPreventives,
    checkExistingPreventives
  };
}
