import { supabase } from '../lib/supabase';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { loadBahijFontsForPdfLib } from './fontLoader';

interface MaintenanceData {
  bonNumber: string;
  visitInfo: string;
  gamme: string;
  materiel: string;
  qte: number;
  semaine: string;
  date: string;
  localisation: string;
  machineName: string;
  machineId: string;
  Checks: Record<string, boolean>;
  ChecksWithLabels: Array<{ action: string; checked: boolean; label: string }>;
  etatMateriel: string;
  remarque: string;
  intervenants: Array<{
    technicienNom: string;
    tempsPasse: string;
  }>;
  dateDebut: string;
  heureDebut: string;
}

export async function generateMaintenancePDFFromNew(interventionId: string) {
  try {
    // Récupérer les données complètes de l'intervention préventive
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        ordre_travail:ordres_travail(
          *,
          machine:machines(
            *,
            client:clients(*),
            poste_technique:postes_techniques(*)
          ),
          plans_maintenance:plan_id(
            *,
            gamme:gammes_maintenance(
              *,
              etapes_gamme:etapes_gamme(*)
            )
          )
        ),
        technicien:profiles!interventions_technicien_fkey(*)
      `)
      .eq('id', interventionId)
      .maybeSingle();

    if (interventionError) {
      throw interventionError;
    }

    if (!intervention) {
      throw new Error('Intervention introuvable');
    }

    // Transformer les étapes de gamme en checks
    const checks: Record<string, boolean> = {};
    const checksWithLabels: Array<{ action: string; checked: boolean; label: string }> = [];

    if (intervention.etapes_gamme_checkees && Array.isArray(intervention.etapes_gamme_checkees)) {
      intervention.etapes_gamme_checkees.forEach((etape: any) => {
        checks[etape.description] = etape.ok || false;
        checksWithLabels.push({
          action: etape.description,
          checked: etape.ok || false,
          label: "Maintenance préventive"
        });
      });
    }

    // Si pas d'étapes checkées, utiliser les étapes de la gamme
    if (checksWithLabels.length === 0 && intervention.ordre_travail?.plans_maintenance?.gamme?.etapes_gamme) {
      intervention.ordre_travail.plans_maintenance.gamme.etapes_gamme.forEach((etape: any) => {
        checks[etape.description] = false;
        checksWithLabels.push({
          action: etape.description,
          checked: false,
          label: "Maintenance préventive"
        });
      });
    }

    // Calculer la durée formatée
    const formatTempsPasse = (minutes: number) => {
      if (!minutes) return "N/A";
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (mins === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${mins}min`;
      }
    };

    // Transformer les données pour le format attendu par le générateur PDF
    const transformedData: MaintenanceData = {
      bonNumber: intervention.id.substring(0, 8),
      visitInfo: "Maintenance préventive",
      gamme: intervention.ordre_travail?.plans_maintenance?.gamme?.nom || "N/A",
      materiel: `${intervention.ordre_travail?.machine?.nom || ''} ${intervention.ordre_travail?.machine?.modele || ''} ${intervention.ordre_travail?.machine?.numero_serie || ''}`.trim(),
      qte: intervention.ordre_travail?.machine?.qte || 1,
      semaine: `S${Math.ceil(new Date(intervention.date_debut).getDate() / 7)}` || "",
      date: new Date(intervention.date_debut).toLocaleDateString('fr-FR'),
      localisation: intervention.ordre_travail?.machine?.localisation || "N/A",
      machineName: intervention.ordre_travail?.machine?.nom || "N/A",
      machineId: intervention.ordre_travail?.machine?.id || "",
      Checks: checks,
      ChecksWithLabels: checksWithLabels,
      etatMateriel: intervention.etat_machine_apres || "En service",
      remarque: intervention.commentaire || "",
      intervenants: [{
        technicienNom: intervention.technicien?.nom || "N/A",
        tempsPasse: formatTempsPasse(intervention.duree_minutes || 0),
      }],
      dateDebut: new Date(intervention.date_debut).toLocaleDateString('fr-FR'),
      heureDebut: new Date(intervention.date_debut).toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };

    // Générer le PDF
    await generateMaintenancePDF(transformedData);
    
  } catch (error) {
    console.error('Erreur lors de la génération du PDF de maintenance:', error);
    throw error;
  }
}

async function generateMaintenancePDF(data: MaintenanceData) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]);
  const form = pdfDoc.getForm();
  
  // Charger les polices Bahij
  const bahijFonts = await loadBahijFontsForPdfLib();
  let bahijFont;
  let bahijBoldFont;
  
  if (bahijFonts) {
    bahijFont = await pdfDoc.embedFont(bahijFonts.plain);
    bahijBoldFont = await pdfDoc.embedFont(bahijFonts.bold);
  } else {
    // Fallback sur les polices standard si erreur
    bahijFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    bahijBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }
  
  const { width: pageWidth, height: pageHeight } = page.getSize();
  let yPos = pageHeight - 40;

  // Fonction pour wrapper le texte
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
    font: bahijFont,
    color: rgb(0.3, 0.3, 0.3),
  });
  page.drawText('voir la machine', {
    x: pageWidth - qrSize - 25,
    y: pageHeight - qrSize - 48,
    size: 10,
    font: bahijFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Titre
  page.drawText(`Bon de Préventif N°${data.bonNumber}`, {
    x: pageWidth / 2 - bahijBoldFont.widthOfTextAtSize(`Bon de Préventif N°${data.bonNumber}`, 16) / 2,
    y: yPos,
    size: 16,
    font: bahijBoldFont,
    color: rgb(0, 0, 0),
  });
  
  yPos -= 20;
  page.drawText(data.visitInfo, {
    x: pageWidth / 2 - bahijFont.widthOfTextAtSize(data.visitInfo, 12) / 2,
    y: yPos,
    size: 12,
    font: bahijFont,
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

  // Tableau des informations
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
      font: bahijBoldFont,
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

  // Calculer la hauteur de la ligne en fonction du texte
  let maxLines = 0;
  const wrappedCells = tableData.map((cell) => {
    const lines = wrapText(cell, colWidth - 4, bahijFont, 8);
    if (lines.length > maxLines) maxLines = lines.length;
    return lines;
  });
  const rowHeight = maxLines * 10 + 6;

  // Dessiner chaque cellule avec la hauteur calculée
  tableData.forEach((_, i) => {
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
        y: yPos - 10 - j * 10,
        size: 8,
        font: bahijFont,
      });
    });
  });

  yPos -= rowHeight + 15;

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
      font: bahijBoldFont,
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

      const lines = wrapText(check.action, pageWidth - 120, bahijFont, 8);
      lines.forEach((line, i) => {
        page.drawText(line, {
          x: 50,
          y: yPos - 8 - i * 10,
          size: 8,
          font: bahijFont,
        });
      });

      yPos -= Math.max(20, lines.length * 10 + 5);
      checkIndex++;
    });

    yPos -= 10;
  });

  yPos -= 10;

  if (yPos < 100) {
    page = pdfDoc.addPage([595, 842]);
    yPos = page.getHeight() - 40;
  }

  // État du matériel
  page.drawText('Etat du matériel :', {
    x: 30,
    y: yPos,
    size: 9,
    font: bahijBoldFont,
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
      font: bahijFont,
    });
    xOffset += 90;
  });
  yPos -= 25;

  // Remarque
  page.drawText('Remarque :', {
    x: 30,
    y: yPos,
    size: 9,
    font: bahijBoldFont,
  });
  
  if (data.remarque) {
    const remarqueLines = wrapText(data.remarque, pageWidth - 100, bahijFont, 8);
    remarqueLines.forEach((line, i) => {
      page.drawText(line, {
        x: 90,
        y: yPos - i * 10,
        size: 8,
        font: bahijFont,
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

  // Tableau des intervenants
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
    font: bahijBoldFont,
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
    font: bahijBoldFont,
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
      font: bahijFont,
    });
    
    page.drawRectangle({
      x: 30 + (pageWidth - 60) * 0.7,
      y: yPos - 15,
      width: (pageWidth - 60) * 0.3,
      height: 15,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    page.drawText(int.tempsPasse, {
      x: 35 + (pageWidth - 60) * 0.7,
      y: yPos - 10,
      size: 8,
      font: bahijFont,
    });
    
    yPos -= 15;
  });

  yPos -= 15;

  // Signature
  page.drawText(`Date de Début : ${data.dateDebut}`, {
    x: 30,
    y: yPos,
    size: 9,
    font: bahijBoldFont,
  });
  page.drawText(`Heure : ${data.heureDebut}`, {
    x: 30,
    y: yPos - 12,
    size: 9,
    font: bahijBoldFont,
  });
  
  page.drawText('Visa du Client', {
    x: pageWidth - 120,
    y: yPos,
    size: 9,
    font: bahijBoldFont,
  });
  page.drawRectangle({
    x: pageWidth - 120,
    y: yPos - 60,
    width: 90,
    height: 50,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  // Télécharger le PDF
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Bon_Preventif_${data.bonNumber}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
