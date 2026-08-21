import { Calendar, CheckCircle, Check } from 'lucide-react';
import { Lot, Machine, PlanningItem } from '../../lib/supabase';
import { generateWeeks } from '../../utils/planningUtils';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

interface PlanningTableProps {
  planningData: PlanningItem[];
  lots: Lot[];
  machines: Machine[];
  currentYear: number;
  viewMode: 'month' | 'year';
  selectedMonth: number;
}

export function PlanningTable({
  planningData,
  lots,
  machines,
  currentYear,
  viewMode,
  selectedMonth
}: PlanningTableProps) {
  // Générer toutes les semaines de l'année
  const allWeeks = generateWeeks(currentYear);
  
  // Filtrer les semaines selon le mode d'affichage
  const displayWeeks = viewMode === 'month'
    ? allWeeks.filter(w => w.month === selectedMonth)
    : allWeeks;

  if (planningData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Aucune demande d'intervention préventive</p>
          <p className="text-slate-500 text-sm mt-1">Créez une demande pour commencer à planifier</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-slate-100 to-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 min-w-[120px] sticky left-0 bg-slate-100 z-20">
                LOT
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 min-w-[150px]">
                Machine
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 min-w-[180px]">
                Client
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 min-w-[180px]">
                Demande Label
              </th>
              <th className="px-3 py-3 text-center font-semibold text-slate-700 w-16" title="Hebdomadaire">H</th>
              <th className="px-3 py-3 text-center font-semibold text-slate-700 w-16" title="Mensuel">M</th>
              <th className="px-3 py-3 text-center font-semibold text-slate-700 w-16" title="Trimestriel">T</th>
              <th className="px-3 py-3 text-center font-semibold text-slate-700 w-16" title="Semestriel">S</th>
              <th className="px-3 py-3 text-center font-semibold text-slate-700 w-16" title="Annuel">A</th>

              {displayWeeks.map(week => (
                <th
                  key={week.number}
                  className={`px-2 py-2 text-center font-semibold text-slate-700 w-14 ${
                    viewMode === 'month' ? 'text-sm' : 'text-xs'
                  }`}
                >
                  <div className="leading-tight">
                    <div className={viewMode === 'month' ? 'text-sm' : 'text-xs'}>
                      {week.label}
                    </div>
                    <div className={`text-slate-500 font-medium ${
                      viewMode === 'month' ? 'text-[10px]' : 'text-[9px]'
                    }`}>
                      {week.displayDate}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {planningData.map((plan) => {
              const lot = lots.find(l => l.id === plan.lot_id);
              const machine = machines.find(m => m.id === plan.machine_id);

              return (
                <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-700 sticky left-0 bg-white z-10">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {lot?.nom || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-medium">{machine?.nom || 'N/A'}</div>
                    {machine?.modele && (
                      <div className="text-xs text-slate-500">{machine.modele}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {machine?.client ? (
                      <div>
                        <div className="font-medium">
                          {machine.client.raison_sociale || machine.client.prenom}
                        </div>
                        {machine.client.telephone && (
                          <div className="text-xs text-slate-500">
                            {machine.client.telephone}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">N/A</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-slate-700">{plan.nom}</td>
                  <td className="px-3 py-3 text-center">
                    {plan.hebdomadaire && <CheckCircle size={16} className="text-green-600 mx-auto" />}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {plan.mensuel && <CheckCircle size={16} className="text-green-600 mx-auto" />}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {plan.trimestriel && <CheckCircle size={16} className="text-green-600 mx-auto" />}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {plan.semestriel && <CheckCircle size={16} className="text-green-600 mx-auto" />}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {plan.annuelle && <CheckCircle size={16} className="text-green-600 mx-auto" />}
                  </td>

                  {displayWeeks.map(week => {
                    const hasPlanned = plan.weeks?.[week.number-1] === true;
                    const interventions = plan.interventions?.[week.number] || [];
                    const hasApproved = interventions.some(i => i.status === 'approved');
                    const hasPending = interventions.some(i => i.status === 'pending');

                    const tooltipText = interventions.length > 0
                      ? `${interventions.length} intervention(s):\n${interventions.map(i => `${formatDate(i.date)} - ${i.status}`).join('\n')}`
                      : hasPlanned ? 'Maintenance planifiée' : '';

                    return (
                      <td
                        key={week.number}
                        className="px-2 py-3 text-center"
                        title={tooltipText}
                      >
                        {hasPlanned && (
                          <div className="relative w-6 h-6 mx-auto">
                            <div className="absolute inset-0 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">✓</span>
                            </div>

                            {hasApproved && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white">
                                <Check size={8} className="text-white" />
                              </div>
                            )}

                            {!hasApproved && hasPending && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                        )}

                        {!hasPlanned && interventions.length > 0 && (
                          <div
                            className="w-6 h-6 mx-auto bg-red-500 rounded-full flex items-center justify-center cursor-help"
                            title={`Intervention non planifiée:\n${interventions.map(i => `${formatDate(i.date)} - ${i.status}`).join('\n')}`}
                          >
                            <span className="text-white text-xs font-bold">!</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}