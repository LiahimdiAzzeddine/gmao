-- ============================================================================
-- NETTOYAGE DE L'ANCIENNE BASE SUPABASE
-- Suppression du domaine Gestion, conservation du domaine GMO
-- ============================================================================
-- IMPORTANT
-- 1. Exécuter uniquement sur l'ANCIEN projet Supabase partagé GMO + Gestion.
-- 2. Faire une sauvegarde avant l'exécution.
-- 3. Valider complètement la nouvelle application Gestion avant l'exécution.
-- 4. Le script conserve public.profiles et auth.users, partagés avec GMO.
-- 5. Le script n'utilise pas CASCADE : une dépendance inconnue provoquera une
--    erreur et annulera toute la transaction au lieu de supprimer davantage.

BEGIN;

-- Barrière de sécurité : la nouvelle base Gestion ne contient pas ces tables.
DO $safety$
BEGIN
  IF to_regclass('public.machines') IS NULL
     OR to_regclass('public.ordres_travail') IS NULL
     OR to_regclass('public.interventions') IS NULL
  THEN
    RAISE EXCEPTION
      'ARRÊT : cette base ne ressemble pas à l’ancienne base GMO + Gestion.';
  END IF;

  IF to_regclass('public.devis') IS NULL
     OR to_regclass('public.contracts') IS NULL
     OR to_regclass('public.clients_devis') IS NULL
  THEN
    RAISE EXCEPTION
      'ARRÊT : les tables Gestion attendues ne sont pas présentes.';
  END IF;
END;
$safety$;

-- --------------------------------------------------------------------------
-- 1. Suppression explicite des triggers Gestion
-- --------------------------------------------------------------------------

DROP TRIGGER IF EXISTS before_insert_update_achats
  ON public.achats;

DROP TRIGGER IF EXISTS trg_generate_numero_bl
  ON public.bons_livraison;

DROP TRIGGER IF EXISTS before_insert_chantiers_code
  ON public.chantiers;

DROP TRIGGER IF EXISTS trg_increment_travaux_compteur
  ON public.chantiers;

DROP TRIGGER IF EXISTS before_insert_contract
  ON public.contracts;

DROP TRIGGER IF EXISTS trg_create_contract_periods
  ON public.contracts;

DROP TRIGGER IF EXISTS trg_set_date_paye
  ON public.devis;

DROP TRIGGER IF EXISTS trg_generate_numero_facture
  ON public.factures;

-- --------------------------------------------------------------------------
-- 2. Suppression des fonctions Gestion
-- --------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_next_num_devis();
DROP FUNCTION IF EXISTS public.renew_contract(bigint);
DROP FUNCTION IF EXISTS public.create_contract_periods();
DROP FUNCTION IF EXISTS public.generate_numero_bl();
DROP FUNCTION IF EXISTS public.generate_numero_facture();
DROP FUNCTION IF EXISTS public.increment_travaux_compteur();
DROP FUNCTION IF EXISTS public.set_date_paye();
DROP FUNCTION IF EXISTS public.trg_calculate_total_ht_achat();
DROP FUNCTION IF EXISTS public.trg_generate_chantier_code();
DROP FUNCTION IF EXISTS public.trg_set_code_chantier();
DROP FUNCTION IF EXISTS public.generate_code_chantier_auto(bigint);
DROP FUNCTION IF EXISTS public.generate_code_chantier_contract(bigint, text);

-- --------------------------------------------------------------------------
-- 3. Suppression des tables, des enfants vers les parents
-- --------------------------------------------------------------------------

DROP TABLE IF EXISTS public.contract_period_correctifs;
DROP TABLE IF EXISTS public.contract_periods;
DROP TABLE IF EXISTS public.contracts;
DROP TABLE IF EXISTS public.contrat_compteur;

DROP TABLE IF EXISTS public.bons_livraison;
DROP TABLE IF EXISTS public.factures;
DROP TABLE IF EXISTS public.facture_compteur;
DROP TABLE IF EXISTS public.config_facturation;

DROP TABLE IF EXISTS public.achats;
DROP TABLE IF EXISTS public.chantiers;

DROP TABLE IF EXISTS public.validity_notes;
DROP TABLE IF EXISTS public.devis_lignes;
DROP TABLE IF EXISTS public.devis;
DROP TABLE IF EXISTS public.travaux_compteur;

DROP TABLE IF EXISTS public.contacts;
DROP TABLE IF EXISTS public.clients_devis;
DROP TABLE IF EXISTS public.sites_client;

DROP TABLE IF EXISTS public.interlocuteurs;
DROP TABLE IF EXISTS public.emetteurs;
DROP TABLE IF EXISTS public.fournisseurs;
DROP TABLE IF EXISTS public.monetaire;
DROP TABLE IF EXISTS public.type_devis;
DROP TABLE IF EXISTS public.domaines_activite;
DROP TABLE IF EXISTS public.settings;

-- --------------------------------------------------------------------------
-- 4. Suppression des séquences et du type utilisés uniquement par Gestion
-- --------------------------------------------------------------------------

DROP SEQUENCE IF EXISTS public.type_devis_id_seq;
DROP SEQUENCE IF EXISTS public.domaines_activite_id_seq;
DROP SEQUENCE IF EXISTS public.travaux_compteur_id_seq;

DROP TYPE IF EXISTS public.ht_ttc_enum;

-- --------------------------------------------------------------------------
-- 5. Contrôles avant validation
-- --------------------------------------------------------------------------

DO $verification$
BEGIN
  IF to_regclass('public.devis') IS NOT NULL
     OR to_regclass('public.contracts') IS NOT NULL
     OR to_regclass('public.clients_devis') IS NOT NULL
  THEN
    RAISE EXCEPTION
      'ÉCHEC : certaines tables Gestion existent encore. Transaction annulée.';
  END IF;

  IF to_regclass('public.machines') IS NULL
     OR to_regclass('public.ordres_travail') IS NULL
     OR to_regclass('public.interventions') IS NULL
     OR to_regclass('public.profiles') IS NULL
  THEN
    RAISE EXCEPTION
      'ÉCHEC : un objet GMO partagé a disparu. Transaction annulée.';
  END IF;
END;
$verification$;

COMMIT;

-- Contrôle facultatif après exécution : doit retourner uniquement des objets GMO.
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
