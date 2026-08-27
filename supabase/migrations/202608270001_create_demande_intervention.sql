-- The application has always queried public.demande_intervention, but the
-- table was missing from the schema migrations. Keep this migration
-- idempotent so it can also repair an existing environment safely.
create table if not exists public.demande_intervention (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  type_intervention text not null
    check (type_intervention in ('preventive', 'corrective')),
  description text not null default '',
  urgence text not null default 'moyenne'
    check (urgence in ('faible', 'moyenne', 'élevée')),
  gamme text,
  label text not null default '',
  statut text not null default 'en attente'
    check (statut in ('en attente', 'validée', 'annulée')),
  created_by uuid references public.profiles(id) on delete set null,
  date_intervention timestamptz,
  date_demande timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demande_intervention_machine_id_idx
  on public.demande_intervention(machine_id);

create index if not exists demande_intervention_created_by_idx
  on public.demande_intervention(created_by);

-- Enforce the same business rule checked by DemandeModal, including when two
-- requests are submitted concurrently.
create unique index if not exists demande_intervention_one_pending_corrective_idx
  on public.demande_intervention(machine_id)
  where type_intervention = 'corrective' and statut = 'en attente';

create or replace function public.set_demande_intervention_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_demande_intervention_updated_at
  on public.demande_intervention;

create trigger set_demande_intervention_updated_at
before update on public.demande_intervention
for each row execute function public.set_demande_intervention_updated_at();

grant select, insert, update, delete on public.demande_intervention to authenticated;

comment on table public.demande_intervention is
  'Demandes de maintenance préventive et corrective créées par les utilisateurs.';
