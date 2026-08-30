-- Normalise la relation plans de maintenance <-> machines sans perdre les donnees existantes.
-- La colonne plans_maintenance.machine_id est conservee temporairement comme colonne de compatibilite.

begin;

create table if not exists public.plan_machines (
  plan_id uuid not null references public.plans_maintenance(id) on delete cascade,
  machine_id uuid not null references public.machines(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (plan_id, machine_id)
);

create index if not exists plan_machines_machine_id_idx
  on public.plan_machines(machine_id);

create table if not exists public.plan_maintenance_aliases (
  legacy_plan_id uuid primary key,
  plan_id uuid not null references public.plans_maintenance(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.plan_machines is
  'Machines associees a un plan de maintenance partage.';
comment on column public.plans_maintenance.machine_id is
  'DEPRECATED: premiere machine conservee temporairement pour compatibilite. Utiliser plan_machines.';

-- Chaque ancien plan est d'abord associe a sa machine actuelle.
insert into public.plan_machines (plan_id, machine_id, created_at)
select id, machine_id, created_at
from public.plans_maintenance
where machine_id is not null
on conflict (plan_id, machine_id) do nothing;

-- Les plans crees par le meme INSERT groupe ont exactement le meme created_at et la
-- meme configuration. Ils peuvent donc etre regroupes sans confondre des plans crees
-- independamment. Les plans par lot ne sont pas concernes.
create temporary table plan_merge_map on commit drop as
select id as duplicate_id, canonical_id
from (
  select
    id,
    (first_value(id) over (
      partition by gamme_id, type_recurrence, intervalle, jour_semaine,
                   semaine_du_mois, forcer_jour_semaine, date_debut, date_fin,
                   statut, type, created_at
      order by id::text
    )) as canonical_id,
    count(*) over (
      partition by gamme_id, type_recurrence, intervalle, jour_semaine,
                   semaine_du_mois, forcer_jour_semaine, date_debut, date_fin,
                   statut, type, created_at
    ) as group_size
  from public.plans_maintenance
  where machine_id is not null and lot_id is null
) grouped
where group_size > 1 and id <> canonical_id;

-- Conserver les anciens identifiants afin que les liens historiques puissent être redirigés.
insert into public.plan_maintenance_aliases (legacy_plan_id, plan_id)
select duplicate_id, canonical_id
from plan_merge_map
on conflict (legacy_plan_id) do update set plan_id = excluded.plan_id;

-- Rattacher toutes les machines au plan canonique avant de rediriger les OT.
insert into public.plan_machines (plan_id, machine_id, created_at)
select map.canonical_id, pm.machine_id, pm.created_at
from plan_merge_map map
join public.plan_machines pm on pm.plan_id = map.duplicate_id
on conflict (plan_id, machine_id) do nothing;

update public.ordres_travail ot
set plan_id = map.canonical_id
from plan_merge_map map
where ot.plan_id = map.duplicate_id;

delete from public.plans_maintenance plan
using plan_merge_map map
where plan.id = map.duplicate_id;

grant select, insert, update, delete on public.plan_machines to anon, authenticated, service_role;
grant select on public.plan_maintenance_aliases to authenticated, service_role;

-- La table parent n'utilise actuellement pas RLS dans le schema deploye. Si RLS y est
-- activee plus tard, ces politiques garantissent le meme niveau d'acces authentifie.
alter table public.plan_machines enable row level security;

drop policy if exists plan_machines_authenticated_select on public.plan_machines;
create policy plan_machines_authenticated_select
  on public.plan_machines for select to authenticated using (true);

drop policy if exists plan_machines_authenticated_insert on public.plan_machines;
create policy plan_machines_authenticated_insert
  on public.plan_machines for insert to authenticated with check (true);

drop policy if exists plan_machines_authenticated_update on public.plan_machines;
create policy plan_machines_authenticated_update
  on public.plan_machines for update to authenticated using (true) with check (true);

drop policy if exists plan_machines_authenticated_delete on public.plan_machines;
create policy plan_machines_authenticated_delete
  on public.plan_machines for delete to authenticated using (true);

alter table public.plan_maintenance_aliases enable row level security;
drop policy if exists plan_maintenance_aliases_authenticated_select on public.plan_maintenance_aliases;
create policy plan_maintenance_aliases_authenticated_select
  on public.plan_maintenance_aliases for select to authenticated using (true);

commit;
