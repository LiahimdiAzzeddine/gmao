// Site
export type Site = {
  id: string;            // UUID
  code: string;          // Code unique du site
  nom: string;           // Nom du site
  created_at?: string;   // Timestamp (optionnel si généré par la DB)
};

// Domaine
export type Domaine = {
  id: string;
  code: string;          // Code unique du domaine
  libelle: 'fluide' | 'patrimoine';  // Contrainte sur les valeurs
  created_at?: string;
};

// Lot (tu as un lot_id dans postes_techniques, donc je suppose que tu as une table lots)
export type Lot = {
  id: string;
  code: string;
  nom: string;
  created_at?: string;
};

// Secteur
export type Secteur = {
  id: string;
  domaine_id:string;
  code: string;          // ex: F01, D03
  libelle: string;       // ex: "secteur électricité et levage"
  created_at?: string;
};

// Poste Technique
export type PosteTechnique = {
  id: string;
  site_id: string;       // UUID du site
  domaine_id: string;    // UUID du domaine
  batiment:string;
  lot_id: string;        // UUID du lot
  secteur_id?: string;   // UUID du secteur (optionnel si non assigné)
  code_pt: string;       // Ex: SITE_F_BAT01_LOT05_POMPE01
  created_at?: string;
};
