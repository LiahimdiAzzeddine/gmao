-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.achats (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  chantier_code text NOT NULL,
  fournisseur_id bigint,
  date_achat date DEFAULT CURRENT_DATE,
  designation text,

  total_ht numeric NOT NULL,
  reference text,
  statut text DEFAULT 'brouillon'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  methode_paiement text,
  fournisseur_libre text,
  type_depense character varying NOT NULL DEFAULT 'fourniture'::character varying CHECK (type_depense::text = ANY (ARRAY['fourniture'::character varying, 'transport'::character varying, 'main_oeuvre'::character varying, 'transit'::character varying]::text[])),
  CONSTRAINT achats_pkey PRIMARY KEY (id),
  CONSTRAINT fk_achats_chantier FOREIGN KEY (chantier_code) REFERENCES public.chantiers(code),
  CONSTRAINT fk_achats_fournisseur FOREIGN KEY (fournisseur_id) REFERENCES public.fournisseurs(id)
);
CREATE TABLE public.bons_livraison (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  numero_bl text UNIQUE,
  devis_id bigint NOT NULL,
  chantier_code text NOT NULL,
  receptionne boolean DEFAULT false,
  commentaire text,
  created_at timestamp with time zone DEFAULT now(),
  numero_commande text,
  CONSTRAINT bons_livraison_pkey PRIMARY KEY (id),
  CONSTRAINT bons_livraison_devis_id_fkey FOREIGN KEY (devis_id) REFERENCES public.devis(id),
  CONSTRAINT bons_livraison_chantier_code_fkey FOREIGN KEY (chantier_code) REFERENCES public.chantiers(code)
);
CREATE TABLE public.chantiers (
  code text NOT NULL,
  chantier text,
  created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  devis_id bigint UNIQUE,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  type_devis_id integer NOT NULL DEFAULT 1,
  CONSTRAINT chantiers_pkey PRIMARY KEY (code),
  CONSTRAINT chantiers_type_devis_fkey FOREIGN KEY (type_devis_id) REFERENCES public.type_devis(id),
  CONSTRAINT chantiers_devis_fkey FOREIGN KEY (devis_id) REFERENCES public.devis(id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prenom text,
  cin text,
  telephone text,
  adresse text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  raison_sociale text,
  logo_url text,
  profile_id uuid UNIQUE,
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.clients_devis (
  client text,
  ice text,
  created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  numero_fournisseur text,
  site_code integer,
  CONSTRAINT clients_devis_pkey PRIMARY KEY (id),
  CONSTRAINT clients_devis_site_code_fkey FOREIGN KEY (site_code) REFERENCES public.sites_client(code)
);
CREATE TABLE public.config_facturation (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  annee_reference integer NOT NULL,
  CONSTRAINT config_facturation_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contacts (
  num_contact bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nom text,
  adresse text,
  tel text,
  adresse_facturation text,
  created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  client_id bigint NOT NULL,
  email text,
  CONSTRAINT contacts_pkey PRIMARY KEY (num_contact),
  CONSTRAINT contacts_client_fk FOREIGN KEY (client_id) REFERENCES public.clients_devis(id)
);
CREATE TABLE public.contract_period_correctifs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  contract_period_id bigint NOT NULL,
  description text NOT NULL,
  prix_unitaire numeric NOT NULL,
  quantite numeric NOT NULL DEFAULT 1,
  total numeric DEFAULT (prix_unitaire * quantite),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contract_period_correctifs_pkey PRIMARY KEY (id),
  CONSTRAINT correctifs_period_fkey FOREIGN KEY (contract_period_id) REFERENCES public.contract_periods(id)
);
CREATE TABLE public.contract_periods (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  contract_id bigint NOT NULL,
  periode_debut date NOT NULL,
  periode_fin date NOT NULL,
  montant numeric NOT NULL,
  statut text DEFAULT 'en_attente'::text CHECK (statut = ANY (ARRAY['en_attente'::text, 'payee'::text, 'annulee'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  payment_mode text DEFAULT 'virement'::text,
  facture_id bigint,
  CONSTRAINT contract_periods_pkey PRIMARY KEY (id),
  CONSTRAINT contract_periods_facture_fkey FOREIGN KEY (facture_id) REFERENCES public.factures(id),
  CONSTRAINT contract_periods_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id)
);
CREATE TABLE public.contracts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nom text NOT NULL,
  description text,
  client_id bigint NOT NULL,
  chantier_code text NOT NULL,
  statut text NOT NULL CHECK (statut = ANY (ARRAY['brouillon'::text, 'actif'::text, 'suspendu'::text, 'termine'::text, 'annule'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  date_debut date NOT NULL,
  date_fin date,
  forfaitaire numeric,
  montant_periode numeric,
  facturation text CHECK (facturation = ANY (ARRAY['mensuelle'::text, 'trimestrielle'::text, 'annuelle'::text])),
  emetteur_id bigint,
  contact_id bigint,
  numero_commande text,
  ht_ttc USER-DEFINED NOT NULL DEFAULT 'HT'::ht_ttc_enum,
  CONSTRAINT contracts_pkey PRIMARY KEY (id),
  CONSTRAINT contracts_client_fkey FOREIGN KEY (client_id) REFERENCES public.clients_devis(id),
  CONSTRAINT contracts_chantier_fkey FOREIGN KEY (chantier_code) REFERENCES public.chantiers(code),
  CONSTRAINT contracts_emetteur_fkey FOREIGN KEY (emetteur_id) REFERENCES public.emetteurs(id),
  CONSTRAINT contracts_contact_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(num_contact)
);
CREATE TABLE public.contrat_compteur (
  client_id bigint NOT NULL,
  nombre_contrats integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contrat_compteur_pkey PRIMARY KEY (client_id)
);
CREATE TABLE public.devis (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  num_devis text NOT NULL UNIQUE,
  designation text,
  statut text CHECK (statut = ANY (ARRAY['en_attente'::text, 'en_cours'::text, 'accepte'::text, 'facturé'::text, 'terminé'::text, 'payé'::text, 'annule'::text])),
  client_devis_id bigint NOT NULL,
  interlocuteur_id bigint,
  emetteur_id bigint,
  kg_mat double precision,
  kg_mo double precision,
  mois integer,
  annee integer,
  date_devis timestamp with time zone,
  contact_num bigint,
  monetaire_id bigint NOT NULL,
  ht_ttc USER-DEFINED DEFAULT 'HT'::ht_ttc_enum,
  type_devis_id integer NOT NULL,
  domaine_id integer NOT NULL,
  date_paye timestamp with time zone,
  CONSTRAINT devis_pkey PRIMARY KEY (id),
  CONSTRAINT devis_client_devis_id_fkey FOREIGN KEY (client_devis_id) REFERENCES public.clients_devis(id),
  CONSTRAINT devis_interlocuteur_id_fkey FOREIGN KEY (interlocuteur_id) REFERENCES public.interlocuteurs(id),
  CONSTRAINT devis_emetteur_id_fkey FOREIGN KEY (emetteur_id) REFERENCES public.emetteurs(id),
  CONSTRAINT devis_contact_fkey FOREIGN KEY (contact_num) REFERENCES public.contacts(num_contact),
  CONSTRAINT devis_monetaire_fkey FOREIGN KEY (monetaire_id) REFERENCES public.monetaire(id),
  CONSTRAINT devis_type_devis_fkey FOREIGN KEY (type_devis_id) REFERENCES public.type_devis(id),
  CONSTRAINT devis_domaine_fkey FOREIGN KEY (domaine_id) REFERENCES public.domaines_activite(id)
);
CREATE TABLE public.devis_lignes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  devis_id bigint,
  materiel text,
  quantite bigint,
  prix numeric,
  ordre integer,
  type text,
  unite text,
  CONSTRAINT devis_lignes_pkey PRIMARY KEY (id),
  CONSTRAINT devis_lignes_devis_fk FOREIGN KEY (devis_id) REFERENCES public.devis(id)
);
CREATE TABLE public.domaines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  libelle text NOT NULL CHECK (libelle = ANY (ARRAY['fluide'::text, 'patrimoine'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT domaines_pkey PRIMARY KEY (id)
);
CREATE TABLE public.domaines_activite (
  id integer NOT NULL DEFAULT nextval('domaines_activite_id_seq'::regclass),
  code text NOT NULL UNIQUE,
  libelle text NOT NULL,
  CONSTRAINT domaines_activite_pkey PRIMARY KEY (id)
);
CREATE TABLE public.emetteurs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nom text,
  telephone text,
  portable text,
  email text,
  adresse text,
  created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  CONSTRAINT emetteurs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.etapes_gamme (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gamme_id uuid NOT NULL,
  ordre integer NOT NULL,
  description text NOT NULL,
  duree_estimee integer,
  outil character varying,
  piece character varying,
  consigne_securite text,
  CONSTRAINT etapes_gamme_pkey PRIMARY KEY (id),
  CONSTRAINT etapes_gamme_gamme_id_fkey FOREIGN KEY (gamme_id) REFERENCES public.gammes_maintenance(id)
);
CREATE TABLE public.facture_compteur (
  annee_offset integer NOT NULL,
  last_value integer NOT NULL,
  CONSTRAINT facture_compteur_pkey PRIMARY KEY (annee_offset)
);
CREATE TABLE public.factures (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  numero_facture text UNIQUE,
  devis_id bigint,
  date_facture date NOT NULL,
  date_echeance date,
  statut text CHECK (statut = ANY (ARRAY['brouillon'::text, 'envoyee'::text, 'payee'::text, 'annulee'::text])),
  created_at timestamp with time zone DEFAULT now(),
  methode_paiement text,
  CONSTRAINT factures_pkey PRIMARY KEY (id),
  CONSTRAINT factures_devis_id_fkey FOREIGN KEY (devis_id) REFERENCES public.devis(id)
);
CREATE TABLE public.fournisseurs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  societe text,
  interlocuteur text,
  adresse text,
  tel text,
  fax text,
  created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  CONSTRAINT fournisseurs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.gammes_maintenance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nom character varying NOT NULL,
  description text,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['préventive'::character varying, 'corrective'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gammes_maintenance_pkey PRIMARY KEY (id)
);
CREATE TABLE public.interlocuteurs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  interlocuteur text,
  created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  CONSTRAINT interlocuteurs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.interventions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ordre_travail_id uuid NOT NULL,
  machine_id uuid NOT NULL,
  technicien_id uuid NOT NULL,
  date_debut timestamp with time zone NOT NULL,
  date_fin timestamp with time zone,
  duree_minutes integer DEFAULT 
CASE
    WHEN (date_fin IS NOT NULL) THEN (EXTRACT(epoch FROM (date_fin - date_debut)) / (60)::numeric)
    ELSE NULL::numeric
END,
  actions_realisees text NOT NULL,
  resultat text CHECK (resultat = ANY (ARRAY['réussi'::text, 'partiel'::text, 'échec'::text])),
  etat_machine_apres text CHECK (etat_machine_apres = ANY (ARRAY['opérationnel'::text, 'dégradé'::text, 'hors_service'::text])),
  pieces_remplacees jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(pieces_remplacees) = 'array'::text),
  etapes_gamme_checkees jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(etapes_gamme_checkees) = 'array'::text),
  image_avant_urls ARRAY NOT NULL DEFAULT '{}'::text[],
  image_apres_urls ARRAY NOT NULL DEFAULT '{}'::text[],
  commentaire text,
  valide boolean NOT NULL DEFAULT false,
  valide_par uuid,
  valide_le timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT interventions_pkey PRIMARY KEY (id),
  CONSTRAINT interventions_ot_fkey FOREIGN KEY (ordre_travail_id) REFERENCES public.ordres_travail(id),
  CONSTRAINT interventions_machine_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id),
  CONSTRAINT interventions_technicien_fkey FOREIGN KEY (technicien_id) REFERENCES public.profiles(id),
  CONSTRAINT interventions_valide_par_fkey FOREIGN KEY (valide_par) REFERENCES public.profiles(id)
);
CREATE TABLE public.lots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  description text,
  created_at timestamp without time zone DEFAULT now(),
  code text NOT NULL UNIQUE,
  CONSTRAINT lots_pkey PRIMARY KEY (id)
);
CREATE TABLE public.machines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  machine_id text UNIQUE,
  nom text NOT NULL,
  modele text NOT NULL,
  numero_serie text NOT NULL,
  annee integer NOT NULL,
  fabricant text NOT NULL,
  localisation text,
  etat text NOT NULL DEFAULT 'opérationnel'::text,
  puissance text,
  tension text,
  manuel_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  client_id uuid,
  qte integer,
  lot_id uuid,
  poste_technique_id uuid NOT NULL,
  CONSTRAINT machines_pkey PRIMARY KEY (id),
  CONSTRAINT machines_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT machines_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id),
  CONSTRAINT machines_poste_technique_id_fkey FOREIGN KEY (poste_technique_id) REFERENCES public.postes_techniques(id)
);
CREATE TABLE public.monetaire (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  unite text,
  created_at timestamp with time zone DEFAULT now(),
  symbol text,
  CONSTRAINT monetaire_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ordres_travail (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_id uuid,
  technicien_id uuid,
  date_programmee timestamp without time zone,
  date_execution timestamp without time zone,
  statut character varying DEFAULT 'prévu'::character varying CHECK (statut::text = ANY (ARRAY['prévu'::character varying, 'en_cours'::character varying, 'terminé'::character varying, 'annulé'::character varying]::text[])),
  observations text,
  created_at timestamp with time zone DEFAULT now(),
  numot integer,
  type character varying NOT NULL DEFAULT 'préventif'::character varying CHECK (type::text = ANY (ARRAY['préventif'::character varying, 'correctif'::character varying, 'curatif'::character varying]::text[])),
  machine_id uuid NOT NULL,
  priorite character varying DEFAULT 'moyenne'::character varying CHECK (priorite::text = ANY (ARRAY['faible'::character varying, 'moyenne'::character varying, 'haute'::character varying, 'critique'::character varying]::text[])),
  cause text,
  ot_parent_id uuid,
  type_intervention text,
  CONSTRAINT ordres_travail_pkey PRIMARY KEY (id),
  CONSTRAINT ordres_travail_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans_maintenance(id),
  CONSTRAINT ordres_travail_technicien_id_fkey FOREIGN KEY (technicien_id) REFERENCES public.profiles(id),
  CONSTRAINT ordres_travail_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id),
  CONSTRAINT ordres_travail_ot_parent_fkey FOREIGN KEY (ot_parent_id) REFERENCES public.ordres_travail(id)
);
CREATE TABLE public.plans_maintenance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  machine_id uuid,
  lot_id uuid,
  gamme_id uuid,
  type_recurrence character varying CHECK (type_recurrence::text = ANY (ARRAY['journalière'::character varying, 'hebdomadaire'::character varying, 'mensuelle'::character varying, 'annuelle'::character varying]::text[])),
  intervalle integer DEFAULT 1 CHECK (intervalle >= 1),
  jour_semaine integer CHECK (jour_semaine >= 0 AND jour_semaine <= 6),
  semaine_du_mois integer CHECK (semaine_du_mois >= 1 AND semaine_du_mois <= 5),
  forcer_jour_semaine boolean NOT NULL DEFAULT false,
  date_debut date NOT NULL,
  date_fin date,
  statut character varying NOT NULL DEFAULT 'actif'::character varying CHECK (statut::text = ANY (ARRAY['actif'::character varying, 'inactif'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  type character varying NOT NULL DEFAULT 'préventive'::character varying CHECK (type::text = ANY (ARRAY['préventive'::character varying, 'corrective'::character varying]::text[])),
  numero bigint NOT NULL DEFAULT nextval('plans_maintenance_numero_seq'::regclass),
  CONSTRAINT plans_maintenance_pkey PRIMARY KEY (id),
  CONSTRAINT plans_maintenance_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id),
  CONSTRAINT plans_maintenance_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id),
  CONSTRAINT plans_maintenance_gamme_id_fkey FOREIGN KEY (gamme_id) REFERENCES public.gammes_maintenance(id)
);
CREATE TABLE public.postes_techniques (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  domaine_id uuid NOT NULL,
  lot_id uuid NOT NULL,
  code_pt text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  secteur_id uuid,
  batiment text NOT NULL,
  CONSTRAINT postes_techniques_pkey PRIMARY KEY (id),
  CONSTRAINT postes_techniques_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id),
  CONSTRAINT postes_techniques_domaine_id_fkey FOREIGN KEY (domaine_id) REFERENCES public.domaines(id),
  CONSTRAINT postes_techniques_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id),
  CONSTRAINT postes_techniques_secteur_id_fkey FOREIGN KEY (secteur_id) REFERENCES public.secteurs(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  nom text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['technicien'::text, 'consultant'::text, 'admin'::text])),
  created_at timestamp with time zone DEFAULT now(),
  email text,
  password text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.secteurs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  libelle text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  domaine_id uuid,
  CONSTRAINT secteurs_pkey PRIMARY KEY (id),
  CONSTRAINT fk_secteurs_domaines FOREIGN KEY (domaine_id) REFERENCES public.domaines(id)
);
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  data jsonb,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  nom text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sites_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sites_client (
  code integer NOT NULL,
  libelle text NOT NULL,
  CONSTRAINT sites_client_pkey PRIMARY KEY (code)
);
CREATE TABLE public.travaux_compteur (
  id bigint NOT NULL DEFAULT nextval('travaux_compteur_id_seq'::regclass),
  client_id bigint NOT NULL UNIQUE,
  nombre_travaux integer NOT NULL DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT travaux_compteur_pkey PRIMARY KEY (id),
  CONSTRAINT travaux_compteur_client_fk FOREIGN KEY (client_id) REFERENCES public.clients_devis(id)
);
CREATE TABLE public.type_devis (
  id integer NOT NULL DEFAULT nextval('type_devis_id_seq'::regclass),
  libelle text NOT NULL UNIQUE,
  code text UNIQUE,
  CONSTRAINT type_devis_pkey PRIMARY KEY (id)
);
CREATE TABLE public.validity_notes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  devis_id bigint NOT NULL,
  contenu text NOT NULL,
  ordre integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT validity_notes_pkey PRIMARY KEY (id),
  CONSTRAINT validity_notes_devis_fkey FOREIGN KEY (devis_id) REFERENCES public.devis(id)
);