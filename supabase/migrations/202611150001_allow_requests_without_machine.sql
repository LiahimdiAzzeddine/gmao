begin;

-- Cette migration doit être exécutée avec le rôle propriétaire
-- supabase_admin (la session postgres de l'éditeur SQL n'en est pas membre).

alter table public.demande_intervention
  add column if not exists client_id uuid references public.clients(id) on delete cascade;

update public.demande_intervention request
set client_id = machine.client_id
from public.machines machine
where request.machine_id = machine.id
  and request.client_id is null;

alter table public.demande_intervention
  alter column machine_id drop not null;

create index if not exists demande_intervention_client_id_idx
  on public.demande_intervention(client_id);

alter table public.demande_intervention
  drop constraint if exists demande_intervention_machine_or_client_check;

alter table public.demande_intervention
  add constraint demande_intervention_machine_or_client_check
  check (machine_id is not null or client_id is not null);

comment on column public.demande_intervention.client_id is
  'Client concerne, notamment lorsque la demande ne cible pas encore une machine.';

commit;
