import { Settings } from 'lucide-react';
import { PlanMaintenanceDetail } from '../../types/ot';
import { InfoCard } from './InfoCard';
import { InfoField } from './InfoField';
import { StatusBadge } from './StatusBadge';
import { renderRecurrence } from '../../utils/renderRecurrence';
import { formatShortDate, getJourSemaine } from '../../utils/dateFormatters';

interface PlanMaintenanceSectionProps {
  plan?: PlanMaintenanceDetail;
}

export const PlanMaintenanceSection = ({ plan }: PlanMaintenanceSectionProps) => {
  if (!plan) {
    return (
      <InfoCard icon={Settings} title="Plan de maintenance">
        <p className="text-gray-500 text-center py-4">Aucun plan associé</p>
      </InfoCard>
    );
  }

  return (
    <InfoCard icon={Settings} title="Plan de maintenance">
      <InfoField label="Récurrence" value={renderRecurrence(plan)} />

      {plan.jour_semaine && (
        <InfoField label="Jour de la semaine" value={getJourSemaine(plan.jour_semaine)} />
      )}

      {plan.semaine_du_mois && (
        <InfoField label="Semaine du mois" value={`Semaine ${plan.semaine_du_mois}`} />
      )}

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
        <InfoField label="Date début" value={formatShortDate(plan.date_debut)} />
        <InfoField label="Date fin" value={plan.date_fin ? formatShortDate(plan.date_fin) : 'Indéfini'} />
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Statut du plan</p>
        <StatusBadge variant={plan.statut === 'actif' ? 'success' : 'neutral'}>
          {plan.statut}
        </StatusBadge>
      </div>

      {plan.gamme && (
        <div className="pt-3 border-t border-gray-100">
          <InfoField label="Gamme de maintenance" value={plan.gamme.nom} />
          {plan.gamme.description && (
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              {plan.gamme.description}
            </p>
          )}
        </div>
      )}
    </InfoCard>
  );
};
