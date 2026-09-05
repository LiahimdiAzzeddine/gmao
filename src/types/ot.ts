import type { TypeRecurrence } from "../hooks/useOrdresTravail"
import type { OtStatus } from "../utils/otStatus"
export type TypeOt = 'préventif' | 'correctif' | 'curatif'
export type StatutType = OtStatus;

export interface OrdreTravail {
  id: string;
  statut: OtStatus;
  plan_id: string;
  created_at: string;
  technicien: Technicien | null;
  observations: string | null;
  technicien_id: string;
  date_execution: string | null;
  date_programmee: string;
}
// Profil de l'utilisateur
export type Profile = {
  id: string;
  nom: string;
  email?: string;
  role?: string;
};

// Client
export type Client = {
  id: string;
  raison_sociale: string;
  prenom?: string | null;
  cin?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  logo_url?: string | null;
};

// Lot
export type Lot = {
  id: string;
  code: string;
  nom: string;
  description?: string | null;
};

// Domaine / Secteur / Site
export type Domaine = { code: string; libelle: string };
export type Secteur = { code: string; libelle: string };
export type Site = { code: string; nom: string };

// Poste technique
export type PosteTechnique = {
  id: string;
  code_pt: string;
  batiment: string;
  site?: Site | null;
  domaine?: Domaine | null;
  secteur?: Secteur | null;
  lot?: Lot | null;
};

// Machine
export type Machine = {
  plans_maintenance?: any;
  poste_technique?: PosteTechnique;
  id: string;
  nom: string;
  modele: string;
  numero_serie: string;
  annee?: number;
  fabricant?: string;
  etat?: string;
  qte?: number; 
  puissance?: string;
  tension?: string;
  manuel_url?: string;
  client_id?: string; 
  created_at?: string;
  updated_at?: string;
  lot_id?: string;
  client?: Client | null;
};

// Gamme de maintenance
export type Gamme = {
  id: string;
  nom: string;
  description?: string | null;
  etapes_gamme: EtapeGamme[];
  type: any;
};
export interface EtapeGamme {
  id: string;
  ordre: number;
  description: string;
  duree_estimee?: number;
  outil?: string;
  piece?: string;
  consigne_securite?: string;
}


// Plan de maintenance
export type PlanMaintenanceDetail = {
  id: string;
  numero:number;
  type_recurrence?: TypeRecurrence | null;
  intervalle?: number | null;
  jour_semaine?: number | null;
  semaine_du_mois?: number | null;
  forcer_jour_semaine: boolean;
  date_debut: string;
  date_fin?: string | null;
  statut: string;
  gamme?: Gamme | null;
  lot?: Lot | null;
};


// Technicien
export type Technicien = {
  id: string;
  nom: string;
  email?: string | null;
  role?: string;
};

// Détail de l’ordre de travail
export type OrdreTravailDetail = {
  classification_source?: string | null;
  classification_confirmed?: boolean;
  failure_modes?: Array<{
    source: string;
    failure_mode?: {
      nom: string;
      famille?: { nom: string; lot?: { nom: string } | null } | null;
    } | null;
  }>;
  type_intervention: string;
  ot_parent?: string;
 type: TypeOt;
  machine?: Machine | null;
  numot?: number;
  cause?:string,
  id: string;
  date_programmee: string;
  date_execution?: string | null;
  statut: OtStatus;
  observations?: string | null;
  created_at: string;
  profile?: Profile;
  plans_maintenance?: PlanMaintenanceDetail | null;
  technicien?: Technicien | null;
  interventions?: Array<{
    date_debut?: string;
    technicien?: Technicien | null;
    valide?: boolean | null;
    etapes_gamme_checkees?: any[];
    commentaire?: string | null;
  }>;
};


