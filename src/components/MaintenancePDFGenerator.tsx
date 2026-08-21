import { useState, useEffect } from 'react';
import { FileText, Download, Loader, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { supabase,MaintenanceData } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import Loading from './Ui/Loading';

export default function MaintenancePDFApp() {
  const [data, setData] = useState<MaintenanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
function formatTempsPasse(temps: string) {
  const [hours, minutes] = temps.split(':').map(Number);

  if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}min`;
  }
}
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    if (id) {
      fetchDataFromSupabase(id);
    } else {
      setError("Aucun ID d'intervention trouvé dans l'URL");
      setLoading(false);
    }
  }, []);

  const fetchDataFromSupabase = async (id: string) => {
    setLoading(true);
    setError('');
    
    try {
      const { data: intervention, error: interventionError } = await supabase
        .from("interventions")
        .select("*")
        .eq("id", id)
        .single();

      if (interventionError) throw new Error('Intervention non trouvée');
      if (!intervention) throw new Error('Aucune intervention trouvée');

      let technicienNom = "Inconnu";
      if (intervention.technicien_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nom")
          .eq("id", intervention.technicien_id)
          .single();
        if (profile) technicienNom = profile.nom;
      }

      const { data: demande } = await supabase
        .from("demande_intervention")
        .select("*")
        .eq("id", intervention.demande_id)
        .single();

      if (!demande) throw new Error('Demande non trouvée');

      const { data: machine } = await supabase
        .from("machines")
        .select("*")
        .eq("id", demande.machine_id)
        .single();

      if (!machine) throw new Error('Machine non trouvée');

      const { data: actions } = await supabase
        .from("actions_preventives")
        .select("*")
        .eq("machine_id", machine.id);

      // Récupérer les actions validées pour cette intervention
      const { data: validatedActions } = await supabase
        .from("intervention_action_preventive")
        .select("action_preventive_id, valide")
        .eq("intervention_id", id);

      const checks: Record<string, boolean> = {};
      const checksWithLabels: Array<{ action: string; checked: boolean; label: string }> = [];
      
      actions?.forEach((a) => {
        const validated = validatedActions?.find(v => v.action_preventive_id === a.id);
        const isChecked = validated?.valide || false;
        
        checks[a.action] = isChecked;
        checksWithLabels.push({
          action: a.action,
          checked: isChecked,
          label: a.label || "Autres"
        });
      });

      const formatted: MaintenanceData = {
        bonNumber: intervention.id.substring(0, 8),
        visitInfo: intervention.visitinfo 
          ? `${intervention.visitinfo}ème visite`
          : "Visite de maintenance",
        gamme: demande.gamme ?? "N/A",
        materiel: `${machine.nom} ${machine.modele || ''} ${machine.numero_serie || ''}`.trim(),
        qte: machine.qte ?? 1,
        semaine: "",
        date: intervention.date_intervention
          ? new Date(intervention.date_intervention).toLocaleDateString('fr-FR')
          : "",
        localisation: machine.localisation || "N/A",
        machineName: machine.nom || "N/A",
        machineId: machine.id,
        Checks: checks,
        ChecksWithLabels: checksWithLabels,
        etatMateriel: machine.etat || "En service",
        remarque: intervention.description || "",
        intervenants: [
          {
            technicienNom,
            tempsPasse: intervention.temps_passe
              ? String(intervention.temps_passe)
              : "N/A",
          },
        ],
        dateDebut: intervention.date_intervention
          ? new Date(intervention.date_intervention).toLocaleDateString('fr-FR')
          : "",
        heureDebut: intervention.heuredebut ?? "",
      };

      setData(formatted);
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la récupération des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const wrapText = (text: string, maxWidth: number, font: any, fontSize: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const generatePDF = async () => {
    if (!data) return;
    
    try {
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([595, 842]);
      const form = pdfDoc.getForm();
      
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const { width: pageWidth, height: pageHeight } = page.getSize();
      let yPos = pageHeight - 40;

      // Générer le QR code
      const baseUrl = window.location.origin;
      const qrUrl = `${baseUrl}/machine/${data.machineId}/?tab=historique`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 80,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Convertir le QR code en image pour le PDF
      const qrCodeImage = await pdfDoc.embedPng(qrCodeDataUrl);
      const qrSize = 80;

      // Dessiner le QR code en haut à droite
      page.drawImage(qrCodeImage, {
        x: pageWidth - qrSize - 30,
        y: pageHeight - qrSize - 30,
        width: qrSize,
        height: qrSize,
      });

      // Ajouter un texte sous le QR code
      page.drawText('Scanner pour', {
        x: pageWidth - qrSize - 25,
        y: pageHeight - qrSize - 40,
        size: 10,
        font: helveticaFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      page.drawText('voir la machine', {
        x: pageWidth - qrSize - 25,
        y: pageHeight - qrSize - 48,
        size: 10,
        font: helveticaFont,
        color: rgb(0.3, 0.3, 0.3),
      });

      page.drawText(`Bon de Préventif N°${data.bonNumber}`, {
        x: pageWidth / 2 - helveticaBold.widthOfTextAtSize(`Bon de Préventif N°${data.bonNumber}`, 16) / 2,
        y: yPos,
        size: 16,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
      
      yPos -= 20;
      page.drawText(data.visitInfo, {
        x: pageWidth / 2 - helveticaFont.widthOfTextAtSize(data.visitInfo, 12) / 2,
        y: yPos,
        size: 12,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      yPos -= 90;
      page.drawLine({
        start: { x: 30, y: yPos },
        end: { x: pageWidth - 30, y: yPos },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      yPos -= 10;

      const tableHeaders = ['Gamme', 'Matériel', 'Qté', 'Semaine', 'Date', 'Localisation'];
const colWidth = (pageWidth - 60) / 6;

// Dessin des headers
tableHeaders.forEach((header, i) => {
  page.drawRectangle({
    x: 30 + i * colWidth,
    y: yPos - 15,
    width: colWidth,
    height: 15,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawText(header, {
    x: 32 + i * colWidth,
    y: yPos - 10,
    size: 9,
    font: helveticaBold,
  });
});

yPos -= 15;

// Dessin des données
const tableData = [
  data.gamme,
  data.materiel,
  data.qte.toString(),
  data.semaine,
  data.date,
  data.localisation,
];

// 1️⃣ Calculer la hauteur de la ligne en fonction du texte
let maxLines = 0;
const wrappedCells = tableData.map((cell) => {
  const lines = wrapText(cell, colWidth - 4, helveticaFont, 8); // wrapText renvoie un tableau de lignes
  if (lines.length > maxLines) maxLines = lines.length;
  return lines;
});
const rowHeight = maxLines * 10 + 6; // 10 = taille de la ligne, +6 = padding

// 2️⃣ Dessiner chaque cellule avec la hauteur calculée
tableData.forEach((cell, i) => {
  page.drawRectangle({
    x: 30 + i * colWidth,
    y: yPos - rowHeight,
    width: colWidth,
    height: rowHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  const lines = wrappedCells[i];
  lines.forEach((line, j) => {
    page.drawText(line, {
      x: 32 + i * colWidth,
      y: yPos - 10 - j * 10, // yPos - padding - ligne * lineHeight
      size: 8,
      font: helveticaFont,
    });
  });
});

yPos -= rowHeight+15;

      
      // page.drawText('(F=fait ; A=Annulé ; sinon Reste à faire):', {
      //   x: 30,
      //   y: yPos,
      //   size: 8,
      //   font: helveticaFont,
      //   color: rgb(0.5, 0.5, 0.5),
      // });
      // yPos -= 20;

      // Grouper les checks par label
      const groupedChecks: Record<string, Array<{ action: string; checked: boolean }>> = {};
      
      data.ChecksWithLabels.forEach((check) => {
        const label = check.label || "Autres";
        if (!groupedChecks[label]) {
          groupedChecks[label] = [];
        }
        groupedChecks[label].push({
          action: check.action,
          checked: check.checked
        });
      });

      // Trier les labels alphabétiquement
      const sortedLabels = Object.keys(groupedChecks).sort();

      // Parcourir chaque groupe
      let checkIndex = 0;
      sortedLabels.forEach((label) => {
        if (yPos < 120) {
          page = pdfDoc.addPage([595, 842]);
          yPos = page.getHeight() - 40;
        }

        // Dessiner le titre du groupe (label)
        page.drawRectangle({
          x: 30,
          y: yPos - 15,
          width: pageWidth - 60,
          height: 15,
          color: rgb(0.2, 0.2, 0.2),
        });
        page.drawText(label.toUpperCase(), {
          x: 35,
          y: yPos - 10,
          size: 10,
          font: helveticaBold,
          color: rgb(1, 1, 1),
        });
        yPos -= 25;

        // Dessiner les checks de ce groupe
        groupedChecks[label].forEach((check) => {
          if (yPos < 100) {
            page = pdfDoc.addPage([595, 842]);
            yPos = page.getHeight() - 40;
          }

          const checkBox = form.createCheckBox(`check_${checkIndex}`);
          checkBox.addToPage(page, {
            x: 35,
            y: yPos - 10,
            width: 10,
            height: 10,
            borderWidth: 1,
            borderColor: rgb(0, 0, 0),
          });
          
          if (check.checked) {
            checkBox.check();
          }

          const lines = wrapText(check.action, pageWidth - 120, helveticaFont, 8);
          lines.forEach((line, i) => {
            page.drawText(line, {
              x: 50,
              y: yPos - 8 - i * 10,
              size: 8,
              font: helveticaFont,
            });
          });

          yPos -= Math.max(20, lines.length * 10 + 5);
          checkIndex++;
        });

        // Ajouter un espace entre les groupes
        yPos -= 10;
      });

      yPos -= 10;

      if (yPos < 100) {
        page = pdfDoc.addPage([595, 842]);
        yPos = page.getHeight() - 40;
      }

      page.drawText('Etat du matériel :', {
        x: 30,
        y: yPos,
        size: 9,
        font: helveticaBold,
      });
      
      const etats = ['En service', 'En panne', 'Hors service'];
      const radioGroup = form.createRadioGroup('etat_materiel');
      let xOffset = 110;
      etats.forEach((etat) => {
        radioGroup.addOptionToPage(etat, page, {
          x: xOffset,
          y: yPos - 8,
          width: 10,
          height: 10,
          borderWidth: 1,
        });
        
        if (data.etatMateriel === etat) {
          radioGroup.select(etat);
        }
        
        page.drawText(etat, {
          x: xOffset + 15,
          y: yPos - 5,
          size: 8,
          font: helveticaFont,
        });
        xOffset += 90;
      });
      yPos -= 25;

      page.drawText('Remarque :', {
        x: 30,
        y: yPos,
        size: 9,
        font: helveticaBold,
      });
      
      if (data.remarque) {
        const remarqueLines = wrapText(data.remarque, pageWidth - 100, helveticaFont, 8);
        remarqueLines.forEach((line, i) => {
          page.drawText(line, {
            x: 90,
            y: yPos - i * 10,
            size: 8,
            font: helveticaFont,
          });
        });
        yPos -= remarqueLines.length * 10 + 10;
      } else {
        page.drawLine({
          start: { x: 90, y: yPos - 2 },
          end: { x: pageWidth - 30, y: yPos - 2 },
          thickness: 0.5,
        });
        yPos -= 15;
      }

      page.drawRectangle({
        x: 30,
        y: yPos - 15,
        width: (pageWidth - 60) * 0.7,
        height: 15,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      page.drawText('Nom(s) Intervenant(s)', {
        x: 35,
        y: yPos - 10,
        size: 9,
        font: helveticaBold,
      });
      
      page.drawRectangle({
        x: 30 + (pageWidth - 60) * 0.7,
        y: yPos - 15,
        width: (pageWidth - 60) * 0.3,
        height: 15,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      page.drawText('Temps passé', {
        x: 35 + (pageWidth - 60) * 0.7,
        y: yPos - 10,
        size: 9,
        font: helveticaBold,
      });
      
      yPos -= 15;

      data.intervenants.forEach((int, idx) => {
        page.drawRectangle({
          x: 30,
          y: yPos - 15,
          width: (pageWidth - 60) * 0.7,
          height: 15,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });
        page.drawText(`${idx + 1}. ${int.technicienNom}`, {
          x: 35,
          y: yPos - 10,
          size: 8,
          font: helveticaFont,
        });
        
        page.drawRectangle({
          x: 30 + (pageWidth - 60) * 0.7,
          y: yPos - 15,
          width: (pageWidth - 60) * 0.3,
          height: 15,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });
     page.drawText(formatTempsPasse(int.tempsPasse), { 
  x: 35 + (pageWidth - 60) * 0.7,
  y: yPos - 10,
  size: 8,
  font: helveticaFont,
});

        
        yPos -= 15;
      });

      yPos -= 15;

      page.drawText(`Date de Début : ${data.dateDebut}`, {
        x: 30,
        y: yPos,
        size: 9,
        font: helveticaBold,
      });
      page.drawText(`Heure : ${data.heureDebut}`, {
        x: 30,
        y: yPos - 12,
        size: 9,
        font: helveticaBold,
      });
      
      page.drawText('Visa du Client', {
        x: pageWidth - 120,
        y: yPos,
        size: 9,
        font: helveticaBold,
      });
      page.drawRectangle({
        x: pageWidth - 120,
        y: yPos - 60,
        width: 90,
        height: 50,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bon_Preventif_${data.bonNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Erreur lors de la génération du PDF');
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
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-colors"
            >
              <ArrowLeft size={20} />
              Retour
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Bon N° {data?.bonNumber}
              </h1>
            </div>
          </div>
        </div>

        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-amber-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md border border-orange-100">
            <div className="bg-red-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Erreur</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-sm text-gray-500">Veuillez vérifier l'URL et réessayer</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
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
              Bon N° {data?.bonNumber}
            </h1>
          </div>
        </div>
      </div>
      
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-orange-100">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-orange-100">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-3 shadow-lg" style={{ backgroundColor: '#f15c00' }}>
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Bon d'Intervention
                </h1>
                <p className="text-sm text-gray-500 mt-1">Bon N° {data?.bonNumber}</p>
              </div>
            </div>

            {data && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border-2 shadow-md hover:shadow-lg transition-shadow" style={{ borderColor: '#f15c00' }}>
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                      <div className="rounded-full p-1" style={{ backgroundColor: '#f15c00' }}>
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      Informations Machine
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex">
                        <span className="font-semibold text-gray-700 min-w-[110px]">Matériel :</span>
                        <span className="text-gray-600">{data.materiel}</span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold text-gray-700 min-w-[110px]">Localisation :</span>
                        <span className="text-gray-600">{data.localisation}</span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold text-gray-700 min-w-[110px]">Date :</span>
                        <span className="text-gray-600">{data.date}</span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold text-gray-700 min-w-[110px]">Gamme :</span>
                        <span className="text-gray-600">{data.gamme}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border-2 shadow-md hover:shadow-lg transition-shadow" style={{ borderColor: '#f15c00' }}>
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                      <div className="rounded-full p-1" style={{ backgroundColor: '#f15c00' }}>
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      Intervention
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex">
                        <span className="font-semibold text-gray-700 min-w-[110px]">Type :</span>
                        <span className="text-gray-600">{data.visitInfo}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-700 min-w-[110px]">État :</span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{ backgroundColor: '#f15c00' }}>
                          {data.etatMateriel}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold text-gray-700 min-w-[110px]">Vérifications :</span>
                        <span className="text-gray-600">
                          {Object.values(data.Checks).filter(v => v).length}/{Object.keys(data.Checks).length} complétées
                        </span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold text-gray-700 min-w-[110px]">Intervenant :</span>
                        <span className="text-gray-600">{data.intervenants[0]?.technicienNom}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {data.remarque && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border-2 mb-8 shadow-md" style={{ borderColor: '#f15c00' }}>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f15c00' }}></div>
                      Remarque
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{data.remarque}</p>
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <button
                    onClick={generatePDF}
                    className="flex items-center gap-3 px-10 py-4 text-white rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-lg font-semibold"
                    style={{ 
                      backgroundColor: '#f15c00',
                      background: 'linear-gradient(135deg, #f15c00 0%, #ff7a33 100%)'
                    }}
                  >
                    <Download className="w-6 h-6" />
                    Télécharger le PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

}
