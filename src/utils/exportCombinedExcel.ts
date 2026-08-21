import * as XLSX from 'xlsx-js-style';

export interface CombinedExportOptions {
  filename?: string;
  includeFilters?: {
    searchTerm?: string;
    filterClient?: string;
    filterStatut?: string;
    filterType?: string;
  };
}

export function exportCombinedDataToExcel(
  combinedData: any[],
  options: CombinedExportOptions = {}
) {
  const {
    filename = `export_combine_P2_P5_${new Date().toISOString().split('T')[0]}.xlsx`,
    includeFilters
  } = options;

  // Séparer les données P2 et P5
  const p2Data = combinedData.filter(item => item.type === 'P2');
  const p5Data = combinedData.filter(item => item.type === 'P5');

  // Créer un nouveau workbook
  const wb = XLSX.utils.book_new();

  // Fonction pour garantir un nombre valide
  const ensureNumber = (value: any): number => {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.-]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // Feuille combinée avec toutes les données
  const combinedExportData = combinedData.map((item, index) => {
    // Calculer Total HT et TTC
    const totalHT = ensureNumber(item.montant);
    
    // Déterminer si on doit afficher le TTC
    let htTtcValue = '';
    if (item.type === 'P2') {
      htTtcValue = item.raw_data?.contract?.ht_ttc || 'HT';
    } else {
      htTtcValue = item.raw_data?.ht_ttc || 'HT';
    }
    
    // Calculer TTC uniquement si ht_ttc === 'TTC' - retourner nombre brut ou chaîne vide
    const totalTTC = htTtcValue === 'TTC' ? ensureNumber(totalHT * 1.2) : '';
    
    const baseData = {
      'No': index + 1,
      'Type': item.type,
      'Client': item.client_nom || '',
      'ICE Client': item.client_ice || '',
      'Code Chantier': item.chantier_code || '',
      'Total HT': totalHT, // Nombre brut
      'Total TTC': totalTTC, // Nombre brut ou vide
      'Statut': getStatutLabel(item.statut, item.type),
    };

    if (item.type === 'P2') {
      return {
        ...baseData,
        'Référence': `Période ${item.id.split('-')[1]}`,
        'N° Devis': '',
        'Désignation': '',
        'Début Période': item.periode_debut ? new Date(item.periode_debut).toLocaleDateString('fr-FR') : '',
        'Fin Période': item.periode_fin ? new Date(item.periode_fin).toLocaleDateString('fr-FR') : '',
        'Date Devis': '',
        'N° Facture': item.facture_numero || '',
        'Date Facturation': item.date_facture ? new Date(item.date_facture).toLocaleDateString('fr-FR') : '',
        'Date Échéance': item.date_echeance ? new Date(item.date_echeance).toLocaleDateString('fr-FR') : '',
        'Date Paiement': '',
        'Correctifs Total': ensureNumber(item.correctifs_total) // Nombre brut
      };
    } else {
      return {
        ...baseData,
        'Référence': item.num_devis || '',
        'N° Devis': item.num_devis || '',
        'Désignation': item.designation || '',
        'Début Période': '',
        'Fin Période': '',
        'Date Devis': item.date_devis ? new Date(item.date_devis).toLocaleDateString('fr-FR') : '',
        'N° Facture': item.facture_numero || '',
        'Date Facturation': item.date_facture ? new Date(item.date_facture).toLocaleDateString('fr-FR') : '',
        'Date Échéance': item.date_echeance ? new Date(item.date_echeance).toLocaleDateString('fr-FR') : '',
        'Date Paiement': item.date_paye ? new Date(item.date_paye).toLocaleDateString('fr-FR') : '',
        'Correctifs Total': ''
      };
    }
  });

  // Créer la feuille combinée
  const wsCombined = XLSX.utils.json_to_sheet(combinedExportData);
  
  // Largeurs des colonnes pour la feuille combinée
  const combinedColWidths = [
    { wch: 5 },   // No
    { wch: 8 },   // Type
    { wch: 25 },  // Client
    { wch: 15 },  // ICE Client
    { wch: 15 },  // Code Chantier
    { wch: 15 },  // Total HT
    { wch: 15 },  // Total TTC
    { wch: 15 },  // Statut
    { wch: 20 },  // Référence
    { wch: 15 },  // N° Devis
    { wch: 30 },  // Désignation
    { wch: 12 },  // Début Période
    { wch: 12 },  // Fin Période
    { wch: 12 },  // Date Devis
    { wch: 15 },  // N° Facture
    { wch: 15 },  // Date Facturation
    { wch: 15 },  // Date Échéance
    { wch: 15 },  // Date Paiement
    { wch: 15 }   // Correctifs Total
  ];
  wsCombined['!cols'] = combinedColWidths;

  // Appliquer les styles à la feuille combinée
  applyStyling(wsCombined, 'combined');
  XLSX.utils.book_append_sheet(wb, wsCombined, 'Données Combinées');

  // Feuille d'informations et statistiques
  createInfoSheet(wb, combinedData, p2Data, p5Data, includeFilters);

  // Télécharger le fichier
  XLSX.writeFile(wb, filename);
}

function applyStyling(ws: any, sheetType: string) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  
  // Couleurs selon le type de feuille
  const headerColor = sheetType === 'P2' ? "F15C00" : sheetType === 'P5' ? "EA580C" : "8B5CF6"; // Orange FSG, Orange, Purple
  
  // Style pour les en-têtes
  const headerStyle = {
    fill: { fgColor: { rgb: headerColor } },
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };

  // Style pour les cellules de données
  const dataStyle = {
    alignment: { horizontal: "left", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "CCCCCC" } },
      bottom: { style: "thin", color: { rgb: "CCCCCC" } },
      left: { style: "thin", color: { rgb: "CCCCCC" } },
      right: { style: "thin", color: { rgb: "CCCCCC" } }
    }
  };

  // Appliquer le style aux en-têtes (première ligne)
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;
    ws[cellAddress].s = headerStyle;
  }

  // Identifier les colonnes numériques par leur en-tête
  const numericColumns = new Set<number>();
  for (let col = range.s.c; col <= range.e.c; col++) {
    const headerAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    const headerValue = ws[headerAddress]?.v;
    
    // Colonnes qui doivent être numériques
    if (headerValue && (
      headerValue.includes('Total HT') || 
      headerValue.includes('Total TTC') || 
      headerValue.includes('Montant') ||
      headerValue.includes('Correctifs')
    )) {
      numericColumns.add(col);
    }
  }

  // Appliquer le style aux cellules de données
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;
      
      const cellValue = ws[cellAddress].v;
      
      // Forcer le type numérique pour les colonnes identifiées
      if (numericColumns.has(col)) {
        if (cellValue !== '' && cellValue !== null && cellValue !== undefined) {
          // S'assurer que c'est un nombre
          const numValue = typeof cellValue === 'number' ? cellValue : parseFloat(cellValue);
          if (!isNaN(numValue)) {
            ws[cellAddress].t = 'n'; // Type numérique
            ws[cellAddress].v = numValue;
            ws[cellAddress].s = {
              ...dataStyle,
              alignment: { horizontal: "right", vertical: "center" },
              numFmt: "#,##0.00"
            };
          }
        }
      } else {
        ws[cellAddress].s = dataStyle;
      }
    }
  }
}

function createInfoSheet(wb: any, combinedData: any[], p2Data: any[], p5Data: any[], includeFilters?: any) {
  const filterInfo = [];
  
  filterInfo.push(['Informations sur l\'export combiné', '']);
  filterInfo.push(['Date d\'export', new Date().toLocaleString('fr-FR')]);
  filterInfo.push(['', '']);
  
  // Statistiques générales
  filterInfo.push(['STATISTIQUES GÉNÉRALES', '']);
  filterInfo.push(['Total éléments exportés', combinedData.length.toString()]);
  filterInfo.push(['Éléments P2 (Périodes)', p2Data.length.toString()]);
  filterInfo.push(['Éléments P5 (Devis)', p5Data.length.toString()]);
  filterInfo.push(['', '']);
  
  // Statistiques financières
  const totalMontantHT = combinedData.reduce((sum, item) => sum + item.montant, 0);
  
  // Calculer le total TTC uniquement pour les éléments avec ht_ttc === 'TTC'
  const totalMontantTTC = combinedData.reduce((sum, item) => {
    let htTtcValue = '';
    if (item.type === 'P2') {
      htTtcValue = item.raw_data?.contract?.ht_ttc || 'HT';
    } else {
      htTtcValue = item.raw_data?.ht_ttc || 'HT';
    }
    return sum + (htTtcValue === 'TTC' ? item.montant * 1.2 : 0);
  }, 0);
  
  const totalP2HT = p2Data.reduce((sum, item) => sum + item.montant, 0);
  const totalP2TTC = p2Data.reduce((sum, item) => {
    const htTtcValue = item.raw_data?.contract?.ht_ttc || 'HT';
    return sum + (htTtcValue === 'TTC' ? item.montant * 1.2 : 0);
  }, 0);
  
  const totalP5HT = p5Data.reduce((sum, item) => sum + item.montant, 0);
  const totalP5TTC = p5Data.reduce((sum, item) => {
    const htTtcValue = item.raw_data?.ht_ttc || 'HT';
    return sum + (htTtcValue === 'TTC' ? item.montant * 1.2 : 0);
  }, 0);
  
  filterInfo.push(['STATISTIQUES FINANCIÈRES', '']);
  filterInfo.push(['Total HT combiné', `${formatNumber(totalMontantHT)} MAD`]);
  if (totalMontantTTC > 0) {
    filterInfo.push(['Total TTC combiné', `${formatNumber(totalMontantTTC)} MAD`]);
  }
  filterInfo.push(['Total HT P2', `${formatNumber(totalP2HT)} MAD`]);
  if (totalP2TTC > 0) {
    filterInfo.push(['Total TTC P2', `${formatNumber(totalP2TTC)} MAD`]);
  }
  filterInfo.push(['Total HT P5', `${formatNumber(totalP5HT)} MAD`]);
  if (totalP5TTC > 0) {
    filterInfo.push(['Total TTC P5', `${formatNumber(totalP5TTC)} MAD`]);
  }
  filterInfo.push(['', '']);
  
  // Statistiques clients
  const clientsUniques = new Set(combinedData.map(item => item.client_nom)).size;
  const clientsP2 = new Set(p2Data.map(item => item.client_nom)).size;
  const clientsP5 = new Set(p5Data.map(item => item.client_nom)).size;
  
  filterInfo.push(['STATISTIQUES CLIENTS', '']);
  filterInfo.push(['Clients uniques total', clientsUniques.toString()]);
  filterInfo.push(['Clients P2', clientsP2.toString()]);
  filterInfo.push(['Clients P5', clientsP5.toString()]);
  filterInfo.push(['', '']);
  
  // Filtres appliqués
  if (includeFilters && (includeFilters.searchTerm || includeFilters.filterClient || includeFilters.filterStatut || includeFilters.filterType)) {
    filterInfo.push(['FILTRES APPLIQUÉS', '']);
    
    if (includeFilters.searchTerm) {
      filterInfo.push(['Recherche', includeFilters.searchTerm]);
    }
    
    if (includeFilters.filterClient) {
      filterInfo.push(['Client filtré', includeFilters.filterClient]);
    }
    
    if (includeFilters.filterStatut) {
      filterInfo.push(['Statut filtré', includeFilters.filterStatut]);
    }
    
    if (includeFilters.filterType) {
      filterInfo.push(['Type filtré', includeFilters.filterType]);
    }
  }

  const wsInfo = XLSX.utils.aoa_to_sheet(filterInfo);
  wsInfo['!cols'] = [{ wch: 30 }, { wch: 25 }];
  
  // Style pour la feuille d'informations
  const range = XLSX.utils.decode_range(wsInfo['!ref'] || 'A1');
  for (let row = range.s.r; row <= range.e.r; row++) {
    const cellA = XLSX.utils.encode_cell({ r: row, c: 0 });
    
    if (wsInfo[cellA] && wsInfo[cellA].v && wsInfo[cellA].v.toString().includes('STATISTIQUES') || wsInfo[cellA].v === 'FILTRES APPLIQUÉS') {
      // Style pour les titres de section
      wsInfo[cellA].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "8B5CF6" } },
        alignment: { horizontal: "left", vertical: "center" }
      };
    }
  }
  
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Informations');
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

function getStatutLabel(statut: string, type: 'P2' | 'P5'): string {
  if (type === 'P2') {
    const statutLabels: { [key: string]: string } = {
      en_attente: 'En attente',
      payee: 'Payée',
      annulee: 'Annulée'
    };
    return statutLabels[statut] || statut;
  } else {
    const statutLabels: { [key: string]: string } = {
      en_attente: 'En attente',
      en_cours: 'En cours',
      facturé: 'Facturé',
      annule: 'Annulé',
      payé: 'Payé',
      terminé: 'Terminé',
      accepte: 'Accepté'
    };
    return statutLabels[statut] || statut;
  }
}