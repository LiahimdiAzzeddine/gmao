create extension if not exists pgcrypto;

create table if not exists public.plan_action_problem_options (
  id uuid primary key default gen_random_uuid(),
  lot text not null check (btrim(lot) <> ''),
  famille text not null check (btrim(famille) <> ''),
  mode_defaillance text check (mode_defaillance is null or btrim(mode_defaillance) <> ''),
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create unique index if not exists plan_action_problem_options_family_unique
  on public.plan_action_problem_options (lot, famille)
  where mode_defaillance is null;

create unique index if not exists plan_action_problem_options_mode_unique
  on public.plan_action_problem_options (lot, famille, mode_defaillance)
  where mode_defaillance is not null;

alter table public.plan_action_problem_options enable row level security;

create policy "Authenticated users can read plan action options"
  on public.plan_action_problem_options for select
  to authenticated
  using (true);

create policy "Admins can insert plan action options"
  on public.plan_action_problem_options for insert
  to authenticated
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

create policy "Admins can update plan action options"
  on public.plan_action_problem_options for update
  to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

create policy "Admins can delete plan action options"
  on public.plan_action_problem_options for delete
  to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

create or replace function public.set_plan_action_problem_option_metadata()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists set_plan_action_problem_option_metadata on public.plan_action_problem_options;
create trigger set_plan_action_problem_option_metadata
before insert or update on public.plan_action_problem_options
for each row execute function public.set_plan_action_problem_option_metadata();

notify pgrst, 'reload schema';
