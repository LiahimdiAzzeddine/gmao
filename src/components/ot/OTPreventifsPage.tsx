import { Calendar, ClipboardList, Plus, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OrdresTravailList from './OrdresTravailList';

export default function OTPreventifsPage() {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Générer OT',
      description: 'Créer les OT préventifs depuis les plans',
      icon: Plus,
      onClick: () => navigate('/admin/addOT'),
    },
    {
      label: 'Plans',
      description: 'Consulter les plans de maintenance',
      icon: Calendar,
      onClick: () => navigate('/admin/plans-maintenance'),
    },
    {
      label: 'Interventions',
      description: 'Suivre les interventions liées aux OT',
      icon: Wrench,
      onClick: () => navigate('/admin/interventions'),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="max-w-7xl mx-auto pt-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center flex-shrink-0">
                <ClipboardList size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Ordres de travail préventifs</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Voir les OT préventifs, filtrer par statut, ouvrir le détail et accéder aux actions courantes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:border-orange-300 hover:bg-orange-50"
                  >
                    <Icon className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">{action.label}</span>
                      <span className="block text-xs text-slate-500 truncate">{action.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <OrdresTravailList fixedTypeOt="préventif" hideTypeFilter allowDelete />
    </div>
  );
}
