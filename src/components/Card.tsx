import React from 'react';
import { Clock, Edit, AlertCircle, Wrench, Calendar, ChevronRight } from 'lucide-react';
import { Machine, Profile } from '../lib/supabase';

interface Demande {
  id: string;
  machine?: Machine;
  label?: string;
  type_intervention: string;
  statut: 'en attente' | 'en cours' | 'terminée' | 'annulée' | string;
  urgence: 'élevée' | 'moyenne' | 'faible' | string;
  created_by: string;
  date_demande: string;
}

interface DemandeCardProps {
  demande: Demande;
  profile?: Profile | undefined;
  onEdit?: (demande: Demande) => void;
  onClick?: (demande: Demande) => void;
}

export const DemandeCard: React.FC<DemandeCardProps> = ({ demande, profile, onEdit, onClick }) => {
  const getStatutConfig = (statut?: string) => {
    const configs: Record<string, { bg: string; text: string; border: string; icon: JSX.Element }> = {
      'en attente': {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-300',
        icon: <Clock size={14} className="text-amber-600" />
      },
      'en cours': {
        bg: 'bg-[#fef3f0]',
        text: 'text-[#f15c00]',
        border: 'border-[#f15c00]',
        icon: <Wrench size={14} className="text-[#f15c00]" />
      },
      'terminée': {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-300',
        icon: <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center text-white text-[10px] font-bold">✓</div>
      },
      'annulée': {
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        border: 'border-slate-300',
        icon: <AlertCircle size={14} className="text-slate-500" />
      },
    };
    return statut ? configs[statut.toLowerCase()] ?? configs['annulée'] : configs['annulée'];
  };

  const getUrgenceConfig = (urgence?: string) => {
    const configs: Record<string, { dot: string; bg: string; text: string }> = {
      'élevée': { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
      'moyenne': { dot: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
      'faible': { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
    };
    return urgence ? configs[urgence.toLowerCase()] ?? configs['faible'] : configs['faible'];
  };

  const canEdit = profile?.role === 'admin' || profile?.id === demande?.created_by;
  const statutConfig = getStatutConfig(demande.statut);
  const urgenceConfig = getUrgenceConfig(demande.urgence);

  return (
    <div
      onClick={() => onClick?.(demande)}
      className="bg-white border-2 border-slate-200 hover:border-[#f15c00] rounded-xl overflow-hidden transition-all duration-300 cursor-pointer group hover:shadow-lg max-w-sm"
    >
      {/* Header Section */}
      <div className="bg-gradient-to-r from-slate-50 to-white p-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 ${statutConfig.border} ${statutConfig.bg}`}>
            {statutConfig.icon}
            <span className={`text-xs font-bold ${statutConfig.text}`}>{demande.statut}</span>
          </div>

          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(demande);
              }}
              className="p-1.5 text-slate-400 hover:text-[#f15c00] hover:bg-[#fef3f0] rounded-lg transition-all duration-200"
              title="Éditer"
            >
              <Edit size={16} />
            </button>
          )}
        </div>

        <h3 className="font-bold text-base text-slate-800 group-hover:text-[#f15c00] transition-colors line-clamp-2">
          {demande?.label?demande?.label:"N/A"}
        </h3>
      </div>

      {/* Body Section */}
      <div className="p-3 space-y-2">
        {/* Machine Info */}
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#f15c00] to-orange-600 flex items-center justify-center text-white font-bold text-base shadow-sm flex-shrink-0">
            {demande?.machine?.nom?.charAt(0)?.toUpperCase() || 'M'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Machine</p>
            <p className="text-xs font-bold text-slate-800 truncate">{demande?.machine?.nom}</p>
             <p className="text-xs text-slate-700 lowercase ">{demande?.machine?.client?.raison_sociale ? demande?.machine.client!.raison_sociale : demande?.machine?.client!.prenom}</p>
          </div>
        </div>

        {/* Type Intervention */}
        <div className="flex items-center gap-2 p-2 bg-[#fef3f0] rounded-lg border border-[#fcd3c1]">
          <Wrench size={18} className="text-[#f15c00] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[#f15c00] uppercase tracking-wide font-semibold">Type</p>
            <p className="text-xs font-bold text-slate-800 truncate">{demande.type_intervention}</p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar size={14} className="text-slate-400" />
            <span className="font-medium">
              {new Intl.DateTimeFormat('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }).format(new Date(demande.date_demande))}
            </span>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${urgenceConfig.bg}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${urgenceConfig.dot} animate-pulse`}></div>
            <span className={`text-xs font-bold ${urgenceConfig.text} capitalize`}>{demande.urgence}</span>
          </div>
        </div>
      </div>

      {/* Hover Arrow */}
      <div className="flex items-center justify-end p-2 bg-slate-50 border-t border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-xs font-semibold text-[#f15c00] flex items-center gap-1">
          Voir détails
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </div>
  );
};