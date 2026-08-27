-- Short identifier used by OT lists and machine history.
alter table public.ordres_travail
  add column if not exists search_id text
  generated always as (left(id::text, 8)) stored;

create index if not exists ordres_travail_search_id_idx
  on public.ordres_travail(search_id);

comment on column public.ordres_travail.search_id is
  'Eight-character prefix of the work-order UUID, used for searches such as #3b0fb03c.';
