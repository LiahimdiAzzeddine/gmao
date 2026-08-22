select
  c.relname as table_name,
  coalesce(s.n_live_tup, 0) as estimated_rows,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_stat_user_tables s on s.relid = c.oid
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by c.relname;

select
  conrelid::regclass::text as source_table,
  confrelid::regclass::text as referenced_table,
  conname as constraint_name
from pg_constraint
where contype = 'f'
  and (
    connamespace = 'public'::regnamespace
    or conrelid in (
      select c.oid
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
    )
  )
order by source_table, referenced_table;

select schemaname, viewname, definition
from pg_views
where schemaname = 'public'
order by viewname;

select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind in ('f', 'p')
  and pg_get_functiondef(p.oid) ~* '(achats|bons_livraison|chantiers|clients_devis|config_facturation|contacts|contract_periods?|contracts|contrat_compteur|devis|domaines_activite|emetteurs|facture_compteur|factures|fournisseurs|interlocuteurs|monetaire|settings|sites_client|travaux_compteur|type_devis|validity_notes)'
order by p.proname;
