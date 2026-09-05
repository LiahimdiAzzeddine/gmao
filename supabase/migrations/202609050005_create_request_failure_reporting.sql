-- Vue de reporting des demandes client classees par defaillance.

begin;

create or replace view public.v_request_failure_classification
with (security_invoker = true)
as
select
  request.id as demande_id,
  request.machine_id,
  machine.client_id,
  request.type_intervention,
  request.statut,
  request.urgence,
  request.label,
  request.description,
  request.problem_lot_id,
  lot.nom as lot_defaillance,
  request.problem_family_id,
  family.nom as famille_probleme,
  request.failure_mode_id,
  mode.nom as mode_defaillance,
  coalesce(request.date_intervention, request.date_demande, request.created_at) as report_date
from public.demande_intervention request
join public.machines machine on machine.id = request.machine_id
left join public.plan_action_failure_modes mode on mode.id = request.failure_mode_id
left join public.plan_action_problem_families family on family.id = request.problem_family_id
left join public.plan_action_lots lot on lot.id = request.problem_lot_id;

grant select on public.v_request_failure_classification to authenticated, service_role;
notify pgrst, 'reload schema';

commit;
