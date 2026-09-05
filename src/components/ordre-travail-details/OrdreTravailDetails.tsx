import { Download, FileText, ArrowLeft, Loader2, Clock, CheckCircle, XCircle, AlertCircle, User } from 'lucide-react';
import { useOrdreTravailDetail } from '../../hooks/useOrdreTravailDetail';
import { generateOTPdf } from '../../utils/generateOTPdf';
import { generateOTCPdf } from '../../utils/generateOTCPdf';
import { generateOTPdfReact } from '../../utils/generateOTPdfReact';
import { generateOTCPdfReact } from '../../utils/generateOTCPdfReact';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ErrorState } from './ErrorState';
import { StatusHeader } from './StatusHeader';
import { DateCards } from './DateCards';
// Note: detailed sections removed — we show compact summaries instead
import { useParams, useNavigate } from 'react-router-dom';
import MainHeader from '../MainHeader';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';


export default function OrdreTravailDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { ordre, loading, error } = useOrdreTravailDetail(String(id));
  const [generatingPDF, setGeneratingPDF] = useState<boolean>(false);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !ordre) {
    return <ErrorState message={error || undefined} />;
  }

  const machine = ordre.machine;
  const client = machine?.client;
  const posteTechnique = machine?.poste_technique;
  const plan = ordre.plans_maintenance;
  const gamme = plan?.gamme;
  const technicien = ordre.profile;
  const interventionDetailsPath = (interventionId: string) =>
    profile?.role === 'admin'
      ? `/admin/intervention/${interventionId}`
      : `/mes-interventions/${interventionId}`;

  return (
    <>
      {/* Spinner global pendant la génération du PDF */}
      {generatingPDF && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <Loader2 className="w-16 h-16 animate-spin text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Génération du PDF en cours...</h3>
              <p className="text-slate-600">Préparation du document de maintenance...</p>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                <span>Veuillez patienter</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <MainHeader 
        title="Ordre de Travail"
        subtitle={`ID: ${ordre.id.slice(0, 8)}... • ${ordre.type === 'préventif' ? 'Maintenance Préventive' : 'Maintenance Corrective'}`}
        variant="compact"
        customActions={
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all duration-200 font-medium"
            title="Retour"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Retour</span>
          </button>
        }
      />

      <div className="max-w-7xl mx-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={async () => {
              setGeneratingPDF(true);
              try {
                if (ordre.type === 'préventif') {
                  await generateOTPdf(ordre);
                } else {
                  await generateOTCPdf(ordre);
                }
              } catch (err) {
                console.error('Erreur génération PDF:', err);
                alert('Erreur lors de la génération du PDF');
              } finally {
                setGeneratingPDF(false);
              }
            }}
            disabled={generatingPDF}
            className="group flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Version de base</span>
          </button>
          
          <button
            onClick={async () => {
              setGeneratingPDF(true);
              try {
                console.log('=== AVANT GÉNÉRATION PDF ===');
                console.log('Ordre passé:', ordre);
                console.log('Interventions:', ordre.interventions);
                console.log('Nombre interventions:', ordre.interventions?.length);
                
                if (ordre.type === 'préventif') {
                  await generateOTPdfReact(ordre);
                } else {
                  await generateOTCPdfReact(ordre);
                }
              } catch (err) {
                console.error('Erreur génération PDF:', err);
                alert('Erreur lors de la génération du PDF');
              } finally {
                setGeneratingPDF(false);
              }
            }}
            disabled={generatingPDF}
            className="group flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Version électronique remplie</span>
          </button>
        </div>

        <StatusHeader ordre={ordre} />

        {/* Liens OT Parent / Correctif */}
        {(ordre.ot_parent || ordre.ot_correctif) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ordre.ot_parent && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-slate-200 rounded-lg">
                      <FileText className="w-4 h-4 text-slate-700" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">OT Parent</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Cet OT correctif a été créé suite à l'OT parent:</p>
                  <button
                    onClick={() => navigate(`/ordres-travail/${ordre.ot_parent?.id}`)}
                    className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-between"
                  >
                    <span>#{ordre.ot_parent.numot}</span>
                    <span className="text-xs opacity-90">{ordre.ot_parent.type}</span>
                  </button>
                </div>
              )}

              {ordre.ot_correctif && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-slate-200 rounded-lg">
                      <FileText className="w-4 h-4 text-slate-700" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">OT Correctif Créé</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Un OT correctif a été créé suite aux anomalies détectées:</p>
                  <button
                    onClick={() => navigate(`/ordres-travail/${ordre.ot_correctif?.id}`)}
                    className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-between"
                  >
                    <span>#{ordre.ot_correctif.numot}</span>
                    <span className="text-xs opacity-90">{ordre.ot_correctif.statut}</span>
                  </button>
                </div>
              )}
            </div>
        )}

        <DateCards ordre={ordre} />

        {ordre.failure_modes && ordre.failure_modes.length > 0 && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-orange-900">Classification des défaillances</h2>
            <div className="flex flex-wrap gap-2">
              {ordre.failure_modes.map((relation, index) => {
                const mode = relation.failure_mode;
                const label = [mode?.famille?.lot?.nom, mode?.famille?.nom, mode?.nom].filter(Boolean).join(' · ');
                return <span key={`${relation.source}-${mode?.nom || index}`} className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-900">{label || 'Non classée'}</span>;
              })}
            </div>
          </div>
        )}

        {/* Compact summary: keep OT core info + small summary for machine/plan/client/code PT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Informations OT</h2>
            <div className="space-y-1 text-sm text-slate-700">
              <div>Type: {ordre.type || 'N/A'}</div>
              <div>Statut: {ordre.statut ? ordre.statut.replace('_', ' ') : 'N/A'}</div>
              <div>Date programmée: {ordre.date_programmee ? new Date(ordre.date_programmee).toLocaleDateString('fr-FR') : 'N/A'}</div>
              <div>OT #: {ordre.numot ?? 'N/A'}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Résumé</h2>
            <div className="space-y-1 text-sm text-slate-700">
              <div>Machine: {machine?.nom || 'N/A'}</div>
              <div>Type de plan: {plan?.type || 'N/A'}</div>
              <div>Client: {client?.raison_sociale || client?.prenom || 'N/A'}</div>
              <div>Code PT: {posteTechnique?.code_pt || 'N/A'}</div>
            </div>
          </div>
        </div>

        {ordre.observations && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-gray-50">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Observations</h2>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {ordre.observations}
            </p>
          </div>
        )}

        {/* Removed detailed steps and interventions for a compact view per request */}
        {/* Interventions (compact list) */}
        {ordre.interventions && ordre.interventions.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-800">Interventions ({ordre.interventions.length})</h3>
            </div>
            <div className="space-y-2">
              {ordre.interventions.map((i: any) => (
                <div key={i.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-slate-700 text-sm">
                      <div className="font-medium">{i.technicien?.nom || '—'}</div>
                      <div className="text-xs text-slate-500">{i.date_debut ? new Date(i.date_debut).toLocaleString('fr-FR') : '—'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {i.resultat === 'réussi' ? <CheckCircle className="text-green-600" /> : i.resultat === 'partiel' ? <AlertCircle className="text-yellow-600" /> : i.resultat === 'échec' ? <XCircle className="text-red-600" /> : <AlertCircle className="text-slate-400" />}
                      <span className="text-sm text-slate-700">{i.resultat || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {i.valide ? <span className="text-xs text-emerald-700">Validée</span> : <span className="text-xs text-amber-700">En attente</span>}
                    <button
                      onClick={() => navigate(interventionDetailsPath(i.id))}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm"
                    >
                      Voir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
