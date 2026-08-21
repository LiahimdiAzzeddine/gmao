import { supabase } from '../lib/supabase';
import { generateInterventionPDF } from '../services/pdfGenerator';

interface InterventionData {
  id: string;
  ordre_travail_id: string;
  machine_id: string;
  technicien_id: string;
  date_debut: string;
  actions_realisees: string;
  commentaire?: string;
  etat_machine_apres: string;
  pieces_remplacees: any[];
  etapes_gamme_checkees: any[];
  image_avant_urls?: string[];
  image_apres_urls?: string[];
  resultat: string;
  valide: boolean;
  valide_le?: string;
  duree?: number;
}

export async function generateInterventionPDFFromNew(interventionId: string) {
  try {
    // Récupérer les données complètes de l'intervention
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        ordre_travail:ordres_travail(
          *,
          machine:machines(
            *,
            client:clients(*),
            poste_technique:postes_techniques(*)
          ),
          plans_maintenance:plan_id(
            *,
            gamme:gammes_maintenance(*)
          )
        ),
        technicien:profiles!interventions_technicien_fkey(*)
      `)
      .eq('id', interventionId)
      .maybeSingle();

    if (interventionError) {
      throw interventionError;
    }

    if (!intervention) {
      throw new Error('Intervention introuvable');
    }

    // Transformer les données pour le format attendu par le générateur PDF
    const transformedData = {
      id: intervention.id,
      intervention_number: `INT-${intervention.id.substring(0, 8)}`,
      installation_number: intervention.ordre_travail?.machine?.id?.substring(0, 8) || 'N/A',
      site_number: intervention.ordre_travail?.machine?.client?.id?.substring(0, 8) || 'N/A',
      team_number: intervention.technicien?.id?.substring(0, 8) || 'N/A',
      requested_by: intervention.technicien?.nom || 'N/A',
      quote_number: intervention.ordre_travail?.id?.substring(0, 8) || 'N/A',
      work_location: intervention.ordre_travail?.machine?.poste_technique?.batiment || 
                    intervention.ordre_travail?.machine?.localisation || 'N/A',
      intervention_type: intervention.ordre_travail?.type || 'N/A',
      type_action: 'Maintenance',
      status: intervention.valide ? 'Validée' : 'En attente',
      // Convertir les tableaux d'URLs en JSON strings comme attendu par le générateur
      image_avant_url: intervention.image_avant_urls && intervention.image_avant_urls.length > 0 
                      ? JSON.stringify(intervention.image_avant_urls) 
                      : null,
      image_apres_url: intervention.image_apres_urls && intervention.image_apres_urls.length > 0 
                      ? JSON.stringify(intervention.image_apres_urls) 
                      : null,
      created_at: new Date(intervention.date_debut).toLocaleDateString('fr-FR'),

      machine: {
        nom: intervention.ordre_travail?.machine?.nom || 'N/A',
        modele: intervention.ordre_travail?.machine?.modele || 'N/A',
        localisation: intervention.ordre_travail?.machine?.localisation || 'N/A',
        id: intervention.ordre_travail?.machine?.id,
      },

      client: {
        raison_sociale: intervention.ordre_travail?.machine?.client?.raison_sociale || 'N/A',
        adresse: intervention.ordre_travail?.machine?.client?.adresse || 'N/A',
        telephone: intervention.ordre_travail?.machine?.client?.telephone || 'N/A'
      },

      technicians: [{
        name: intervention.technicien?.nom || 'N/A',
        ho_hours: Math.floor((intervention.duree || 0) / 60),
        regular_hours: (intervention.duree || 0) % 60,
        night_hours: 0,
        sunday_hours: 0,
        travel_hours: 0
      }],

      materials: intervention.pieces_remplacees?.map((piece: any) => ({
        designation: piece.nom || piece.description || 'N/A',
        quantity: piece.quantite || 1,
        order_number: piece.reference || 'N/A',
        line: 'N/A',
        expenses: 'N/A',
        isolation: 'N/A',
        unit_price: 0
      })) || [],

      work_description: intervention.actions_realisees || 'N/A',

      client_validation: {
        date: intervention.valide_le ? 
              new Date(intervention.valide_le).toLocaleDateString('fr-FR') : 
              new Date().toLocaleDateString('fr-FR'),
        name: intervention.ordre_travail?.machine?.client?.raison_sociale || 'N/A',
        address: intervention.ordre_travail?.machine?.client?.adresse || 'N/A',
        phone: intervention.ordre_travail?.machine?.client?.telephone || 'N/A'
      }
    };

    // Générer le PDF
    await generateInterventionPDF(transformedData);
    
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
}