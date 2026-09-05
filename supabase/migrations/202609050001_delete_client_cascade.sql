-- Suppression definitive et atomique d'un client GMAO et de ses donnees metier.
-- L'appel est reserve au service_role et exige l'identifiant d'un administrateur.

begin;

create or replace function public.delete_client_cascade(
  p_client_id uuid,
  p_admin_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile_id uuid;
  v_machine_ids uuid[] := array[]::uuid[];
  v_plan_ids uuid[] := array[]::uuid[];
  v_exclusive_plan_ids uuid[] := array[]::uuid[];
  v_work_order_ids uuid[] := array[]::uuid[];
  v_intervention_ids uuid[] := array[]::uuid[];
  v_storage_urls text[] := array[]::text[];
  v_demande_count integer := 0;
  v_planning_count integer := 0;
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_admin_id and role = 'admin'
  ) then
    raise exception using
      errcode = '42501',
      message = 'Action reservee aux administrateurs';
  end if;

  select profile_id
  into v_profile_id
  from public.clients
  where id = p_client_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Client introuvable';
  end if;

  select coalesce(array_agg(id), array[]::uuid[])
  into v_machine_ids
  from public.machines
  where client_id = p_client_id;

  select coalesce(array_agg(distinct linked.plan_id), array[]::uuid[])
  into v_plan_ids
  from (
    select id as plan_id
    from public.plans_maintenance
    where machine_id = any(v_machine_ids)
    union
    select plan_id
    from public.plan_machines
    where machine_id = any(v_machine_ids)
  ) linked;

  -- Un plan est supprime uniquement s'il ne concerne aucune machine externe
  -- au client. Les associations d'un plan partage sont simplement detachees.
  select coalesce(array_agg(p.id), array[]::uuid[])
  into v_exclusive_plan_ids
  from public.plans_maintenance p
  where p.id = any(v_plan_ids)
    and (p.machine_id is null or p.machine_id = any(v_machine_ids))
    and not exists (
      select 1
      from public.plan_machines pm
      where pm.plan_id = p.id
        and not (pm.machine_id = any(v_machine_ids))
    );

  select coalesce(array_agg(id), array[]::uuid[])
  into v_work_order_ids
  from public.ordres_travail
  where machine_id = any(v_machine_ids)
     or plan_id = any(v_exclusive_plan_ids);

  select coalesce(array_agg(id), array[]::uuid[])
  into v_intervention_ids
  from public.interventions
  where machine_id = any(v_machine_ids)
     or ordre_travail_id = any(v_work_order_ids);

  select count(*) into v_demande_count
  from public.demande_intervention
  where machine_id = any(v_machine_ids);

  select count(*) into v_planning_count
  from public.maintenance_planning
  where machine_id = any(v_machine_ids)
     or demande_id in (
       select id from public.demande_intervention where machine_id = any(v_machine_ids)
     );

  -- Les URL sont retournees a l'Edge Function pour nettoyer Storage apres le commit.
  select coalesce(array_agg(distinct item.url) filter (where item.url is not null and btrim(item.url) <> ''), array[]::text[])
  into v_storage_urls
  from (
    select logo_url as url from public.clients where id = p_client_id
    union all
    select image_url from public.machines where id = any(v_machine_ids)
    union all
    select manuel_url from public.machines where id = any(v_machine_ids)
    union all
    select unnest(coalesce(image_avant_urls, array[]::text[]))
      from public.interventions where id = any(v_intervention_ids)
    union all
    select unnest(coalesce(image_apres_urls, array[]::text[]))
      from public.interventions where id = any(v_intervention_ids)
  ) item;

  -- Eviter que la colonne historique machine_id supprime un plan encore partage.
  update public.plans_maintenance p
  set machine_id = (
    select pm.machine_id
    from public.plan_machines pm
    where pm.plan_id = p.id
      and not (pm.machine_id = any(v_machine_ids))
    order by pm.created_at, pm.machine_id
    limit 1
  )
  where p.id = any(v_plan_ids)
    and p.machine_id = any(v_machine_ids)
    and not (p.id = any(v_exclusive_plan_ids));

  delete from public.interventions
  where id = any(v_intervention_ids);

  delete from public.ordres_travail
  where id = any(v_work_order_ids);

  delete from public.plans_maintenance
  where id = any(v_exclusive_plan_ids);

  delete from public.machines
  where id = any(v_machine_ids);

  delete from public.clients
  where id = p_client_id;

  -- Supprime aussi identities, sessions et profil via les contraintes Auth.
  if v_profile_id is not null then
    delete from auth.users where id = v_profile_id;
  end if;

  return jsonb_build_object(
    'clientId', p_client_id,
    'profileId', v_profile_id,
    'storageUrls', to_jsonb(v_storage_urls),
    'deleted', jsonb_build_object(
      'machines', cardinality(v_machine_ids),
      'plans', cardinality(v_exclusive_plan_ids),
      'workOrders', cardinality(v_work_order_ids),
      'interventions', cardinality(v_intervention_ids),
      'requests', v_demande_count,
      'planningRules', v_planning_count
    )
  );
end;
$$;

revoke all on function public.delete_client_cascade(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_client_cascade(uuid, uuid) to service_role;

commit;
