import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MaintenanceData } from '../types/intervention';

export function useIntervention(interventionId: string | null) {
  const [data, setData] = useState<MaintenanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!interventionId) {
      setError('Aucun ID d\'intervention fourni');
      return;
    }

    const fetchIntervention = async () => {
      setLoading(true);
      setError('');

      try {
        const { data: intervention, error: interventionError } = await supabase
          .from('interventions')
          .select(`
            *,
            demande:demande_intervention!interventions_demande_id_fkey(
              *,
              machine:machines!demande_intervention_machine_id_fkey(
                *,
                client:clients!machines_client_id_fkey(*)
              ),
              created_by_profile:profiles!demande_intervention_created_by_fkey(*)
            ),
            technicien:profiles!interventions_technicien_id_fkey(*),
            actions:intervention_action_preventive(
              *,
              action:actions_preventives(*)
            )
          `)
          .eq('id', interventionId)
          .maybeSingle();

        if (interventionError) {
          throw interventionError;
        }

        if (!intervention) {
          throw new Error('Intervention introuvable');
        }

        const transformedData: MaintenanceData = {
          id: intervention.id,
          intervention_number: `INT-${intervention.id.substring(0, 8)}`,
          installation_number: intervention.demande?.machine?.machine_id || 'N/A',
          site_number: intervention.demande?.machine?.client?.id?.substring(0, 8) || 'N/A',
          team_number: intervention.technicien?.id?.substring(0, 8) || 'N/A',
          requested_by: intervention.demande?.created_by_profile?.nom || 'N/A',
          quote_number: intervention.demande?.id?.substring(0, 8) || 'N/A',
          work_location: intervention.demande?.machine?.localisation || 'N/A',
          intervention_type: intervention.demande?.type_intervention || 'N/A',
          type_action: intervention.type_action || 'N/A',
          status: intervention.demande?.statut || 'N/A',
            image_avant_url: intervention.image_avant_url || null,
  image_apres_url: intervention.image_apres_url || null,
          created_at: new Date(intervention.created_at).toLocaleDateString('fr-FR'),

          machine: {
            nom: intervention.demande?.machine?.nom || 'N/A',
            modele: intervention.demande?.machine?.modele || 'N/A',
            localisation: intervention.demande?.machine?.localisation || 'N/A',
            id:intervention.demande?.machine?.id,
          },

          client: {
            raison_sociale: intervention.demande?.machine?.client?.raison_sociale || 'N/A',
            adresse: intervention.demande?.machine?.client?.adresse || 'N/A',
            telephone: intervention.demande?.machine?.client?.telephone || 'N/A'
          },

          technicians: [{
            name: intervention.technicien?.nom || 'N/A',
            ho_hours: 0,
            regular_hours: 0,
            night_hours: 0,
            sunday_hours: 0,
            travel_hours: 0
          }],

      materials: intervention.pieces_remplacees
  ? JSON.parse(intervention.pieces_remplacees).map((piece: string) => ({
      designation: piece.trim(),
      quantity: 1,
      order_number: 'N/A',
      line: 'N/A',
      expenses: 'N/A',
      isolation: 'N/A',
      unit_price: 0
    }))
  : [],

          work_description: intervention.description || 'N/A',

          client_validation: {
            date: new Date(intervention.date_intervention).toLocaleDateString('fr-FR'),
            name: intervention.demande?.machine?.client?.raison_sociale || 'N/A',
            address: intervention.demande?.machine?.client?.adresse || 'N/A',
            phone: intervention.demande?.machine?.client?.telephone || 'N/A'
          }
        };

        setData(transformedData);
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement des données');
        console.error('Erreur Supabase:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchIntervention();
  }, [interventionId]);

  return { data, loading, error };
}
