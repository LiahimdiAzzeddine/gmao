import { User, Mail } from 'lucide-react';
import { Profile } from '../../types/ot';
import { InfoCard } from './InfoCard';
import { InfoField } from './InfoField';
import { StatusBadge } from './StatusBadge';

interface TechnicianSectionProps {
  technicien?: Profile;
}

export const TechnicianSection = ({ technicien }: TechnicianSectionProps) => {
  if (!technicien) {
    return (
      <InfoCard icon={User} title="Technicien assigné">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-3">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Aucun technicien assigné</p>
        </div>
      </InfoCard>
    );
  }

  return (
    <InfoCard icon={User} title="Technicien assigné">
      <InfoField label="Nom" value={technicien.nom} />

      {technicien.email && (
        <InfoField label="Email" value={technicien.email} icon={Mail} />
      )}

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Rôle</p>
        <StatusBadge variant="info">
          {technicien.role}
        </StatusBadge>
      </div>
    </InfoCard>
  );
};
