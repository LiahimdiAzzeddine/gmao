select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind in ('f', 'p')
  and pg_get_functiondef(p.oid) ~* '(achats|bons_livraison|chantiers|clients_devis|config_facturation|contacts|contract_periods?|contracts|contrat_compteur|devis|domaines_activite|emetteurs|facture_compteur|factures|fournisseurs|interlocuteurs|monetaire|settings|sites_client|travaux_compteur|type_devis|validity_notes)'
order by p.proname;
