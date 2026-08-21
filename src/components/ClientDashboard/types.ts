// Types partagés pour le dashboard client

export type DailyActivity = {
  day: string;
  otCrees: number;
  interventionsTerminees: number;
};

export type OTByType = {
  type: string;
  count: number;
  color: string;
};

export type PlanActionPreviewItem = {
  id: string;
  equipment: string;
  modeDefaillance: string;
  actionRecommandee: string;
  rpn: number | null;
  dateExpression: string | null;
  cloturee: boolean;
};

export type ClientStats = {
  machines: number;
  machinesEnService: number;
  machinesEnPanne: number;
  machinesHorsService: number;
  ordresTravail: number;
  otOuverts: number;
  interventions: number;
  interventionsValidees: number;
  interventionsValideesByClient: number;
  interventionsValideesByAdmin: number;
  activiteMaintenance: DailyActivity[];
  otNonTraitesParType: OTByType[];
  planActionsTotal: number;
  planActionsCloturees: number;
  planActionsRpnEleve: number;
  planActionsRecentes: PlanActionPreviewItem[];
};

export const emptyClientStats: ClientStats = {
  machines: 0,
  machinesEnService: 0,
  machinesEnPanne: 0,
  machinesHorsService: 0,
  ordresTravail: 0,
  otOuverts: 0,
  interventions: 0,
  interventionsValidees: 0,
  interventionsValideesByClient: 0,
  interventionsValideesByAdmin: 0,
  activiteMaintenance: [],
  otNonTraitesParType: [],
  planActionsTotal: 0,
  planActionsCloturees: 0,
  planActionsRpnEleve: 0,
  planActionsRecentes: [],
};
