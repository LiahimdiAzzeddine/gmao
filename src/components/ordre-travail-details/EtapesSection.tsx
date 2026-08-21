import { ListChecks, Timer, Wrench, Package, AlertCircle } from 'lucide-react';
import { EtapeGamme } from '../../types/ot';

interface EtapesSectionProps {
  etapes: EtapeGamme[];
}

export const EtapesSection = ({ etapes }: EtapesSectionProps) => {
  if (!etapes || etapes.length === 0) return null;

  const sortedEtapes = [...etapes].sort((a, b) => a.ordre - b.ordre);

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-gray-100">
        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <ListChecks className="w-5 h-5 text-orange-600" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Étapes de maintenance</h2>
        <span className="ml-auto bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-semibold">
          {etapes.length} étape{etapes.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {sortedEtapes.map((etape, index) => (
          <div
            key={etape.id}
            className="group border-l-4 border-orange-400 bg-gradient-to-r from-orange-50/50 to-transparent hover:from-orange-50 rounded-r-lg p-4 transition-all duration-200 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 min-w-[2.5rem] bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg flex items-center justify-center font-bold text-base shadow-sm group-hover:shadow-md transition-shadow">
                {index + 1}
              </div>

              <div className="flex-1 min-w-0 space-y-2.5">
                <p className="text-sm text-gray-900 font-medium leading-relaxed break-words">
                  {etape.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                  {etape.duree_estimee && (
                    <div className="flex items-center gap-1.5 bg-white rounded-md px-2 py-1.5 border border-gray-100">
                      <Timer className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span className="text-gray-600">Durée:</span>
                      <span className="font-semibold text-gray-900">{etape.duree_estimee} min</span>
                    </div>
                  )}

                  {etape.outil && (
                    <div className="flex items-center gap-1.5 bg-white rounded-md px-2 py-1.5 border border-gray-100">
                      <Wrench className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-600">Outil:</span>
                      <span className="font-semibold text-gray-900 truncate">{etape.outil}</span>
                    </div>
                  )}

                  {etape.piece && (
                    <div className="flex items-center gap-1.5 bg-white rounded-md px-2 py-1.5 border border-gray-100">
                      <Package className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                      <span className="text-gray-600">Pièce:</span>
                      <span className="font-semibold text-gray-900 truncate">{etape.piece}</span>
                    </div>
                  )}
                </div>

                {etape.consigne_securite && (
                  <div className="p-2.5 bg-amber-50 border-l-4 border-amber-400 rounded-r-md">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-0.5">
                          Consigne de sécurité
                        </p>
                        <p className="text-xs text-amber-900 leading-relaxed">
                          {etape.consigne_securite}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
