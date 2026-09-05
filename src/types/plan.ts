import { Machine } from "../lib/supabase";

export interface FormData {
  client_id: string;
  machine_ids: string[];
  gamme_id: string;
  type: 'préventive' | 'corrective';
  type_recurrence: 'journalière' | 'hebdomadaire' | 'mensuelle' | 'annuelle' | string;
  intervalle: number;
  forcer_jour_semaine: boolean;
  jour_semaine: number | null|undefined;
  semaine_du_mois: number | null;
  date_debut: string;
  date_fin: string;
  statut: 'actif' | 'inactif';
}

export interface Plan {
  id: string;
  numero?: number;
  type: 'préventive' | 'corrective';
  machine_id?: string;
  lot_id?: string;
  gamme_id: string;
  type_recurrence?: string;
  intervalle?: number;
  forcer_jour_semaine: boolean;
  jour_semaine: number | null;
  semaine_du_mois?: number | null;
  statut: 'actif' | 'inactif';
  date_debut: string;
  date_fin?: string;
  machine?: Machine;
  machines?: Machine[];
  plan_machines?: Array<{ machine_id: string; machine?: Machine }>;
  plan_failure_modes?: Array<{
    failure_mode_id: string;
    mode?: {
      id: string;
      nom: string;
      family?: { id: string; nom: string; lot?: { id: string; nom: string } };
    };
  }>;
  lot?: { nom: string };
  gamme?: { nom: string };
}
