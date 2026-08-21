import { Wrench, Hash, Factory, Zap } from 'lucide-react';
import { Machine } from '../../types/ot';
import { InfoCard } from './InfoCard';
import { InfoField } from './InfoField';
import { StatusBadge } from './StatusBadge';
import { MachineState, getMachineStateConfig, normalizeMachineState } from '../../types/machineState';

interface MachineSectionProps {
  machine: Machine;
}

export const MachineSection = ({ machine }: MachineSectionProps) => {
  const normalizedState = normalizeMachineState(machine.etat);
  const stateConfig = getMachineStateConfig(machine.etat);

  return (
    <InfoCard icon={Wrench} title="Machine">
      <InfoField label="Nom" value={machine.nom} />

      {machine.machine_id && (
        <InfoField label="ID Machine" value={machine.machine_id} icon={Hash} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <InfoField label="Modèle" value={machine.modele} />
        <InfoField label="N° de série" value={<span className="font-mono text-sm">{machine.numero_serie}</span>} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoField label="Année" value={machine.annee} />
        <InfoField label="Fabricant" value={machine.fabricant} icon={Factory} />
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">État</p>
        <StatusBadge variant={normalizedState === MachineState.EN_SERVICE ? 'success' : 'error'}>
          {stateConfig.label}
        </StatusBadge>
      </div>

      {(machine.puissance || machine.tension) && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
          {machine.puissance && (
            <InfoField label="Puissance" value={machine.puissance} icon={Zap} />
          )}
          {machine.tension && (
            <InfoField label="Tension" value={machine.tension} />
          )}
        </div>
      )}

      {machine.qte && (
        <InfoField label="Quantité" value={machine.qte} />
      )}
    </InfoCard>
  );
};
