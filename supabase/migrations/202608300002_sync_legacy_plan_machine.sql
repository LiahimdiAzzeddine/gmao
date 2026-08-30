-- Compatibilite avec les anciennes versions du frontend qui renseignent encore
-- plans_maintenance.machine_id directement.

begin;

create or replace function public.sync_legacy_plan_machine()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.machine_id is not null then
    insert into public.plan_machines (plan_id, machine_id)
    values (new.id, new.machine_id)
    on conflict (plan_id, machine_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_legacy_plan_machine_trigger on public.plans_maintenance;
create trigger sync_legacy_plan_machine_trigger
after insert or update of machine_id on public.plans_maintenance
for each row execute function public.sync_legacy_plan_machine();

-- Reparation idempotente au cas ou des lignes auraient ete creees entre les deux migrations.
insert into public.plan_machines (plan_id, machine_id, created_at)
select id, machine_id, created_at
from public.plans_maintenance
where machine_id is not null
on conflict (plan_id, machine_id) do nothing;

commit;
