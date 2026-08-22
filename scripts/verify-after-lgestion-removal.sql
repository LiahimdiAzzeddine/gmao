select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;

select 'clients' as object_name, count(*) as row_count from public.clients
union all select 'machines', count(*) from public.machines
union all select 'interventions', count(*) from public.interventions
union all select 'ordres_travail', count(*) from public.ordres_travail
union all select 'plans_maintenance', count(*) from public.plans_maintenance
union all select 'profiles', count(*) from public.profiles
union all select 'storage.objects', count(*) from storage.objects;
