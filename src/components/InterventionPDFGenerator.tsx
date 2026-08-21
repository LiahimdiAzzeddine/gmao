import jsPDF from 'jspdf';
import { Intervention, DemandeIntervention, Machine } from '../lib/supabase';
import { registerBahijFonts } from '../utils/fontLoader';

const toBase64 = (url: string): Promise<string> =>
  fetch(url)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );

export async function generateInterventionPDF(
  intervention: Intervention,
  demande: DemandeIntervention,
  machine: Machine,
  technicienNom: string
): Promise<void> {
  const doc = new jsPDF();
  await registerBahijFonts(doc);

  doc.setFontSize(16);
  doc.text("BON D'INTERVENTION", 105, 15, { align: 'center' });

  doc.setFontSize(11);
  let y = 30;

  doc.text(`Machine : ${machine.nom}`, 10, y);
  y += 7;
  doc.text(
    `Date intervention : ${new Date(intervention.date_intervention).toLocaleDateString('fr-FR')}`,
    10,
    y
  );
  y += 7;
  doc.text(`Technicien : ${technicienNom || 'Non renseigné'}`, 10, y);
  y += 7;
  doc.text(
    `Type : ${demande.type_intervention === 'preventive' ? 'Préventive' : 'Corrective'}`,
    10,
    y
  );
  y += 10;

  doc.line(10, y, 200, y);
  y += 7;

  doc.setFontSize(12);
  doc.text('Détails de l\'intervention :', 10, y);
  y += 7;

  doc.setFontSize(11);
  doc.text('Description demande :', 10, y);
  y += 5;
  const descriptionLines = doc.splitTextToSize(demande.description, 180);
  doc.text(descriptionLines, 10, y);
  y += descriptionLines.length * 5 + 5;

  doc.text('Travaux effectués :', 10, y);
  y += 5;
  const workLines = doc.splitTextToSize(intervention.description || '-', 180);
  doc.text(workLines, 10, y);
  y += workLines.length * 5 + 5;

  if (intervention.pieces_remplacees) {
    doc.text(`Pièces remplacées : ${intervention.pieces_remplacees}`, 10, y);
    y += 7;
  }

  if (intervention.temps_passe) {
    doc.text(`Temps passé : ${intervention.temps_passe}`, 10, y);
    y += 7;
  }

  y += 5;

  const imagesAvant = intervention.image_avant_url
    ? JSON.parse(intervention.image_avant_url as string)
    : [];
  const imagesApres = intervention.image_apres_url
    ? JSON.parse(intervention.image_apres_url as string)
    : [];

  if (imagesAvant.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = 10;
    }

    doc.setFontSize(12);
    doc.text('Photos avant intervention :', 10, y);
    y += 10;

    for (let i = 0; i < imagesAvant.length; i++) {
      if (y > 260) {
        doc.addPage();
        y = 10;
      }

      try {
        const img = await toBase64(imagesAvant[i]);
        doc.addImage(img, 'PNG', 10, y, 90, 70);
        y += 75;
      } catch (err) {
        console.warn('Erreur chargement image avant:', err);
        doc.text('Erreur de chargement image', 10, y);
        y += 7;
      }
    }

    y += 5;
  }

  if (imagesApres.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = 10;
    }

    doc.setFontSize(12);
    doc.text('Photos après intervention :', 10, y);
    y += 10;

    for (let i = 0; i < imagesApres.length; i++) {
      if (y > 260) {
        doc.addPage();
        y = 10;
      }

      try {
        const img = await toBase64(imagesApres[i]);
        doc.addImage(img, 'PNG', 10, y, 90, 70);
        y += 75;
      } catch (err) {
        console.warn('Erreur chargement image après:', err);
        doc.text('Erreur de chargement image', 10, y);
        y += 7;
      }
    }

    y += 10;
  }

  if (y > 250) {
    doc.addPage();
    y = 10;
  }

  doc.line(10, y, 200, y);
  y += 10;
  doc.text('Visa du client : ___________________________', 10, y);

  doc.save(`bon_intervention_${intervention.id}.pdf`);
}
