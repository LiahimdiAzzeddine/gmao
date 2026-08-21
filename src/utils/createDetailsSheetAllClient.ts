import * as XLSX from 'xlsx-js-style';
import { Devis } from '../types/devis';
import { calculateTotalHT, calculateTotalTTC } from './gestionMethode';

interface StatutStats {
    count: number;
    totalHT: number;
    totalTTC: number;
}

interface ClientStats {
    clientName: string;
    count: number;
    totalHT: number;
    totalTTC: number;
}

interface Stats {
    [key: string]: StatutStats;
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

// Styles pour Excel
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
    totalClient: {
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
    }
};

function createDetailsSheet(devis: Devis[]): XLSX.WorkSheet {
    if (devis.length === 0) {
        const ws = XLSX.utils.aoa_to_sheet([['Aucun devis à afficher']]);
        return ws;
    }

    const allDevisAreHT = devis.every(d => d.ht_ttc === 'HT');
    const currency = devis[0]?.monetaire?.symbol || 'Dhs';
    const devisExportData: any[] = [];

    // Grouper par client
    const devisByClient: { [key: string]: Devis[] } = {};
    devis.forEach(d => {
        const clientName = d.clients_devis?.client || 'Client inconnu';
        if (!devisByClient[clientName]) {
            devisByClient[clientName] = [];
        }
        devisByClient[clientName].push(d);
    });

    // Trier les clients par total TTC décroissant
    const sortedClients = Object.entries(devisByClient).sort((a, b) => {
        const totalA = a[1].reduce((sum, d) => {
            const ht = calculateTotalHT(d);
            return sum + (d.ht_ttc === 'HT' ? ht : calculateTotalTTC(ht));
        }, 0);
        const totalB = b[1].reduce((sum, d) => {
            const ht = calculateTotalHT(d);
            return sum + (d.ht_ttc === 'HT' ? ht : calculateTotalTTC(ht));
        }, 0);
        return totalB - totalA;
    });

    // Variables pour le total général
    let totalGeneralHT = 0;
    let totalGeneralTTC = 0;
    let totalGeneralCount = 0;

    // Parcourir chaque client
    sortedClients.forEach(([clientName, clientDevis]) => {
        let totalClientHT = 0;
        let totalClientTTC = 0;

        // Ajouter les devis du client
        clientDevis.forEach(d => {
            const totalHT = calculateTotalHT(d);
            const totalTTC = d.ht_ttc === 'HT' ? totalHT : calculateTotalTTC(totalHT);

            totalClientHT += totalHT;
            totalClientTTC += totalTTC;

            const row: any = {
                'Client': clientName,
                'N° Devis': d.num_devis,
                'Code Chantier': d.chantiers?.code || '-',
                'Date': d.date_devis ? new Date(d.date_devis).toLocaleDateString('fr-FR') : '-',
                'Statut': statutLabels[d.statut] || d.statut,
                'Désignation': d.designation || '-',
                'Type': d.type_devis?.libelle || '-',
                'Domaine': d.domaines_activite?.libelle || '-',
                'Type Montant': d.ht_ttc || 'HT',
                [`Montant HT (${currency})`]: totalHT,
            };

            if (!allDevisAreHT) {
                row[`Montant TTC (${currency})`] = totalTTC;
            }

            devisExportData.push(row);
        });

        // Ajouter la ligne total client
        const totalClientRow: any = {
            'Client': '',
            'N° Devis': '',
            'Code Chantier': '',
            'Date': '',
            'Statut': `TOTAL ${clientName.toUpperCase()}`,
            'Désignation': '',
            'Type': '',
            'Domaine': '',
            'Type Montant': '',
            [`Montant HT (${currency})`]: totalClientHT,
        };

        if (!allDevisAreHT) {
            totalClientRow[`Montant TTC (${currency})`] = totalClientTTC;
        }

        devisExportData.push(totalClientRow);

        // Accumuler pour le total général
        totalGeneralHT += totalClientHT;
        totalGeneralTTC += totalClientTTC;
        totalGeneralCount += clientDevis.length;
    });

    // Ajouter le total général
    const totalGeneralRow: any = {
        'Client': '',
        'N° Devis': '',
        'Code Chantier': '',
        'Date': '',
        'Statut': 'TOTAL GÉNÉRAL',
        'Désignation': '',
        'Type': '',
        'Domaine': '',
        'Type Montant': '',
        [`Montant HT (${currency})`]: totalGeneralHT,
    };

    if (!allDevisAreHT) {
        totalGeneralRow[`Montant TTC (${currency})`] = totalGeneralTTC;
    }

    devisExportData.push(totalGeneralRow);

    const ws = XLSX.utils.json_to_sheet(devisExportData);

    // Largeurs de colonnes
    const colWidths = [
        { wch: 25 },  // Client
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
        colWidths.push({ wch: 16 }); // Montant TTC
    }

    ws['!cols'] = colWidths;

    // Application des styles
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

    // Style en-têtes
    for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = styles.header;
    }

    // Identifier les colonnes monétaires
    const headers = Object.keys(devisExportData[0] || {});
    const currencyColumns: number[] = [];

    headers.forEach((header, idx) => {
        if (header && header.includes('(') && header.includes(currency)) {
            currencyColumns.push(idx);
        }
    });

    // Appliquer les styles aux données
    let currentRow = 1;
    sortedClients.forEach(([clientName, clientDevis]) => {
        // Lignes de devis normales
        for (let i = 0; i < clientDevis.length; i++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
                if (!ws[cellAddress]) continue;

                if (currencyColumns.includes(col)) {
                    ws[cellAddress].s = styles.currency;
                } else {
                    ws[cellAddress].s = styles.data;
                }
            }
            currentRow++;
        }

        // Ligne total client
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
            if (!ws[cellAddress]) continue;

            if (currencyColumns.includes(col)) {
                ws[cellAddress].s = {
                    ...styles.totalClient,
                    numFmt: '#,##0.00'
                };
            } else {
                ws[cellAddress].s = styles.totalClient;
            }
        }
        currentRow++;
    });

    // Ligne total général
    for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
        if (!ws[cellAddress]) continue;

        if (currencyColumns.includes(col)) {
            ws[cellAddress].s = {
                ...styles.totalGeneral,
                numFmt: '#,##0.00'
            };
        } else {
            ws[cellAddress].s = styles.totalGeneral;
        }
    }

    return ws;
}

function createStatsSheet(stats: Stats, allDevisAreHT: boolean, currency: string): XLSX.WorkSheet {
    const statsData = Object.entries(stats)
        .sort((a, b) => b[1].totalTTC - a[1].totalTTC)
        .map(([statut, data]) => {
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
    const total = Object.values(stats).reduce(
        (acc, stat) => {
            acc.count += stat.count;
            acc.totalHT += stat.totalHT;
            acc.totalTTC += stat.totalTTC;
            return acc;
        },
        { count: 0, totalHT: 0, totalTTC: 0 }
    );

    const totalRow: any = {
        'Statut': 'TOTAL',
        'Nombre de devis': total.count,
        [`Montant Total HT (${currency})`]: total.totalHT,
    };

    if (!allDevisAreHT) {
        totalRow[`Montant Total TTC (${currency})`] = total.totalTTC;
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

            if (col >= 2) {
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

function createClientStatsSheet(clientStats: ClientStats[], allDevisAreHT: boolean, currency: string): XLSX.WorkSheet {
    const clientData = clientStats.map((client, index) => {
        const row: any = {
            'Rang': index + 1,
            'Client': client.clientName,
            'Nombre de devis': client.count,
            [`Montant Total HT (${currency})`]: client.totalHT,
        };

        if (!allDevisAreHT) {
            row[`Montant Total TTC (${currency})`] = client.totalTTC;
        }

        row[`Moyenne par Devis (${currency})`] = client.totalTTC / client.count;

        return row;
    });

    // Total
    const total = clientStats.reduce(
        (acc, client) => {
            acc.count += client.count;
            acc.totalHT += client.totalHT;
            acc.totalTTC += client.totalTTC;
            return acc;
        },
        { count: 0, totalHT: 0, totalTTC: 0 }
    );

    const totalRow: any = {
        'Rang': '',
        'Client': 'TOTAL',
        'Nombre de devis': total.count,
        [`Montant Total HT (${currency})`]: total.totalHT,
    };

    if (!allDevisAreHT) {
        totalRow[`Montant Total TTC (${currency})`] = total.totalTTC;
    }

    totalRow[`Moyenne par Devis (${currency})`] = total.totalTTC / total.count;

    clientData.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(clientData);

    const colWidths = [
        { wch: 8 },   // Rang
        { wch: 35 },  // Client
        { wch: 18 },  // Nombre
        { wch: 22 },  // HT
    ];

    if (!allDevisAreHT) {
        colWidths.push({ wch: 22 }); // TTC
    }

    colWidths.push({ wch: 22 }); // Moyenne

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

            if (col >= 2) {
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

export function exportAllClientsStatsToExcel(
    devis: Devis[],
    stats: Stats,
    clientStats: ClientStats[],
    dateDebut: string,
    dateFin: string
): void {
    if (devis.length === 0) {
        alert('Aucun devis à exporter');
        return;
    }

    try {
        const wb = XLSX.utils.book_new();
        const allDevisAreHT = devis.every(d => d.ht_ttc === 'HT');
        const currency = devis[0]?.monetaire?.symbol || 'Dhs';

        // Feuille détails des devis
        const wsDevis = createDetailsSheet(devis);
        XLSX.utils.book_append_sheet(wb, wsDevis, 'Détails Devis');

        // Feuille statistiques par statut
        const wsStats = createStatsSheet(stats, allDevisAreHT, currency);
        XLSX.utils.book_append_sheet(wb, wsStats, 'Stats par Statut');

        // Feuille statistiques par client
        const wsClientStats = createClientStatsSheet(clientStats, allDevisAreHT, currency);
        XLSX.utils.book_append_sheet(wb, wsClientStats, 'Stats par Client');

        const fileName = `Stats_Tous_Clients_${dateDebut || 'debut'}_${dateFin || 'fin'}.xlsx`;
        XLSX.writeFile(wb, fileName);
    } catch (error) {
        console.error('Erreur lors de l\'export Excel:', error);
        alert('Une erreur est survenue lors de l\'export. Veuillez réessayer.');
    }
}