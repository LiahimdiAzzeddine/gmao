export interface Contract {
  id: number;
  nom: string;
  description?: string;
  client_id: number;
  contact_id?: number;
  chantier_code: string;
  numero_commande?: string;
  emetteur_id?: number;
  statut: 'brouillon' | 'actif' | 'suspendu' | 'termine' | 'annule';
  ht_ttc: 'HT' | 'TTC';
  created_at: string;
  updated_at: string;
  date_debut: string;
  date_fin?: string;
  forfaitaire?: number;
  montant_periode?: number;
  facturation?: 'mensuelle' | 'trimestrielle' | 'annuelle';
  
  // Relations
  client?: {
    id: number;
    client: string;
    ice?: string;
  };
  contact?: {
    num_contact: number;
    nom: string;
    adresse?: string;
    tel?: string;
    adresse_facturation?: string;
    email?: string;
  };
  chantier?: {
    code: string;
    type_devis_id: number;
  };
  emetteur?: {
    id: number;
    nom: string;
    telephone?: string;
    portable?: string;
    email?: string;
    adresse?: string;
  };
}

export interface CreateContractData {
  nom: string;
  description?: string;
  client_id: number;
  contact_id?: number;
  numero_commande?: string;
  emetteur_id?: number;
  statut: 'brouillon' | 'actif' | 'suspendu' | 'termine' | 'annule';
  ht_ttc: 'HT' | 'TTC';
  date_debut: string;
  date_fin?: string;
  forfaitaire?: number;
  montant_periode?: number;
  facturation?: 'mensuelle' | 'trimestrielle' | 'annuelle';
}

export interface UpdateContractData extends Partial<CreateContractData> {
  id: number;
}

export interface ContractFilters {
  statut?: string;
  client_id?: number;
  search?: string;
}