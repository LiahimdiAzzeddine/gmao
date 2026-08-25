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
  doc.setFontSize(6)
  doc.setFont('BahijTheSansArabic', 'normal')
  doc.text('Dateg:', pageWidth - margin - signWidth + 2, signY + 25)
  doc.line(pageWidth - margin - signWidth + 8, signY + 25, pageWidth - margin - signWidth + 30, signY + 25)
}

function drawCheckmark(doc: jsPDF, x: number, y: number, size: number) {
  doc.setDrawColor(0)
  doc.setLineWidth(0.5)
  doc.line(x, y, x + size * 0.3, y + size * 0.6)
  doc.line(x + size * 0.3, y + size * 0.6, x + size, y - size * 0.4)
}

function drawCross(doc: jsPDF, x: number, y: number, size: number) {
  doc.setDrawColor(0)
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


export async function generateOTPdf(ordre: OrdreTravailDetail) {
  const doc = new jsPDF()
  
  // Charger et enregistrer les polices Bahij
  await registerBahijFonts(doc)
  
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10
  let yPosition = 8

  const plan = ordre.plans_maintenance
  const machine = ordre?.machine
  const gamme = plan?.gamme
  const interventionSignature = ordre.interventions?.find((intervention) => intervention.technicien?.nom)
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

    yPosition += 4
    doc.text(`Type intervention : ${ordre?.type + ' ' + 'systématique' || 'N/A'}`, margin, yPosition)

    if (client?.raison_sociale) {
      doc.text('R.S: ' + client.raison_sociale, pageWidth - margin - 50, yPosition - 4)
    }
  }

  yPosition += 3
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  doc.setFont('BahijTheSansArabic', 'bold')
  doc.text('Emplacement :', margin, yPosition)

  yPosition += 4
  doc.setFont('BahijTheSansArabic', 'normal')

  if (poste_technique) {
    let ptText = `PT: ${poste_technique.code_pt+'_'+ machine.nom.replace(/\s+/g, '').replace(/[^A-Z0-9_]/gi, '').toUpperCase()}`
    doc.text(ptText, margin, yPosition)
    yPosition += 4

    const locDetails = []
    if (poste_technique.site) locDetails.push(poste_technique.site.nom)
    if (poste_technique.secteur) locDetails.push(poste_technique.batiment)
    if (poste_technique.domaine) locDetails.push(poste_technique.domaine.libelle)
    if (locDetails.length > 0) {
      const locText = doc.splitTextToSize(locDetails.join(' / '), pageWidth - 2 * margin - 20)
      doc.text(locText, margin + 5, yPosition)
      yPosition += locText.length * 4
    }
  }

  yPosition += 1
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
    yPosition += 15

    doc.setFontSize(7.5)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('Durée totale estimée:', margin + 2, yPosition)
    doc.setFont('BahijTheSansArabic', 'normal')
    doc.text(`${heures}h ${minutes}min`, margin + 35, yPosition)

    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('Nombre d\'étapes:', margin + 70, yPosition)
    doc.setFont('BahijTheSansArabic', 'normal')
    doc.text(`${gamme.etapes_gamme.length}`, margin + 98, yPosition)

    

    yPosition += 6

    const legendeStartY = yPosition
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 13)

    yPosition += 4
    doc.setFontSize(7)
    doc.setFont('BahijTheSansArabic', 'bold')
    doc.text('LÉGENDE DES SYMBOLES', margin + 2, yPosition)
    yPosition += 5

    doc.setFont('BahijTheSansArabic', 'normal')
    const checkboxSize = 4

    doc.setDrawColor(0)
    doc.rect(margin + 4, yPosition - 2.9, checkboxSize, checkboxSize)
    drawCross(doc, margin + 6, yPosition - 0.9, 2.5)
    doc.setFontSize(7)
    doc.setFont('BahijTheSansArabic', 'normal')
    doc.text("= fait, sans constat d'anomalie", margin + 10, yPosition)

    doc.rect(margin + 60, yPosition - 2.9, checkboxSize, checkboxSize)
    drawCircle(doc, margin + 61.96, yPosition - 0.9, 1.3)
    doc.setFontSize(7)
    doc.setFont('BahijTheSansArabic', 'normal')
    doc.text('= fait, anomalie constatée', margin + 66, yPosition)

    doc.rect(margin + 115, yPosition - 2.9, checkboxSize, checkboxSize)
    drawCircleWithCross(doc, margin + 115.75 + 1.2, yPosition - 0.9, 1.4)
    doc.setFontSize(7)
    doc.setFont('BahijTheSansArabic', 'normal')
    doc.text('= anomalie corrigée', margin + 121, yPosition)

   
    yPosition += 5
  }

  yPosition += 3
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 2

  yPosition = checkPageBreak(doc, yPosition, 20, margin, pageHeight)

  doc.setFillColor(255, 245, 161)
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('BahijTheSansArabic', 'bold')
  doc.text('RESPECTER LES CONSIGNES DE SECURITE', pageWidth / 2, yPosition + 4, { align: 'center' })
  yPosition += 8

  doc.setFillColor(70, 130, 180)
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 7, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('BahijTheSansArabic', 'bold')
  doc.text('ACTIVITÉS À RÉALISER', pageWidth / 2, yPosition + 4.5, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  yPosition += 8

  if (gamme?.etapes_gamme && gamme.etapes_gamme.length > 0) {
    const etapesSortees = [...gamme.etapes_gamme].sort((a, b) => a.ordre - b.ordre)

    const tableStartY = yPosition

    const tableWidth = pageWidth - 2 * margin
    const headers = [
      { content: 'N°', styles: { halign: 'center', cellWidth: 8 } },
      { content: 'DESCRIPTION DE L\'ACTIVITÉ', styles: { halign: 'left', cellWidth: tableWidth - 63 } },
      { content: 'DURÉE', styles: { halign: 'center', cellWidth: 15 } },
      { content: 'ETAT COMPLET RENDU', styles: { halign: 'center', cellWidth: 40 } }
    ]

    const tableData = etapesSortees.map((etape) => {
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
        fontSize: 7.5,
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
  doc.save(fileName)
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
