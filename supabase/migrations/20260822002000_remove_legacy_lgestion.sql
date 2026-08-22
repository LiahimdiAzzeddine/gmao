begin;

set local lock_timeout = '10s';
set local statement_timeout = '2min';

-- Tables enfants en premier afin de respecter toutes les clés étrangères,
-- sans utiliser CASCADE.
drop table if exists public.contract_period_correctifs;
drop table if exists public.contract_periods;
drop table if exists public.contracts;
drop table if exists public.bons_livraison;
drop table if exists public.achats;
drop table if exists public.validity_notes;
drop table if exists public.devis_lignes;
drop table if exists public.factures;
drop table if exists public.chantiers;
drop table if exists public.devis;
drop table if exists public.contacts;
drop table if exists public.travaux_compteur;
drop table if exists public.clients_devis;

drop table if exists public.config_facturation;
drop table if exists public.contrat_compteur;
drop table if exists public.domaines_activite;
drop table if exists public.emetteurs;
drop table if exists public.facture_compteur;
drop table if exists public.fournisseurs;
drop table if exists public.interlocuteurs;
drop table if exists public.monetaire;
drop table if exists public.settings;
drop table if exists public.sites_client;
drop table if exists public.type_devis;

-- Fonctions et fonctions-trigger propres à l'ancienne application Lgestion.
drop function if exists public.create_contract_periods();
drop function if exists public.generate_code_chantier_auto(bigint);
drop function if exists public.generate_code_chantier_contract(bigint, text);
drop function if exists public.generate_num_devis();
drop function if exists public.generate_numero_bl();
drop function if exists public.generate_numero_facture();
drop function if exists public.get_next_num_devis();
drop function if exists public.increment_travaux_compteur();
drop function if exists public.renew_contract(bigint);
drop function if exists public.trg_generate_chantier_code();
drop function if exists public.trg_set_code_chantier();

do $$
declare
  remaining integer;
begin
  select count(*)
  into remaining
  from information_schema.tables
  where table_schema = 'public'
    and table_name = any (array[
      'achats', 'bons_livraison', 'chantiers', 'clients_devis',
      'config_facturation', 'contacts', 'contract_period_correctifs',
      'contract_periods', 'contracts', 'contrat_compteur', 'devis',
      'devis_lignes', 'domaines_activite', 'emetteurs', 'facture_compteur',
      'factures', 'fournisseurs', 'interlocuteurs', 'monetaire', 'settings',
      'sites_client', 'travaux_compteur', 'type_devis', 'validity_notes'
    ]);

  if remaining <> 0 then
    raise exception '% table(s) Lgestion subsistent; annulation', remaining;
  end if;
end
$$;

commit;
