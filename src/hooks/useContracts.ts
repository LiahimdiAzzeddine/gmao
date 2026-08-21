import { useState, useEffect, useCallback } from 'react';
import { supabaseGes } from '../lib/supagestion';
import { Contract, CreateContractData, UpdateContractData, ContractFilters } from '../types/contracts';

export const useContracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = useCallback(async (filters?: ContractFilters) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabaseGes
        .from('contracts')
        .select(`
          *,
          client:clients_devis(id, client, ice, numero_fournisseur),
          contact:contacts(num_contact, nom, adresse, tel, adresse_facturation, email),
          chantier:chantiers(code, type_devis_id),
          emetteur:emetteurs(id, nom, telephone, portable, email, adresse)
        `)
        .order('created_at', { ascending: false });

      if (filters?.statut) {
        query = query.eq('statut', filters.statut);
      }

      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id);
      }

      if (filters?.search) {
        query = query.or(`nom.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setContracts(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des contrats:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  const createContract = async (contractData: CreateContractData): Promise<Contract | null> => {
    try {
      setError(null);

      const { data, error } = await supabaseGes
        .from('contracts')
        .insert([{
          ...contractData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select(`
          *,
          client:clients_devis(id, client, ice, numero_fournisseur),
          contact:contacts(num_contact, nom, adresse, tel, adresse_facturation, email),
          chantier:chantiers(code, type_devis_id),
          emetteur:emetteurs(id, nom, telephone, portable, email, adresse)
        `)
        .single();

      if (error) throw error;

      if (data) {
        setContracts(prev => [data, ...prev]);
        return data;
      }

      return null;
    } catch (err) {
      console.error('Erreur lors de la création du contrat:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      return null;
    }
  };

  const updateContract = async (contractData: UpdateContractData): Promise<Contract | null> => {
    try {
      setError(null);

      const { data, error } = await supabaseGes
        .from('contracts')
        .update({
          nom: contractData.nom,
          description: contractData.description,
          client_id: contractData.client_id,
          contact_id: contractData.contact_id,
          numero_commande: contractData.numero_commande,
          emetteur_id: contractData.emetteur_id,
          statut: contractData.statut,
          ht_ttc: contractData.ht_ttc,
          date_debut: contractData.date_debut,
          date_fin: contractData.date_fin,
          forfaitaire: contractData.forfaitaire,
          montant_periode: contractData.montant_periode,
          facturation: contractData.facturation,
          updated_at: new Date().toISOString()
        })
        .eq('id', contractData.id)
        .select(`
          *,
          client:clients_devis(id, client, ice, numero_fournisseur),
          contact:contacts(num_contact, nom, adresse, tel, adresse_facturation, email),
          chantier:chantiers(code, type_devis_id),
          emetteur:emetteurs(id, nom, telephone, portable, email, adresse)
        `)
        .single();

      if (error) throw error;

      if (data) {
        setContracts(prev => prev.map(contract => 
          contract.id === data.id ? data : contract
        ));
        return data;
      }

      return null;
    } catch (err) {
      console.error('Erreur lors de la mise à jour du contrat:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return null;
    }
  };

  const deleteContract = async (id: number): Promise<boolean> => {
    try {
      setError(null);

      const { error } = await supabaseGes
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContracts(prev => prev.filter(contract => contract.id !== id));
      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression du contrat:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    }
  };

  const renewContract = async (contractId: number): Promise<{ success: boolean; message: string }> => {
    try {
      setError(null);

      const { data, error } = await supabaseGes.rpc('renew_contract', {
        contract_id: contractId
      });

      if (error) throw error;

      // Recharger les contrats pour refléter les changements
      await fetchContracts();

      return {
        success: true,
        message: 'Contrat renouvelé avec succès'
      };
    } catch (err) {
      console.error('Erreur lors du renouvellement du contrat:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du renouvellement';
      setError(errorMessage);
      
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  return {
    contracts,
    loading,
    error,
    fetchContracts,
    createContract,
    updateContract,
    deleteContract,
    renewContract,
    refetch: fetchContracts
  };
};