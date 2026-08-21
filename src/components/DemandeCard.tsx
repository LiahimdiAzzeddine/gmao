import { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench, Clock, AlertCircle, Edit2, FileText, Package, FileCog } from 'lucide-react';
import { DemandeIntervention, Intervention, Machine } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { generateOTPdfReact } from '../utils/generateOTPdfReact';
import { generateOTCPdfReact } from '../utils/generateOTCPdfReact';

interface DemandeCardProps {
  demande: DemandeIntervention;
  interventions: Intervention[];
  machine: Machine;
  onCreateIntervention: (demandeId: string) => void;
}

export default function DemandeCard({
  demande,
  interventions,
  machine,
  onCreateIntervention,
}: DemandeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const { profile } = useAuth();
  const navigate = useNavigate();

  const canCreateIntervention =
    profile?.role === 'technicien' || profile?.role === 'admin';

  const urgenceStyles = {
    faible: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200',
    moyenne: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-200',
    élevée: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-200',
  };

  const statutStyles = {
    'en attente': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    validée: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    annulée: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  };

  const handleEditIntervention = (interventionId: string) => {
    navigate(`/intervention/edit?intervention_id=${interventionId}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-[#f15c00]">
      <div
        className="p-5 cursor-pointer hover:bg-gradient-to-r hover:from-[#fef3f0] hover:to-white transition-all duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* En-tête avec badges */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <h3 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
                {demande.type_intervention === 'preventive' ? (
                  <>
                    <Wrench size={18} className="text-[#f15c00]" />
                    Préventive : {demande.label}
                  </>
                ) : (
                  <>
                    <AlertCircle size={18} className="text-[#f15c00]" />
                    Corrective : {demande.label}
                  </>
                )}
              </h3>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${urgenceStyles[demande.urgence]
                  }`}
              >
                {demande.urgence}
              </span>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${statutStyles[demande.statut]
                  }`}
              >
                {demande.statut}
              </span>
            </div>

            {/* Description */}
            <p className="text-slate-600 text-sm leading-relaxed mb-3 line-clamp-2">
              {demande.description}
            </p>

            {/* Gamme */}
            {demande.gamme && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#fef3f0] rounded-lg mb-3 border border-[#fcd3c1]">
                <Package size={14} className="text-[#f15c00]" />
                <span className="text-xs font-medium text-[#f15c00]">
                  {demande.gamme}
                </span>
              </div>
            )}

            {/* Métadonnées */}
            <div className="flex items-center gap-5 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock size={15} className="text-slate-400" />
                {new Date(demande.date_demande).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>

              <span className="flex items-center gap-1.5 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f15c00]"></div>
                {interventions.length} intervention{interventions.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Bouton expand/collapse */}
          <button
            className="flex-shrink-0 p-2 hover:bg-[#fef3f0] rounded-lg transition-colors group"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronUp size={20} className="text-slate-400 group-hover:text-[#f15c00] transition-colors" />
            ) : (
              <ChevronDown size={20} className="text-slate-400 group-hover:text-[#f15c00] transition-colors" />
            )}
          </button>
        </div>
      </div>

      {/* Contenu étendu */}
      {isExpanded && (
        <div className="border-t border-slate-200 bg-gradient-to-b from-slate-50 to-white">
          <div className="p-5 space-y-5">
            {/* Bouton créer intervention */}
            {canCreateIntervention && (
              <button
                onClick={() => onCreateIntervention(demande.id)}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-gradient-to-r from-[#f15c00] to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-semibold shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                <Wrench size={18} />
                Créer une intervention
              </button>
            )}

            {/* Historique des interventions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-800 text-base">
                  Historique des interventions
                </h4>
                <span className="px-2.5 py-1 bg-[#fef3f0] text-[#f15c00] rounded-full text-xs font-bold border border-[#fcd3c1]">
                  {interventions.length}
                </span>
              </div>

              {interventions.length === 0 ? (
                <div className="text-center py-8 px-4 bg-white rounded-lg border-2 border-dashed border-slate-200">
                  <AlertCircle size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm font-medium">
                    Aucune intervention réalisée
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {interventions.map((intervention, index) => (
                    <div
                      key={intervention.id}
                      className="bg-white p-4 rounded-lg border border-slate-200 hover:border-[#f15c00] transition-all duration-200 hover:shadow-md"
                    >
                      {/* En-tête intervention */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#fef3f0] text-[#f15c00] flex items-center justify-center text-xs font-bold border border-[#fcd3c1]">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-700">
                              {new Date(intervention.date_intervention).toLocaleDateString(
                                'fr-FR',
                                {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                }
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {intervention.temps_passe && (
                            <span className="text-xs bg-[#fef3f0] text-[#f15c00] px-3 py-1 rounded-full font-semibold border border-[#fcd3c1]">
                              {intervention.temps_passe}h
                            </span>
                          )}

                         
                            <div className="flex items-center gap-1"> 
                            {canCreateIntervention && (
                              <button
                                onClick={() => handleEditIntervention(intervention.id)}
                                className="p-2 text-[#f15c00] hover:bg-[#fef3f0] rounded-lg transition-all duration-200 hover:scale-110"
                                title="Modifier l'intervention"
                              >
                                <Edit2 size={16} />
                              </button>
                              )}
                              {demande.type_intervention == 'preventive' ? (
                                <button
                                  onClick={async () => {
                                    setGeneratingPDF(intervention.id);
                                    try {
                                      // Récupérer l'ordre de travail complet avec toutes les relations
                                      const { supabase } = await import('../lib/supabase');
                                      const { data: ordre, error } = await supabase
                                        .from('ordres_travail')
                                        .select(`
                                          *,
                                          machine:machines(*),
                                          plan:plans_maintenance(
                                            *,
                                            gamme:gammes_maintenance(*)
                                          ),
                                          interventions:interventions!interventions_ot_fkey(
                                            *,
                                            technicien:profiles!interventions_technicien_fkey(*)
                                          )
                                        `)
                                        .eq('id', intervention.ordre_travail_id)
                                        .single();

                                      if (error) throw error;
                                      if (!ordre) throw new Error('Ordre de travail non trouvé');

                                      // Générer le PDF
                                      await generateOTPdfReact(ordre);
                                    } catch (err) {
                                      console.error('Erreur génération PDF:', err);
                                      alert('Erreur lors de la génération du PDF');
                                    } finally {
                                      setGeneratingPDF(null);
                                    }
                                  }}
                                  disabled={generatingPDF === intervention.id}
                                  className={
                                    "p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200 hover:scale-110 " +
                                    (generatingPDF === intervention.id
                                      ? "opacity-50 pointer-events-none hover:scale-100 cursor-not-allowed"
                                      : "")
                                  }
                                  title="Télécharger le PDF de maintenance préventive"
                                >
                                  {generatingPDF === intervention.id ? (
                                    <div className="animate-spin">
                                      <FileText size={16} />
                                    </div>
                                  ) : (
                                    <FileText size={16} />
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={async () => {
                                    setGeneratingPDF(intervention.id);
                                    try {
                                      // Récupérer l'ordre de travail complet avec toutes les relations
                                      const { supabase } = await import('../lib/supabase');
                                      const { data: ordre, error } = await supabase
                                        .from('ordres_travail')
                                        .select(`
                                          *,
                                          machine:machines(*),
                                          interventions:interventions!interventions_ot_fkey(
                                            *,
                                            technicien:profiles!interventions_technicien_fkey(*)
                                          )
                                        `)
                                        .eq('id', intervention.ordre_travail_id)
                                        .single();

                                      if (error) throw error;
                                      if (!ordre) throw new Error('Ordre de travail non trouvé');

                                      // Générer le PDF
                                      await generateOTCPdfReact(ordre);
                                    } catch (err) {
                                      console.error('Erreur génération PDF:', err);
                                      alert('Erreur lors de la génération du PDF');
                                    } finally {
                                      setGeneratingPDF(null);
                                    }
                                  }}
                                  disabled={generatingPDF === intervention.id}
                                  className={
                                    "p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200 hover:scale-110 " +
                                    (generatingPDF === intervention.id
                                      ? "opacity-50 pointer-events-none hover:scale-100 cursor-not-allowed"
                                      : "")
                                  }
                                  title="Télécharger le PDF de maintenance corrective"
                                >
                                  {generatingPDF === intervention.id ? (
                                    <div className="animate-spin">
                                      <FileCog size={16} />
                                    </div>
                                  ) : (
                                    <FileCog size={16} />
                                  )}
                                </button>
                              )}
                            </div>
                          
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-slate-700 mb-3 leading-relaxed">
                        {intervention.description}
                      </p>

                      {/* Pièces remplacées */}
                      {intervention.pieces_remplacees && (
                        <div className="flex items-start gap-2 p-3 bg-[#fef3f0] rounded-lg mb-3 border border-[#fcd3c1]">
                          <Package size={14} className="text-[#f15c00] mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-slate-700">
                            <span className="font-semibold">Pièces remplacées:</span>
                            <ul className="mt-1 space-y-0.5 ml-4">
                              {(() => {
                                try {
                                  const pieces = JSON.parse(intervention.pieces_remplacees);
                                  return pieces.map((piece: any, index: any) => (
                                    <li key={index} className="list-disc">
                                      {piece}
                                    </li>
                                  ));
                                } catch {
                                  return <li className="list-none">{intervention.pieces_remplacees}</li>;
                                }
                              })()}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Images */}
                      {(intervention.image_avant_url || intervention.image_apres_url) && (
                        <div className="space-y-3">
                          {intervention.image_avant_url && (
                            <div>
                              <p className="text-xs font-semibold text-slate-600 mb-2">Avant</p>
                              <div className="flex flex-wrap gap-2">
                                {JSON.parse(String(intervention.image_avant_url) as string).map(
                                  (url: string, idx: number) => (
                                    <div key={`avant-${idx}`} className="w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-200 hover:border-[#f15c00] transition-all duration-200 hover:scale-105 cursor-pointer">
                                      <img
                                        src={url}
                                        alt={`Avant ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {intervention.image_apres_url && (
                            <div>
                              <p className="text-xs font-semibold text-slate-600 mb-2">Après</p>
                              <div className="flex flex-wrap gap-2">
                                {JSON.parse(String(intervention.image_apres_url) as string).map(
                                  (url: string, idx: number) => (
                                    <div key={`apres-${idx}`} className="w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-200 hover:border-emerald-400 transition-all duration-200 hover:scale-105 cursor-pointer">
                                      <img
                                        src={url}
                                        alt={`Après ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}