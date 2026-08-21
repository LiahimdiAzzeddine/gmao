import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Créez cette instance en dehors du composant
export const supabaseAnon = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false, // Ne pas persister la session
      autoRefreshToken: false,
    }
  }
);

export interface Lot {
  id: string;
  nom: string;
  description: string;
}
export type DemandeData = {
  machine_ids: string[];
  type_intervention: 'preventive' | 'corrective';
  urgence: 'faible' | 'moyenne' | 'élevée';
  description: string;
  gamme?: 'quinzaine'|'mensuel' | 'trimestriel' | 'semestriel' | 'annuel';
  date_intervention?: string;
  label?: string;
    planning?:PlanningData;

};
export type FrequencyType = 'monthly' | 'quarterly' | 'biannual' | 'annual';

export interface PlanningData {
  frequency: FrequencyType;
  week_of_month: number;
  day_of_week: string;
  time: string;
  dtstart: string;
}
export type MaintenancePlanning = {
  id: string;                // UUID
  machine_id: string;         // UUID de la machine
  demande_id?: string;        // UUID de la demande initiale (optionnel)
  rrule: string;              // Règle RRULE RFC 5545, ex: "FREQ=MONTHLY;BYDAY=SU;BYSETPOS=2"
  dtstart: string;            // ISO string, date/heure de la première occurrence
  until?: string;             // ISO string, date de fin optionnelle
  week_of_month?: number;     // 1,2,3,4 ou -1 (dernier)
  day_of_week?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  time?: string;              // HH:mm
  label?: string;             // Libellé ou nom de la planification
  created_by: string;         // UUID de l'utilisateur qui a créé la planification
  created_at?: string;        // ISO string, date de création
  updated_at?: string;        // ISO string, date de dernière modification
};




export type ExistingDemande = {
  [x: string]: string;
  id: string;
  machine_id: string;
  description: string;
  urgence: string;
  gamme: string;
  date_intervention: string;
  statut: string;
  created_at: string;
};

export interface MaintenanceData {
  bonNumber: string;
  visitInfo: string;
  gamme: string;
  materiel: string;
  qte: number;
  semaine: string;
  date: string;
  localisation: string;
  machineName: string;
  machineId: string;
  Checks: { [key: string]: boolean };
  ChecksWithLabels: Array<{ action: string; checked: boolean; label: string }>;
  etatMateriel: string;
  remarque: string;
  intervenants: Array<{ technicienNom: string; tempsPasse: string }>;
  dateDebut: string;
  heureDebut: string;
}



export type Profile = {
  email: any;
  id: string;
  nom: string;
  role: 'technicien' | 'consultant' | 'admin';
  created_at: string;
};

import { MachineState } from '../types/machineState';

export type Machine = {
  plans_maintenance: any;
  poste_technique: any;
  ordres_travail?: any[]; // Tous les ordres de travail liés à la machine
  id: string;
  nom: string;
  modele: string;
  numero_serie: string;
  annee: number;
  fabricant: string;
  localisation: string;
  etat: MachineState | string; // État de la machine
  qte?: number; 
  puissance?: string;
  tension?: string;
  manuel_url?: string;
  image_url?: string | null;
  client_id?: string; // lié à un client
  created_at: string;
  updated_at: string;
  lot_id:string;
   client?: Client; 
   
};




export type Client = {
  id: string;
  prenom?: string;
  cin?: string;
  telephone?: string;
  adresse?: string;
  raison_sociale?: string;
  logo_file?: string;
  created_at: string;
  updated_at: string;
  [x: string]: any;
};

export type Intervention = {
  id: string;
  demande_id: string;
  technicien_id: string | null;
  date_intervention: string;
  description: string; 
  temps_passe?: number; 
  pieces_remplacees?: string;
  image_avant_url?: string[];
  image_apres_url?: string[];
  created_at: string;
  updated_at: string;
  heureDebut?: string; 
  visitinfo?: number; 
    status: 'pending' | 'approved' | 'rejected' | 'unresolved';
  type_action?:any;
  heuredebut?:string;
};

export type DemandeIntervention = {
  id: string;
  machine_id: string;
  type_intervention: 'preventive' | 'corrective';
  description: string;
  urgence: 'faible' | 'moyenne' | 'élevée';
  gamme: string; // 'mensuel', 'trimestriel', 'semestriel', 'annuel', "quinzaine"
  label:string,
  statut: 'en attente' | 'validée' | 'annulée';
  created_by: string; // admin
  date_intervention:string;// date de départ du plan
  date_demande: string;
  created_at: string;
  updated_at: string;
   // règle de planification calendaire
  planning_rule?: {
    weekOfMonth: number; // 1, 2, 3, 4
    dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    time: string; // HH:mm
  };
};

export type ActionPreventive = {
  id: string;
  machine_id: string;
  action: string;
  description?: string;
  statut: 'à valider' | 'validée' | 'refusée';
  created_by?: string; // id du profile qui a créé l'action
  created_at: string;
  updated_at: string;
  label?:string;
};




export interface PlanningItem {
  id: string;
  lot_id: string;
  machine_id: string;
  nom: string;
  gamme: string;
  hebdomadaire: boolean;
  mensuel: boolean;
  trimestriel: boolean;
  semestriel: boolean;
  annuelle: boolean;
  weeks: { [weekNumber: number]: boolean };
  interventions: { 
    [weekNumber: number]: Array<{
      id: string;
      status: string;
      date: string;
    }> 
  };
  machine?:Machine;
}


export interface Demande {
  id: string;
  type_intervention: string;
  statut: string;
  machine: Machine;
}

export interface Technicien {
  id: string;
  nom: string;
}
