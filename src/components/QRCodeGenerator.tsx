import { useEffect, useRef, useState } from 'react';
import { X, Download } from 'lucide-react';
import QRCode from 'qrcode';

// Mock types for the demo
type PosteTechnique = {
  id: string;
  code_pt: string;
  batiment?: string;
  site?: {
    code: string;
    nom: string;
  };
  domaine?: {
    code: string;
    libelle: string;
  };
  secteur?: {
    code: string;
    libelle: string;
  };
  lot?: {
    code: string;
    nom: string;
  };
};

type Machine = {
  id: string;
  nom: string;
  modele?: string;
  numero_serie?: string;
  etat?: string;
  annee?: number;
  fabricant?: string;
  machine_id?: string;
  poste_technique?: PosteTechnique;
};

type Props = {
  machine: Machine;
  onClose: () => void;
};

export default function QRCodeGenerator({ machine, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const logoImage = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Load logo image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      logoImage.current = img;
      setLogoLoaded(true);
      generateQRCode();
    };
    img.onerror = () => {
      console.warn('Logo not found, proceeding without it');
      setLogoLoaded(true);
      generateQRCode();
    };
    img.src = '/FSGlogo.png';
  }, []);

  useEffect(() => {
    if (logoLoaded) {
      generateQRCode();
    }
  }, [machine, logoLoaded]);


  async function generateQRCode() {
    if (!canvasRef.current) return;

    const url = `${window.location.origin}/machine/${machine.id}/?tab=historique`;
    const canvas = canvasRef.current;
    const size = 300;

    canvas.width = size;
    canvas.height = size;

    try {
      // Génère le QR code directement sur le canvas
      await QRCode.toCanvas(canvas, url, {
        width: size,
        margin: 1,
        color: {
          dark: '#1e293b', // couleur des carrés
          light: '#ffffff' // fond
        }
      });
    } catch (err) {
      console.error('Erreur génération QR code:', err);
    }
  }
  async function loadZebraLikeFont() {
    const font = new FontFace(
      'ZebraMono',
      'url(/fonts/OCR-B.ttf)'
    );

    await font.load();
    document.fonts.add(font);
  }

  async function downloadAsImage() {
    await loadZebraLikeFont();
    if (!previewRef.current || !canvasRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions optimisées pour étiquette thermique Zebra (4x6 inches / 101x152mm)
    // 300 DPI pour impression thermique de qualité
    const width = 1200;  // 4 inches * 300 DPI
    const height = 1800; // 6 inches * 300 DPI
    canvas.width = width;
    canvas.height = height;

    // Fond blanc (essentiel pour imprimantes thermiques)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Marges de sécurité (importantes pour imprimantes thermiques)
    const margin = 40;
    const contentWidth = width - (margin * 2);

    // --- SECTION HEADER ---
    let yPos = margin + 10;

    // Logo
    if (logoImage.current) {
      const logoHeight = 120;
      const logoWidth = logoImage.current.width * (logoHeight / logoImage.current.height);
      const logoX = (width - logoWidth) / 2; // Centré
      ctx.drawImage(logoImage.current, logoX, yPos, logoWidth, logoHeight);
      yPos += logoHeight + 10;
    } else {
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 42px ZebraMono';
      ctx.textAlign = 'center';
      ctx.fillText('LOGO ENTREPRISE', width / 2, yPos);
      yPos += 50;
    }

    // Ligne de séparation
    yPos += 35;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(margin, yPos);
    ctx.lineTo(width - margin, yPos);
    ctx.stroke();
    yPos += 70;

    // --- SECTION QR CODE (CENTRÉ) ---
    const qrImage = canvasRef.current;
    const qrSize = 500; // Grand pour faciliter le scan
    const qrX = (width - qrSize) / 2;

    // Bordure autour du QR code
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeRect(qrX - 10, yPos - 10, qrSize + 20, qrSize + 20);

    // QR code
    ctx.drawImage(qrImage, qrX, yPos, qrSize, qrSize);
    yPos += qrSize + 45;

    // Texte sous le QR code
    yPos += 30;
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 32px ZebraMono';
    ctx.textAlign = 'center';
    ctx.fillText('📱 SCANNEZ POUR ACCÉDER', width / 2, yPos);
    yPos += 50;

    // Ligne de séparation
    yPos += 30;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(margin, yPos);
    ctx.lineTo(width - margin, yPos);
    ctx.stroke();
    yPos += 80;

    // --- SECTION INFORMATIONS ---
    ctx.textAlign = 'left';

    // Nom de la machine (titre principal)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 56px ZebraMono';
    const machineName = machine.nom || 'N/A';
    // Gérer le texte long avec retour à la ligne si nécessaire
    const maxWidth = contentWidth - 40;
    const words = machineName.split(' ');
    let line = '';
    let lines = [];

    for (let word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        lines.push(line);
        line = word + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    yPos += 10;
    lines.forEach(textLine => {
      ctx.fillText(textLine.trim(), margin + 20, yPos);
      yPos += 0;
    });

    yPos += 20;

    // Barre d'accent
    yPos += 25;
    ctx.fillStyle = '#000000';
    ctx.fillRect(margin + 20, yPos, 120, 6);
    yPos += 100;

    // Informations détaillées avec contraste fort
    const info = [
      { label: 'MODÈLE:', value: machine.modele || 'N/A' },
      { label: 'N° SÉRIE:', value: machine.numero_serie || 'N/A' },
      { label: 'ANNÉE:', value: machine.annee?.toString() || 'N/A' }
    ];

    if (machine.fabricant) {
      info.push({ label: 'FABRICANT:', value: machine.fabricant });
    }

    // Ajouter les informations du poste technique
    if (machine.poste_technique) {
      const pt = machine.poste_technique;
      info.push({ label: 'Code PT:', value: pt.code_pt || 'N/A' });
    }

    info.forEach((item) => {
      // Label en gras
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 34px ZebraMono';
      ctx.fillText(item.label, margin + 20, yPos);

      // Valeur
      ctx.font = '34px Arial';
      ctx.fillText(item.value, margin + 20, yPos + 50);

      // Ligne de séparation légère
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin + 20, yPos + 80);
      ctx.lineTo(width - margin - 20, yPos + 80);
      ctx.stroke();

      yPos += 130;
    });

    // --- TÉLÉCHARGEMENT ---
    // Pour imprimante thermique, utiliser PNG haute qualité
    const url = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = `etiquette-machine-${machine.machine_id || machine.nom}.png`;
    link.href = url;
    link.click();
  }
async function generateZPLLabel() {
  if (!canvasRef.current) return;

  // === CONFIGURATION STANDARDISÉE ===
  const CONFIG = {
    dpi: 203,
    pageWidth: 799,     // 10 cm = 3.937 inches * 203 DPI = 799 dots
    pageHeight: 559,    // 7 cm = 2.756 inches * 203 DPI = 559 dots
    margin: 50,         // Marge réduite pour petit format
    qr: {
      size: 350,        // Taille du QR réduite (150px au lieu de 200px)
      quietZone: 10     // Marge blanche autour du QR
    }
  };

  // Début du ZPL
  let zpl = `^XA\n`;
  zpl += `^POI\n`;
  zpl += `^PW${CONFIG.pageWidth}\n`;
  zpl += `^LL${CONFIG.pageHeight}\n`;
  zpl += `^LH0,0\n`;
  zpl += `^CI28\n`;

  // === GÉNÉRATION DU QR CODE EN IMAGE ===
  const qrX = CONFIG.margin;
  const qrY = CONFIG.margin+45;
  const qrSize = CONFIG.qr.size;
  
  const qrData = `${window.location.origin}/machine/${machine.id}/?tab=historique`;
  
  try {
    // Créer un canvas pour le QR code
    const qrCanvas = document.createElement('canvas');
    qrCanvas.width = qrSize;
    qrCanvas.height = qrSize;
    const qrCtx = qrCanvas.getContext('2d');
    
    if (!qrCtx) throw new Error("QR Canvas context null");

    // Fond blanc
    qrCtx.fillStyle = '#FFFFFF';
    qrCtx.fillRect(0, 0, qrSize, qrSize);

    // Importer QRCode.js (vous devez l'avoir installé: npm install qrcode)
    // Si vous utilisez une autre lib QR, adaptez cette partie
    const QRCode = window.QRCode || (await import('qrcode'));
    
    // Générer le QR code sur le canvas
    await QRCode.toCanvas(qrCanvas, qrData, {
      width: qrSize,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Convertir le canvas QR en hex pour ZPL
    const qrImageData = qrCtx.getImageData(0, 0, qrSize, qrSize);
    const qrHex = convertImageToZPLHex(qrImageData, qrSize, qrSize);

    const bytesPerRow = Math.ceil(qrSize / 8);
    const totalBytes = bytesPerRow * qrSize;

    // Insérer le QR code comme image
    zpl += `^FO${qrX},${qrY}^GFA,${totalBytes},${totalBytes},${bytesPerRow},${qrHex}^FS\n`;

    // Texte sous le QR code
    const textUnderQR = qrY + qrSize +1;
    zpl += `^FO${qrX *2.7},${textUnderQR}^A0N,20,20^FDScannez pour acceder^FS\n`;

  } catch (error) {
    console.error('Erreur génération QR:', error);
    // Fallback: utiliser la méthode ZPL native
    zpl += `^FO${qrX},${qrY}^BQN,2,5^FDMA,${qrData}^FS\n`;
    zpl += `^FO${qrX + 10},${qrY + 220}^A0N,20,20^FDScannez pour acceder^FS\n`;
  }

  // === SECTION DROITE : LOGO + INFOS ===
  const rightX = qrX + qrSize + 30;  // Espacement réduit
  let yPos = CONFIG.margin+60;

  // --- LOGO ---
  if (logoImage.current) {
    try {
      const logoHeight = 80;  // Logo plus petit pour format réduit
      const logoWidth = Math.round(logoImage.current.width * (logoHeight / logoImage.current.height));

      const logoCanvas = document.createElement('canvas');
      logoCanvas.width = logoWidth;
      logoCanvas.height = logoHeight;

      const logoCtx = logoCanvas.getContext('2d');
      if (!logoCtx) throw new Error("Canvas context null");

      logoCtx.fillStyle = '#ffffff';
      logoCtx.fillRect(0, 0, logoWidth, logoHeight);
      logoCtx.drawImage(logoImage.current, 0, 0, logoWidth, logoHeight);

      const logoHex = convertImageToZPLHex(
        logoCtx.getImageData(0, 0, logoWidth, logoHeight),
        logoWidth,
        logoHeight
      );

      const bytesPerRow = Math.ceil(logoWidth / 8);
      const totalBytes = bytesPerRow * logoHeight;

      zpl += `^FO${rightX},${yPos}^GFA,${totalBytes},${totalBytes},${bytesPerRow},${logoHex}^FS\n`;
      yPos += logoHeight + 15;  // Espacement réduit
    } catch (e) {
      console.error('Erreur logo:', e);
      zpl += `^FO${rightX},${yPos}^A0N,24,24^FDLOGO ENTREPRISE^FS\n`;
      yPos += 40;
    }
  }

  // --- Fonction de nettoyage du texte ---
  const cleanText = (text) => {
    if (!text) return 'N/A';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/°/g, ' ')
      .trim();
  };

  // --- NOM MACHINE (max 2 lignes) ---
  const machineName = cleanText(machine.nom || 'N/A');
  const nameMaxLength = 20;  // Réduit pour petit format
  
  let nameLine1 = machineName;
  let nameLine2 = '';
  
  if (machineName.length > nameMaxLength) {
    const cutIndex = machineName.lastIndexOf(' ', nameMaxLength);
    nameLine1 = machineName.substring(0, cutIndex > 0 ? cutIndex : nameMaxLength);
    nameLine2 = machineName.substring(cutIndex > 0 ? cutIndex + 1 : nameMaxLength, nameMaxLength * 2);
    
    if (machineName.length > nameMaxLength * 2) {
      nameLine2 = nameLine2.substring(0, nameMaxLength - 3) + '...';
    }
  }

  zpl += `^FO${rightX},${yPos}^A0N,22,22^FD${nameLine1}^FS\n`;
  yPos += 28;
  
  if (nameLine2) {
    zpl += `^FO${rightX},${yPos}^A0N,22,22^FD${nameLine2}^FS\n`;
    yPos += 28;
  }

  yPos -= 5;

  // Barre séparatrice
  zpl += `^FO${rightX},${yPos}^GB120,3,3^FS\n`;
  yPos += 18;

  // --- INFORMATIONS TECHNIQUES ---
  const infoConfig = {
    labelSize: 18,      // Tailles réduites
    valueSize: 20,
    spacing: 38,        // Espacement réduit
    labelOffset: 0,
    valueOffset: 130    // Décalage réduit
  };

  const machineInfo = [
    { label: 'Modele:', value: cleanText(machine.modele) },
    { label: 'N° serie:', value: cleanText(machine.numero_serie) },
    { label: 'Annee:', value: machine.annee?.toString() || 'N/A' }
  ];

  if (machine.fabricant) {
    machineInfo.push({ 
      label: 'Fabricant:', 
      value: cleanText(machine.fabricant) 
    });
  }

  // Ajouter les informations du poste technique
  if (machine.poste_technique) {
    const pt = machine.poste_technique;
    machineInfo.push({ 
      label: 'PT:', 
      value: cleanText(pt.code_pt) 
    });
  }

  machineInfo.forEach(item => {
    let displayValue = item.value;
    
    // Ne pas tronquer le code PT, tronquer les autres valeurs
    if (item.label !== 'PT:' && displayValue.length > 18) {
      displayValue = displayValue.substring(0, 15) + '...';
    }

    // Pour le code PT, afficher label et valeur collés sans espace
    if (item.label === 'PT:') {
      zpl += `^FO${rightX + infoConfig.labelOffset},${yPos}`;
      zpl += `^A0N,${infoConfig.labelSize},${infoConfig.labelSize}`;
      zpl += `^FD${item.label}${displayValue}^FS\n`;
    } else {
      // Pour les autres, afficher normalement avec label et valeur séparés
      zpl += `^FO${rightX + infoConfig.labelOffset},${yPos}`;
      zpl += `^A0N,${infoConfig.labelSize},${infoConfig.labelSize}`;
      zpl += `^FD${item.label}^FS\n`;

      zpl += `^FO${rightX + infoConfig.valueOffset},${yPos}`;
      zpl += `^A0N,${infoConfig.valueSize},${infoConfig.valueSize}`;
      zpl += `^FD${displayValue}^FS\n`;
    }

    yPos += infoConfig.spacing;
  });

  zpl += `^XZ\n`;

  // === TÉLÉCHARGEMENT ===
  const fileName = `etiquette-${cleanText(machine.nom || machine.machine_id || 'machine')}.zpl`;
  
  const blob = new Blob([zpl], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log('Fichier ZPL généré:', fileName);
}

// === FONCTION DE CONVERSION IMAGE → ZPL HEX ===
// (Assurez-vous que cette fonction existe dans votre code)
function convertImageToZPLHex(imageData, width, height) {
  const data = imageData.data;
  let hex = '';
  
  for (let y = 0; y < height; y++) {
    let hexRow = '';
    for (let x = 0; x < width; x += 8) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const px = x + bit;
        if (px < width) {
          const idx = (y * width + px) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          if (brightness < 128) byte |= (1 << (7 - bit));
        }
      }
      hexRow += byte.toString(16).padStart(2, '0').toUpperCase();
    }
    hex += hexRow;
  }
  
  return hex;
}

 return (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800">QR Code - Fiche Machine</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
          aria-label="Fermer"
        >
          <X size={24} />
        </button>
      </div>

      {/* Preview */}
      <div ref={previewRef} className="bg-slate-50 rounded-lg p-4 mb-4 border shadow-inner">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
          
          {/* QR Code */}
          <div className="flex-shrink-0 flex justify-center">
            <div className="bg-white sm:p-1 rounded-xl border shadow-md">
              <canvas ref={canvasRef} />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">{machine.nom || 'N/A'}</h3>
            <div className="space-y-2">
              <InfoRow label="Modèle" value={machine.modele} />
              <InfoRow label="N° de série" value={machine.numero_serie} />
              <InfoRow label="Année" value={machine.annee?.toString()} />
              {machine.fabricant && <InfoRow label="Fabricant" value={machine.fabricant} />}
              
              {/* Informations du poste technique */}
              {machine.poste_technique && (
                <>
                  <div className="border-t border-slate-200 my-2 pt-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Poste Technique</p>
                  </div>
                  <InfoRow label="Code PT" value={machine.poste_technique.code_pt} />
                  {machine.poste_technique.secteur && (
                    <InfoRow label="Secteur" value={machine.poste_technique.secteur.libelle} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <ActionButton onClick={downloadAsImage} label="Télécharger l'image" icon={<Download size={20} />} />
        <ActionButton onClick={generateZPLLabel} label="Télécharger ZPL" icon={<Download size={20} />} />
        <button
          onClick={onClose}
          className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all font-semibold"
        >
          Fermer
        </button>
      </div>
    </div>
  </div>
);

// Composant InfoRow simplifié
function InfoRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex justify-between bg-white px-3 py-2 rounded-lg shadow-sm">
      <span className="font-semibold text-slate-700">{label}:</span>
      <span className="text-slate-900 font-medium">{value || 'N/A'}</span>
    </div>
  );
}

// Composant ActionButton simplifié
function ActionButton({ onClick, label, icon }: { onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#ea742b] text-white rounded-lg hover:bg-[#f15c00] transition-all font-semibold"
    >
      {icon}
      {label}
    </button>
  );
}

}