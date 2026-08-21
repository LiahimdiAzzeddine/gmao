import { useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Devis } from '../types/devis';

interface DevisFilter {
  clientId: number;
  dateDebut?: string;
  dateFin?: string;
}

interface UseDevisReturn {
  devis: Devis[];
  loading: boolean;
  fetchDevis: () => Promise<void>;
}

export function useDevis(supabase: SupabaseClient, filter: DevisFilter, calculateStats: (data: Devis[]) => void): UseDevisReturn {
  const [devis, setDevis] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevis = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('devis')
        .select(`
          id,
          num_devis,
          date_devis,
          statut,
          designation,
          kg_mat,
          ht_ttc,
          kg_mo,
          bons_livraison (*),
          factures(*),
          monetaire:monetaire_id (*),
          type_devis ( libelle ),
          domaines_activite ( libelle ),
          devis_lignes ( quantite, prix, type ),
          chantiers (*,achats (*))
        `)
        .eq('client_devis_id', filter.clientId)
        .order('date_devis', { ascending: false });

      if (filter.dateDebut) query = query.gte('date_devis', filter.dateDebut);
      if (filter.dateFin) query = query.lte('date_devis', filter.dateFin);

      const { data, error } = await query;
      if (error) throw error;

      const devisData = (data || []).map((d: any) => ({
        id: d.id,
        num_devis: d.num_devis,
        date_devis: d.date_devis,
        statut: d.statut,
        designation: d.designation,
        kg_mat: d.kg_mat || 1,
        kg_mo: d.kg_mo || 1,
        ht_ttc: d.ht_ttc,
        type_devis: d.type_devis,
        monetaire: d.monetaire,
        factures: d.factures || [],
        bons_livraison: d.bons_livraison || [],
        domaines_activite: d.domaines_activite,
        lignes: (d.devis_lignes || []).map((l: any) => ({
          quantite: l.quantite,
          prix: l.prix,
          type: l.type || 'materiel',
        })),
        client_devis_id: d.client_devis_id,
        clients_devis: d.clients_devis,
        contact: d.contact,
        emetteur: d.emetteur,
        chantiers: d.chantiers,
        
      })) as Devis[];

      setDevis(devisData);
      calculateStats(devisData);
    } catch (error) {
      console.error('Erreur lors du chargement des devis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevis();
  }, [filter.clientId, filter.dateDebut, filter.dateFin]);

  return { devis, loading, fetchDevis };
}
