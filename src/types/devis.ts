export interface Ligne {
  materiel: string;
  quantite: string;
  prix: string;
  type: string;       
  unite: string;    
  ordre: number;  
}
export interface Chantier {
  code: string;
  chantier?: string|null;
  created_at: string;
  devis_id?: number;
  achats?: any[];
}
export type ValidityNote = {
  id?: number;        // présent uniquement en mode édition
  devis_id?: number;  // optionnel côté front, utile si tu veux tracer
  contenu: string;    // texte de la note
  ordre: number;      // ordre d’affichage
  created_at?: string;
};


export interface Interlocuteur {
  id: number;
  interlocuteur: string;
}

export interface Client {
  id: number;
  client: string;
  site: string;
  telephone:string;
  ice:string;
  adresse:string;
  contacts: Contact[];
  numero_fournisseur?: string | null;
}


export type ClientDevisInsert = {
  id:number;
  site: string;
  marque_installation?: string | null;
  contrat?: string | null;
  contact?: string | null;
  client?: string | null;
  telephone?: string | null;
  ice?: string | null;
  adresse?: string | null;
};


export type Contact = {
  email: string | null;
  num_contact: number;
  nom: string;
  adresse: string | null;
  tel: string | null;
  fax: number | null;
  adresse_facturation: string | null;
  created_at: string;     
  client_id: number; 
};


export type Emetteur = {
  id: number;                // bigint identity
  nom: string;
  telephone?: string | null;
  portable?: string | null;
  fax?: string | null;
  adresse?: string | null;
  created_at?: string;        // timestamp with time zone (ISO)
};

export type Monetaire = {
  id: number;
  unite: string | null;
  symbol: string | null;
  created_at: string;
};
export type FactureBonLivraison = {
  facture_id: number;        // bigint côté PostgreSQL
  bon_livraison_id: number;  // bigint côté PostgreSQL
};
export interface Facture {
  id: number;
  numero_facture: string | null;
  devis_id: number;
  date_facture: string;
  date_echeance: string | null;
  statut: 'brouillon' | 'envoyee' | 'payee' | 'annulee' | null;
  created_at: string;
  methode_paiement: string | null;
}
export type BonLivraison = {
  id: number;                 // bigint
  numero_bl: string | null;
  devis_id: number;
  chantier_code: string;
  receptionne: boolean;
  commentaire: string | null;
  created_at: string;  
  numero_commande: string | null;
};

export type DevisLigne = {
  type: string;
  id: number;
  materiel: string | null;
  quantite: number | null;
  prix: number | null;
  ordre: number | null;
  unite?: string | null;
};


export type Devis = {
  id: number;
  num_devis: string;
  client_devis_id: number | null;
  clients_devis: Client | null;
  contact: Contact | null;
  
  emetteur: Emetteur | any | null;
  date_devis: string | null;
  date_paye: string | null;
  kg_mo: number | null;
  ht_ttc?: 'HT' | 'TTC' | null | undefined | any;
  kg_mat: number | null;
  mois: number | null;
  annee: number | null;
  bons_livraison?: BonLivraison[] | [];
  factures?: Facture | null;
  chantiers?: Chantier | null;
  statut: "en_attente" | "en_cours"| "terminé" | "facturé" | "annule"| "payé"|"accepte";
  designation: string | null;
  lignes?: DevisLigne[];
  monetaire?: Monetaire | null;
  validity_notes?: ValidityNote[] | [];
  type_devis?: {
    id: number;
    libelle: string;
    code: string;
    created_at: string;
  } | null;
  domaines_activite?: {
    id: number;
    libelle: string;   
    code: string;};
};