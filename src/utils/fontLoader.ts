import jsPDF from 'jspdf';

// Fonction pour charger et enregistrer les polices Bahij dans jsPDF
export async function registerBahijFonts(doc: jsPDF) {
  try {
    // Charger les fichiers de police
    const [plainFont, boldFont, semiBoldFont, lightFont] = await Promise.all([
      fetch('/fonts/Bahij_TheSansArabic-Plain.ttf').then(res => res.arrayBuffer()),
      fetch('/fonts/Bahij_TheSansArabic-Bold.ttf').then(res => res.arrayBuffer()),
      fetch('/fonts/Bahij_TheSansArabic-SemiBold.ttf').then(res => res.arrayBuffer()),
      fetch('/fonts/Bahij_TheSansArabic-Light.ttf').then(res => res.arrayBuffer()),
    ]);

    // Convertir en base64
    const plainBase64 = arrayBufferToBase64(plainFont);
    const boldBase64 = arrayBufferToBase64(boldFont);
    const semiBoldBase64 = arrayBufferToBase64(semiBoldFont);
    const lightBase64 = arrayBufferToBase64(lightFont);

    // Ajouter les polices à jsPDF
    doc.addFileToVFS('BahijTheSansArabic-Plain.ttf', plainBase64);
    doc.addFont('BahijTheSansArabic-Plain.ttf', 'BahijTheSansArabic', 'normal');

    doc.addFileToVFS('BahijTheSansArabic-Bold.ttf', boldBase64);
    doc.addFont('BahijTheSansArabic-Bold.ttf', 'BahijTheSansArabic', 'bold');

    doc.addFileToVFS('BahijTheSansArabic-SemiBold.ttf', semiBoldBase64);
    doc.addFont('BahijTheSansArabic-SemiBold.ttf', 'BahijTheSansArabic', 'semibold');

    doc.addFileToVFS('BahijTheSansArabic-Light.ttf', lightBase64);
    doc.addFont('BahijTheSansArabic-Light.ttf', 'BahijTheSansArabic', 'light');

    // Définir la police par défaut
    doc.setFont('BahijTheSansArabic', 'normal');
  } catch (error) {
    console.error('Erreur lors du chargement des polices Bahij:', error);
    // Fallback sur Helvetica si erreur
    doc.setFont('helvetica');
  }
}

// Fonction pour charger les polices pour pdf-lib
export async function loadBahijFontsForPdfLib() {
  try {
    const [plainFont, boldFont] = await Promise.all([
      fetch('/fonts/Bahij_TheSansArabic-Plain.ttf').then(res => res.arrayBuffer()),
      fetch('/fonts/Bahij_TheSansArabic-Bold.ttf').then(res => res.arrayBuffer()),
    ]);

    return {
      plain: plainFont,
      bold: boldFont,
    };
  } catch (error) {
    console.error('Erreur lors du chargement des polices Bahij pour pdf-lib:', error);
    return null;
  }
}

// Fonction utilitaire pour convertir ArrayBuffer en base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
