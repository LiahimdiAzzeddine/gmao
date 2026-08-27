-- Calendar rules attached to preventive intervention requests.
create table if not exists public.maintenance_planning (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  demande_id uuid not null references public.demande_intervention(id) on delete cascade,
  frequency text not null default 'monthly'
    check (frequency in ('monthly', 'quarterly', 'biannual', 'annual')),
  rrule text not null,
  dtstart timestamptz not null,
  until timestamptz,
  week_of_month integer check (week_of_month in (-1, 1, 2, 3, 4)),
  day_of_week text
    check (day_of_week in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  time time,
  label text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_planning_demande_id_key unique (demande_id)
);

create index if not exists maintenance_planning_machine_id_idx
  on public.maintenance_planning(machine_id);

create or replace function public.set_maintenance_planning_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_maintenance_planning_updated_at
  on public.maintenance_planning;

create trigger set_maintenance_planning_updated_at
before update on public.maintenance_planning
for each row execute function public.set_maintenance_planning_updated_at();

grant select, insert, update, delete on public.maintenance_planning to authenticated;

comment on table public.maintenance_planning is
  'Règles de planification associées aux demandes de maintenance préventive.';
