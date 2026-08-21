import * as XLSX from 'xlsx-js-style';

export interface ContractPeriodExportOptions {
  filename?: string;
  sheetName?: string;
  includeFilters?: {
    searchTerm?: string;
    filterClient?: string;
    filterStatut?: string;
  };
}

export function exportContractPeriodsToExcel(
  periods: any[],
  options: ContractPeriodExportOptions = {}
) {
  const {
    filename = `periodes_contrats_P2_${new Date().toISOString().split('T')[0]}.xlsx`,
    sheetName = 'Périodes P2',
    includeFilters
  } = options;

  // Préparer les données pour l'export
  const exportData = periods.map((period, index) => {
    const correctifsTotal = period.correctifs?.reduce((sum: number, c: any) => sum + c.total, 0) || 0;
    
    // Fonction pour s'assurer qu'une valeur est un nombre valide
    const ensureNumber = (value: any): number => {
      if (value === null || value === undefined || value === '') return 0;
      
      // Si c'est déjà un nombre
      if (typeof value === 'number') {
        return isNaN(value) ? 0 : value;
      }
      
      // Si c'est une chaîne, la nettoyer
      if (typeof value === 'string') {
        const cleanValue = value
          .trim()
          .replace(/\s/g, '') // Supprimer les espaces
          .replace(/,/g, '.') // Remplacer virgules par points
          .replace(/[^\d.-]/g, ''); // Garder seulement chiffres, points et tirets
        
        const num = parseFloat(cleanValue);
        return isNaN(num) ? 0 : num;
      }
      
      // Tentative de conversion directe
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    };
    
    return {
      'No': index + 1,
      'Contrat': period.contract.nom || '',
      'Client': period.contract.client.client || '',
      'ICE Client': period.contract.client.ice || '',
      'N° Fournisseur': period.contract.client.numero_fournisseur || '',
      'Code Chantier': period.contract.chantier_code || '',
      'Type Devis': period.contract.chantier?.type_devis?.libelle || '',
      'Code Type': period.contract.chantier?.type_devis?.code || '',
      'Début Période': period.periode_debut ? new Date(period.periode_debut).toLocaleDateString('fr-FR') : '',
      'Fin Période': period.periode_fin ? new Date(period.periode_fin).toLocaleDateString('fr-FR') : '',
      'Montant': (() => {
        const rawMontant = period.montant;
        const cleanMontant = ensureNumber(rawMontant);
        // Debug temporaire - à supprimer après test
        if (rawMontant !== cleanMontant) {
          console.log('Montant conversion:', { raw: rawMontant, clean: cleanMontant, type: typeof rawMontant });
        }
        return cleanMontant;
      })(), // Nombre valide garanti avec debug
      'Devise': 'MAD',
      'HT/TTC': period.contract.ht_ttc || '',
      'Statut Période': getStatutLabel(period.statut),
      'Mode Paiement': period.payment_mode || '',
      'N° Facture': period.facture.numero_facture || '',
      'Statut Facture': getFactureStatutLabel(period.facture.statut),
      'Date Facture': period.facture.date_facture ? 
        new Date(period.facture.date_facture).toLocaleDateString('fr-FR') : '',
      'Date Échéance': period.facture.date_echeance ? 
        new Date(period.facture.date_echeance).toLocaleDateString('fr-FR') : '',
      'Correctifs Total': ensureNumber(correctifsTotal), // Nombre valide garanti
      'Nb Correctifs': ensureNumber(period.correctifs?.length),
      'Contact Nom': period.contract.contact?.nom || '',
      'Émetteur': period.contract.emetteur?.nom || '',
      'N° Commande': period.contract.numero_commande || '',
      'Facturation': period.contract.facturation || '',
      'Date Début Contrat': period.contract.date_debut ? 
        new Date(period.contract.date_debut).toLocaleDateString('fr-FR') : '',
      'Date Fin Contrat': period.contract.date_fin ? 
        new Date(period.contract.date_fin).toLocaleDateString('fr-FR') : '',
      'Forfaitaire': ensureNumber(period.contract.forfaitaire), // Nombre valide garanti
      'Montant Période Contrat': ensureNumber(period.contract.montant_periode) // Nombre valide garanti
    };
  });

  // Créer un nouveau workbook
  const wb = XLSX.utils.book_new();

  // Créer la feuille principale avec les données
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Définir la largeur des colonnes
  const colWidths = [
    { wch: 5 },   // No
    { wch: 25 },  // Contrat
    { wch: 25 },  // Client
    { wch: 15 },  // ICE Client
    { wch: 15 },  // N° Fournisseur
    { wch: 15 },  // Code Chantier
    { wch: 20 },  // Type Devis
    { wch: 10 },  // Code Type
    { wch: 12 },  // Début Période
    { wch: 12 },  // Fin Période
    { wch: 15 },  // Montant
    { wch: 8 },   // Devise
    { wch: 8 },   // HT/TTC
    { wch: 15 },  // Statut Période
    { wch: 15 },  // Mode Paiement
    { wch: 15 },  // N° Facture
    { wch: 15 },  // Statut Facture
    { wch: 12 },  // Date Facture
    { wch: 12 },  // Date Échéance
    { wch: 15 },  // Correctifs Total
    { wch: 12 },  // Nb Correctifs
    { wch: 20 },  // Contact Nom
    { wch: 20 },  // Émetteur
    { wch: 15 },  // N° Commande
    { wch: 15 },  // Facturation
    { wch: 15 },  // Date Début Contrat
    { wch: 15 },  // Date Fin Contrat
    { wch: 15 },  // Forfaitaire
    { wch: 20 }   // Montant Période Contrat
  ];
  ws['!cols'] = colWidths;

  // Ajouter des bordures et du style au tableau
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  
  // Style pour les en-têtes
  const headerStyle = {
    fill: { fgColor: { rgb: "F15C00" } }, // Orange FSG
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
      
      // Colonnes numériques : Montant(10), Correctifs Total(19), Nb Correctifs(20), Forfaitaire(27), Montant Période(28)
      if (col === 10 || col === 19 || col === 20 || col === 27 || col === 28) {
        // Conversion robuste pour éviter les erreurs #VALEUR!
        let numValue = 0;
        const rawValue = ws[cellAddress].v;
        
        if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
          // Nettoyer la valeur si c'est une chaîne
          if (typeof rawValue === 'string') {
            // Supprimer les espaces, virgules, et autres caractères non numériques
            const cleanValue = rawValue.toString()
              .replace(/\s/g, '') // Supprimer les espaces
              .replace(/,/g, '.') // Remplacer virgules par points
              .replace(/[^\d.-]/g, ''); // Garder seulement chiffres, points et tirets
            numValue = parseFloat(cleanValue) || 0;
          } else {
            numValue = Number(rawValue) || 0;
          }
        }
        
        // Forcer le type numérique et la valeur
        ws[cellAddress].t = 'n';
        ws[cellAddress].v = numValue;
        
        // Supprimer toute formule ou référence qui pourrait causer des erreurs
        delete ws[cellAddress].f;
        
        // Format différent pour Nb Correctifs (entier) vs montants (décimaux)
        const numFormat = (col === 20) ? "#,##0" : "#,##0.00";
        
        ws[cellAddress].s = {
          ...dataStyle,
          alignment: { horizontal: "right", vertical: "center" },
          numFmt: numFormat
        };
      } else {
        ws[cellAddress].s = dataStyle;
      }
    }
  }

  // Ajouter la feuille au workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Si des filtres sont appliqués, créer une feuille d'informations
  if (includeFilters && (includeFilters.searchTerm || includeFilters.filterClient || includeFilters.filterStatut)) {
    const filterInfo = [];
    
    filterInfo.push(['Informations sur l\'export', '']);
    filterInfo.push(['Date d\'export', new Date().toLocaleString('fr-FR')]);
    filterInfo.push(['Nombre de périodes exportées', periods.length.toString()]);
    filterInfo.push(['', '']);
    filterInfo.push(['Filtres appliqués', '']);
    
    if (includeFilters.searchTerm) {
      filterInfo.push(['Recherche', includeFilters.searchTerm]);
    }
    
    if (includeFilters.filterClient) {
      filterInfo.push(['Client filtré', includeFilters.filterClient]);
    }
    
    if (includeFilters.filterStatut) {
      filterInfo.push(['Statut filtré', getStatutLabel(includeFilters.filterStatut)]);
    }

    // Ajouter les statistiques avec validation des nombres
    const totalMontant = periods.reduce((sum, p) => {
      const montant = Number(p.montant) || 0;
      return sum + montant;
    }, 0);
    
    const totalCorrectifs = periods.reduce((sum, p) => {
      const correctifs = p.correctifs?.reduce((cSum: number, c: any) => {
        const cTotal = Number(c.total) || 0;
        return cSum + cTotal;
      }, 0) || 0;
      return sum + correctifs;
    }, 0);
    
    const clientsUniques = new Set(periods.map(p => p.contract.client.id)).size;
    const contratsUniques = new Set(periods.map(p => p.contract.id)).size;

    filterInfo.push(['', '']);
    filterInfo.push(['Statistiques', '']);
    filterInfo.push(['Montant total des périodes', totalMontant]); // Nombre validé
    filterInfo.push(['Total des correctifs', totalCorrectifs]); // Nombre validé
    filterInfo.push(['Nombre de clients uniques', clientsUniques]);
    filterInfo.push(['Nombre de contrats uniques', contratsUniques]);

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
    facture: 'Facturé',
    payee: 'Payée',
    annulee: 'Annulée'
  };
  
  return statutLabels[statut] || statut;
}

function getFactureStatutLabel(statut: string): string {
  const statutLabels: { [key: string]: string } = {
    brouillon: 'Brouillon',
    envoyee: 'Envoyée',
    payee: 'Payée',
    annulee: 'Annulée'
  };
  
  return statutLabels[statut] || statut;
}