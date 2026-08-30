-- Sauvegarde atomique d'un plan et de toutes ses associations machine.

begin;

create or replace function public.save_maintenance_plan(
  p_plan_id uuid,
  p_plan jsonb,
  p_machine_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan_id uuid;
  v_first_machine_id uuid;
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
     and not exists (
       select 1
       from public.profiles
       where id = auth.uid()
         and role = 'admin'
     ) then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;

  if coalesce(array_length(p_machine_ids, 1), 0) = 0 then
    raise exception 'Au moins une machine doit etre associee au plan';
  end if;

  select machine_id
  into v_first_machine_id
  from unnest(p_machine_ids) with ordinality as selected(machine_id, position)
  order by position
  limit 1;

  if p_plan_id is null then
    insert into public.plans_maintenance (
      machine_id,
      gamme_id,
      type,
      type_recurrence,
      intervalle,
      forcer_jour_semaine,
      jour_semaine,
      semaine_du_mois,
      date_debut,
      date_fin,
      statut
    ) values (
      v_first_machine_id,
      (p_plan->>'gamme_id')::uuid,
      coalesce(p_plan->>'type', 'préventive'),
      p_plan->>'type_recurrence',
      coalesce((p_plan->>'intervalle')::integer, 1),
      coalesce((p_plan->>'forcer_jour_semaine')::boolean, false),
      nullif(p_plan->>'jour_semaine', '')::integer,
      nullif(p_plan->>'semaine_du_mois', '')::integer,
      (p_plan->>'date_debut')::date,
      nullif(p_plan->>'date_fin', '')::date,
      coalesce(p_plan->>'statut', 'actif')
    )
    returning id into v_plan_id;
  else
    update public.plans_maintenance
    set machine_id = v_first_machine_id,
        gamme_id = (p_plan->>'gamme_id')::uuid,
        type = coalesce(p_plan->>'type', 'préventive'),
        type_recurrence = p_plan->>'type_recurrence',
        intervalle = coalesce((p_plan->>'intervalle')::integer, 1),
        forcer_jour_semaine = coalesce((p_plan->>'forcer_jour_semaine')::boolean, false),
        jour_semaine = nullif(p_plan->>'jour_semaine', '')::integer,
        semaine_du_mois = nullif(p_plan->>'semaine_du_mois', '')::integer,
        date_debut = (p_plan->>'date_debut')::date,
        date_fin = nullif(p_plan->>'date_fin', '')::date,
        statut = coalesce(p_plan->>'statut', 'actif')
    where id = p_plan_id
    returning id into v_plan_id;

    if v_plan_id is null then
      raise exception 'Plan de maintenance introuvable';
    end if;
  end if;

  delete from public.plan_machines
  where plan_id = v_plan_id
    and not (machine_id = any(p_machine_ids));

  insert into public.plan_machines (plan_id, machine_id)
  select v_plan_id, selected.machine_id
  from unnest(p_machine_ids) as selected(machine_id)
  on conflict (plan_id, machine_id) do nothing;

  return v_plan_id;
end;
$$;

revoke all on function public.save_maintenance_plan(uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.save_maintenance_plan(uuid, jsonb, uuid[]) to authenticated, service_role;

commit;
