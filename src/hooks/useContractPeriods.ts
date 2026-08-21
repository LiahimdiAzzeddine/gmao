import { useState, useEffect, useCallback } from 'react';
import { supabaseGes } from '../lib/supagestion';

export interface ContractPeriod {
  id: number;
  contract_id: number;
  periode_debut: string;
  periode_fin: string;
  montant: number;
  statut: 'en_attente' | 'en_cours' | 'facture' | 'payee' | 'annulee';
  payment_mode?: string;
  facture_id?: number;
  created_at: string;
  updated_at: string;
  facture?: {
    id: number;
    numero_facture: string;
    date_facture: string;
    date_echeance: string;
    statut: string;
    methode_paiement?: string;
  };
}

export interface CreateContractPeriodData {
  contract_id: number;
  periode_debut: string;
  periode_fin: string;
  montant: number;
  statut: 'en_attente' | 'en_cours' | 'facture' | 'payee' | 'annulee';
  payment_mode?: string;
}

export interface UpdateContractPeriodData extends Partial<CreateContractPeriodData> {
  id: number;
}

export const useContractPeriods = (contractId?: number) => {
  const [periods, setPeriods] = useState<ContractPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPeriods = useCallback(async (id?: number) => {
    try {
      setLoading(true);
      setError(null);

      const targetId = id || contractId;
      if (!targetId) {
        setPeriods([]);
        return;
      }

      const { data, error } = await supabaseGes
        .from('contract_periods')
        .select(`
          *,
          facture:factures(
            id,
            numero_facture,
            date_facture,
            date_echeance,
            statut,
            methode_paiement
          )
        `)
        .eq('contract_id', targetId)
        .order('periode_debut', { ascending: true });

      if (error) throw error;

      setPeriods(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des périodes:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  const createPeriod = async (periodData: CreateContractPeriodData): Promise<ContractPeriod | null> => {
    try {
      setError(null);

      const { data, error } = await supabaseGes
        .from('contract_periods')
        .insert([{
          ...periodData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setPeriods(prev => [...prev, data].sort((a, b) => 
          new Date(a.periode_debut).getTime() - new Date(b.periode_debut).getTime()
        ));
        return data;
      }

      return null;
    } catch (err) {
      console.error('Erreur lors de la création de la période:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      return null;
    }
  };

  const updatePeriod = async (periodData: UpdateContractPeriodData): Promise<ContractPeriod | null> => {
    try {
      setError(null);

      const { data, error } = await supabaseGes
        .from('contract_periods')
        .update({
          periode_debut: periodData.periode_debut,
          periode_fin: periodData.periode_fin,
          montant: periodData.montant,
          statut: periodData.statut,
          payment_mode: periodData.payment_mode,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodData.id)
        .select(`
          *,
          facture:factures(
            id,
            numero_facture,
            date_facture,
            date_echeance,
            statut,
            methode_paiement
          )
        `)
        .single();

      if (error) throw error;

      if (data) {
        setPeriods(prev => prev.map(period => 
          period.id === data.id ? data : period
        ));
        return data;
      }

      return null;
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la période:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return null;
    }
  };

  const deletePeriod = async (id: number): Promise<boolean> => {
    try {
      setError(null);

      const { error } = await supabaseGes
        .from('contract_periods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPeriods(prev => prev.filter(period => period.id !== id));
      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression de la période:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    }
  };

  const updatePeriodStatus = async (id: number, statut: 'en_attente' | 'en_cours' | 'facture' | 'payee' | 'annulee'): Promise<boolean> => {
    try {
      setError(null);

      const { data, error } = await supabaseGes
        .from('contract_periods')
        .update({
          statut,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          facture:factures(
            id,
            numero_facture,
            date_facture,
            date_echeance,
            statut,
            methode_paiement
          )
        `)
        .single();

      if (error) throw error;

      if (data) {
        setPeriods(prev => prev.map(period => 
          period.id === data.id ? data : period
        ));
        return true;
      }

      return false;
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du statut');
      return false;
    }
  };

  const updatePeriodPaymentMode = async (id: number, payment_mode: string): Promise<boolean> => {
    try {
      setError(null);

      const { data, error } = await supabaseGes
        .from('contract_periods')
        .update({
          payment_mode,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setPeriods(prev => prev.map(period => 
          period.id === data.id ? data : period
        ));
        return true;
      }

      return false;
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la Mode de paiement:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la Mode de paiement');
      return false;
    }
  };

  const updateFactureDates = async (factureId: number, date_facture: string, date_echeance: string): Promise<boolean> => {
    try {
      setError(null);

      const { error } = await supabaseGes
        .from('factures')
        .update({
          date_facture,
          date_echeance
        })
        .eq('id', factureId);

      if (error) throw error;

      // Recharger les périodes pour refléter les changements
      if (contractId) {
        await fetchPeriods();
      }

      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour des dates de facture:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour des dates de facture');
      return false;
    }
  };

  useEffect(() => {
    if (contractId) {
      fetchPeriods();
    }
  }, [contractId, fetchPeriods]);

  return {
    periods,
    loading,
    error,
    fetchPeriods,
    createPeriod,
    updatePeriod,
    deletePeriod,
    updatePeriodStatus,
    updatePeriodPaymentMode,
    updateFactureDates,
    refetch: fetchPeriods
  };
};