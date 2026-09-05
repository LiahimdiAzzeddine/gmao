-- Complements additifs a la classification des defaillances.
-- Cette migration ne modifie ni ne supprime les donnees historiques.

begin;

-- Une demande conserve toujours une hierarchie lot/famille/mode coherente.
create or replace function public.sync_request_failure_classification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_lot_id uuid;
begin
  if new.failure_mode_id is null then
    new.problem_family_id := null;
    new.problem_lot_id := null;
    return new;
  end if;

  select mode.famille_id, family.lot_id
    into v_family_id, v_lot_id
  from public.plan_action_failure_modes mode
  join public.plan_action_problem_families family on family.id = mode.famille_id
  join public.plan_action_lots lot on lot.id = family.lot_id
  where mode.id = new.failure_mode_id
    and mode.actif and family.actif and lot.actif;

  if not found then
    raise exception 'Mode de defaillance invalide ou inactif' using errcode = '23514';
  end if;

  new.problem_family_id := v_family_id;
  new.problem_lot_id := v_lot_id;
  return new;
end;
$$;

drop trigger if exists sync_request_failure_classification on public.demande_intervention;
create trigger sync_request_failure_classification
before insert or update of failure_mode_id, problem_family_id, problem_lot_id
on public.demande_intervention
for each row execute function public.sync_request_failure_classification();

-- Quand le classement d'un plan change, actualiser seulement ses OT futurs.
-- Les OT termines restent des instantanes historiques immuables.
create or replace function public.sync_scheduled_plan_failure_modes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid := coalesce(new.plan_id, old.plan_id);
begin
  delete from public.work_order_failure_modes relation
  using public.ordres_travail ot
  where relation.ordre_travail_id = ot.id
    and relation.source = 'plan'
    and ot.plan_id = v_plan_id
    and ot.statut in ('prévu', 'en_cours');

  insert into public.work_order_failure_modes (ordre_travail_id, failure_mode_id, source)
  select ot.id, configured.failure_mode_id, 'plan'
  from public.ordres_travail ot
  join public.plan_failure_modes configured on configured.plan_id = ot.plan_id
  where ot.plan_id = v_plan_id
    and ot.statut in ('prévu', 'en_cours')
  on conflict (ordre_travail_id, failure_mode_id, source) do nothing;

  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_scheduled_plan_failure_modes on public.plan_failure_modes;
create trigger sync_scheduled_plan_failure_modes
after insert or delete on public.plan_failure_modes
for each row execute function public.sync_scheduled_plan_failure_modes();

-- Finalise une intervention et cree zero, un ou deux OT dans une seule transaction.
create or replace function public.finalize_intervention_followup(
  p_intervention_id uuid,
  p_create_replan boolean,
  p_replan jsonb default '{}'::jsonb,
  p_create_corrective boolean default false,
  p_corrective jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_intervention public.interventions%rowtype;
  v_parent public.ordres_travail%rowtype;
  v_replan public.ordres_travail%rowtype;
  v_corrective public.ordres_travail%rowtype;
  v_failure_mode_id uuid;
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
     and not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Action reservee aux administrateurs' using errcode = '42501';
  end if;
  if not p_create_replan and not p_create_corrective then
    raise exception 'Selectionnez au moins un OT a creer' using errcode = '22023';
  end if;

  select * into v_intervention from public.interventions
  where id = p_intervention_id for update;
  if not found then raise exception 'Intervention introuvable' using errcode = 'P0002'; end if;

  select * into v_parent from public.ordres_travail
  where id = v_intervention.ordre_travail_id for update;
  if not found then raise exception 'OT parent introuvable' using errcode = 'P0002'; end if;

  update public.interventions
  set valide = true, valide_par = auth.uid(), valide_le = now()
  where id = v_intervention.id;

  if v_intervention.etat_machine_apres is not null then
    update public.machines set etat = v_intervention.etat_machine_apres
    where id = v_intervention.machine_id;
  end if;

  update public.ordres_travail set statut = 'clôturé_avec_anomalie'
  where id = v_parent.id;

  if p_create_replan then
    if nullif(p_replan->>'date_programmee', '') is null then
      raise exception 'Date de replanification requise' using errcode = '22023';
    end if;
    insert into public.ordres_travail (
      type, statut, date_programmee, machine_id, plan_id, ot_parent_id,
      raison_report, date_report, observations, etapes_reportees, etapes_deja_faites
    ) values (
      'préventif', 'prévu', (p_replan->>'date_programmee')::timestamp,
      v_intervention.machine_id, v_parent.plan_id, v_parent.id,
      nullif(p_replan->>'raison', ''), now(), nullif(p_replan->>'observations', ''),
      coalesce(p_replan->'etapes_reportees', '[]'::jsonb),
      coalesce(p_replan->'etapes_deja_faites', '[]'::jsonb)
    ) returning * into v_replan;
  end if;

  if p_create_corrective then
    if nullif(p_corrective->>'date_programmee', '') is null then
      raise exception 'Date de l OT correctif requise' using errcode = '22023';
    end if;
    v_failure_mode_id := nullif(p_corrective->>'failure_mode_id', '')::uuid;
    if v_failure_mode_id is null then
      raise exception 'Mode de defaillance requis pour l OT correctif' using errcode = '22023';
    end if;

    insert into public.ordres_travail (
      type, statut, priorite, date_programmee, observations, cause,
      machine_id, ot_parent_id, intervention_source_id, etapes_non_conformes,
      failure_mode_id, classification_source, classification_confirmed,
      action_recommandee, gravite_libelle, gravite_classe,
      occurrence_libelle, occurrence_classe, detectabilite_libelle,
      detectabilite_classe, rpn, date_expression
    ) values (
      'correctif', 'prévu', coalesce(nullif(p_corrective->>'priorite', ''), 'moyenne'),
      (p_corrective->>'date_programmee')::timestamp,
      nullif(p_corrective->>'observations', ''),
      'Non-conformités détectées lors de la maintenance préventive',
      v_intervention.machine_id, v_parent.id, v_intervention.id,
      coalesce(p_corrective->'etapes_non_conformes', '[]'::jsonb),
      v_failure_mode_id, 'diagnostic', true,
      nullif(p_corrective->>'action_recommandee', ''),
      nullif(p_corrective->>'gravite_libelle', ''),
      nullif(p_corrective->>'gravite_classe', '')::integer,
      nullif(p_corrective->>'occurrence_libelle', ''),
      nullif(p_corrective->>'occurrence_classe', '')::integer,
      nullif(p_corrective->>'detectabilite_libelle', ''),
      nullif(p_corrective->>'detectabilite_classe', '')::integer,
      nullif(p_corrective->>'rpn', '')::integer,
      nullif(p_corrective->>'date_expression', '')::date
    ) returning * into v_corrective;
  end if;

  return jsonb_build_object(
    'replan_id', v_replan.id, 'replan_numot', v_replan.numot,
    'corrective_id', v_corrective.id, 'corrective_numot', v_corrective.numot
  );
end;
$$;

revoke all on function public.finalize_intervention_followup(uuid, boolean, jsonb, boolean, jsonb) from public, anon;
grant execute on function public.finalize_intervention_followup(uuid, boolean, jsonb, boolean, jsonb) to authenticated, service_role;

-- Vue detaillee pour les graphiques. Une ligne = un couple OT/mode ; les totaux
-- d'OT doivent donc utiliser count(distinct ordre_travail_id).
drop view if exists public.v_work_order_failure_classification;
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
  latest_intervention.technicien_id
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

-- Eviter les privileges de structure inutiles sur les tables de liaison.
revoke truncate, references, trigger on public.plan_failure_modes from authenticated;
revoke truncate, references, trigger on public.work_order_failure_modes from authenticated;

notify pgrst, 'reload schema';
commit;
