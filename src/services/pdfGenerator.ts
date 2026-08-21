import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { MaintenanceData } from '../types/intervention';
import { generateQRCode } from '../utils/qrcode';

const COLORS = {
  primary: rgb(0.965, 0.481, 0.12),
  lightGray: rgb(0.95, 0.95, 0.95),
  white: rgb(1, 1, 1),
  black: rgb(0, 0, 0),
  darkGray: rgb(0.3, 0.3, 0.3)
};

const MARGIN = 25;
const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const CONTENT_WIDTH = A4_WIDTH - 1.9 * MARGIN;

// Fonction pour nettoyer les URLs d'images
function sanitizeImageUrl(url: string): string {
  if (!url) return url;
  return url.replace(/ /g, '%20');
}

export class PDFGenerator {
  private pdfDoc!: PDFDocument;
  private page!: PDFPage;
  private font!: PDFFont;
  private fontBold!: PDFFont;
  private yPos: number = A4_HEIGHT - MARGIN;

  async generate(data: MaintenanceData): Promise<Uint8Array> {
    this.pdfDoc = await PDFDocument.create();
    this.page = this.pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    this.font = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
    this.fontBold = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);
    this.yPos = A4_HEIGHT - MARGIN;

    await this.drawHeader(data);
    this.drawInterventionTypes(data);
    this.drawInterventionInfo(data);
    this.drawMaterialsSection(data);
    this.drawLaborSection(data);
    await this.drawWorkDescription(data);
    this.drawValidationSection(data);

    return await this.pdfDoc.save();
  }

  private async drawHeader(data: MaintenanceData) {
    // En-tête avec design amélioré
    this.page.drawRectangle({
      x: MARGIN,
      y: this.yPos - 90,
      width: CONTENT_WIDTH,
      height: 90,
      color: COLORS.primary,
    });

    // QR Code à gauche dans l'en-tête
    await this.drawQRCode(data);

    // Titre principal centré
    const mainTitle = 'FICHE D\'INTERVENTION';
    const titleWidth = this.fontBold.widthOfTextAtSize(mainTitle, 18);
    
    this.page.drawText(mainTitle, {
      x: MARGIN + 90,
      y: this.yPos - 19,
      size: 16,
      font: this.fontBold,
      color: COLORS.white,
    });

    // Informations à droite dans un bloc structuré
    const infoX = A4_WIDTH - MARGIN - 230;
    const infoStartY = this.yPos - 15;
    const lineHeight = 15;

    const infoFields = [
      { label: 'N° Installation:', value: data.installation_number || 'N/A' },
      { label: 'N° Chantier:', value: data.site_number || 'N/A' },
      { label: 'N° Équipe:', value: data.team_number || 'N/A' },
      { label: 'Référence:', value: 'EQ-ACH-05' },
      { label: 'Révision:', value: 'A' }
    ];

    infoFields.forEach((field, index) => {
      const y = infoStartY - (index * lineHeight);
      
      // Label en gras
      this.page.drawText(field.label, {
        x: infoX,
        y: y,
        size: 8,
        font: this.fontBold,
        color: COLORS.white,
      });

      // Valeur
      this.page.drawText(field.value, {
        x: infoX + 70,
        y: y,
        size: 8,
        font: this.font,
        color: COLORS.white,
      });
    });

    this.yPos -= 105;
  }

  private drawInterventionTypes(data: MaintenanceData) {
    const checkboxY = this.yPos - 5;
    const checkboxSize = 12;
    const spacing = 110;
    
    const checkboxes = [
      { label: 'Prise en charge', value: 'prise en charge' },
      { label: 'Exploitation (P2)', value: 'exploitation (p2)' },
      { label: 'Dépannage', value: 'dépannage' },
      { label: 'Garantie totale (P3)', value: 'garantie totale (p3)' },
      { label: 'Devis', value: 'devis' },
    ];

    const normalize = (str: string) => str.toLowerCase().trim();
    const selectedType = normalize(data.type_action || '');

    checkboxes.forEach((cb, index) => {
      const x = MARGIN + (index * spacing);
      
      // Checkbox avec style amélioré
      this.page.drawRectangle({
        x: x,
        y: checkboxY,
        width: checkboxSize,
        height: checkboxSize,
        borderColor: COLORS.black,
        borderWidth: 1.5,
        color: selectedType === normalize(cb.value) ? COLORS.primary : COLORS.white,
      });

      // Checkmark pour la sélection (utilisation de X car ✓ n'est pas supporté par WinAnsi)
      if (selectedType === normalize(cb.value)) {
        this.page.drawText('X', {
          x: x + 3,
          y: checkboxY + 2,
          size: 9,
          font: this.fontBold,
          color: COLORS.white,
        });
      }

      // Label
      this.page.drawText(cb.label, {
        x: x + checkboxSize + 5,
        y: checkboxY + 2,
        size: 8,
        font: this.font,
      });
    });

    this.yPos -= 30;
  }

  private drawInterventionInfo(data: MaintenanceData) {
    const infoFields = [
      { label: 'Intervention demandée par', value: data.requested_by || 'N/A' },
      { label: 'Lieu des travaux', value: data.work_location || 'N/A' },
      { label: 'Devis n°', value: data.quote_number || 'N/A' },
      { label: 'N° d\'intervention', value: data.intervention_number || 'N/A' },
    ];

    const fieldHeight = 22;
    const labelWidth = 150;

    infoFields.forEach((field, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const xPos = MARGIN + (col * (CONTENT_WIDTH / 2));
      const currentY = this.yPos - (row * fieldHeight);

      // Fond alterné pour lisibilité
      if (row % 2 === 0) {
        this.page.drawRectangle({
          x: xPos,
          y: currentY - 15,
          width: (CONTENT_WIDTH / 2) - 5,
          height: 18,
          color: COLORS.lightGray,
        });
      }

      // Label en gras
      this.page.drawText(`${field.label}:`, {
        x: xPos + 5,
        y: currentY - 5,
        size: 9,
        font: this.fontBold,
      });

      // Valeur
      const valueX = xPos + labelWidth + 5;
      this.page.drawText(field.value, {
        x: valueX,
        y: currentY - 5,
        size: 9,
        font: this.font,
      });
    });

    this.yPos -= (Math.ceil(infoFields.length / 2) * fieldHeight) + 10;
  }

  private drawMaterialsSection(data: MaintenanceData) {
    this.drawSectionHeader('FOURNITURES / MATÉRIELS');

    const columns = [
      { text: 'Désignation', x: 0, width: 200 },
      { text: 'Qté', x: 200, width: 45 },
      { text: 'N°commande', x: 245, width: 75 },
      { text: 'Ligne', x: 320, width: 45 },
      { text: 'Dépenses', x: 365, width: 60 },
      { text: 'Éclatement', x: 425, width: 60 },
      { text: 'Prix unit. HT', x: 485, width: 70 },
    ];

    // En-tête du tableau
    this.page.drawRectangle({
      x: MARGIN,
      y: this.yPos - 22,
      width: CONTENT_WIDTH,
      height: 22,
      color: COLORS.primary,
    });

    columns.forEach((col) => {
      this.page.drawText(col.text, {
        x: MARGIN + col.x + 3,
        y: this.yPos - 15,
        size: 8,
        font: this.fontBold,
        color: COLORS.white,
      });
    });

    this.yPos -= 25;

    // Lignes du tableau
    if (data.materials && data.materials.length > 0) {
      data.materials.forEach((material, index) => {
        const rowY = this.yPos - (index * 22);
        const isEven = index % 2 === 0;

        // Fond alterné
        this.page.drawRectangle({
          x: MARGIN,
          y: rowY - 18,
          width: CONTENT_WIDTH,
          height: 20,
          color: isEven ? COLORS.white : COLORS.lightGray,
          borderColor: COLORS.darkGray,
          borderWidth: 0.5,
        });

        // Séparateurs verticaux
        columns.forEach((col, colIndex) => {
          if (colIndex > 0) {
            this.page.drawLine({
              start: { x: MARGIN + col.x, y: rowY },
              end: { x: MARGIN + col.x, y: rowY - 18 },
              thickness: 0.5,
              color: COLORS.darkGray,
            });
          }
        });

        // Données
        const designation = material.designation?.substring(0, 30) || '';
        this.page.drawText(designation, {
          x: MARGIN + 3,
          y: rowY - 10,
          size: 8,
          font: this.font,
        });

        this.page.drawText(material.quantity?.toString() || '0', {
          x: MARGIN + 210,
          y: rowY - 10,
          size: 8,
          font: this.font,
        });

        if (material.order_number && material.order_number !== 'N/A') {
          this.page.drawText(material.order_number.substring(0, 10), {
            x: MARGIN + 250,
            y: rowY - 10,
            size: 8,
            font: this.font,
          });
        }

        if (material.unit_price) {
          this.page.drawText(material.unit_price.toFixed(2) + ' €', {
            x: MARGIN + 490,
            y: rowY - 10,
            size: 8,
            font: this.font,
          });
        }
      });

      this.yPos -= data.materials.length * 22 + 15;
    } else {
      // Message si pas de données
      this.page.drawRectangle({
        x: MARGIN,
        y: this.yPos - 30,
        width: CONTENT_WIDTH,
        height: 25,
        color: COLORS.lightGray,
        borderColor: COLORS.darkGray,
        borderWidth: 0.5,
      });

      this.page.drawText('Aucun matériel enregistré', {
        x: MARGIN + (CONTENT_WIDTH / 2) - 70,
        y: this.yPos - 18,
        size: 9,
        font: this.font,
        color: COLORS.darkGray,
      });

      this.yPos -= 45;
    }
  }

  private drawLaborSection(data: MaintenanceData) {
    this.drawSectionHeader('MAIN D\'ŒUVRE');

    const columns = [
      { text: 'Technicien', x: 0, width: 120 },
      { text: 'HO', x: 120, width: 55 },
      { text: 'Hors HO', x: 175, width: 65 },
      { text: 'Nuit', x: 240, width: 55 },
      { text: 'Dimanche', x: 295, width: 75 },
      { text: 'Jours repos', x: 370, width: 80 },
      { text: 'Déplacement', x: 450, width: 105 },
    ];

    // En-tête
    this.page.drawRectangle({
      x: MARGIN,
      y: this.yPos - 22,
      width: CONTENT_WIDTH,
      height: 22,
      color: COLORS.primary,
    });

    columns.forEach((col) => {
      this.page.drawText(col.text, {
        x: MARGIN + col.x + 5,
        y: this.yPos - 15,
        size: 8,
        font: this.fontBold,
        color: COLORS.white,
      });
    });

    this.yPos -= 25;

    // Lignes
    if (data.technicians && data.technicians.length > 0) {
      data.technicians.forEach((tech, index) => {
        const rowY = this.yPos - (index * 22);
        const isEven = index % 2 === 0;

        this.page.drawRectangle({
          x: MARGIN,
          y: rowY - 18,
          width: CONTENT_WIDTH,
          height: 20,
          color: isEven ? COLORS.white : COLORS.lightGray,
          borderColor: COLORS.darkGray,
          borderWidth: 0.5,
        });

        columns.forEach((col, colIndex) => {
          if (colIndex > 0) {
            this.page.drawLine({
              start: { x: MARGIN + col.x, y: rowY },
              end: { x: MARGIN + col.x, y: rowY - 18 },
              thickness: 0.5,
              color: COLORS.darkGray,
            });
          }
        });

        this.page.drawText(tech.name?.substring(0, 18) || '', {
          x: MARGIN + 5,
          y: rowY - 10,
          size: 8,
          font: this.font,
        });

        if (tech.ho_hours) {
          this.page.drawText(tech.ho_hours.toString(), {
            x: MARGIN + 140,
            y: rowY - 10,
            size: 8,
            font: this.font,
          });
        }

        if (tech.regular_hours) {
          this.page.drawText(tech.regular_hours.toString(), {
            x: MARGIN + 200,
            y: rowY - 10,
            size: 8,
            font: this.font,
          });
        }
      });

      this.yPos -= data.technicians.length * 22 + 15;
    } else {
      this.page.drawRectangle({
        x: MARGIN,
        y: this.yPos - 30,
        width: CONTENT_WIDTH,
        height: 25,
        color: COLORS.lightGray,
        borderColor: COLORS.darkGray,
        borderWidth: 0.5,
      });

      this.page.drawText('Aucun technicien enregistré', {
        x: MARGIN + (CONTENT_WIDTH / 2) - 75,
        y: this.yPos - 18,
        size: 9,
        font: this.font,
        color: COLORS.darkGray,
      });

      this.yPos -= 45;
    }
  }

  private async drawWorkDescription(data: MaintenanceData) {
    this.drawSectionHeader('DESCRIPTION D\'INTERVENTION / TRAVAUX RÉALISÉS');
    
    // Zone de description avec bordure
    const descBoxHeight = 100;
    
    this.page.drawRectangle({
      x: MARGIN,
      y: this.yPos - descBoxHeight,
      width: CONTENT_WIDTH,
      height: descBoxHeight,
      color: COLORS.white,
      borderColor: COLORS.darkGray,
      borderWidth: 1,
    });

    if (data.work_description) {
      const lines = this.wrapText(data.work_description, 90);
      const maxLines = 5;
      const visibleLines = lines.slice(0, maxLines);
      
      visibleLines.forEach((line, index) => {
        this.page.drawText(line, {
          x: MARGIN + 10,
          y: this.yPos - 20 - (index * 15),
          size: 9,
          font: this.font,
        });
      });
      
      if (lines.length > maxLines) {
        this.page.drawText('...', {
          x: MARGIN + 10,
          y: this.yPos - 20 - (maxLines * 15),
          size: 9,
          font: this.font,
        });
      }
    } else {
      this.page.drawText('Aucune description disponible', {
        x: MARGIN + 10,
        y: this.yPos - 55,
        size: 9,
        font: this.font,
        color: COLORS.darkGray,
      });
    }

    this.yPos -= descBoxHeight + 20;

    // Section Images
    await this.drawImagesSection(data);
  }

  private async drawImagesSection(data: MaintenanceData) {
    const imageAvantUrls = data.image_avant_url ? JSON.parse(data.image_avant_url) : [];
    const imageApresUrls = data.image_apres_url ? JSON.parse(data.image_apres_url) : [];

    if (imageAvantUrls.length > 0) {
      await this.drawImageSection('IMAGES AVANT INTERVENTION', imageAvantUrls);
    }

    if (imageApresUrls.length > 0) {
      await this.drawImageSection('IMAGES APRÈS INTERVENTION', imageApresUrls);
    }
  }

  private async drawImageSection(title: string, urls: string[]) {
    if (this.yPos < 220) {
      this.page = this.pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      this.yPos = A4_HEIGHT - MARGIN;
    }

    this.page.drawRectangle({
      x: MARGIN,
      y: this.yPos - 20,
      width: CONTENT_WIDTH,
      height: 20,
      color: COLORS.primary,
    });

    const titleWidth = this.fontBold.widthOfTextAtSize(title, 10);
    this.page.drawText(title, {
      x: MARGIN + (CONTENT_WIDTH - titleWidth) / 2,
      y: this.yPos - 13,
      size: 10,
      font: this.fontBold,
      color: COLORS.white,
    });

    this.yPos -= 30;

    await this.drawImagesFromArray(urls);
  }

  private async drawImagesFromArray(urls: string[]) {
    if (!urls || urls.length === 0) return;

    for (let i = 0; i < urls.length; i++) {
      const url = sanitizeImageUrl(urls[i].replace(/\.\.+/g, '.'));

      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('jpeg') && !contentType.includes('jpg') && !contentType.includes('png')) {
          continue;
        }

        const buffer = await response.arrayBuffer();
        const embeddedImage = contentType.includes('png')
          ? await this.pdfDoc.embedPng(buffer)
          : await this.pdfDoc.embedJpg(buffer);

        const imgWidth = 240;
        const imgHeight = 180;
        
        if (this.yPos - imgHeight - 40 < 50) {
          this.page = this.pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
          this.yPos = A4_HEIGHT - MARGIN;
        }

        if (urls.length > 1) {
          this.page.drawText(`Image ${i + 1}/${urls.length}`, {
            x: MARGIN,
            y: this.yPos,
            size: 8,
            font: this.fontBold,
            color: COLORS.darkGray,
          });
          this.yPos -= 18;
        }
        
        // Ombre portée
        this.page.drawRectangle({
          x: MARGIN + 3,
          y: this.yPos - imgHeight - 3,
          width: imgWidth,
          height: imgHeight,
          color: rgb(0.8, 0.8, 0.8),
        });

        // Bordure
        this.page.drawRectangle({
          x: MARGIN,
          y: this.yPos - imgHeight,
          width: imgWidth,
          height: imgHeight,
          borderColor: COLORS.darkGray,
          borderWidth: 2,
        });

        this.page.drawImage(embeddedImage, {
          x: MARGIN + 2,
          y: this.yPos - imgHeight + 2,
          width: imgWidth - 4,
          height: imgHeight - 4,
        });
        
        this.yPos -= imgHeight + 30;

      } catch (err) {
        console.warn(`Impossible de charger l'image ${i + 1}`, err);
      }
    }
  }

  private drawValidationSection(data: MaintenanceData) {
    const bottomY = 120;
    const boxHeight = 130;
    const boxWidth = (CONTENT_WIDTH - 15) / 2;

    // Validation FSG (gauche)
    this.page.drawRectangle({
      x: MARGIN,
      y: bottomY,
      width: boxWidth,
      height: boxHeight,
      borderColor: COLORS.darkGray,
      borderWidth: 1.5,
    });

    this.page.drawRectangle({
      x: MARGIN,
      y: bottomY + boxHeight - 30,
      width: boxWidth,
      height: 30,
      color: COLORS.primary,
    });

    const fsgTitle = 'VALIDATION FSG';
    const fsgTitleWidth = this.fontBold.widthOfTextAtSize(fsgTitle, 11);
    
    this.page.drawText(fsgTitle, {
      x: MARGIN + (boxWidth - fsgTitleWidth) / 2,
      y: bottomY + boxHeight - 18,
      size: 11,
      font: this.fontBold,
      color: COLORS.white,
    });

    this.page.drawText('Nom & Prénom:', {
      x: MARGIN + 10,
      y: bottomY + 80,
      size: 9,
      font: this.fontBold,
    });

    this.page.drawLine({
      start: { x: MARGIN + 10, y: bottomY + 65 },
      end: { x: MARGIN + boxWidth - 10, y: bottomY + 65 },
      thickness: 0.5,
      color: COLORS.darkGray,
    });

    this.page.drawText('Signature:', {
      x: MARGIN + 10,
      y: bottomY + 40,
      size: 9,
      font: this.fontBold,
    });

    // Validation Client (droite)
    this.page.drawRectangle({
      x: MARGIN + boxWidth + 15,
      y: bottomY,
      width: boxWidth,
      height: boxHeight,
      borderColor: COLORS.darkGray,
      borderWidth: 1.5,
    });

    this.page.drawRectangle({
      x: MARGIN + boxWidth + 15,
      y: bottomY + boxHeight - 30,
      width: boxWidth,
      height: 30,
      color: COLORS.primary,
    });

    const clientTitle = 'VALIDATION CLIENT';
    const clientTitleWidth = this.fontBold.widthOfTextAtSize(clientTitle, 11);
    
    this.page.drawText(clientTitle, {
      x: MARGIN + boxWidth + 15 + (boxWidth - clientTitleWidth) / 2,
      y: bottomY + boxHeight - 18,
      size: 11,
      font: this.fontBold,
      color: COLORS.white,
    });

    if (data.client_validation) {
      const fields = [
        { label: 'Date:', value: data.client_validation.date || 'N/A', y: 80 },
        { label: 'Nom & Prénom:', value: data.client_validation.name || 'N/A', y: 65 },
        { label: 'Adresse:', value: data.client_validation.address || 'N/A', y: 50 },
        { label: 'Téléphone:', value: data.client_validation.phone || 'N/A', y: 35 },
      ];

      fields.forEach(field => {
        this.page.drawText(field.label, {
          x: MARGIN + boxWidth + 25,
          y: bottomY + field.y,
          size: 8,
          font: this.fontBold,
        });

        this.page.drawText(field.value, {
          x: MARGIN + boxWidth + 100,
          y: bottomY + field.y,
          size: 8,
          font: this.font,
        });
      });
    }

    this.page.drawText('Signature:', {
      x: MARGIN + boxWidth + 25,
      y: bottomY + 15,
      size: 9,
      font: this.fontBold,
    });
  }

  private async drawQRCode(data: MaintenanceData) {
    try {
      const baseUrl = window.location.origin;
      const qrUrl = `${baseUrl}/machine/${data.machine?.id || ''}/?tab=historique`;
      const qrCodeDataUrl = await generateQRCode(qrUrl);

      if (qrCodeDataUrl) {
        const qrImage = await this.pdfDoc.embedPng(qrCodeDataUrl);
        
        // Position en haut à gauche dans l'en-tête avec bordure blanche
        const qrSize = 70;
        const qrX = MARGIN + 10;
        const qrY = this.yPos - 80;

        // Fond blanc pour le QR code
        this.page.drawRectangle({
          x: qrX - 3,
          y: qrY - 3,
          width: qrSize + 6,
          height: qrSize + 6,
          color: COLORS.white,
        });

        this.page.drawImage(qrImage, {
          x: qrX,
          y: qrY,
          width: qrSize,
          height: qrSize,
        });
      }
    } catch (err) {
      console.warn('Erreur lors de la génération du QR code:', err);
    }
  }

  private drawSectionHeader(title: string) {
    this.page.drawRectangle({
      x: MARGIN,
      y: this.yPos - 22,
      width: CONTENT_WIDTH,
      height: 18,
      color: COLORS.primary,
    });

    const titleWidth = this.fontBold.widthOfTextAtSize(title, 11);
    this.page.drawText(title, {
      x: MARGIN + (CONTENT_WIDTH - titleWidth) / 2,
      y: this.yPos - 15,
      size: 11,
      font: this.fontBold,
      color: COLORS.white,
    });

    this.yPos -= 27;
  }

  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + word).length <= maxChars) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines;
  }
}

export async function generateInterventionPDF(data: MaintenanceData): Promise<void> {
  const generator = new PDFGenerator();
  const pdfBytes = await generator.generate(data);

  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Bon_Intervention_${data.intervention_number || 'sans_numero'}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}