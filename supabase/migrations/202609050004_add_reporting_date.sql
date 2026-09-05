-- Date de reference stable pour filtrer les rapports cote serveur.
-- Priorite : intervention realisee, execution OT, puis programmation.

begin;

create or replace view public.v_work_order_failure_classification
with (security_invoker = true)
as
select
  ot.id as ordre_travail_id, ot.numot, ot.demande_id, ot.plan_id, ot.machine_id,
  machine.client_id, machine.nom as machine_nom,
  site.id as site_id, site.nom as site_nom,
  ot.type, ot.statut, ot.date_programmee, ot.date_execution,
  ot.classification_confirmed, relation.source,
  lot.id as problem_lot_id, lot.nom as lot_defaillance,
  family.id as problem_family_id, family.nom as famille_probleme,
  mode.id as failure_mode_id, mode.nom as mode_defaillance,
  latest_intervention.date_debut as intervention_date_debut,
  latest_intervention.date_fin as intervention_date_fin,
  latest_intervention.resultat as intervention_resultat,
  latest_intervention.technicien_id,
  coalesce(latest_intervention.date_debut, ot.date_execution, ot.date_programmee) as report_date
from public.ordres_travail ot
join public.machines machine on machine.id = ot.machine_id
left join public.postes_techniques poste on poste.id = machine.poste_technique_id
left join public.sites site on site.id = poste.site_id
left join public.work_order_failure_modes relation on relation.ordre_travail_id = ot.id
left join public.plan_action_failure_modes mode on mode.id = relation.failure_mode_id
left join public.plan_action_problem_families family on family.id = mode.famille_id
left join public.plan_action_lots lot on lot.id = family.lot_id
left join lateral (
  select intervention.date_debut, intervention.date_fin, intervention.resultat, intervention.technicien_id
  from public.interventions intervention
  where intervention.ordre_travail_id = ot.id
  order by intervention.date_debut desc limit 1
) latest_intervention on true;

grant select on public.v_work_order_failure_classification to authenticated, service_role;
notify pgrst, 'reload schema';

commit;
