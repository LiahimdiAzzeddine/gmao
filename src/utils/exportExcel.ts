import * as XLSX from 'xlsx-js-style';
import { Devis } from '../types/devis';
import { calculateTotalHT, calculateTotalTTC } from './gestionMethode';

export interface ExportOptions {
  filename?: string;
  sheetName?: string;
  includeFilters?: {
    searchTerm?: string;
    filterClient?: string;
    filterStatut?: string;
  };
}

export function exportDevisToExcel(
  devisList: Devis[], 
  options: ExportOptions = {}
) {
  const {
    filename = `devis_export_${new Date().toISOString().split('T')[0]}.xlsx`,
    sheetName = 'Devis',
    includeFilters
  } = options;

  // Préparer les données pour l'export
  const exportData = devisList.map((devis, index) => {
    const totalHT = calculateTotalHT(devis);
    const totalTTC = calculateTotalTTC(totalHT);

    return {
      'No': index + 1,
      'N° Devis': devis.num_devis || '',
      'Statut': getStatutLabel(devis.statut),
      'Client': devis.clients_devis?.client || '',
      'Code Chantier': devis.chantiers?.code || '',
      'Désignation': devis.designation || '',
      'Total HT': totalHT, // Nombre brut pour Excel
      'Total TTC': devis.ht_ttc === "HT" ? 'HT' : totalTTC, // Nombre brut pour Excel
      'Monnaie': devis.monetaire?.symbol || 'Dhs',
      'Contact': devis.contact?.nom || '',
      'Date Devis': devis.date_devis ? new Date(devis.date_devis).toLocaleDateString('fr-FR') : '',
      'N° Facture': devis.factures?.numero_facture || '',
      'Date Facturation': devis.factures?.date_facture ? 
        new Date(devis.factures.date_facture).toLocaleDateString('fr-FR') : '',
      'Date Échéance': devis.factures?.date_echeance ? 
        new Date(devis.factures.date_echeance + "T00:00:00").toLocaleDateString('fr-FR') : '',
      'Date Paiement': devis.date_paye ? 
        new Date(devis.date_paye).toLocaleDateString('fr-FR') + ' ' + 
        new Date(devis.date_paye).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
    };
  });

  // Créer un nouveau workbook
  const wb = XLSX.utils.book_new();

  // Créer la feuille principale avec les données
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Définir la largeur des colonnes
  const colWidths = [
    { wch: 5 },   // No
    { wch: 15 },  // N° Devis
    { wch: 12 },  // Statut
    { wch: 25 },  // Client
    { wch: 15 },  // Code Chantier
    { wch: 30 },  // Désignation
    { wch: 12 },  // Total HT
    { wch: 12 },  // Total TTC
    { wch: 8 },   // Monnaie
    { wch: 20 },  // Contact
    { wch: 12 },  // Date Devis
    { wch: 15 },  // N° Facture
    { wch: 15 },  // Date Facturation
    { wch: 12 },  // Date Échéance
    { wch: 18 },  // Date Paiement
  ];
  ws['!cols'] = colWidths;

  // Ajouter des bordures et du style au tableau
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  
  // Style pour les en-têtes
  const headerStyle = {
    fill: { fgColor: { rgb: "EA580C" } }, // Orange
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

  // Appliquer le style aux cellules de données
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;
      
      // Style spécial pour les colonnes numériques (Total HT, Total TTC)
      if (col === 6 || col === 7) { // Colonnes Total HT et Total TTC
        // S'assurer que la valeur est un nombre (sauf si c'est "HT")
        if (ws[cellAddress].v !== 'HT' && ws[cellAddress].v !== undefined && ws[cellAddress].v !== null && ws[cellAddress].v !== '') {
          const numValue = Number(ws[cellAddress].v);
          if (!isNaN(numValue)) {
            ws[cellAddress].t = 'n'; // Type numérique
            ws[cellAddress].v = numValue;
          }
        }
        
        ws[cellAddress].s = {
          ...dataStyle,
          alignment: { horizontal: "right", vertical: "center" },
          numFmt: "#,##0.00" // Excel utilisera la virgule selon les paramètres régionaux
        };
      } else {
        ws[cellAddress].s = dataStyle;
      }
    }
  }

  // Ajouter la feuille au workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Si des filtres sont appliqués, créer une feuille d'informations
  if (includeFilters && (includeFilters.searchTerm || includeFilters.filterClient !== 'all' || includeFilters.filterStatut !== 'all')) {
    const filterInfo = [];
    
    filterInfo.push(['Informations sur l\'export', '']);
    filterInfo.push(['Date d\'export', new Date().toLocaleString('fr-FR')]);
    filterInfo.push(['Nombre de devis exportés', devisList.length.toString()]);
    filterInfo.push(['', '']);
    filterInfo.push(['Filtres appliqués', '']);
    
    if (includeFilters.searchTerm) {
      filterInfo.push(['Recherche', includeFilters.searchTerm]);
    }
    
    if (includeFilters.filterClient && includeFilters.filterClient !== 'all') {
      filterInfo.push(['Client filtré', includeFilters.filterClient]);
    }
    
    if (includeFilters.filterStatut && includeFilters.filterStatut !== 'all') {
      filterInfo.push(['Statut filtré', getStatutLabel(includeFilters.filterStatut)]);
    }

    const wsInfo = XLSX.utils.aoa_to_sheet(filterInfo);
    wsInfo['!cols'] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Informations');
  }

  // Télécharger le fichier
  XLSX.writeFile(wb, filename);
}

function getStatutLabel(statut: string): string {
  const statutLabels: { [key: string]: string } = {
    en_attente: 'En attente',
    en_cours: 'En cours',
    facturé: 'Facturé',
    annule: 'Annulé',
    payé: 'Payé',
    terminé: 'Terminé',
    accepte: 'Accepté',
  };
  
  return statutLabels[statut] || statut;
}