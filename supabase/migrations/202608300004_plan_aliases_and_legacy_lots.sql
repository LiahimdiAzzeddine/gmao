-- Compatibilité des anciens liens et des plans historiques ciblant un lot.

begin;

create table if not exists public.plan_maintenance_aliases (
  legacy_plan_id uuid primary key,
  plan_id uuid not null references public.plans_maintenance(id) on delete cascade,
  created_at timestamptz not null default now()
);

grant select on public.plan_maintenance_aliases to authenticated, service_role;
alter table public.plan_maintenance_aliases enable row level security;

drop policy if exists plan_maintenance_aliases_authenticated_select on public.plan_maintenance_aliases;
create policy plan_maintenance_aliases_authenticated_select
  on public.plan_maintenance_aliases for select to authenticated using (true);

-- Les éventuels anciens plans par lot deviennent visibles dans le nouveau modèle.
insert into public.plan_machines (plan_id, machine_id)
select distinct plan.id, machine.id
from public.plans_maintenance plan
join public.machines machine
  on machine.lot_id = plan.lot_id
  or exists (
    select 1
    from public.postes_techniques poste
    where poste.id = machine.poste_technique_id
      and poste.lot_id = plan.lot_id
  )
where plan.lot_id is not null
on conflict (plan_id, machine_id) do nothing;

commit;

notify pgrst, 'reload schema';
