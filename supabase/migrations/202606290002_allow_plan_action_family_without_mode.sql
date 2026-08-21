alter table public.plan_action_problem_options
  alter column mode_defaillance drop not null;

alter table public.plan_action_problem_options
  drop constraint if exists plan_action_problem_options_unique;

alter table public.plan_action_problem_options
  drop constraint if exists plan_action_problem_options_mode_defaillance_check;

alter table public.plan_action_problem_options
  add constraint plan_action_problem_options_mode_defaillance_check
  check (mode_defaillance is null or btrim(mode_defaillance) <> '');

create unique index if not exists plan_action_problem_options_family_unique
  on public.plan_action_problem_options (lot, famille)
  where mode_defaillance is null;

create unique index if not exists plan_action_problem_options_mode_unique
  on public.plan_action_problem_options (lot, famille, mode_defaillance)
  where mode_defaillance is not null;

notify pgrst, 'reload schema';
