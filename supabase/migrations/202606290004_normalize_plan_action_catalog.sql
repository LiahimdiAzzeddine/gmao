-- Catalogue hierarchique : Lot -> Famille de problemes -> Mode de defaillance.
-- Les colonnes texte de ordres_travail ne sont pas modifiees : l'historique reste intact.

create table if not exists public.plan_action_lots (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (btrim(nom) <> ''),
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_action_lots_nom_unique unique (nom)
);

create table if not exists public.plan_action_problem_families (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.plan_action_lots(id) on delete cascade,
  nom text not null check (btrim(nom) <> ''),
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_action_problem_families_unique unique (lot_id, nom)
);

create table if not exists public.plan_action_failure_modes (
  id uuid primary key default gen_random_uuid(),
  famille_id uuid not null references public.plan_action_problem_families(id) on delete cascade,
  nom text not null check (btrim(nom) <> ''),
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_action_failure_modes_unique unique (famille_id, nom)
);

-- Reprise du catalogue plat, y compris les options ajoutees par les administrateurs.
insert into public.plan_action_lots (nom)
select distinct btrim(lot)
from public.plan_action_problem_options
where btrim(lot) <> ''
on conflict (nom) do nothing;

insert into public.plan_action_problem_families (lot_id, nom)
select distinct l.id, btrim(o.famille)
from public.plan_action_problem_options o
join public.plan_action_lots l on l.nom = btrim(o.lot)
where btrim(o.famille) <> ''
on conflict (lot_id, nom) do nothing;

insert into public.plan_action_failure_modes (famille_id, nom)
select distinct f.id, btrim(o.mode_defaillance)
from public.plan_action_problem_options o
join public.plan_action_lots l on l.nom = btrim(o.lot)
join public.plan_action_problem_families f
  on f.lot_id = l.id and f.nom = btrim(o.famille)
where o.mode_defaillance is not null and btrim(o.mode_defaillance) <> ''
on conflict (famille_id, nom) do nothing;

alter table public.plan_action_lots enable row level security;
alter table public.plan_action_problem_families enable row level security;
alter table public.plan_action_failure_modes enable row level security;

drop policy if exists "Authenticated users can read plan action lots" on public.plan_action_lots;
create policy "Authenticated users can read plan action lots"
  on public.plan_action_lots for select to authenticated using (true);
drop policy if exists "Authenticated users can read plan action families" on public.plan_action_problem_families;
create policy "Authenticated users can read plan action families"
  on public.plan_action_problem_families for select to authenticated using (true);
drop policy if exists "Authenticated users can read plan action failure modes" on public.plan_action_failure_modes;
create policy "Authenticated users can read plan action failure modes"
  on public.plan_action_failure_modes for select to authenticated using (true);

drop policy if exists "Admins can manage plan action lots" on public.plan_action_lots;
create policy "Admins can manage plan action lots"
  on public.plan_action_lots for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
drop policy if exists "Admins can manage plan action families" on public.plan_action_problem_families;
create policy "Admins can manage plan action families"
  on public.plan_action_problem_families for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
drop policy if exists "Admins can manage plan action failure modes" on public.plan_action_failure_modes;
create policy "Admins can manage plan action failure modes"
  on public.plan_action_failure_modes for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.set_plan_action_catalog_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_plan_action_lots_updated_at on public.plan_action_lots;
create trigger set_plan_action_lots_updated_at
before update on public.plan_action_lots
for each row execute function public.set_plan_action_catalog_updated_at();
drop trigger if exists set_plan_action_families_updated_at on public.plan_action_problem_families;
create trigger set_plan_action_families_updated_at
before update on public.plan_action_problem_families
for each row execute function public.set_plan_action_catalog_updated_at();
drop trigger if exists set_plan_action_modes_updated_at on public.plan_action_failure_modes;
create trigger set_plan_action_modes_updated_at
before update on public.plan_action_failure_modes
for each row execute function public.set_plan_action_catalog_updated_at();

notify pgrst, 'reload schema';
