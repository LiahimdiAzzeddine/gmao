import { Shield, Building2 } from 'lucide-react';
import { PosteTechnique, Machine } from '../../types/ot';
import { InfoCard } from './InfoCard';
import { InfoField } from './InfoField';

interface PosteTechniqueSectionProps {
  posteTechnique: PosteTechnique;
  machine?: Machine;
}

export const PosteTechniqueSection = ({ posteTechnique, machine }: PosteTechniqueSectionProps) => {
  const codePT = machine
    ? `${posteTechnique.code_pt}_${machine.nom.replace(/\s+/g, '').replace(/[^A-Z0-9_]/gi, '').toUpperCase()}`
    : posteTechnique.code_pt;

  return (
    <InfoCard icon={Shield} title="Poste Technique" className="lg:col-span-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoField label="Code PT" value={<span className="font-mono text-sm">{codePT}</span>} />

        <InfoField label="Bâtiment" value={posteTechnique.batiment} icon={Building2} />

        {posteTechnique.site && (
          <div>
            <InfoField label="Site" value={posteTechnique.site.nom} />
            <p className="text-xs text-gray-500 mt-1">({posteTechnique.site.code})</p>
          </div>
        )}

        {posteTechnique.domaine && (
          <div>
            <InfoField label="Domaine" value={posteTechnique.domaine.libelle} />
            <p className="text-xs text-gray-500 mt-1">({posteTechnique.domaine.code})</p>
          </div>
        )}

        {posteTechnique.secteur && (
          <div>
            <InfoField label="Secteur" value={posteTechnique.secteur.libelle} />
            <p className="text-xs text-gray-500 mt-1">({posteTechnique.secteur.code})</p>
          </div>
        )}

        {posteTechnique.lot && (
          <div>
            <InfoField label="Lot" value={posteTechnique.lot.nom} />
            <p className="text-xs text-gray-500 mt-1">({posteTechnique.lot.code})</p>
          </div>
        )}
      </div>
    </InfoCard>
  );
};
