import { useNavigate } from 'react-router-dom'
import { Calendar, User, Trash2 } from 'lucide-react'
import { TypePlan } from '../../hooks/useOrdresTravail'
import { renderRecurrence } from '../../utils/renderRecurrence'
import { getOtStatusLabel } from '../../utils/otStatus'

interface Props {
  ot: any
  statutConfig: any
  StatutIcon: any
  getTypePlanColor: (type: TypePlan) => string
  onDelete?: (ot: any) => void
  deleting?: boolean
}

export default function OrdreTravailCard({
  ot,
  statutConfig,
  StatutIcon,
  getTypePlanColor,
  onDelete,
  deleting = false,
}: Props) {
  const navigate = useNavigate()

  const machine = ot.machine
  const plan = ot.plan

  return (
    <div
      onClick={() => navigate(`/ordres-travail/${ot.id}`)}
      className={`group bg-white rounded-xl border-2 ${statutConfig.borderColor}
        shadow-md hover:shadow-xl transition-all duration-300
        overflow-hidden cursor-pointer transform hover:-translate-y-1`}
    >
      {/* Header avec gradient */}
      <div className={`${statutConfig.color} p-3 sm:p-4 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
        
        <div className="relative flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="mb-1 text-xs font-bold text-white/90">
              #{ot.id.slice(0, 8)}{ot.numot ? ` · N° ${ot.numot}` : ''}
            </p>
            <h3 className="font-bold text-sm sm:text-base mb-1 line-clamp-1 text-white">
              {machine?.nom || 'Machine inconnue'}
            </h3>
            <p className="text-xs sm:text-sm text-white/90 line-clamp-1">
              {machine?.client?.raison_sociale || 'Client inconnu'}
            </p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <StatutIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {onDelete && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onDelete(ot)
              }}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-600 hover:text-white disabled:cursor-wait disabled:opacity-50"
              title="Supprimer cet OT"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        )}
        {machine?.modele && (
          <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200 font-mono">
            {machine.modele}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {ot.type && (
            <span className={`px-2 py-1 rounded text-xs sm:text-sm font-bold border ${getTypePlanColor(ot.type)}`}>
              {ot.type === 'préventif' ? '🛡️' : '⚡'} {ot.type === 'préventif' ? 'Préventif' : ot.type === 'correctif' ? 'Correctif' : 'Curatif'}
            </span>
          )}

          {plan?.type_recurrence && renderRecurrence(plan) && (
            <span className="px-2 py-1 rounded text-xs sm:text-sm font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              🔄 {renderRecurrence(plan)}
            </span>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-700 bg-blue-50 px-2 py-1.5 rounded border border-blue-100 flex-1">
            <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="font-medium">
              {new Date(ot.date_programmee).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
              })}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-700 bg-amber-50 px-2 py-1.5 rounded border border-amber-100 flex-1">
            <User className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-medium line-clamp-1">
              {ot.technicien?.nom || '⚠️ Non assigné'}
            </span>
          </div>
        </div>

        {machine.poste_technique?.code_pt && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 line-clamp-1 italic">
              {machine.poste_technique.code_pt}_{machine.nom.replace(/\s+/g, '').replace(/[^A-Z0-9_]/gi, '').toUpperCase()}
            </p>
          </div>
        )}

        <div className={`${statutConfig.bgLight} ${statutConfig.textColor} px-3 py-2 rounded text-center font-bold text-xs sm:text-sm border ${statutConfig.borderColor}`}>
          <div className="flex items-center justify-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              ot.statut === 'prévu' ? 'bg-blue-500' :
              ot.statut === 'en_cours' ? 'bg-yellow-500' :
              ot.statut === 'terminé' ? 'bg-green-500' :
              ot.statut === 'clôturé_avec_anomalie' ? 'bg-red-500' :
              'bg-gray-500'
            } animate-pulse`}></div>
            {getOtStatusLabel(ot.statut)}
          </div>
        </div>
      </div>
    </div>
  )
}
