import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { OrdreTravailDetail } from '../types/ot';
import { MachineState } from '../types/machineState';

interface OrdreTravailDetailWithIntervention extends OrdreTravailDetail {
  interventions?: Array<{
    id: string;
    date_debut: string;
    date_fin: string | null;
    duree_minutes: number | null;
    resultat: 'réussi' | 'partiel' | 'échec' | null;
    etat_machine_apres: MachineState;
    pieces_remplacees: any[];
    etapes_gamme_checkees: any[];
    image_avant_urls: string[];
    image_apres_urls: string[];
    commentaire: string | null;
    valide: boolean;
    valide_par: string | null;
    valide_le: string | null;
    created_at: string;
    updated_at: string;
    technicien: {
      id: string;
      nom: string;
      email: string | null;
    };
    validateur: {
      id: string;
      nom: string;
    } | null;
  }>;
  ot_parent?: {
    id: string;
    numot: string;
    type: string;
    statut: string;
  } | null;
  ot_correctif?: {
    id: string;
    numot: string;
    type: string;
    statut: string;
  } | null;
}

export const useOrdreTravailDetail = (id: string) => {
  const [ordre, setOrdre] = useState<OrdreTravailDetailWithIntervention | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Charger l'ordre de travail
        const { data: ordreData, error: ordreError } = await supabase
          .from('ordres_travail')
          .select(`
            id,
            type,
            date_programmee,
            date_execution,
            statut,
            numot,
            observations,
            ot_parent_id,
            created_at,
            machine:machine_id (
              id,
              machine_id,
              nom,
              modele,
              numero_serie,
              annee,
              fabricant,
              localisation,
              etat,
              puissance,
              tension,
              qte,
              poste_technique:poste_technique_id (
                id,
                code_pt,
                batiment,
                site:site_id (
                  code,
                  nom
                ),
                domaine:domaine_id (
                  code,
                  libelle
                ),
                secteur:secteur_id (
                  code,
                  libelle
                ),
                lot:lot_id (
                  code,
                  nom,
                  description
                )
              ),
              client:client_id (
                id,
                raison_sociale,
                prenom,
                cin,
                telephone,
                adresse,
                logo_url
              )
            ),
            plans_maintenance:plan_id (
              id,
              numero,
              type_recurrence,
              intervalle,
              jour_semaine,
              semaine_du_mois,
              forcer_jour_semaine,
              date_debut,
              date_fin,
              statut,
              gamme:gamme_id (
                id,
                nom,
                description,
                type,
                etapes_gamme (
                  id,
                  ordre,
                  description,
                  duree_estimee,
                  outil,
                  piece,
                  consigne_securite
                )
              )
            ),
            profile:technicien_id (
              id,
              nom,
              email,
              role
            )
          `)
          .eq('id', id)
          .single();

        if (ordreError) throw ordreError;

        // Charger les interventions associées
        const { data: interventionsData, error: interventionsError } = await supabase
          .from('interventions')
          .select(`
            id,
            date_debut,
            date_fin,
            duree_minutes,
            resultat,
            etat_machine_apres,
            pieces_remplacees,
            etapes_gamme_checkees,
            image_avant_urls,
            image_apres_urls,
            commentaire,
            valide,
            valide_par,
            valide_le,
            created_at,
            updated_at,
            technicien:profiles!interventions_technicien_fkey (
              id,
              nom,
              email
            ),
            validateur:profiles!interventions_valide_par_fkey (
              id,
              nom
            )
          `)
          .eq('ordre_travail_id', id)
          .order('date_debut', { ascending: false });

        if (interventionsError) throw interventionsError;

        // Charger l'OT parent si cet OT est un correctif
        let otParent = null;
        if (ordreData.ot_parent_id) {
          const { data: parentData } = await supabase
            .from('ordres_travail')
            .select('id, numot, type, statut')
            .eq('id', ordreData.ot_parent_id)
            .single();
          otParent = parentData;
        }

        // Charger l'OT correctif si cet OT a généré un correctif
        let otCorrectif = null;
        const { data: correctifData } = await supabase
          .from('ordres_travail')
          .select('id, numot, type, statut')
          .eq('ot_parent_id', id)
          .maybeSingle();
        otCorrectif = correctifData;

        // Combiner les données
        const ordreWithInterventions = {
          ...ordreData,
          interventions: interventionsData || [],
          ot_parent: otParent,
          ot_correctif: otCorrectif
        } as OrdreTravailDetailWithIntervention;

        setOrdre(ordreWithInterventions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id]);

  return { ordre, loading, error };
};
