import { useState, useEffect } from 'react';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { generateInterventionPDFFromNew } from '../utils/generateInterventionPDF';
import { Alert } from './Alert';
import Loading from './Ui/Loading';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface BonPDFAppNewProps {
  interventionId: string;
  onClose?: () => void;
}

export default function BonPDFAppNew({ interventionId, onClose }: BonPDFAppNewProps) {
  const [intervention, setIntervention] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [pdfError, setPdfError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadIntervention();
  }, [interventionId]);

  const loadIntervention = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('interventions')
        .select(`
          *,
          ordre_travail:ordres_travail!interventions_ot_fkey(
            *,
            machine:machines(
              *,
              client:clients(*)
            )
          ),
          technicien:profiles!interventions_technicien_fkey(*)
        `)
        .eq('id', interventionId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Intervention introuvable');

      setIntervention(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!intervention) {
      setPdfError('Aucune donnée d\'intervention disponible');
      return;
    }

    setPdfLoading(true);
    setPdfError('');
    setSuccess(false);

    try {
      await generateInterventionPDFFromNew(interventionId);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      setPdfError('Erreur lors de la génération du PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <Loading
        variant="spinner"
        size="lg"
        fullScreen={true}
        message="Chargement en cours..."
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md border border-orange-100">
          <Alert type="error" message={error} />
          {onClose && (
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!intervention) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md border border-orange-100">
          <Alert type="error" message="Intervention introuvable" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={onClose || (() => navigate(-1))}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-all hover:gap-3"
          >
            <ArrowLeft size={20} />
            Retour
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-gray-700 bg-clip-text text-transparent">
              Bon d'Intervention N° {intervention.id.substring(0, 8)}
            </h1>
          </div>
        </div>
      </div>
      
      {/* Contenu principal */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-orange-100">
            {/* Titre avec icône */}
            <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-orange-100">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-3 shadow-lg" style={{ backgroundColor: '#f15c00' }}>
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Bon d'Intervention
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Intervention N° {intervention.id.substring(0, 8)}
                </p>
              </div>
            </div>

            {pdfError && <Alert type="error" message={pdfError} />}
            {success && <Alert type="success" message="PDF généré avec succès!" />}

            {/* Grille d'informations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border-2 shadow-md hover:shadow-lg transition-shadow" style={{ borderColor: '#f15c00' }}>
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                  <div className="rounded-full p-1" style={{ backgroundColor: '#f15c00' }}>
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  Informations Client
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex">
                    <span className="font-semibold text-gray-700 min-w-[90px]">Client :</span>
                    <span className="text-gray-600">{intervention.ordre_travail?.machine?.client?.raison_sociale || 'N/A'}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold text-gray-700 min-w-[90px]">Machine :</span>
                    <span className="text-gray-600">{intervention.ordre_travail?.machine?.nom || 'N/A'}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold text-gray-700 min-w-[90px]">Lieu :</span>
                    <span className="text-gray-600">{intervention.ordre_travail?.machine?.localisation || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border-2 shadow-md hover:shadow-lg transition-shadow" style={{ borderColor: '#f15c00' }}>
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                  <div className="rounded-full p-1" style={{ backgroundColor: '#f15c00' }}>
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  Détails Intervention
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex">
                    <span className="font-semibold text-gray-700 min-w-[90px]">Type :</span>
                    <span className="text-gray-600">{intervention.ordre_travail?.type || 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 min-w-[90px]">Statut :</span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{ backgroundColor: '#f15c00' }}>
                      {intervention.valide ? 'Validée' : 'En attente'}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold text-gray-700 min-w-[90px]">Date :</span>
                    <span className="text-gray-600">{new Date(intervention.date_debut).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description des travaux */}
            {intervention.actions_realisees && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border-2 mb-6 shadow-md" style={{ borderColor: '#f15c00' }}>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f15c00' }}></div>
                  Actions réalisées
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">{intervention.actions_realisees}</p>
              </div>
            )}

            {/* Pièces remplacées */}
            {intervention.pieces_remplacees && intervention.pieces_remplacees.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border-2 mb-6 shadow-md" style={{ borderColor: '#f15c00' }}>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f15c00' }}></div>
                  Pièces remplacées
                </h3>
                <div className="space-y-2">
                  {intervention.pieces_remplacees.map((piece: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{piece.nom || piece.description}</span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: '#f15c00' }}>
                        x{piece.quantite || 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technicien */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border-2 mb-8 shadow-md" style={{ borderColor: '#f15c00' }}>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f15c00' }}></div>
                Technicien
              </h3>
              <div className="text-sm text-gray-700 font-medium">
                • {intervention.technicien?.nom || 'N/A'}
              </div>
            </div>

            {/* Bouton de téléchargement */}
            <div className="flex justify-center mb-8">
              <button
                onClick={handleGeneratePDF}
                disabled={pdfLoading}
                className="flex items-center gap-3 px-10 py-4 text-white rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: '#f15c00',
                  background: 'linear-gradient(135deg, #f15c00 0%, #ff7a33 100%)'
                }}
              >
                <Download className="w-6 h-6" />
                {pdfLoading ? 'Génération en cours...' : 'Télécharger le PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}