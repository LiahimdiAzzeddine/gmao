select
  p.proname as legacy_function,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind in ('f', 'p')
  and p.proname = any (array[
    'create_contract_periods',
    'generate_code_chantier_auto',
    'generate_code_chantier_contract',
    'generate_num_devis',
    'generate_numero_bl',
    'generate_numero_facture',
    'get_next_num_devis',
    'increment_travaux_compteur',
    'renew_contract',
    'trg_generate_chantier_code',
    'trg_set_code_chantier'
  ]);

select
  event_object_table,
  trigger_name
from information_schema.triggers
where trigger_schema = 'public'
  and (
    event_object_table = any (array[
      'achats', 'bons_livraison', 'chantiers', 'clients_devis',
      'config_facturation', 'contacts', 'contract_period_correctifs',
      'contract_periods', 'contracts', 'contrat_compteur', 'devis',
      'devis_lignes', 'domaines_activite', 'emetteurs', 'facture_compteur',
      'factures', 'fournisseurs', 'interlocuteurs', 'monetaire', 'settings',
      'sites_client', 'travaux_compteur', 'type_devis', 'validity_notes'
    ])
    or trigger_name ~* '(devis|chantier|contract|facture|livraison|travaux)'
  )
order by event_object_table, trigger_name;
