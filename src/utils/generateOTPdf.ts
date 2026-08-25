import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { OrdreTravailDetail } from '../types/ot'
import { renderRecurrence } from './renderRecurrence'
import { registerBahijFonts } from './fontLoader'

const APP_LOGO_URL = '/FSGlogo.png'

function checkPageBreak(doc: jsPDF, yPosition: number, requiredSpace: number, margin: number, pageHeight: number): number {
  if (yPosition + requiredSpace > pageHeight - margin - 45) {
    doc.addPage()
    return margin + 5
  }
  return yPosition
}

function drawSignatures(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number, technicienNom: string, dateSignature: string) {
  const signWidth = 60
  const signHeight = 19
  const signatureBlockHeight = 35
  const signY = pageHeight - margin - signatureBlockHeight

  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.line(margin, signY - 6, pageWidth - margin, signY - 6)

  doc.setFontSize(8)
  doc.setFont('BahijTheSansArabic', 'bold')

  doc.text('SIGNATURE TECHNICIEN', margin + 5, signY)
  doc.rect(margin, signY + 2, signWidth, signHeight)
  doc.setFontSize(8)
  doc.setFont('BahijTheSansArabic', 'bold')
  const nomAffiche = doc.splitTextToSize(`Nom: ${technicienNom}`, signWidth - 4)
  doc.text(nomAffiche.slice(0, 2), margin + 2, signY + 7)
  doc.setFontSize(7)
  doc.setFont('BahijTheSansArabic', 'normal')
  doc.text(`Date: ${dateSignature}`, margin + 2, signY + 25)

  doc.setFontSize(8)
  doc.setFont('BahijTheSansArabic', 'bold')
  doc.text('SIGNATURE CLIENT', pageWidth - margin - signWidth + 5, signY)
  doc.rect(pageWidth - margin - signWidth, signY + 2, signWidth, signHeight)
}

function drawCheckmark(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number] = [0, 0, 0]) {
  doc.setDrawColor(...color)
  doc.setLineWidth(0.5)
  doc.line(x, y, x + size * 0.3, y + size * 0.6)
  doc.line(x + size * 0.3, y + size * 0.6, x + size, y - size * 0.4)
}

function drawCross(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number] = [0, 0, 0]) {
  doc.setDrawColor(...color)
  doc.setLineWidth(0.5)
  doc.line(x - size * 0.4, y - size * 0.4, x + size * 0.4, y + size * 0.4)
  doc.line(x - size * 0.4, y + size * 0.4, x + size * 0.4, y - size * 0.4)
}

function drawCircle(doc: jsPDF, x: number, y: number, radius: number) {
  doc.setDrawColor(0)
  doc.setLineWidth(0.4)
  doc.circle(x, y, radius, 'S')
}
function drawCircleWithCross(
  doc: jsPDF,
  x: number,
  y: number,
  size: number
) {
  const radius = size

  // cercle
  doc.setDrawColor(0)
  doc.setLineWidth(0.4)
  doc.circle(x, y, radius, 'S')

  // croix
  doc.setLineWidth(0.5)
  const offset = radius * 0.6
  doc.line(x - offset, y - offset, x + offset, y + offset)
  doc.line(x - offset, y + offset, x + offset, y - offset)
}


export async function generateOTPdf(
  ordre: OrdreTravailDetail,
  options: { download?: boolean } = {}
) {
  const doc = new jsPDF()
  
  // Charger et enregistrer les polices Bahij
  await registerBahijFonts(doc)
  
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10
  let yPosition = 8

  const plan = ordre.plans_maintenance
  console.log('ordre:', ordre)
  const machine = ordre?.machine
  const gamme = plan?.gamme
  const gameName = gamme?.nom || 'N/A'
  const interventionValidee = ordre.interventions?.find((intervention) => intervention.valide === true)
  const interventionSignature = interventionValidee || ordre.interventions?.[0]
  const interventionAvecEtapes = interventionValidee
    || ordre.interventions?.find((intervention) => Array.isArray(intervention.etapes_gamme_checkees))
  const technicienIntervention = interventionSignature?.technicien
  const dateIntervention = interventionSignature?.date_debut
    ? new Date(interventionSignature.date_debut).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR')
  const poste_technique = machine?.poste_technique
  const client = machine?.client

  let qrCodeDataUrl: string | null = null
  if (machine?.id) {
    try {
      const QRCode = await import('qrcode')
      const machineHistoryUrl = `${window.location.origin}/machine/${machine.id}/?tab=historique`
      qrCodeDataUrl = await QRCode.toDataURL(machineHistoryUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        }
      })
    } catch (error) {
      console.warn('Impossible de générer le QR code de la machine', error)
    }
  }

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

  if (qrCodeDataUrl) {
    const qrCodeSize = 18
    const qrCodeX = (pageWidth - qrCodeSize) / 2
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.2)
    doc.rect(qrCodeX - 0.5, logoY - 0.5, qrCodeSize + 1, qrCodeSize + 1)
    doc.addImage(qrCodeDataUrl, 'PNG', qrCodeX, logoY, qrCodeSize, qrCodeSize)
  }

  yPosition += logoHeight + 15

  doc.setFontSize(16)
  doc.setFont('BahijTheSansArabic', 'bold')
  doc.text('ORDRE DE TRAVAIL PREVENTIF', pageWidth / 2, yPosition, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('BahijTheSansArabic', 'normal')
  doc.text(`TYPE : ${ordre?.type === 'préventif' ? 'Préventif systématique' : 'Correctif'}`, pageWidth - margin - 40, yPosition)
  yPosition += 4
  doc.text(`n° : ${ordre.numot}`, pageWidth - margin - 40, yPosition)

  yPosition += 3
  doc.setFontSize(7)
  doc.text(`Etat : 0 A faire`, margin, yPosition)

  yPosition += 2
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  doc.setFontSize(8)
  doc.setFont('BahijTheSansArabic', 'bold')
  doc.text('Intervention :', margin, yPosition)
  doc.setFont('BahijTheSansArabic', 'normal')

  if (machine) {
    const label =plan? renderRecurrence(plan):'';
    const machineName = machine.nom.toUpperCase()

    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text(label, margin + 19, yPosition)

    const labelWidth = doc.getTextWidth(label + ' ')

    doc.setFont('BahijTheSansArabic', 'normal')
    doc.text(machineName, margin + 22 + labelWidth, yPosition)

    if (client?.raison_sociale) {
      doc.text('R.S: ' + client.raison_sociale, pageWidth - margin - 50, yPosition)
    }

    yPosition += 4
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text(`Type intervention : ${ordre?.type + ' ' + 'systématique' || 'N/A'}`, margin, yPosition)

    yPosition += 4
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('Gamme :', margin, yPosition)
    doc.setFont('BahijTheSansArabic', 'normal')
    doc.text(gamme?.nom || 'N/A', margin + 15, yPosition)
  }

  yPosition += 3
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  doc.setFont('BahijTheSansArabic', 'bold')
  doc.text('Emplacement :', margin, yPosition)

  if (poste_technique) {
    const machineCode = machine?.nom
      ? `_${machine.nom.replace(/\s+/g, '').replace(/[^A-Z0-9_]/gi, '').toUpperCase()}`
      : ''
    const locDetails = [`PT: ${poste_technique.code_pt}${machineCode}`]
    if (poste_technique.site) locDetails.push(poste_technique.site.nom)
    if (poste_technique.secteur) locDetails.push(poste_technique.batiment)
    if (poste_technique.domaine) locDetails.push(poste_technique.domaine.libelle)

    const emplacementText = locDetails.join(' / ')
    const emplacementX = margin + doc.getTextWidth('Emplacement :') + 2
    const availableWidth = pageWidth - margin - emplacementX
    doc.setFont('BahijTheSansArabic', 'normal')
    doc.setFontSize(Math.max(5.5, Math.min(8, (availableWidth / doc.getTextWidth(emplacementText)) * 8)))
    doc.text(emplacementText, emplacementX, yPosition)
    doc.setFontSize(8)
  }

  yPosition += 3
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5
  doc.setFont('BahijTheSansArabic', 'bold')
  doc.text('Superviseur:', margin, yPosition)

  let x = margin + doc.getTextWidth('Superviseur: ') + 2

  doc.setFont('BahijTheSansArabic', 'normal')

  const secteurCode = poste_technique?.secteur?.code ?? ''
  const secteurLibelle = poste_technique?.secteur?.libelle ?? ''
  if (secteurCode) {
    doc.text(secteurCode + ' / ', x, yPosition)
    x += doc.getTextWidth(secteurCode + ' / ')
  }

  
  if (secteurLibelle) {
    doc.text(secteurLibelle, x, yPosition)
  }

  doc.setFont('BahijTheSansArabic', 'bold')
  const datePreview = ordre.date_programmee
    ? new Date(ordre.date_programmee).toLocaleDateString('fr-FR')
    : 'N/A'
  doc.text('Date prévue:', pageWidth / 2, yPosition)
  doc.setFont('BahijTheSansArabic', 'normal')
  doc.text(datePreview, pageWidth / 2 + 20, yPosition)

  if (ordre.date_programmee) {
    const date = new Date(ordre.date_programmee)
    const weekNum = getWeekNumber(date)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('Semaine:', pageWidth - margin - 30, yPosition)
    doc.setFont('BahijTheSansArabic', 'normal')
    doc.text(weekNum.toString().padStart(2, '0'), pageWidth - margin - 15, yPosition)
  }

  yPosition += 4
  if (plan?.date_debut) {
    const datedebut = plan.date_debut
      ? new Date(plan.date_debut).toLocaleDateString('fr-FR')
      : 'N/A'
    doc.text(`Créé le: ${datedebut}`, margin, yPosition)
  }
  if (plan?.date_debut) {
    doc.text(`Plan d'entretien ID : ${plan.numero}`, pageWidth / 2, yPosition)
  }

  yPosition += 3
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  if (gamme?.etapes_gamme && gamme.etapes_gamme.length > 0) {
    yPosition = checkPageBreak(doc, yPosition, 40, margin, pageHeight)

    const totalDuree = gamme.etapes_gamme.reduce((sum:any, e:any) => sum + (e.duree_estimee || 0), 0)
    const heures = Math.floor(totalDuree / 60)
    const minutes = totalDuree % 60

    doc.setFillColor(240, 245, 250)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')

    doc.setFontSize(9)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('INFORMATIONS TECHNIQUES', pageWidth / 2, yPosition + 5.5, { align: 'center' })
    yPosition += 12

    doc.setFontSize(7.5)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('Durée totale estimée:', margin, yPosition)
    doc.setFont('BahijTheSansArabic', 'normal')
    doc.text(`${heures}h ${minutes}min`, margin + 35, yPosition)

    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('Nombre d\'étapes:', margin + 70, yPosition)
    doc.setFont('BahijTheSansArabic', 'normal')
    doc.text(`${gamme.etapes_gamme.length}`, margin + 98, yPosition)

    yPosition += 2

    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.3)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 14, 'FD')

    doc.setFontSize(7.5)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('LÉGENDE DES STATUTS', margin + 2, yPosition + 3.5)

    const checkboxSize = 4
    const symbolY = yPosition + 11

    doc.setDrawColor(0)
    doc.rect(margin + 4, symbolY - 2.7, checkboxSize, checkboxSize)
    drawCheckmark(doc, margin + 4.7, symbolY - 0.5, 2.3, [22, 163, 74])
    doc.setFontSize(7)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.setTextColor(22, 163, 74)
    doc.text('Conforme', margin + 10, symbolY)

    doc.setDrawColor(0)
    doc.rect(margin + 62, symbolY - 2.7, checkboxSize, checkboxSize)
    doc.setDrawColor(37, 99, 235)
    doc.setLineWidth(0.6)
    doc.line(margin + 62.7, symbolY - 0.7, margin + 65.3, symbolY - 0.7)
    doc.setTextColor(37, 99, 235)
    doc.text('Reporté', margin + 68, symbolY)

    doc.setDrawColor(0)
    doc.rect(margin + 116, symbolY - 2.7, checkboxSize, checkboxSize)
    drawCross(doc, margin + 118, symbolY - 0.7, 2.2, [220, 38, 38])
    doc.setTextColor(220, 38, 38)
    doc.text('Action corrective', margin + 122, symbolY)

    doc.setTextColor(0, 0, 0)
    doc.setDrawColor(0)
    yPosition += 14
  }

  yPosition += 1
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 2

  yPosition = checkPageBreak(doc, yPosition, 12, margin, pageHeight)

  doc.setFillColor(70, 130, 180)
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('BahijTheSansArabic', 'bold')
  doc.text('ACTIVITÉS À RÉALISER', pageWidth / 2, yPosition + 3.4, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  yPosition += 6

  if (gamme?.etapes_gamme && gamme.etapes_gamme.length > 0) {
    const etapesSortees = [...gamme.etapes_gamme].sort((a, b) => a.ordre - b.ordre)
    const etapesCheckees = interventionAvecEtapes?.etapes_gamme_checkees
    const etapesAvecStatut = etapesSortees.map((etape) => {
      if (!Array.isArray(etapesCheckees)) {
        return { etape, isChecked: false, statut: '' }
      }

      if (etapesCheckees.some((item) => typeof item === 'string')) {
        return { etape, isChecked: etapesCheckees.includes(etape.id), statut: '' }
      }

      const etapeCheckee = etapesCheckees.find((item: any) =>
        item && (item.id === etape.id || item.etape_id === etape.id)
      )
      return {
        etape,
        isChecked: Boolean(etapeCheckee),
        statut: etapeCheckee?.statut || ''
      }
    })

    const tableStartY = yPosition

    const tableWidth = pageWidth - 2 * margin
    const headers = [
      { content: 'N°', styles: { halign: 'center', cellWidth: 8 } },
      { content: 'DESCRIPTION DE L\'ACTIVITÉ', styles: { halign: 'left', cellWidth: tableWidth - 63 } },
      { content: 'DURÉE', styles: { halign: 'center', cellWidth: 15 } },
      { content: 'ETAT COMPLET RENDU', styles: { halign: 'center', cellWidth: 40 } }
    ]

    const tableData = etapesAvecStatut.map(({ etape }) => {
      let description = etape.description

      if (etape.outil) {
        description += `\n[Outil: ${etape.outil}]`
      }
      if (etape.consigne_securite) {
        description += `\n[!] ${etape.consigne_securite}`
      }

      return [
        { content: etape.ordre.toString().padStart(2, '0'), styles: { halign: 'center', fontStyle: 'bold' } },
        { content: description, styles: { fontSize: 7 } },
        { content: etape.duree_estimee ? `${etape.duree_estimee}min` : '-', styles: { halign: 'center' } },
        { content: '', styles: { halign: 'center' } }
      ]
    })


    autoTable(doc, {
      startY: tableStartY,
      head: [headers],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [70, 130, 180],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.5,
        cellPadding: 1,
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { left: margin, right: margin, bottom: 50 },
      showHead: 'everyPage',
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const checkboxSize = 3

          const cellCenterX = data.cell.x + data.cell.width / 2
          const cellCenterY = data.cell.y + data.cell.height / 2

          doc.setDrawColor(0)
          doc.setLineWidth(0.3)
          doc.rect(
            cellCenterX - checkboxSize / 2,
            cellCenterY - checkboxSize / 2,
            checkboxSize,
            checkboxSize
          )

          const etapeResultat = etapesAvecStatut[data.row.index]
          const symbolSize = 1.8

          if (etapeResultat?.statut === 'Conforme') {
            doc.setDrawColor(22, 163, 74)
            doc.setLineWidth(0.5)
            doc.line(cellCenterX - symbolSize, cellCenterY, cellCenterX - 0.4, cellCenterY + symbolSize * 0.7)
            doc.line(cellCenterX - 0.4, cellCenterY + symbolSize * 0.7, cellCenterX + symbolSize, cellCenterY - symbolSize * 0.7)
          } else if (etapeResultat?.statut === 'Reporté/Replanification') {
            doc.setDrawColor(37, 99, 235)
            doc.setLineWidth(0.6)
            doc.line(cellCenterX - symbolSize, cellCenterY, cellCenterX + symbolSize, cellCenterY)
          } else if (etapeResultat?.statut === 'Action corrective requise') {
            drawCross(doc, cellCenterX, cellCenterY, symbolSize * 1.5, [220, 38, 38])
          } else if (etapeResultat?.isChecked) {
            doc.setDrawColor(0)
            drawCross(doc, cellCenterX, cellCenterY, symbolSize * 1.5)
          }

          doc.setDrawColor(0)
        }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 5
  }

  if (ordre.observations) {
    const obsLines = doc.splitTextToSize(ordre.observations, pageWidth - 2 * margin - 4)
    const obsHeight = 11 + obsLines.length * 3
    yPosition = checkPageBreak(doc, yPosition, obsHeight, margin, pageHeight)

    doc.setFillColor(255, 250, 230)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 5, 'F')
    doc.setFontSize(8)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('OBSERVATIONS:', margin + 2, yPosition + 3.5)
    yPosition += 6

    doc.setFont('BahijTheSansArabic', 'normal')
    doc.setFontSize(7)
    doc.text(obsLines, margin + 2, yPosition)
    yPosition += obsLines.length * 3 + 3
  }

  if (interventionSignature?.commentaire?.trim()) {
    const commentaireLines = doc.splitTextToSize(
      interventionSignature.commentaire.trim(),
      pageWidth - 2 * margin - 4
    )
    const commentaireHeight = 11 + commentaireLines.length * 3
    yPosition = checkPageBreak(doc, yPosition, commentaireHeight, margin, pageHeight)

    doc.setFillColor(245, 245, 244)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 5, 'F')
    doc.setFontSize(8)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('COMMENTAIRE DU TECHNICIEN:', margin + 2, yPosition + 3.5)
    yPosition += 8

    doc.setFont('BahijTheSansArabic', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(120, 113, 108)
    doc.text(commentaireLines, margin + 2, yPosition)
    doc.setTextColor(0, 0, 0)
    yPosition += commentaireLines.length * 3 + 3
  }

  const signatureBlockHeight = 40
  if (yPosition > pageHeight - margin - signatureBlockHeight - 5) {
    doc.addPage()
  }
  

  drawSignatures(
    doc,
    pageWidth,
    pageHeight,
    margin,
    technicienIntervention?.nom || 'Non assigné',
    dateIntervention
  )

  const fileName = `OT_${ordre.numot}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`
  const pdfBlob = doc.output('blob')
  if (options.download !== false) {
    doc.save(fileName)
  }
  return pdfBlob
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
