import { 
  Activity, Wrench, Hash, Calendar, Factory, MapPin, 
  School, Zap, Download, Building2, Network, 
  Layers, PackageCheck, MapPinned, ImageIcon
} from 'lucide-react';
import OrdresTravail from './OrdresTravail';
import { useNavigate } from 'react-router-dom';

const InfoCard = ({ icon, label, value }:any) => (
  <div className="p-4 rounded-xl border border-slate-200 hover:shadow-md transition-all bg-white">
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg" style={{ backgroundColor: '#f15c0015' }}>
        <div style={{ color: '#f15c00' }}>{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-sm font-semibold text-slate-900 truncate">{value || 'Non renseigné'}</p>
      </div>
    </div>
  </div>
);

const SectionCard = ({ title, icon, children }:any) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-200" style={{ background: 'linear-gradient(to right, #f15c0010, #f15c0005)' }}>
      <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
        <div style={{ color: '#f15c00' }}>{icon}</div>
        {title}
      </h2>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const MachineContent = ({machine, activeTab, onReloadMachine}:any) => {
 const navigate = useNavigate();

 const handleDemarrerIntervention = (otId: string) => {
   // Naviguer vers la page de création d'intervention au lieu d'ouvrir un modal
   navigate(`/intervention/nouvelle?ordre_id=${otId}`);
 };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'fiche' && (
          <div className="space-y-6">
            {/* INFORMATIONS TECHNIQUES */}
            <SectionCard title="Informations techniques" icon={<Activity size={20} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2 lg:col-span-3">
                  <div className="h-56 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {machine.image_url ? (
                      <img
                        src={machine.image_url}
                        alt={machine.nom}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                        <ImageIcon size={44} />
                        <span className="mt-2 text-sm font-semibold">Aucune image renseignée</span>
                      </div>
                    )}
                  </div>
                </div>
                <InfoCard icon={<Wrench size={18} />} label="Modèle" value={machine.modele} />
                <InfoCard icon={<Hash size={18} />} label="Numéro de série" value={machine.numero_serie} />
                <InfoCard icon={<Calendar size={18} />} label="Année" value={machine.annee} />
                <InfoCard icon={<Factory size={18} />} label="Fabricant" value={machine.fabricant} />
                <InfoCard icon={<PackageCheck size={18} />} label="Quantité" value={machine.qte} />
                {machine.puissance && (
                  <InfoCard icon={<Zap size={18} />} label="Puissance" value={machine.puissance} />
                )}
                {machine.tension && (
                  <InfoCard icon={<Zap size={18} />} label="Tension" value={machine.tension} />
                )}

                {machine.manuel_url && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <a
                      href={machine.manuel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:shadow-md group"
                      style={{ backgroundColor: '#f15c0008', borderColor: '#f15c0030' }}
                    >
                      <div className="p-3 rounded-lg group-hover:scale-110 transition-transform" style={{ backgroundColor: '#f15c0020' }}>
                        <Download size={20} style={{ color: '#f15c00' }} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Manuel d'utilisation</p>
                        <p className="text-sm text-slate-600">Cliquer pour télécharger le document</p>
                      </div>
                    </a>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* INFORMATIONS CLIENT */}
            {machine.client && (
              <SectionCard title="Informations client" icon={<School size={20} />}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoCard 
                    icon={<Building2 size={18} />} 
                    label="Raison sociale" 
                    value={machine.client.raison_sociale} 
                  />
                  <InfoCard 
                    icon={<MapPin size={18} />} 
                    label="Adresse" 
                    value={machine.client.adresse} 
                  />
                  <InfoCard 
                    icon={<School size={18} />} 
                    label="Téléphone" 
                    value={machine.client.telephone} 
                  />
                </div>
              </SectionCard>
            )}

            {/* POSTE TECHNIQUE */}
            {machine.poste_technique && (
              <SectionCard title="Poste technique" icon={<Network size={20} />}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoCard 
                    icon={<Hash size={18} />} 
                    label="Code PT" 
                    value={machine.poste_technique.code_pt+machine.nom.replace(/\s+/g, '').replace(/[^A-Z0-9_]/gi, '').toUpperCase()} 
                  />
                  <InfoCard 
                    icon={<Building2 size={18} />} 
                    label="Bâtiment" 
                    value={machine.poste_technique.batiment} 
                  />
                  
                  {/* Site */}
                  {machine.poste_technique.site && (
                    <>
                      <InfoCard 
                        icon={<MapPinned size={18} />} 
                        label="Site" 
                        value={machine.poste_technique.site.nom} 
                      />
                      <InfoCard 
                        icon={<Hash size={18} />} 
                        label="Code Site" 
                        value={machine.poste_technique.site.code} 
                      />
                    </>
                  )}

                  {/* Domaine */}
                  {machine.poste_technique.domaine && (
                    <>
                      <InfoCard 
                        icon={<Layers size={18} />} 
                        label="Domaine" 
                        value={machine.poste_technique.domaine.libelle} 
                      />
                      <InfoCard 
                        icon={<Hash size={18} />} 
                        label="Code Domaine" 
                        value={machine.poste_technique.domaine.code} 
                      />
                    </>
                  )}

                  {/* Secteur */}
                  {machine.poste_technique.secteur && (
                    <>
                      <InfoCard 
                        icon={<Network size={18} />} 
                        label="Secteur" 
                        value={machine.poste_technique.secteur.libelle} 
                      />
                      <InfoCard 
                        icon={<Hash size={18} />} 
                        label="Code Secteur" 
                        value={machine.poste_technique.secteur.code} 
                      />
                    </>
                  )}

                  {/* Lot */}
                  {machine.poste_technique.lot && (
                    <>
                      <InfoCard 
                        icon={<PackageCheck size={18} />} 
                        label="Lot" 
                        value={machine.poste_technique.lot.nom} 
                      />
                      <InfoCard 
                        icon={<Hash size={18} />} 
                        label="Code Lot" 
                        value={machine.poste_technique.lot.code} 
                      />
                      {machine.poste_technique.lot.description && (
                        <div className="md:col-span-2 lg:col-span-3">
                          <InfoCard 
                            icon={<Activity size={18} />} 
                            label="Description Lot" 
                            value={machine.poste_technique.lot.description} 
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {activeTab === 'historique' && (
         <OrdresTravail 
           machine={machine} 
           onVoirDetails={(otId) => navigate(`/ordres-travail/${otId}`)}
           onDemarrer={handleDemarrerIntervention}
         />
        )}
      </div>
    </div>
  );
};

export default MachineContent;
