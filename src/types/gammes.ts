export interface GammeMaintenance {
  id: string;
  nom: string;
  description: string | null;
  type: 'préventive' | 'corrective';
  created_at: string;
  updated_at: string;
}

export interface EtapeGamme {
  id: string;
  gamme_id: string;
  ordre: number;
  description: string;
  duree_estimee: number | null;
  outil: string | null;
  piece: string | null;
  consigne_securite: string | null;
  created_at: string;
}

export interface GammeWithEtapes extends GammeMaintenance {
  etapes: EtapeGamme[];
}
