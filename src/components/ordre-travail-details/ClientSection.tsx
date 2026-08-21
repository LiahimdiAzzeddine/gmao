import { Building2, Phone, Home } from 'lucide-react';
import { Client } from '../../types/ot';
import { InfoCard } from './InfoCard';
import { InfoField } from './InfoField';

interface ClientSectionProps {
  client: Client;
}

export const ClientSection = ({ client }: ClientSectionProps) => {
  return (
    <InfoCard icon={Building2} title="Client">
      {client.logo_url && (
        <div className="flex justify-center mb-4">
          <img
            src={client.logo_url}
            alt="Logo client"
            className="w-28 h-28 object-contain rounded-xl border-2 border-gray-100 p-2 bg-white"
          />
        </div>
      )}

      <InfoField label="Raison sociale" value={client.raison_sociale} />

      {client.prenom && (
        <InfoField label="Prénom" value={client.prenom} />
      )}

      {client.cin && (
        <InfoField label="CIN" value={<span className="font-mono">{client.cin}</span>} />
      )}

      {client.telephone && (
        <InfoField label="Téléphone" value={client.telephone} icon={Phone} />
      )}

      {client.adresse && (
        <InfoField label="Adresse" value={client.adresse} icon={Home} />
      )}
    </InfoCard>
  );
};
