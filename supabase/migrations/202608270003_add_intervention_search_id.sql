-- Short, searchable identifier displayed by the client and admin interfaces.
alter table public.interventions
  add column if not exists search_id text
  generated always as (left(id::text, 8)) stored;

create index if not exists interventions_search_id_idx
  on public.interventions(search_id);

comment on column public.interventions.search_id is
  'Eight-character prefix of the intervention UUID, used for searches such as #7090772e.';
