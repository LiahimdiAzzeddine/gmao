import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react"
import { StatutOT, TypePlan, TypeRecurrence } from "../../hooks/useOrdresTravail"

export const getStatutConfig = (statut: StatutOT) => {
    const configs = {
      prévu: {
        color: 'bg-orange-500',
        bgLight: 'bg-orange-50',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200',
        icon: Clock
      },
      en_cours: {
        color: 'bg-amber-500',
        bgLight: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        icon: AlertCircle
      },
      terminé: {
        color: 'bg-emerald-500',
        bgLight: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
        icon: CheckCircle
      },
      clôturé_avec_anomalie: {
        color: 'bg-red-500',
        bgLight: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        icon: AlertCircle
      },
      annulé: {
        color: 'bg-rose-500',
        bgLight: 'bg-rose-50',
        textColor: 'text-rose-700',
        borderColor: 'border-rose-200',
        icon: XCircle
      }
    }
    return configs[statut] || configs.prévu
  }

  export   const getTypePlanColor = (type: TypePlan) => {
      return type === 'préventive'
        ? 'bg-orange-100 text-orange-700 border-orange-200'
        : 'bg-amber-100 text-amber-700 border-amber-200'
    }
    
    export   const formatRecurrence = (type: TypeRecurrence | null, intervalle: number | null) => {
    if (!type) return null

    
    const label =type
    return intervalle && intervalle > 1 ? `${label} x ${intervalle}` : label
  }
