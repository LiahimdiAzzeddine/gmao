import { useState, useEffect, useCallback } from 'react';
import { supabaseGes } from '../lib/supagestion';

export interface ContractCorrectif {
  id: number;
  contract_period_id: number;
  description: string;
  prix_unitaire: number;
  quantite: number;
  total: number;
  created_at: string;
}

export interface CreateContractCorrectifData {
  contract_period_id: number;
  description: string;
  prix_unitaire: number;
  quantite: number;
}

export interface UpdateContractCorrectifData extends Partial<CreateContractCorrectifData> {
  id: number;
}

export const useContractCorrectifs = (periodId?: number) => {
  const [correctifs, setCorrectifs] = useState<ContractCorrectif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCorrectifs = useCallback(async (id?: number) => {
    try {
      setLoading(true);
      setError(null);

      const targetId = id || periodId;
      if (!targetId) {
        setCorrectifs([]);
        return;
      }

      const { data, error } = await supabaseGes
        .from('contract_period_correctifs')
        .select('*')
        .eq('contract_period_id', targetId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setCorrectifs(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des correctifs:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  const createCorrectif = async (correctifData: CreateContractCorrectifData): Promise<ContractCorrectif | null> => {
    try {
      setError(null);

      const { data, error } = await supabaseGes
        .from('contract_period_correctifs')
        .insert([{
          ...correctifData,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setCorrectifs(prev => [...prev, data]);
        return data;
      }

      return null;
    } catch (err) {
      console.error('Erreur lors de la création du correctif:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      return null;
    }
  };

  const updateCorrectif = async (correctifData: UpdateContractCorrectifData): Promise<ContractCorrectif | null> => {
    try {
      setError(null);

      const { data, error } = await supabaseGes
        .from('contract_period_correctifs')
        .update({
          description: correctifData.description,
          prix_unitaire: correctifData.prix_unitaire,
          quantite: correctifData.quantite
        })
        .eq('id', correctifData.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setCorrectifs(prev => prev.map(correctif => 
          correctif.id === data.id ? data : correctif
        ));
        return data;
      }

      return null;
    } catch (err) {
      console.error('Erreur lors de la mise à jour du correctif:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return null;
    }
  };

  const deleteCorrectif = async (id: number): Promise<boolean> => {
    try {
      setError(null);

      const { error } = await supabaseGes
        .from('contract_period_correctifs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCorrectifs(prev => prev.filter(correctif => correctif.id !== id));
      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression du correctif:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    }
  };

  const getTotalCorrectifs = useCallback(() => {
    return correctifs.reduce((sum, correctif) => sum + correctif.total, 0);
  }, [correctifs]);

  useEffect(() => {
    if (periodId) {
      fetchCorrectifs();
    }
  }, [periodId, fetchCorrectifs]);

  return {
    correctifs,
    loading,
    error,
    fetchCorrectifs,
    createCorrectif,
    updateCorrectif,
    deleteCorrectif,
    getTotalCorrectifs,
    refetch: fetchCorrectifs
  };
};