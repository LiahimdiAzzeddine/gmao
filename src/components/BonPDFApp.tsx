import { useState, useEffect } from 'react';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { useIntervention } from '../hooks/useIntervention';
import { generateInterventionPDF } from '../services/pdfGenerator';
import { getInterventionIdFromUrl } from '../utils/url';
import { Alert } from './Alert';
import Loading from './Ui/Loading';
import { useNavigate } from 'react-router-dom';

export default function BonPDFApp() {
  const [interventionId, setInterventionId] = useState<string | null>(null);
  const { data, loading: fetchLoading, error: fetchError } = useIntervention(interventionId);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const id = getInterventionIdFromUrl();
    setInterventionId(id);
  }, []);

  const handleGeneratePDF = async () => {
    if (!data) {
      setPdfError('Aucune donnée d\'intervention disponible');
      return;
    }

    setPdfLoading(true);
    setPdfError('');
    setSuccess(false);

    try {
      await generateInterventionPDF(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('PDF generation error:', err);
      setPdfError('Erreur lors de la génération du PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  if (!interventionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
          <Alert
            type="error"
            message="Aucun ID d'intervention fourni dans l'URL. Veuillez accéder à cette page avec un paramètre ?id=..."
          />
        </div>
      </div>
    );
  }

  if (fetchLoading) {
    return (
        <Loading
            variant="spinner"
            size="lg"
            fullScreen={true}
            message="Chargement en cours..."
          />
    );
  }
   if (fetchError) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-all hover:gap-3"
            >
              <ArrowLeft size={20} />
              Retour
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-gray-700 bg-clip-text text-transparent">
                Intervention N° {data?.intervention_number}
              </h1>
            </div>
          </div>
        </div>

        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-amber-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md border border-orange-100">
            <Alert type="error" message={fetchError} />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-all hover:gap-3"
            >
              <ArrowLeft size={20} />
              Retour
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-gray-700 bg-clip-text text-transparent">
                Intervention introuvable
              </h1>
            </div>
          </div>
        </div>

        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-amber-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md border border-orange-100">
            <Alert type="error" message="Intervention introuvable" />
          </div>
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
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-all hover:gap-3"
          >
            <ArrowLeft size={20} />
            Retour
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-gray-700 bg-clip-text text-transparent">
              Intervention N° {data.intervention_number}
            </h1>
          </div>
        </div>
      </div>
      
      {/* Contenu principal */}
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-orange-100">
            {/* Titre avec icône */}
            <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-orange-100">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-3 shadow-lg" style={{ backgroundColor: '#f15c00' }}>
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Bon d'Intervention Corrective
                </h1>
                <p className="text-sm text-gray-500 mt-1">Intervention N° {data.intervention_number}</p>
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
                    <span className="text-gray-600">{data.client.raison_sociale}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold text-gray-700 min-w-[90px]">Machine :</span>
                    <span className="text-gray-600">{data.machine.nom}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold text-gray-700 min-w-[90px]">Lieu :</span>
                    <span className="text-gray-600">{data.work_location}</span>
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
                    <span className="text-gray-600">{data.intervention_type}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 min-w-[90px]">Statut :</span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{ backgroundColor: '#f15c00' }}>
                      {data.status}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold text-gray-700 min-w-[90px]">Date :</span>
                    <span className="text-gray-600">{data.created_at}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description des travaux */}
            {data.work_description && data.work_description !== 'N/A' && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border-2 mb-6 shadow-md" style={{ borderColor: '#f15c00' }}>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f15c00' }}></div>
                  Description des travaux
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">{data.work_description}</p>
              </div>
            )}

            {/* Matériel utilisé */}
            {data.materials && data.materials.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border-2 mb-6 shadow-md" style={{ borderColor: '#f15c00' }}>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f15c00' }}></div>
                  Matériel utilisé
                </h3>
                <div className="space-y-2">
                  {data.materials.map((material, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{material.designation}</span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: '#f15c00' }}>
                        x{material.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Techniciens */}
            {data.technicians && data.technicians.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border-2 mb-8 shadow-md" style={{ borderColor: '#f15c00' }}>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f15c00' }}></div>
                  Technicien(s)
                </h3>
                <div className="space-y-2">
                  {data.technicians.map((tech, index) => (
                    <div key={index} className="text-sm text-gray-700 font-medium">
                      • {tech.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {/* Info PDF */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border-2 shadow-md" style={{ borderColor: '#f15c00' }}>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: '#f15c00' }} />
                À propos du PDF
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5"></span>
                  <span>Format A4 professionnel avec en-tête et pied de page</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5"></span>
                  <span>Tableaux détaillés pour les matériels et la main d'œuvre</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5"></span>
                  <span>Sections de validation client et prestataire</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5"></span>
                  <span>QR code pour traçabilité et authentification</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
