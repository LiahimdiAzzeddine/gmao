import * as XLSX from 'xlsx-js-style';
import { Devis, Client } from '../types/devis';
import { calculateTotalHT, calculateTotalTTC } from './gestionMethode';

interface Stats {
    [key: string]: {
        count: number;
        totalHT: number;
        totalTTC: number;
    };
}

const statutLabels: { [key: string]: string } = {
    en_attente: 'En attente',
    en_cours: 'En cours',
    accepte: 'Accepté',
    termine: 'Terminé',
    facturé: 'Facturé',
    paye: 'Payé',
    annule: 'Annulé',
};

// Styles améliorés pour Excel
const styles = {
    header: {
        fill: { fgColor: { rgb: "F97316" } },
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
            top: { style: "medium", color: { rgb: "000000" } },
            bottom: { style: "medium", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        }
    },
    totalStatut: {
        fill: { fgColor: { rgb: "FED7AA" } },
        font: { bold: true, sz: 11 },
        alignment: { horizontal: "right", vertical: "center" },
        border: {
            top: { style: "medium", color: { rgb: "000000" } },
            bottom: { style: "medium", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        }
    },
    totalGeneral: {
        fill: { fgColor: { rgb: "EA580C" } },
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
        alignment: { horizontal: "right", vertical: "center" },
        border: {
            top: { style: "medium", color: { rgb: "000000" } },
            bottom: { style: "medium", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        }
    },
    data: {
        border: {
            top: { style: "thin", color: { rgb: "E5E7EB" } },
            bottom: { style: "thin", color: { rgb: "E5E7EB" } },
            left: { style: "thin", color: { rgb: "E5E7EB" } },
            right: { style: "thin", color: { rgb: "E5E7EB" } }
        },
        alignment: { vertical: "center" }
    },
    currency: {
        numFmt: '#,##0.00',
        border: {
            top: { style: "thin", color: { rgb: "E5E7EB" } },
            bottom: { style: "thin", color: { rgb: "E5E7EB" } },
            left: { style: "thin", color: { rgb: "E5E7EB" } },
            right: { style: "thin", color: { rgb: "E5E7EB" } }
        },
        alignment: { horizontal: "right", vertical: "center" }
    },
    percentage: {
        numFmt: '0.00%',
        border: {
            top: { style: "thin", color: { rgb: "E5E7EB" } },
            bottom: { style: "thin", color: { rgb: "E5E7EB" } },
            left: { style: "thin", color: { rgb: "E5E7EB" } },
            right: { style: "thin", color: { rgb: "E5E7EB" } }
        },
        alignment: { horizontal: "right", vertical: "center" }
    }
};

function createDetailsSheet(
    devis: Devis[],
    selectedStatuts: string[]
): XLSX.WorkSheet {
    const devisFiltered = devis.filter(d => selectedStatuts.includes(d.statut));
    
    if (devisFiltered.length === 0) {
        const ws = XLSX.utils.aoa_to_sheet([['Aucun devis à afficher']]);
        return ws;
    }
    
    const allDevisAreHT = devisFiltered.every(d => d.ht_ttc === 'HT');
    const devisExportData: any[] = [];
    const currency = devis[0]?.monetaire?.symbol || 'Dhs';
    
    // Variables pour les totaux par statut (pour affichage en bas)
    const statutTotals: { [key: string]: { totalHT: number; totalTTC: number; totalAchatsHT: number; totalMarge: number } } = {};
    
    selectedStatuts.forEach((statut) => {
        const devisParStatut = devisFiltered.filter(d => d.statut === statut);
        
        if (devisParStatut.length === 0) return;
        
        // Variables pour les totaux du statut
        let totalStatutHT = 0;
        let totalStatutTTC = 0;
        let totalStatutAchats = 0;
        let totalStatutMarge = 0;
        
        devisParStatut.forEach((d) => {
            const totalHT = calculateTotalHT(d);
            const totalTTC = d.ht_ttc === 'HT' ? totalHT : calculateTotalTTC(totalHT);
            const achats = (d.chantiers?.achats || [])
                .filter(a => a.statut !== 'annule')
                .reduce((sum, a) => sum + Number(a.total_ht || 0), 0);
            
            // ✅ CORRECTION : La marge est toujours calculée en HT
            // car les achats sont toujours en HT
            const margeHT = totalHT - achats;
            
            // Pour l'affichage, si le devis est en TTC, on convertit la marge en TTC
            const margeTTC = d.ht_ttc === 'HT' ? margeHT : calculateTotalTTC(margeHT);
            const montantDeBase = d.ht_ttc === 'HT' ? totalHT : totalTTC;
            const margeAffichee = d.ht_ttc === 'HT' ? margeHT : margeTTC;
            
            // Accumuler les totaux (toujours en HT pour cohérence)
            totalStatutHT += totalHT;
            totalStatutTTC += totalTTC;
            totalStatutAchats += achats;
            totalStatutMarge += margeHT;
            
            const row: any = {
                'N° Devis': d.num_devis,
                'Code Chantier': d.chantiers?.code || '-',
                'Date': d.date_devis ? new Date(d.date_devis).toLocaleDateString('fr-FR') : '-',
                'Statut': statutLabels[d.statut] || d.statut,
                'Désignation': d.designation || '-',
                'Type': d.type_devis?.libelle || '-',
                'Domaine': d.domaines_activite?.libelle || '-',
                'Type Montant': d.ht_ttc || 'HT',
                [`Montant HT (${currency})`]: totalHT,
                [`Total Achats HT (${currency})`]: achats,
                // ✅ CORRECTION : Pourcentages calculés sur la base correcte
                "Pourcentage Achats/Total": montantDeBase > 0 ? achats / montantDeBase : 0,
                [`Restant (${currency})`]: margeAffichee,
                'Pourcentage Restant/Total': montantDeBase > 0 ? margeAffichee / montantDeBase : 0,
            };

            if (!allDevisAreHT) {
                row[`Montant TTC (${currency})`] = totalTTC;
            }

            devisExportData.push(row);
        });
        
        // Stocker les totaux par statut
        statutTotals[statut] = {
            totalHT: totalStatutHT,
            totalTTC: totalStatutTTC,
            totalAchatsHT: totalStatutAchats,
            totalMarge: totalStatutMarge
        };
    });

    // ✅ CORRECTION : Total général cohérent
    const totalGeneralHT = devisFiltered.reduce((sum, d) => sum + calculateTotalHT(d), 0);
    const totalGeneralTTC = devisFiltered.reduce((sum, d) => {
        const ht = calculateTotalHT(d);
        return sum + (d.ht_ttc === 'HT' ? ht : calculateTotalTTC(ht));
    }, 0);
    const totalGeneralAchatsHT = devisFiltered.reduce((sum, d) => {
        return sum + (d.chantiers?.achats || [])
            .filter(a => a.statut !== 'annule')
            .reduce((s, a) => s + Number(a.total_ht || 0), 0);
    }, 0);
    // Marge toujours en HT
    const totalGeneralMargeHT = totalGeneralHT - totalGeneralAchatsHT;

    // Ajouter les totaux par statut avant le total général
    selectedStatuts.forEach((statut) => {
        if (!statutTotals[statut]) return;
        
        const { totalHT, totalTTC, totalAchatsHT, totalMarge } = statutTotals[statut];
        
        const totalStatutRow: any = {
            'N° Devis': '',
            'Code Chantier': '',
            'Date': '',
            'Statut': `TOTAL ${statutLabels[statut]?.toUpperCase() || statut.toUpperCase()}`,
            'Désignation': '',
            'Type': '',
            'Domaine': '',
            'Type Montant': '',
            [`Montant HT (${currency})`]: totalHT,
            [`Total Achats HT (${currency})`]: totalAchatsHT,
            "Pourcentage Achats/Total": totalHT > 0 ? totalAchatsHT / totalHT : 0,
            [`Restant (${currency})`]: totalMarge,
            'Pourcentage Restant/Total': totalHT > 0 ? totalMarge / totalHT : 0,
        };
        
        if (!allDevisAreHT) {
            totalStatutRow[`Montant TTC (${currency})`] = totalTTC;
        }
        
        devisExportData.push(totalStatutRow);
    });

    const totalGeneralRow: any = {
        'N° Devis': '',
        'Code Chantier': '',
        'Date': '',
        'Statut': 'TOTAL GÉNÉRAL',
        'Désignation': '',
        'Type': '',
        'Domaine': '',
        'Type Montant': '',
        [`Montant HT (${currency})`]: totalGeneralHT,
        [`Total Achats HT (${currency})`]: totalGeneralAchatsHT,
        "Pourcentage Achats/Total": totalGeneralHT > 0 ? totalGeneralAchatsHT / totalGeneralHT : 0,
        [`Restant (${currency})`]: totalGeneralMargeHT,
        'Pourcentage Restant/Total': totalGeneralHT > 0 ? totalGeneralMargeHT / totalGeneralHT : 0,
    };

    if (!allDevisAreHT) {
        totalGeneralRow[`Montant TTC (${currency})`] = totalGeneralTTC;
    }

    devisExportData.push(totalGeneralRow);
    
    // Ajouter les pourcentages par statut en bas
    selectedStatuts.forEach((statut) => {
        if (!statutTotals[statut]) return;
        
        const { totalHT, totalTTC, totalAchatsHT, totalMarge } = statutTotals[statut];
        const portionAchats = totalHT > 0 ? totalAchatsHT / totalHT : 0;
        const portionMarge = totalHT > 0 ? totalMarge / totalHT : 0;
        
        const percentRow: any = {
            'N° Devis': '',
            'Code Chantier': '',
            'Date': '',
            'Statut': `% ${statutLabels[statut]}`,
            'Désignation': '',
            'Type': '',
            'Domaine': '',
            'Type Montant': '',
            [`Montant HT (${currency})`]: '',
            [`Total Achats HT (${currency})`]: portionAchats,
            "Pourcentage Achats/Total": '',
            [`Restant (${currency})`]: portionMarge,
            'Pourcentage Restant/Total': '',
        };
        
        if (!allDevisAreHT) {
            percentRow[`Montant TTC (${currency})`] = '';
        }
        
        devisExportData.push(percentRow);
    });

    const ws = XLSX.utils.json_to_sheet(devisExportData);
    
    // Largeurs de colonnes optimisées
    const colWidths = [
        { wch: 12 },  // N° Devis
        { wch: 15 },  // Code Chantier
        { wch: 12 },  // Date
        { wch: 18 },  // Statut
        { wch: 35 },  // Désignation
        { wch: 15 },  // Type
        { wch: 15 },  // Domaine
        { wch: 13 },  // Type Montant
        { wch: 16 },  // Montant HT
    ];

    if (!allDevisAreHT) {
        colWidths.splice(9, 0, { wch: 16 }); // Montant TTC
    }
    
    colWidths.push(
        { wch: 16 },  // Total Achats HT
        { wch: 20 },  // Pourcentage Achats/Total
        { wch: 16 },  // Restant
        { wch: 22 }   // Pourcentage Restant/Total
    );

    ws['!cols'] = colWidths;

    // Application des styles
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    // Style en-têtes
    for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = styles.header;
    }

    // Identifier les colonnes monétaires et pourcentages
    const headers = Object.keys(devisExportData[0] || {});
    const currencyColumns: number[] = [];
    const percentageColumns: number[] = [];
    
    headers.forEach((header, idx) => {
        if (header && header.includes('(') && header.includes(currency)) {
            currencyColumns.push(idx);
        }
        if (header && header.includes('Pourcentage')) {
            percentageColumns.push(idx);
        }
    });

    // Parcourir les lignes
    let currentRow = 1;
    const nbDevisLines = devisFiltered.length;
    const nbStatutTotalLines = selectedStatuts.length;
    const totalGeneralLineIndex = nbDevisLines + nbStatutTotalLines;
    
    // Lignes de devis normales
    for (let i = 0; i < nbDevisLines; i++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
            if (!ws[cellAddress]) continue;
            
            if (currencyColumns.includes(col)) {
                ws[cellAddress].s = styles.currency;
            } else if (percentageColumns.includes(col)) {
                ws[cellAddress].s = styles.percentage;
            } else {
                ws[cellAddress].s = styles.data;
            }
        }
        currentRow++;
    }
    
    // Lignes totaux par statut
    for (let i = 0; i < nbStatutTotalLines; i++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
            if (!ws[cellAddress]) continue;
            
            if (currencyColumns.includes(col)) {
                ws[cellAddress].s = {
                    ...styles.totalStatut,
                    numFmt: '#,##0.00'
                };
            } else if (percentageColumns.includes(col)) {
                ws[cellAddress].s = {
                    ...styles.totalStatut,
                    numFmt: '0.00%'
                };
            } else {
                ws[cellAddress].s = styles.totalStatut;
            }
        }
        currentRow++;
    }

    // Ligne total général
    for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
        if (!ws[cellAddress]) continue;
        
        if (currencyColumns.includes(col)) {
            ws[cellAddress].s = {
                ...styles.totalGeneral,
                numFmt: '#,##0.00'
            };
        } else if (percentageColumns.includes(col)) {
            ws[cellAddress].s = {
                ...styles.totalGeneral,
                numFmt: '0.00%'
            };
        } else {
            ws[cellAddress].s = styles.totalGeneral;
        }
    }
    currentRow++;
    
    // Lignes de pourcentages par statut
    for (let i = 0; i < selectedStatuts.length; i++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
            if (!ws[cellAddress]) continue;
            
            const header = headers[col];
            if (!header) continue; // ✅ Sécurité pour éviter undefined
            
            // Colonnes achats, marge et restant affichent des pourcentages
            if (header.includes('Achats') || header.includes('Restant')) {
                ws[cellAddress].s = {
                    ...styles.data,
                    fill: { fgColor: { rgb: "FEF3C7" } },
                    font: { italic: true },
                    alignment: { horizontal: "right", vertical: "center" },
                    numFmt: '0.00%'
                };
            } else {
                ws[cellAddress].s = {
                    ...styles.data,
                    fill: { fgColor: { rgb: "FEF3C7" } },
                    font: { italic: true }
                };
            }
        }
        currentRow++;
    }

    return ws;
}

function createStatsSheet(
    stats: Stats,
    selectedStatuts: string[],
    devis: Devis[]
): XLSX.WorkSheet {
    const allDevisAreHT = devis.every(d => d.ht_ttc === 'HT');
    const currency = devis[0]?.monetaire?.symbol || 'Dhs';

    const statsData = selectedStatuts.map(statut => {
        const data = stats[statut];
        const row: any = {
            'Statut': statutLabels[statut] || statut,
            'Nombre de devis': data.count,
            [`Montant Total HT (${currency})`]: data.totalHT,
        };

        if (!allDevisAreHT) {
            row[`Montant Total TTC (${currency})`] = data.totalTTC;
        }

        return row;
    });

    // Total
    const totalSelected = selectedStatuts.reduce((acc, statut) => {
        acc.count += stats[statut].count;
        acc.totalHT += stats[statut].totalHT;
        acc.totalTTC += stats[statut].totalTTC;
        return acc;
    }, { count: 0, totalHT: 0, totalTTC: 0 });

    const totalRow: any = {
        'Statut': 'TOTAL',
        'Nombre de devis': totalSelected.count,
        [`Montant Total HT (${currency})`]: totalSelected.totalHT,
    };

    if (!allDevisAreHT) {
        totalRow[`Montant Total TTC (${currency})`] = totalSelected.totalTTC;
    }

    statsData.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(statsData);
    
    const colWidths = [
        { wch: 20 },  // Statut
        { wch: 18 },  // Nombre
        { wch: 22 },  // HT
    ];

    if (!allDevisAreHT) {
        colWidths.push({ wch: 22 }); // TTC
    }

    ws['!cols'] = colWidths;

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    // En-têtes
    for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = styles.header;
    }

    // Données
    for (let row = 1; row < range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            if (!ws[cellAddress]) continue;
            
            if (col >= 2) { // Colonnes numériques
                ws[cellAddress].s = {
                    ...styles.data,
                    alignment: { horizontal: "right", vertical: "center" },
                    numFmt: '#,##0.00'
                };
            } else {
                ws[cellAddress].s = {
                    ...styles.data,
                    alignment: { horizontal: "center", vertical: "center" }
                };
            }
        }
    }

    // Total
    for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: range.e.r, c: col });
        if (!ws[cellAddress]) continue;
        
        if (col >= 2) {
            ws[cellAddress].s = {
                ...styles.totalGeneral,
                alignment: { horizontal: "right", vertical: "center" },
                numFmt: '#,##0.00'
            };
        } else {
            ws[cellAddress].s = {
                ...styles.totalGeneral,
                alignment: { horizontal: "center", vertical: "center" }
            };
        }
    }

    return ws;
}

export function exportDevisStatsToExcel(
    client: Client,
    devis: Devis[],
    stats: Stats,
    selectedStatuts: string[],
    dateDebut: string,
    dateFin: string
): void {
    if (selectedStatuts.length === 0) {
        alert('Veuillez sélectionner au moins un statut à exporter');
        return;
    }

    try {
        const wb = XLSX.utils.book_new();

        const wsDevis = createDetailsSheet(devis, selectedStatuts);
        console.log('Worksheet Devis created:', devis, selectedStatuts);
        XLSX.utils.book_append_sheet(wb, wsDevis, 'Détails Devis');

        const wsStats = createStatsSheet(stats, selectedStatuts, devis);
        XLSX.utils.book_append_sheet(wb, wsStats, 'Résumé Statistiques');

        const fileName = `Stats_${client.client}_${dateDebut || 'debut'}_${dateFin || 'fin'}.xlsx`;
        XLSX.writeFile(wb, fileName);
    } catch (error) {
        console.error('Erreur lors de l\'export Excel:', error);
        alert('Une erreur est survenue lors de l\'export. Veuillez réessayer.');
    }
}