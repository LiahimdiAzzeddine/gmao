-- Classification normalisee des defaillances pour les plans, demandes et OT.
-- Migration additive : les anciennes colonnes texte restent disponibles.

begin;

alter table public.demande_intervention
  add column if not exists problem_lot_id uuid references public.plan_action_lots(id) on delete set null,
  add column if not exists problem_family_id uuid references public.plan_action_problem_families(id) on delete set null,
  add column if not exists failure_mode_id uuid references public.plan_action_failure_modes(id) on delete set null;

alter table public.ordres_travail
  add column if not exists demande_id uuid references public.demande_intervention(id) on delete set null,
  add column if not exists problem_lot_id uuid references public.plan_action_lots(id) on delete set null,
  add column if not exists problem_family_id uuid references public.plan_action_problem_families(id) on delete set null,
  add column if not exists failure_mode_id uuid references public.plan_action_failure_modes(id) on delete set null,
  add column if not exists classification_source text,
  add column if not exists classification_confirmed boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ordres_travail'::regclass
      and conname = 'ordres_travail_classification_source_check'
  ) then
    alter table public.ordres_travail
      add constraint ordres_travail_classification_source_check
      check (classification_source is null or classification_source in ('plan', 'demande', 'diagnostic', 'legacy'));
  end if;
end;
$$;

create table if not exists public.plan_failure_modes (
  plan_id uuid not null references public.plans_maintenance(id) on delete cascade,
  failure_mode_id uuid not null references public.plan_action_failure_modes(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (plan_id, failure_mode_id)
);

create table if not exists public.work_order_failure_modes (
  ordre_travail_id uuid not null references public.ordres_travail(id) on delete cascade,
  failure_mode_id uuid not null references public.plan_action_failure_modes(id) on delete restrict,
  source text not null default 'plan' check (source in ('plan', 'demande', 'diagnostic', 'legacy')),
  created_at timestamptz not null default now(),
  primary key (ordre_travail_id, failure_mode_id, source)
);

create index if not exists demande_intervention_problem_lot_idx on public.demande_intervention(problem_lot_id);
create index if not exists demande_intervention_problem_family_idx on public.demande_intervention(problem_family_id);
create index if not exists demande_intervention_failure_mode_idx on public.demande_intervention(failure_mode_id);
create index if not exists ordres_travail_demande_id_idx on public.ordres_travail(demande_id);
create index if not exists ordres_travail_problem_lot_idx on public.ordres_travail(problem_lot_id);
create index if not exists ordres_travail_problem_family_idx on public.ordres_travail(problem_family_id);
create index if not exists ordres_travail_failure_mode_idx on public.ordres_travail(failure_mode_id);
create index if not exists plan_failure_modes_mode_idx on public.plan_failure_modes(failure_mode_id);
create index if not exists work_order_failure_modes_mode_idx on public.work_order_failure_modes(failure_mode_id);

grant select, insert, update, delete on public.plan_failure_modes to authenticated, service_role;
grant select, insert, update, delete on public.work_order_failure_modes to authenticated, service_role;

alter table public.plan_failure_modes enable row level security;
alter table public.work_order_failure_modes enable row level security;

drop policy if exists plan_failure_modes_authenticated_select on public.plan_failure_modes;
create policy plan_failure_modes_authenticated_select
  on public.plan_failure_modes for select to authenticated using (true);
drop policy if exists plan_failure_modes_admin_insert on public.plan_failure_modes;
create policy plan_failure_modes_admin_insert
  on public.plan_failure_modes for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
drop policy if exists plan_failure_modes_admin_update on public.plan_failure_modes;
create policy plan_failure_modes_admin_update
  on public.plan_failure_modes for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
drop policy if exists plan_failure_modes_admin_delete on public.plan_failure_modes;
create policy plan_failure_modes_admin_delete
  on public.plan_failure_modes for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists work_order_failure_modes_authenticated_select on public.work_order_failure_modes;
create policy work_order_failure_modes_authenticated_select
  on public.work_order_failure_modes for select to authenticated using (true);

-- Synchronise les nouvelles cles avec les anciens champs texte de l'OT.
create or replace function public.sync_work_order_failure_classification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode_id uuid;
  v_family_id uuid;
  v_lot_id uuid;
  v_mode_name text;
  v_family_name text;
  v_lot_name text;
begin
  if new.failure_mode_id is null and nullif(btrim(new.mode_defaillance), '') is not null then
    select candidate.mode_id
    into v_mode_id
    from (
      select (array_agg(m.id order by m.id::text))[1] as mode_id, count(*) as matches
      from public.plan_action_failure_modes m
      join public.plan_action_problem_families f on f.id = m.famille_id
      join public.plan_action_lots l on l.id = f.lot_id
      where lower(btrim(m.nom)) = lower(btrim(new.mode_defaillance))
        and (nullif(btrim(new.famille_probleme), '') is null or lower(btrim(f.nom)) = lower(btrim(new.famille_probleme)))
        and (nullif(btrim(new.lot_defaillance), '') is null or lower(btrim(l.nom)) = lower(btrim(new.lot_defaillance)))
    ) candidate
    where candidate.matches = 1;
    new.failure_mode_id := v_mode_id;
    if v_mode_id is not null and new.classification_source is null then
      new.classification_source := 'legacy';
    end if;
  end if;

  if new.failure_mode_id is not null then
    select m.famille_id, f.lot_id, m.nom, f.nom, l.nom
    into v_family_id, v_lot_id, v_mode_name, v_family_name, v_lot_name
    from public.plan_action_failure_modes m
    join public.plan_action_problem_families f on f.id = m.famille_id
    join public.plan_action_lots l on l.id = f.lot_id
    where m.id = new.failure_mode_id;

    new.problem_family_id := v_family_id;
    new.problem_lot_id := v_lot_id;
    new.mode_defaillance := v_mode_name;
    new.famille_probleme := v_family_name;
    new.lot_defaillance := v_lot_name;
  elsif new.problem_family_id is not null then
    select f.lot_id, f.nom, l.nom
    into v_lot_id, v_family_name, v_lot_name
    from public.plan_action_problem_families f
    join public.plan_action_lots l on l.id = f.lot_id
    where f.id = new.problem_family_id;
    new.problem_lot_id := v_lot_id;
    new.famille_probleme := v_family_name;
    new.lot_defaillance := v_lot_name;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_work_order_failure_classification on public.ordres_travail;
create trigger sync_work_order_failure_classification
before insert or update of failure_mode_id, problem_family_id, problem_lot_id,
  mode_defaillance, famille_probleme, lot_defaillance
on public.ordres_travail
for each row execute function public.sync_work_order_failure_classification();

-- Fige sur l'OT les modes preventifs du plan et la classification corrective.
create or replace function public.snapshot_work_order_failure_modes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    delete from public.work_order_failure_modes
    where ordre_travail_id = new.id;
  end if;

  if new.plan_id is not null then
    insert into public.work_order_failure_modes (ordre_travail_id, failure_mode_id, source)
    select new.id, pfm.failure_mode_id, 'plan'
    from public.plan_failure_modes pfm
    where pfm.plan_id = new.plan_id
    on conflict (ordre_travail_id, failure_mode_id, source) do nothing;
  end if;

  if new.failure_mode_id is not null then
    insert into public.work_order_failure_modes (ordre_travail_id, failure_mode_id, source)
    values (new.id, new.failure_mode_id, coalesce(new.classification_source, 'diagnostic'))
    on conflict (ordre_travail_id, failure_mode_id, source) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists snapshot_work_order_failure_modes on public.ordres_travail;
create trigger snapshot_work_order_failure_modes
after insert or update of plan_id, failure_mode_id, classification_source,
  mode_defaillance, famille_probleme, lot_defaillance
on public.ordres_travail
for each row execute function public.snapshot_work_order_failure_modes();

-- Reprise prudente des anciennes classifications : uniquement les correspondances uniques.
update public.ordres_travail
set mode_defaillance = mode_defaillance
where failure_mode_id is null and nullif(btrim(mode_defaillance), '') is not null;

-- Retrouve le lien demande -> OT conservé jusqu'ici dans le commentaire.
update public.ordres_travail ot
set demande_id = d.id
from public.demande_intervention d
where ot.demande_id is null
  and ot.observations is not null
  and d.id = (substring(ot.observations from '(?i)demande client ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))::uuid
  and d.machine_id = ot.machine_id;

update public.demande_intervention d
set problem_lot_id = ot.problem_lot_id,
    problem_family_id = ot.problem_family_id,
    failure_mode_id = ot.failure_mode_id
from public.ordres_travail ot
where ot.demande_id = d.id
  and d.failure_mode_id is null
  and ot.failure_mode_id is not null;

-- Sauvegarde atomique d'un plan avec ses machines et modes de defaillance.
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
       select 1 from public.profiles where id = auth.uid() and role = 'admin'
     ) then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;

  if coalesce(array_length(p_machine_ids, 1), 0) = 0 then
    raise exception 'Au moins une machine doit etre associee au plan';
  end if;

  select machine_id into v_first_machine_id
  from unnest(p_machine_ids) with ordinality as selected(machine_id, position)
  order by position limit 1;

  if p_plan_id is null then
    insert into public.plans_maintenance (
      machine_id, gamme_id, type, type_recurrence, intervalle,
      forcer_jour_semaine, jour_semaine, semaine_du_mois,
      date_debut, date_fin, statut
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
    ) returning id into v_plan_id;
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

    if v_plan_id is null then raise exception 'Plan de maintenance introuvable'; end if;
  end if;

  delete from public.plan_machines
  where plan_id = v_plan_id and not (machine_id = any(p_machine_ids));
  insert into public.plan_machines (plan_id, machine_id)
  select v_plan_id, selected.machine_id from unnest(p_machine_ids) selected(machine_id)
  on conflict (plan_id, machine_id) do nothing;

  -- Les anciennes versions de l'application qui n'envoient pas cette clé
  -- ne modifient pas les modes déjà configurés.
  if p_plan ? 'failure_mode_ids' then
    delete from public.plan_failure_modes where plan_id = v_plan_id;
    insert into public.plan_failure_modes (plan_id, failure_mode_id)
    select v_plan_id, value::uuid
    from jsonb_array_elements_text(coalesce(p_plan->'failure_mode_ids', '[]'::jsonb)) selected(value)
    join public.plan_action_failure_modes mode on mode.id = selected.value::uuid
    on conflict (plan_id, failure_mode_id) do nothing;
  end if;

  return v_plan_id;
end;
$$;

revoke all on function public.save_maintenance_plan(uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.save_maintenance_plan(uuid, jsonb, uuid[]) to authenticated, service_role;

-- Conversion transactionnelle d'une demande client en OT correctif.
create or replace function public.convert_request_to_work_order(
  p_demande_id uuid,
  p_failure_mode_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_demande public.demande_intervention%rowtype;
  v_ot public.ordres_travail%rowtype;
  v_family_id uuid;
  v_lot_id uuid;
  v_priority text;
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
     and not exists (
       select 1 from public.profiles where id = auth.uid() and role = 'admin'
     ) then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;

  select * into v_demande
  from public.demande_intervention
  where id = p_demande_id
  for update;

  if not found then raise exception 'Demande introuvable' using errcode = 'P0002'; end if;
  if v_demande.statut <> 'en attente' then raise exception 'Cette demande a déjà été traitée'; end if;
  if v_demande.type_intervention <> 'corrective' then raise exception 'Seule une demande corrective peut créer cet OT'; end if;

  if p_failure_mode_id is not null then
    select f.id, l.id into v_family_id, v_lot_id
    from public.plan_action_failure_modes m
    join public.plan_action_problem_families f on f.id = m.famille_id
    join public.plan_action_lots l on l.id = f.lot_id
    where m.id = p_failure_mode_id and m.actif and f.actif and l.actif;
    if not found then raise exception 'Mode de défaillance invalide ou inactif'; end if;
  end if;

  v_priority := case
    when lower(translate(v_demande.urgence, 'éèêë', 'eeee')) = 'elevee' then 'haute'
    when lower(v_demande.urgence) = 'faible' then 'faible'
    else 'moyenne'
  end;

  insert into public.ordres_travail (
    demande_id, machine_id, type, date_programmee, statut, priorite,
    type_intervention, observations, problem_lot_id, problem_family_id,
    failure_mode_id, classification_source, classification_confirmed
  ) values (
    v_demande.id, v_demande.machine_id, 'correctif', now(), 'prévu', v_priority,
    'réparation', concat(case when nullif(v_demande.label, '') is not null then '[' || v_demande.label || '] ' else '' end,
      v_demande.description, E'\n\nCréé depuis la demande client ', v_demande.id),
    v_lot_id, v_family_id, p_failure_mode_id,
    case when p_failure_mode_id is null then null else 'demande' end,
    false
  ) returning * into v_ot;

  update public.demande_intervention
  set statut = 'validée',
      problem_lot_id = v_lot_id,
      problem_family_id = v_family_id,
      failure_mode_id = p_failure_mode_id
  where id = v_demande.id;

  return jsonb_build_object('id', v_ot.id, 'numot', v_ot.numot);
end;
$$;

revoke all on function public.convert_request_to_work_order(uuid, uuid) from public, anon;
grant execute on function public.convert_request_to_work_order(uuid, uuid) to authenticated, service_role;

create or replace view public.v_work_order_failure_classification
with (security_invoker = true)
as
select
  ot.id as ordre_travail_id,
  ot.demande_id,
  ot.plan_id,
  ot.machine_id,
  machine.client_id,
  ot.type,
  ot.date_programmee,
  relation.source,
  lot.id as problem_lot_id,
  lot.nom as lot,
  family.id as problem_family_id,
  family.nom as famille_probleme,
  mode.id as failure_mode_id,
  mode.nom as mode_defaillance
from public.ordres_travail ot
join public.machines machine on machine.id = ot.machine_id
left join public.work_order_failure_modes relation on relation.ordre_travail_id = ot.id
left join public.plan_action_failure_modes mode on mode.id = relation.failure_mode_id
left join public.plan_action_problem_families family on family.id = mode.famille_id
left join public.plan_action_lots lot on lot.id = family.lot_id;

grant select on public.v_work_order_failure_classification to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
