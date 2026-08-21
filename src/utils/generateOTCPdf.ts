import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import { OrdreTravailDetail } from '../types/ot'
import { registerBahijFonts } from './fontLoader'

const APP_LOGO_URL = '/FSGlogo.png'

function checkPageBreak(doc: jsPDF, yPosition: number, requiredSpace: number, margin: number, pageHeight: number): number {
  if (yPosition + requiredSpace > pageHeight - margin - 50) {
    doc.addPage()
    return margin + 5
  }
  return yPosition
}

function drawIntervenantTable(doc: jsPDF, yPosition: number, pageWidth: number, margin: number, interventionValidee?: any) {
  const tableHeaders = [
    { content: 'IPN', styles: { halign: 'center', cellWidth: 15 } },
    { content: 'Nom prénom', styles: { halign: 'center', cellWidth: 40 } },
    { content: 'Date travail', styles: { halign: 'center', cellWidth: 30 } },
    { content: 'Heures réalisées', styles: { halign: 'center', cellWidth: 30 } },
    { content: 'Signature opérateur', styles: { halign: 'center', cellWidth: 35 } },
    { content: 'Signature superviseur', styles: { halign: 'center', cellWidth: 35 } }
  ]

  let tableRows = []

  // Si intervention validée, remplir la première ligne avec les données du technicien
  if (interventionValidee && interventionValidee.technicien) {
    const dateDebut = interventionValidee.date_debut 
      ? new Date(interventionValidee.date_debut).toLocaleDateString('fr-FR')
      : ''
    
    const duree = interventionValidee.duree_minutes
      ? `${Math.floor(interventionValidee.duree_minutes / 60)}h ${interventionValidee.duree_minutes % 60}min`
      : ''

    tableRows.push([
      { content: interventionValidee.technicien.id?.substring(0, 8) || '', styles: { minCellHeight: 12 } },
      { content: interventionValidee.technicien.nom || '', styles: { minCellHeight: 12 } },
      { content: dateDebut, styles: { minCellHeight: 12 } },
      { content: duree, styles: { minCellHeight: 12 } },
      { content: '', styles: { minCellHeight: 12 } },
      { content: '', styles: { minCellHeight: 12 } }
    ])

    // Ajouter 2 lignes vides supplémentaires
    for (let i = 0; i < 2; i++) {
      tableRows.push([
        { content: '', styles: { minCellHeight: 12 } },
        { content: '', styles: { minCellHeight: 12 } },
        { content: '', styles: { minCellHeight: 12 } },
        { content: '', styles: { minCellHeight: 12 } },
        { content: '', styles: { minCellHeight: 12 } },
        { content: '', styles: { minCellHeight: 12 } }
      ])
    }
  } else {
    // Sinon, 3 lignes vides
    tableRows = Array(3).fill([
      { content: '', styles: { minCellHeight: 12 } },
      { content: '', styles: { minCellHeight: 12 } },
      { content: '', styles: { minCellHeight: 12 } },
      { content: '', styles: { minCellHeight: 12 } },
      { content: '', styles: { minCellHeight: 12 } },
      { content: '', styles: { minCellHeight: 12 } }
    ])
  }

  autoTable(doc, {
    startY: yPosition,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.3
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      lineWidth: 0.3,
      lineColor: [0, 0, 0]
    },
    margin: { left: margin, right: margin }
  })

  return (doc as any).lastAutoTable.finalY
}

function drawEmplacementTable(
  doc: jsPDF,
  yPosition: number,
  pageWidth: number,
  margin: number,
  machine: any
) {
  const colWidths = [30, 80, 35, 45]
  const rowHeight = 5
  let currentY = yPosition

  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.setFontSize(7)
  doc.setFont('BahijTheSansArabic', 'italic')

  doc.text('Emplacement :', margin + 1, currentY + 3.5)
  doc.text('Localisation:', margin + colWidths[0] + colWidths[1] + 1, currentY + 3.5)

  if (machine?.code_cdc) {
    doc.text(`CdC : ${machine.code_cdc}`, margin + colWidths[0] + colWidths[1] + colWidths[2] + 1, currentY + 3.5)
  }

  doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight)
  currentY += rowHeight

  doc.setFont('BahijTheSansArabic', 'italic')
  doc.text('Niveau', margin + 1, currentY + 3.5)
  doc.text('Libellé', margin + colWidths[0] + 1, currentY + 3.5)
  doc.text('Machine', margin + colWidths[0] + colWidths[1] + 1, currentY + 3.5)

  if (machine?.nom) {
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('ID', margin + colWidths[0] + colWidths[1] + colWidths[2] + 1, currentY + 3.5)
  }

  doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight)
  doc.line(margin + colWidths[0], currentY, margin + colWidths[0], currentY + rowHeight)
  doc.line(margin + colWidths[0] + colWidths[1], currentY, margin + colWidths[0] + colWidths[1], currentY + rowHeight)
  doc.line(margin + colWidths[0] + colWidths[1] + colWidths[2], currentY, margin + colWidths[0] + colWidths[1] + colWidths[2], currentY + rowHeight)
  currentY += rowHeight

  doc.setFont('BahijTheSansArabic', 'italic')

  // if (machine) {
  //   doc.text('GROUPE ENSEMBLE', margin + 1, currentY + 3.5)
  //   doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight)
  //   doc.line(margin + colWidths[0], currentY, margin + colWidths[0], currentY + rowHeight)
  //   currentY += rowHeight
  // }

  if (machine?.nom) {
    doc.text('ENSEMBLE', margin + 1, currentY + 3.5)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text(machine.nom, margin + colWidths[0] + 1, currentY + 3.5)

    if (machine.id) {
      doc.setFont('BahijTheSansArabic', 'bold')
    doc.text(machine.id.substring(0, 10), margin + colWidths[0] + colWidths[1] + colWidths[2] + 2, currentY + 3.5);

    }

    doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight)
    doc.line(margin + colWidths[0], currentY, margin + colWidths[0], currentY + rowHeight)
    if (machine.id) {
      doc.line(margin + colWidths[0] + colWidths[1], currentY, margin + colWidths[0] + colWidths[1], currentY + rowHeight)
    }
    currentY += rowHeight
  }

  if (machine?.sous_ensemble) {
    doc.setFont('BahijTheSansArabic', 'italic')
    doc.text('SOUS ENSEMBLE', margin + 1, currentY + 3.5)
    doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight)
    doc.line(margin + colWidths[0], currentY, margin + colWidths[0], currentY + rowHeight)
    currentY += rowHeight
  }

  return currentY
}

function drawPosteTechniqueTable(
  doc: jsPDF,
  yPosition: number,
  pageWidth: number,
  margin: number,
  poste_technique: any,
  nom:string
) {
  const rowHeight = 5
  let currentY = yPosition

  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.setFontSize(7)

  if (poste_technique?.code_pt) {
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('PT:', margin + 1, currentY + 3.5)
    doc.text(poste_technique.code_pt+'_'+ nom.replace(/\s+/g, '').replace(/[^A-Z0-9_]/gi, '').toUpperCase(), margin + 8, currentY + 3.5)
    doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight)
    currentY += rowHeight
  }
   const locDetails = []
    if (poste_technique.site) locDetails.push(poste_technique.site.nom)
    if (poste_technique.secteur) locDetails.push(poste_technique.batiment)
    if (poste_technique.domaine) locDetails.push(poste_technique.domaine.libelle)
    // if (locDetails.length > 0) {
    //   const locText = doc.splitTextToSize(locDetails.join(' / '), pageWidth - 2 * margin - 20)
    //   doc.text(locText, margin + 10, yPosition)
    //   yPosition += locText.length * 4
    // }

  doc.setFont('BahijTheSansArabic', 'italic')
if (poste_technique?.site) {
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text(poste_technique.site.nom+' / '+poste_technique.batiment+' / '+ poste_technique.domaine.libelle, margin + 35, currentY + 3.5)
    doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight)
    currentY += rowHeight
    doc.setFont('BahijTheSansArabic', 'italic')
  }
  // if (poste_technique?.ensemble_fonction_process) {
  //   doc.text('ENS FCT PROCESS:', margin + 8, currentY + 3.5)
  //   doc.setFont('BahijTheSansArabic', 'bold')
  //   doc.text(poste_technique.ensemble_fonction_process, margin + 35, currentY + 3.5)
  //   doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight)
  //   currentY += rowHeight
  //   doc.setFont('BahijTheSansArabic', 'italic')
  // }

  if (poste_technique?.fonction_process) {
    doc.text('FCT PROCESS:', margin + 15, currentY + 3.5)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text(poste_technique.fonction_process, margin + 35, currentY + 3.5)
    doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight)
    currentY += rowHeight
    doc.setFont('BahijTheSansArabic', 'italic')
  }

  if (poste_technique?.sous_fonction_process) {
    doc.text('SS FCT PROCESS:', margin + 22, currentY + 3.5)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text(poste_technique.sous_fonction_process, margin + 45, currentY + 3.5)
    doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight)
    currentY += rowHeight
  }

  return currentY
}

export async function generateOTCPdf(ordre: OrdreTravailDetail & { interventions?: any[] }) {
  const doc = new jsPDF()
  await registerBahijFonts(doc)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10
  let yPosition = 8

  const machine = ordre.machine
  const technicien = ordre.profile
  const poste_technique = machine?.poste_technique
  const client = machine?.client
  
  // Récupérer l'intervention validée s'il y en a une
  const interventionValidee = ordre.interventions?.find(i => i.valide === true)

  const logoHeight = 11
  const logoY = yPosition

  if (client?.logo_url) {
    try {
      doc.addImage(client.logo_url, 'PNG', pageWidth - margin - 35, logoY, 30, logoHeight)
    } catch (e) {
      console.warn('Impossible de charger le logo client')
    }
  }

  try {
    doc.addImage(APP_LOGO_URL, 'PNG', margin, logoY, 30, logoHeight)
  } catch (e) {
    doc.setFontSize(10)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('GMAO', margin, logoY + 8)
  }

  yPosition += logoHeight + 10

  doc.setFontSize(16)
  doc.setFont('BahijTheSansArabic', 'bold')
  doc.text('ORDRE DE TRAVAIL CORRECTIF', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += logoHeight + 1

  doc.setFontSize(8)
  doc.setFont('BahijTheSansArabic', 'italic')
  const rightX = pageWidth - margin - 35
  doc.text('TYPE : ___', rightX, yPosition - 2)

  yPosition += 4

  // Générer et ajouter le QR code de la machine
  if (machine?.id) {
    try {
      const qrUrl = `${window.location.origin}/machine/${machine.id}/?tab=historique`
      const qrSize = 18
      const qrCanvas = document.createElement('canvas')
      await QRCode.toCanvas(qrCanvas, qrUrl, {
        width: qrSize * 4,
        margin: 1,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        }
      })
      const qrDataUrl = qrCanvas.toDataURL('image/png')
      
      // Position centrée
      const qrX = pageWidth / 2 - qrSize / 2
      const qrY = yPosition
      
      // Bordure autour du QR code
      doc.setDrawColor(0)
      doc.setLineWidth(0.5)
      doc.rect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2)
      
      // QR code
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
      
      yPosition += qrSize + 2
    } catch (e) {
      console.warn('Impossible de générer le QR code')
    }
  }

  yPosition += 2
  doc.setFontSize(7)
  doc.setFont('BahijTheSansArabic', 'italic')
  doc.text('Etat : 0 A faire',margin, yPosition-1)
  doc.text('n° : '+ordre.numot, rightX, yPosition-1)

  yPosition += 6

  doc.setFontSize(7)
  doc.setFont('BahijTheSansArabic', 'italic')
  doc.text('Intervention : ', margin, yPosition)

  const interventionType = ordre.type_intervention || 'REPARATION'
  doc.setFont('BahijTheSansArabic', 'bold')
  doc.text(interventionType, margin + 18, yPosition)

  if (ordre.ot_parent) {
    doc.setFont('BahijTheSansArabic', 'italic')
    doc.text(`OT père: ${ordre.ot_parent}`, pageWidth - margin - 40, yPosition)
  }

  yPosition += 4

  doc.setFont('BahijTheSansArabic', 'italic')
  const typeDetail = ordre.cause || 'N/A'
  doc.text(`Type intervention : ${typeDetail}`, margin, yPosition)

  yPosition += 4
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 4

  yPosition = checkPageBreak(doc, yPosition, 60, margin, pageHeight)
  yPosition = drawEmplacementTable(doc, yPosition, pageWidth, margin, machine)

  if (poste_technique) {
    yPosition = drawPosteTechniqueTable(doc, yPosition, pageWidth, margin, poste_technique,machine.nom)
  }

  yPosition += 2
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  doc.setFontSize(7)
  doc.setFont('BahijTheSansArabic', 'italic')
  doc.text('Superviseur : ', margin, yPosition)

  const secteurCode = poste_technique?.secteur?.code ?? ''
  const secteurLibelle = poste_technique?.secteur?.libelle ?? ''
  if (secteurCode && secteurLibelle) {
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text(`${secteurCode} ${secteurLibelle}`, margin + 18, yPosition)
  }

  const datePreview = ordre.date_programmee
    ? new Date(ordre.date_programmee).toLocaleDateString('fr-FR')
    : ''
  doc.setFont('BahijTheSansArabic', 'italic')
  doc.text('Date prévue : ', pageWidth / 2 - 20, yPosition)
  doc.setFont('BahijTheSansArabic', 'bold')
  doc.text(datePreview, pageWidth / 2, yPosition)

  if (ordre.date_programmee) {
    const date = new Date(ordre.date_programmee)
    const weekNum = getWeekNumber(date)
    doc.setFont('BahijTheSansArabic', 'italic')
    doc.text('Semaine:', pageWidth - margin - 25, yPosition)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text(weekNum.toString().padStart(2, '0'), pageWidth - margin - 12, yPosition)
  }

  yPosition += 4
  doc.setFont('BahijTheSansArabic', 'italic')
  if (ordre.created_at) {
    const dateCreation = new Date(ordre.created_at).toLocaleDateString('fr-FR')
    const timeCreation = new Date(ordre.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    doc.text(`Créé le: ${dateCreation} ${timeCreation}`, margin, yPosition)
  }

  if (technicien) {
    doc.text('Par: ', pageWidth / 2 - 20, yPosition)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text(`${technicien.nom}`, pageWidth / 2 - 15, yPosition)
  }


  yPosition += 3
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  yPosition = checkPageBreak(doc, yPosition, 40, margin, pageHeight)

  doc.setFontSize(7)
  doc.setFont('BahijTheSansArabic', 'italic')
  const infoWidth = (pageWidth - 2 * margin) / 3

  doc.text('INFO1 :', margin + 2, yPosition)
  doc.text('INFO2 :', margin + infoWidth + 2, yPosition)
  doc.text('INFO3 :', margin + 2 * infoWidth + 2, yPosition)

  yPosition += 4
  doc.setFont('BahijTheSansArabic', 'normal')
  doc.text('Spécialités prévues', margin + 2, yPosition)
  doc.text('T. prev', margin + 2 * infoWidth + 2, yPosition)

  yPosition +=4
  doc.setFont('BahijTheSansArabic', 'bold')
  doc.text('TM Technicien Maintenance', margin + 2, yPosition)
  
  // Afficher la durée réelle si intervention validée, sinon 0
  if (interventionValidee && interventionValidee.duree_minutes) {
    const heures = Math.floor(interventionValidee.duree_minutes / 60)
    const minutes = interventionValidee.duree_minutes % 60
    doc.text(`${heures} h ${minutes} min`, margin + 2 * infoWidth + 2, yPosition)
  } else {
    doc.text('0 h 0 min', margin + 2 * infoWidth + 2, yPosition)
  }

  yPosition += 4
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 4

  yPosition = checkPageBreak(doc, yPosition, 20, margin, pageHeight)

  doc.setFontSize(9)
  doc.setFont('BahijTheSansArabic', 'bold')
  const securityText = 'RESPECTER LES CONSIGNES DE SECURITE'
  doc.text(securityText, pageWidth / 2, yPosition, { align: 'center' })

  yPosition += 2
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition +=6

  doc.setFontSize(10)
  doc.setFont('BahijTheSansArabic', 'italic')
  doc.text('ACTIVITES', pageWidth / 2, yPosition, { align: 'center' })

  yPosition += 2
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 4

  // Si intervention validée, afficher les actions réalisées, sinon afficher les observations
  if (interventionValidee && interventionValidee.actions_realisees) {
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.setFontSize(7)
    doc.text('10', margin + 2, yPosition)

    doc.setFont('BahijTheSansArabic', 'normal')
    const actionsLines = doc.splitTextToSize(interventionValidee.actions_realisees, pageWidth - 2 * margin - 10)
    doc.text(actionsLines, margin + 8, yPosition)
    yPosition += actionsLines.length * 3 + 2
  } else if (ordre.observations) {
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.setFontSize(7)
    doc.text('10', margin + 2, yPosition)

    doc.setFont('BahijTheSansArabic', 'normal')
    const descLines = doc.splitTextToSize(ordre.observations, pageWidth - 2 * margin - 10)
    doc.text(descLines, margin + 8, yPosition)
    yPosition += descLines.length * 3 + 2
  }

  // Ajouter les informations de l'intervention validée
  if (interventionValidee) {
    yPosition += 4
    yPosition = checkPageBreak(doc, yPosition, 80, margin, pageHeight)

    // En-tête de la section
    doc.setFillColor(34, 197, 94) // Vert
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('COMPTE-RENDU D\'INTERVENTION VALIDÉE', pageWidth / 2, yPosition + 4.5, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    yPosition += 8

    // Informations principales dans un tableau
    doc.setFillColor(248, 250, 252)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 25, 'F')
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 25)

    yPosition += 4
    doc.setFontSize(7.5)
    const colWidth = (pageWidth - 2 * margin) / 2

    // Colonne gauche
    let leftY = yPosition
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('Technicien:', margin + 3, leftY)
    doc.setFont('BahijTheSansArabic', 'normal')
    doc.text(interventionValidee.technicien?.nom || 'N/A', margin + 22, leftY)

    leftY += 4
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('Date début:', margin + 3, leftY)
    doc.setFont('BahijTheSansArabic', 'normal')
    if (interventionValidee.date_debut) {
      const dateDebut = new Date(interventionValidee.date_debut).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      doc.text(dateDebut, margin + 22, leftY)
    }

    leftY += 4
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('Date fin:', margin + 3, leftY)
    doc.setFont('BahijTheSansArabic', 'normal')
    if (interventionValidee.date_fin) {
      const dateFin = new Date(interventionValidee.date_fin).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      doc.text(dateFin, margin + 22, leftY)
    }

    // Colonne droite
    let rightY = yPosition
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('Durée:', margin + colWidth + 3, rightY)
    doc.setFont('BahijTheSansArabic', 'normal')
    if (interventionValidee.duree_minutes) {
      const heures = Math.floor(interventionValidee.duree_minutes / 60)
      const minutes = interventionValidee.duree_minutes % 60
      doc.text(`${heures}h ${minutes}min`, margin + colWidth + 18, rightY)
    }

    rightY += 4
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('Résultat:', margin + colWidth + 3, rightY)
    doc.setFont('BahijTheSansArabic', 'normal')
    if (interventionValidee.resultat) {
      const resultatColors: any = {
        'réussi': [34, 197, 94],
        'partiel': [251, 191, 36],
        'échec': [239, 68, 68]
      }
      const color = resultatColors[interventionValidee.resultat] || [100, 100, 100]
      doc.setFillColor(color[0], color[1], color[2])
      doc.setTextColor(255, 255, 255)
      doc.roundedRect(margin + colWidth + 18, rightY - 2.5, 20, 4, 1, 1, 'F')
      doc.text(interventionValidee.resultat.toUpperCase(), margin + colWidth + 28, rightY, { align: 'center' })
      doc.setTextColor(0, 0, 0)
    }

    rightY += 4
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('État machine:', margin + colWidth + 3, rightY)
    doc.setFont('BahijTheSansArabic', 'normal')
    if (interventionValidee.etat_machine_apres) {
      doc.text(interventionValidee.etat_machine_apres, margin + colWidth + 25, rightY)
    }

    rightY += 4
    if (interventionValidee.validateur && interventionValidee.valide_le) {
      doc.setFont('BahijTheSansArabic', 'bold')
      doc.text('Validé par:', margin + colWidth + 3, rightY)
      doc.setFont('BahijTheSansArabic', 'normal')
      const dateValidation = new Date(interventionValidee.valide_le).toLocaleDateString('fr-FR')
      doc.text(`${interventionValidee.validateur.nom}`, margin + colWidth + 20, rightY)
      doc.setFontSize(6.5)
      doc.text(`(${dateValidation})`, margin + colWidth + 20, rightY + 3)
      doc.setFontSize(7.5)
    }

    yPosition += 26

    // Pièces remplacées
    if (interventionValidee.pieces_remplacees && interventionValidee.pieces_remplacees.length > 0) {
      yPosition = checkPageBreak(doc, yPosition, 20, margin, pageHeight)
      
      doc.setFillColor(168, 85, 247) // Violet
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 5, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('BahijTheSansArabic', 'bold')
      doc.text('PIÈCES REMPLACÉES', margin + 2, yPosition + 3.5)
      doc.setTextColor(0, 0, 0)
      yPosition += 6

      doc.setFont('BahijTheSansArabic', 'normal')
      doc.setFontSize(7)
      interventionValidee.pieces_remplacees.forEach((piece: any, index: number) => {
        const pieceText = `${index + 1}. ${piece.nom || piece.reference || 'N/A'} - Quantité: ${piece.quantite || 1}`
        doc.text(pieceText, margin + 2, yPosition)
        yPosition += 3.5
      })
      yPosition += 2
    }

    // Images avant/après
    const hasImagesBefore = interventionValidee.image_avant_urls && interventionValidee.image_avant_urls.length > 0
    const hasImagesAfter = interventionValidee.image_apres_urls && interventionValidee.image_apres_urls.length > 0

    if (hasImagesBefore || hasImagesAfter) {
      yPosition = checkPageBreak(doc, yPosition, 60, margin, pageHeight)
      
      doc.setFillColor(236, 72, 153) // Rose
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 5, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('BahijTheSansArabic', 'bold')
      doc.text('PHOTOS DE L\'INTERVENTION', margin + 2, yPosition + 3.5)
      doc.setTextColor(0, 0, 0)
      yPosition += 7

      const imageWidth = 40
      const imageHeight = 30
      const imageSpacing = 5
      let xPos = margin + 5

      // Images avant
      if (hasImagesBefore) {
        doc.setFontSize(7)
        doc.setFont('BahijTheSansArabic', 'bold')
        doc.text('AVANT:', margin + 2, yPosition)
        yPosition += 4

        for (let i = 0; i < Math.min(interventionValidee.image_avant_urls.length, 3); i++) {
          try {
            const imgUrl = interventionValidee.image_avant_urls[i]
            if (xPos + imageWidth > pageWidth - margin) {
              xPos = margin + 5
              yPosition += imageHeight + imageSpacing
              yPosition = checkPageBreak(doc, yPosition, imageHeight + 10, margin, pageHeight)
            }
            
            doc.addImage(imgUrl, 'JPEG', xPos, yPosition, imageWidth, imageHeight)
            doc.setDrawColor(200, 200, 200)
            doc.setLineWidth(0.3)
            doc.rect(xPos, yPosition, imageWidth, imageHeight)
            
            xPos += imageWidth + imageSpacing
          } catch (e) {
            console.warn('Impossible de charger l\'image avant', e)
          }
        }
        
        yPosition += imageHeight + 5
        xPos = margin + 5
      }

      // Images après
      if (hasImagesAfter) {
        yPosition = checkPageBreak(doc, yPosition, imageHeight + 10, margin, pageHeight)
        
        doc.setFontSize(7)
        doc.setFont('BahijTheSansArabic', 'bold')
        doc.text('APRÈS:', margin + 2, yPosition)
        yPosition += 4

        for (let i = 0; i < Math.min(interventionValidee.image_apres_urls.length, 3); i++) {
          try {
            const imgUrl = interventionValidee.image_apres_urls[i]
            if (xPos + imageWidth > pageWidth - margin) {
              xPos = margin + 5
              yPosition += imageHeight + imageSpacing
              yPosition = checkPageBreak(doc, yPosition, imageHeight + 10, margin, pageHeight)
            }
            
            doc.addImage(imgUrl, 'JPEG', xPos, yPosition, imageWidth, imageHeight)
            doc.setDrawColor(200, 200, 200)
            doc.setLineWidth(0.3)
            doc.rect(xPos, yPosition, imageWidth, imageHeight)
            
            xPos += imageWidth + imageSpacing
          } catch (e) {
            console.warn('Impossible de charger l\'image après', e)
          }
        }
        
        yPosition += imageHeight + 5
      }
    }

    yPosition += 3
  }

  yPosition += 2
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  yPosition = checkPageBreak(doc, yPosition, 60, margin, pageHeight)

  doc.setFontSize(10)
  doc.setFont('BahijTheSansArabic', 'italic')
  doc.text('COMPTE-RENDU INTERVENANTS', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 4

  yPosition = drawIntervenantTable(doc, yPosition, pageWidth, margin, interventionValidee)
  yPosition += 6

  doc.setFontSize(7)
  doc.setFont('BahijTheSansArabic', 'italic')
  doc.text('Commentaires :', margin, yPosition)
  yPosition += 4

  // Afficher le commentaire de l'intervention validée s'il existe
  if (interventionValidee && interventionValidee.commentaire) {
    doc.setFont('BahijTheSansArabic', 'normal')
    const commentLines = doc.splitTextToSize(interventionValidee.commentaire, pageWidth - 2 * margin - 4)
    doc.text(commentLines, margin + 2, yPosition)
    yPosition += commentLines.length * 3
  }

  yPosition = pageHeight - margin - 5
  doc.setFontSize(6)
  doc.setFont('BahijTheSansArabic', 'italic')
  const footerText = `Document non géré  Page 1 / 1  Imprimé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  doc.text(footerText, pageWidth / 2, yPosition, { align: 'center' })

  const fileName = `OTC_${String(ordre.numot)}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`
  doc.save(fileName)
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
