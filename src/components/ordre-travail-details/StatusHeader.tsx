import { OrdreTravailDetail } from '../../types/ot';
import { getStatutConfig } from '../ot/getStatutConfig';
import { getOtStatusLabel } from '../../utils/otStatus';

interface StatusHeaderProps {
  ordre: OrdreTravailDetail;
}

export const StatusHeader = ({ ordre }: StatusHeaderProps) => {
  const statutConfig = getStatutConfig(ordre.statut);
  const StatutIcon = statutConfig.icon;

  const typeLabels = {
    préventif: '🛡️ Préventif',
    correctif: '⚡ Correctif',
    curatif: '🔧 Curatif'
  };

  return (
    <div className={`${statutConfig.color} rounded-xl p-4 text-white shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden`}>
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
      
      <div className="relative flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm ring-2 ring-white/30 shadow-lg">
            <StatutIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs opacity-90 font-semibold mb-1 uppercase tracking-wider">Statut</p>
            <p className="text-xl font-bold tracking-tight">
              {getOtStatusLabel(ordre.statut)}
            </p>
          </div>
        </div>
        <div className="flex gap-6">
          {ordre.numot && (
            <div className="text-right">
              <p className="text-xs opacity-90 font-semibold mb-1 uppercase tracking-wider">N° OT Machine</p>
              <p className="text-lg font-bold">#{ordre.numot}</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-xs opacity-90 font-semibold mb-1 uppercase tracking-wider">Type d'intervention</p>
            <p className="text-lg font-bold">
              {typeLabels[ordre.type]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
