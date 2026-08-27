import React, { useState } from 'react';
import { 
  Wrench, Calendar, User, CheckCircle2, XCircle, AlertCircle, 
  Eye, EyeOff, ChevronDown, ChevronUp, FileText, Package, Image as ImageIcon
} from 'lucide-react';
import { MachineState, getMachineStateConfig } from '../../types/machineState';
import { getStatutEtapeConfig } from '../../types/etapeGamme';
import { getInterventionValidationLabel } from '../../utils/interventionStatus';

interface Intervention {
  id: string;
  date_debut: string;
  date_fin: string | null;
  duree_minutes: number | null;
  resultat: 'réussi' | 'partiel' | 'échec' | null;
  etat_machine_apres: MachineState;
  pieces_remplacees: any[];
  etapes_gamme_checkees: any[];
  image_avant_urls: string[];
  image_apres_urls: string[];
  commentaire: string | null;
  valide: boolean;
  valide_par: string | null;
  valide_le: string | null;
  created_at: string;
  updated_at: string;
  technicien: {
    id: string;
    nom: string;
    email: string | null;
  };
  validateur: {
    id: string;
    nom: string;
  } | null;
}

interface InterventionSectionProps {
  interventions: Intervention[];
}

export const InterventionSection: React.FC<InterventionSectionProps> = ({ interventions }) => {
  const [expandedIntervention, setExpandedIntervention] = useState<string | null>(null);
  const [showImages, setShowImages] = useState<{ [key: string]: boolean }>({});

  if (!interventions || interventions.length === 0) {
    return null;
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuree = (minutes: number | null): string => {
    if (!minutes) return 'Non renseignée';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const getResultatIcon = (resultat: string | null) => {
    switch (resultat) {
      case 'réussi': return <CheckCircle2 size={16} className="text-green-600" />;
      case 'partiel': return <AlertCircle size={16} className="text-yellow-600" />;
      case 'échec': return <XCircle size={16} className="text-red-600" />;
      default: return <AlertCircle size={16} className="text-gray-600" />;
    }
  };

  const getResultatColor = (resultat: string | null): string => {
    switch (resultat) {
      case 'réussi': return 'bg-green-100 text-green-800 border-green-200';
      case 'partiel': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'échec': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEtatMachineColor = (etat: MachineState): string => {
    const config = getMachineStateConfig(etat);
    return `${config.bgColor} ${config.textColor} ${config.borderColor}`;
  };

  const toggleExpanded = (interventionId: string) => {
    setExpandedIntervention(
      expandedIntervention === interventionId ? null : interventionId
    );
  };

  const toggleImages = (interventionId: string) => {
    setShowImages(prev => ({
      ...prev,
      [interventionId]: !prev[interventionId]
    }));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-blue-50">
          <Wrench className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Interventions réalisées
          </h2>
          <p className="text-sm text-gray-500">
            {interventions.length} intervention{interventions.length > 1 ? 's' : ''} enregistrée{interventions.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {interventions.map((intervention) => {
          const isExpanded = expandedIntervention === intervention.id;
          const showInterventionImages = showImages[intervention.id];

          return (
            <div key={intervention.id} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* En-tête de l'intervention */}
              <div 
                className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleExpanded(intervention.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getResultatIcon(intervention.resultat)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getResultatColor(intervention.resultat)}`}>
                        {intervention.resultat || 'Non défini'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar size={14} />
                      {formatDate(intervention.date_debut)}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User size={14} />
                      {intervention.technicien.nom}
                    </div>

                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${
                      intervention.valide 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }`}>
                      {getInterventionValidationLabel(intervention.valide, 'admin')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {formatDuree(intervention.duree_minutes)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Détails de l'intervention */}
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {/* Informations détaillées */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Date de fin:</span>
                      <p className="font-medium">
                        {intervention.date_fin ? formatDate(intervention.date_fin) : 'En cours'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Durée:</span>
                      <p className="font-medium">{formatDuree(intervention.duree_minutes)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">État machine après:</span>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getEtatMachineColor(intervention.etat_machine_apres)}`}>
                        {getMachineStateConfig(intervention.etat_machine_apres).label}
                      </span>
                    </div>
                  </div>

                  {/* Validation */}
                  {intervention.valide && intervention.valide_le && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle2 size={16} />
                        <span className="font-medium">{getInterventionValidationLabel(true, 'admin')}</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        Validée le {formatDate(intervention.valide_le)}
                        {intervention.validateur && ` par ${intervention.validateur.nom}`}
                      </p>
                    </div>
                  )}

                  {/* Pièces remplacées */}
                  {intervention.pieces_remplacees && intervention.pieces_remplacees.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <Package size={16} />
                        Pièces remplacées
                      </h4>
                      <div className="space-y-2">
                        {intervention.pieces_remplacees.map((piece: any, index: number) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{piece.nom}</p>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span>Quantité: {piece.quantite}</span>
                                  {piece.reference && <span>Réf: {piece.reference}</span>}
                                </div>
                              </div>
                            </div>
                            {piece.commentaire && (
                              <p className="text-sm text-gray-600 mt-2">{piece.commentaire}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Étapes de gamme */}
                  {intervention.etapes_gamme_checkees && intervention.etapes_gamme_checkees.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <FileText size={16} />
                        Étapes de gamme
                      </h4>
                      <div className="space-y-2">
                        {intervention.etapes_gamme_checkees.map((etape: any, index: number) => {
                          const statutConfig = getStatutEtapeConfig(etape.statut);
                          return (
                            <div key={index} className={`rounded-lg p-3 border-2 ${statutConfig.bgColor} ${statutConfig.borderColor}`}>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{statutConfig.icon}</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statutConfig.badgeColor}`}>
                                    {statutConfig.label}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-[#f15c00] text-white text-xs font-bold px-2 py-1 rounded">
                                      #{etape.ordre}
                                    </span>
                                    <p className="font-medium text-gray-900">{etape.description}</p>
                                  </div>
                                  {etape.commentaire && (
                                    <p className="text-sm text-gray-600 mt-2 ml-8">{etape.commentaire}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Images */}
                  {(intervention.image_avant_urls.length > 0 || intervention.image_apres_urls.length > 0) && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <ImageIcon size={16} />
                          Photos de l'intervention
                        </h4>
                        <button
                          onClick={() => toggleImages(intervention.id)}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                          {showInterventionImages ? (
                            <>
                              <EyeOff size={14} />
                              Masquer
                            </>
                          ) : (
                            <>
                              <Eye size={14} />
                              Afficher ({intervention.image_avant_urls.length + intervention.image_apres_urls.length})
                            </>
                          )}
                        </button>
                      </div>

                      {showInterventionImages && (
                        <div className="space-y-4">
                          {intervention.image_avant_urls.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Photos avant intervention</h5>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {intervention.image_avant_urls.map((url, index) => (
                                  <img
                                    key={index}
                                    src={url}
                                    alt={`Avant ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:scale-105 transition-transform cursor-pointer"
                                    onClick={() => window.open(url, '_blank')}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {intervention.image_apres_urls.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Photos après intervention</h5>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {intervention.image_apres_urls.map((url, index) => (
                                  <img
                                    key={index}
                                    src={url}
                                    alt={`Après ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:scale-105 transition-transform cursor-pointer"
                                    onClick={() => window.open(url, '_blank')}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Commentaire */}
                  {intervention.commentaire && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Commentaire</h4>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-700 whitespace-pre-wrap">{intervention.commentaire}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
