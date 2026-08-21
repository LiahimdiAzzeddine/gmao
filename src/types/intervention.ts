export interface Material {
  designation: string;
  quantity: number;
  order_number: string;
  line: string;
  expenses: string;
  isolation: string;
  unit_price: number;
}

export interface Technician {
  name: string;
  ho_hours: number;
  regular_hours: number;
  night_hours: number;
  sunday_hours: number;
  travel_hours: number;
}

export interface ClientValidation {
  date: string;
  name: string;
  address: string;
  phone: string;
}

export interface MaintenanceData {
  id: string;
  intervention_number: string;
  installation_number: string;
  site_number: string;
  team_number: string;
  requested_by: string;
  quote_number: string;
  work_location: string;
  intervention_type: string;
  type_action:any;
  status: string;
  created_at: string;
  image_avant_url:any;
  image_apres_url:any;
  machine: {
    nom: string;
    modele: string;
    localisation: string;
    id:string;
  };
  client: {
    raison_sociale: string;
    adresse: string;
    telephone: string;
  };
  technicians: Technician[];
  materials: Material[];
  work_description: string;
  client_validation: ClientValidation;
}
