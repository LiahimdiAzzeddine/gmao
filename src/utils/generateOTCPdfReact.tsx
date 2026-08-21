import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, pdf, Svg, Line } from '@react-pdf/renderer';
import { OrdreTravailDetail } from '../types/ot';

// Styles (réutilisation des mêmes styles que generateOTPdfReact)
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  logo: {
    width: 100,
    height: 36,
  },
  qrCode: {
    width: 60,
    height: 60,
    border: '1px solid black',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#4682B4',
    color: 'white',
    padding: 5,
    marginBottom: 5,
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    padding: 10,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontWeight: 'bold',
    width: '30%',
  },
  value: {
    width: '70%',
  },
  interventionSection: {
    backgroundColor: '#e6f7ed',
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  interventionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#22c55e',
    color: 'white',
    padding: 5,
    textAlign: 'center',
    marginBottom: 10,
  },
  badge: {
    padding: '3 8',
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
    color: 'white',
  },
  badgeSuccess: {
    backgroundColor: '#22c55e',
  },
  badgeWarning: {
    backgroundColor: '#fbbf24',
  },
  badgeError: {
    backgroundColor: '#ef4444',
  },
  imageSection: {
    marginTop: 10,
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  image: {
    height: 140,
    maxWidth: 360,
    objectFit: 'contain',
    border: '1px solid #e2e8f0',
  },
  observations: {
    backgroundColor: '#fffbeb',
    padding: 10,
    marginTop: 10,
  },
  observationsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  observationsText: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  table: {
    marginTop: 10,
    border: '1px solid #e2e8f0',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e2e8f0',
    padding: 8,
  },
  tableCell: {
    fontSize: 9,
  },
  signaturesContainer: {
    marginTop: 20,
    paddingTop: 12,
    borderTop: '1px solid #cbd5e1',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  signatureBox: {
    width: '48%',
    padding: 10,
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 3,
  },
  signatureTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1e40af',
    textAlign: 'center',
  },
  signatureRect: {
    height: 70,
    backgroundColor: '#ffffff',
    border: '1px dashed #cbd5e1',
    marginBottom: 6,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  signatureDate: {
    fontSize: 7,
    color: '#64748b',
    textAlign: 'center',
  },
  signatureValidationText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#047857',
    textAlign: 'center',
    marginTop: 4,
  },
  signaturePendingText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#b45309',
    textAlign: 'center',
  },
  signatureValidationDate: {
    fontSize: 7,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 3,
  },
});

interface OTCPdfDocumentProps {
  ordre: OrdreTravailDetail & { interventions?: any[] };
  qrCodeDataUrl?: string;
}

const OTCPdfDocument: React.FC<OTCPdfDocumentProps> = ({ ordre, qrCodeDataUrl }) => {
  const machine = ordre?.machine;
  const poste_technique = machine?.poste_technique;
  const client = machine?.client;
  const interventionValidee = ordre.interventions?.find(i => i.valide === true);
  const interventionPourSignature = interventionValidee || ordre.interventions?.[0];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDureeRealisee = (intervention: any) => {
    if (!intervention) return 'Non renseignée';

    if (intervention.duree_minutes && intervention.duree_minutes > 0) {
      return `${Math.floor(intervention.duree_minutes / 60)}h ${intervention.duree_minutes % 60}min`;
    }

    if (intervention.date_debut && intervention.date_fin) {
      const debut = new Date(intervention.date_debut).getTime();
      const fin = new Date(intervention.date_fin).getTime();
      const minutes = Math.max(0, Math.round((fin - debut) / 60000));

      if (minutes > 0) {
        return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
      }
    }

    return 'Non renseignée';
  };

  const getBadgeStyle = (resultat: string) => {
    switch (resultat) {
      case 'réussi':
        return styles.badgeSuccess;
      case 'partiel':
        return styles.badgeWarning;
      case 'échec':
        return styles.badgeError;
      default:
        return styles.badgeSuccess;
    }
  };

  const dureeRealisee = formatDureeRealisee(interventionValidee);
  const shouldShowDureeRealisee = dureeRealisee !== 'Non renseignée';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src="/FSGlogo.png" style={styles.logo} />
          <View style={{ width: 60 }} />
          {client?.logo_url && <Image src={client.logo_url} style={styles.logo} />}
        </View>

        {/* Title */}
        <Text style={styles.title}>ORDRE DE TRAVAIL CORRECTIF</Text>
        
        {/* QR Code centré sous le titre */}
        {qrCodeDataUrl && (
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <Image src={qrCodeDataUrl} style={styles.qrCode} />
          </View>
        )}
        
        <Text style={{ textAlign: 'right', fontSize: 8, marginBottom: 10 }}>
          N° : {ordre.numot}
        </Text>

        {/* Machine Info */}
        <View style={styles.infoBox}>
          <View style={styles.row}>
            <Text style={styles.label}>Machine:</Text>
            <Text style={styles.value}>{machine?.nom || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Modèle:</Text>
            <Text style={styles.value}>{machine?.modele || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>N° Série:</Text>
            <Text style={styles.value}>{machine?.numero_serie || 'N/A'}</Text>
          </View>
          {poste_technique && (
            <View style={styles.row}>
              <Text style={styles.label}>Poste Technique:</Text>
              <Text style={styles.value}>
                {poste_technique.code_pt}_{machine.nom.replace(/\s+/g, '').replace(/[^A-Z0-9_]/gi, '').toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Date programmée:</Text>
            <Text style={styles.value}>
              {ordre.date_programmee ? new Date(ordre.date_programmee).toLocaleDateString('fr-FR') : 'N/A'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Type intervention:</Text>
            <Text style={styles.value}>{ordre.type_intervention || ordre.cause || 'RÉPARATION'}</Text>
          </View>
        </View>

        {/* Activités */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACTIVITÉS</Text>
          {ordre.observations ? (
            <Text style={[styles.observationsText, { padding: 10 }]}>
              {ordre.observations}
            </Text>
          ) : (
            <Text style={[styles.observationsText, { padding: 10, fontStyle: 'italic' }]}>
              Aucune activité décrite
            </Text>
          )}
        </View>

        {/* Durée */}
        {shouldShowDureeRealisee && (
          <View style={styles.infoBox}>
            <View style={styles.row}>
              <Text style={styles.label}>Durée réalisée:</Text>
              <Text style={styles.value}>
                {dureeRealisee}
              </Text>
            </View>
          </View>
        )}

        {/* Intervention validée */}
        {interventionValidee && (
          <View style={styles.interventionSection} break>
            <Text style={styles.interventionTitle}>COMPTE-RENDU D'INTERVENTION VALIDÉE</Text>
            
            <View style={styles.infoBox}>
              <View style={styles.row}>
                <Text style={styles.label}>Technicien:</Text>
                <Text style={styles.value}>{interventionValidee.technicien?.nom || 'N/A'}</Text>
              </View>
              {interventionValidee.date_debut && (
                <View style={styles.row}>
                  <Text style={styles.label}>Date début:</Text>
                  <Text style={styles.value}>{formatDate(interventionValidee.date_debut)}</Text>
                </View>
              )}
              {interventionValidee.date_fin && (
                <View style={styles.row}>
                  <Text style={styles.label}>Date fin:</Text>
                  <Text style={styles.value}>{formatDate(interventionValidee.date_fin)}</Text>
                </View>
              )}
              {interventionValidee.resultat && (
                <View style={styles.row}>
                  <Text style={styles.label}>Résultat:</Text>
                  <View style={[styles.badge, getBadgeStyle(interventionValidee.resultat)]}>
                    <Text>{interventionValidee.resultat.toUpperCase()}</Text>
                  </View>
                </View>
              )}
              {interventionValidee.etat_machine_apres && (
                <View style={styles.row}>
                  <Text style={styles.label}>État machine:</Text>
                  <Text style={styles.value}>{interventionValidee.etat_machine_apres}</Text>
                </View>
              )}
            </View>

            {/* Pièces remplacées */}
            {interventionValidee.pieces_remplacees && interventionValidee.pieces_remplacees.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.observationsTitle, { color: '#a855f7' }]}>
                  PIÈCES REMPLACÉES:
                </Text>
                {interventionValidee.pieces_remplacees.map((piece: any, idx: number) => (
                  <Text key={idx} style={[styles.observationsText, { marginLeft: 10 }]}>
                    {idx + 1}. {piece.nom || piece.reference || 'N/A'} - Quantité: {piece.quantite || 1}
                  </Text>
                ))}
              </View>
            )}

            {/* Commentaire */}
            {interventionValidee.commentaire && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.observationsTitle}>COMMENTAIRES:</Text>
                <Text style={styles.observationsText}>{interventionValidee.commentaire}</Text>
              </View>
            )}

            {/* Images */}
            {(interventionValidee.image_avant_urls?.length > 0 || interventionValidee.image_apres_urls?.length > 0) && (
              <View style={styles.imageSection} break>
                <Text style={[styles.observationsTitle, { color: '#ec4899' }]}>
                  PHOTOS DE L'INTERVENTION:
                </Text>
                
                {interventionValidee.image_avant_urls?.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', marginTop: 5 }}>AVANT:</Text>
                    <View style={styles.imageRow}>
                      {interventionValidee.image_avant_urls.slice(0, 3).map((url: string, idx: number) => (
                        <Image key={idx} src={url} style={styles.image} />
                      ))}
                    </View>
                  </View>
                )}
                
                {interventionValidee.image_apres_urls?.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', marginTop: 10 }}>APRÈS:</Text>
                    <View style={styles.imageRow}>
                      {interventionValidee.image_apres_urls.slice(0, 3).map((url: string, idx: number) => (
                        <Image key={idx} src={url} style={styles.image} />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Table des intervenants */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COMPTE-RENDU INTERVENANTS</Text>
          <View style={styles.table}>
            {interventionValidee ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '15%' }]}>
                  {interventionValidee.technicien?.id?.substring(0, 8) || ''}
                </Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>
                  {interventionValidee.technicien?.nom || ''}
                </Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>
                  {interventionValidee.date_debut
                    ? new Date(interventionValidee.date_debut).toLocaleDateString('fr-FR')
                    : ''}
                </Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>
                  {shouldShowDureeRealisee ? dureeRealisee : ''}
                </Text>
                <Text style={[styles.tableCell, { width: '20%' }]}></Text>
              </View>
            ) : (
              <>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}></Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}></Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signaturesContainer}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>SIGNATURE ADMIN</Text>
              <View style={styles.signatureRect}>
                {interventionPourSignature?.valide ? (
                  <>
                    <Svg width="26" height="26" viewBox="0 0 26 26">
                      <Line x1="7" y1="13" x2="11" y2="17" stroke="#047857" strokeWidth="3" strokeLinecap="round" />
                      <Line x1="11" y1="17" x2="19" y2="8" stroke="#047857" strokeWidth="3" strokeLinecap="round" />
                    </Svg>
                    <Text style={styles.signatureValidationText}>Validé par admin</Text>
                    {interventionPourSignature.valide_le && (
                      <Text style={styles.signatureValidationDate}>{formatDate(interventionPourSignature.valide_le)}</Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.signaturePendingText}>En attente de validation admin</Text>
                )}
              </View>
              <Text style={styles.signatureDate}>
                {interventionPourSignature?.valide && interventionPourSignature?.valide_le
                  ? `Date : ${formatDate(interventionPourSignature.valide_le)}`
                  : 'Date : _______________'}
              </Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>SIGNATURE CLIENT</Text>
              <View style={styles.signatureRect}>
                {interventionPourSignature?.client_valide ? (
                  <>
                    <Svg width="26" height="26" viewBox="0 0 26 26">
                      <Line x1="7" y1="13" x2="11" y2="17" stroke="#047857" strokeWidth="3" strokeLinecap="round" />
                      <Line x1="11" y1="17" x2="19" y2="8" stroke="#047857" strokeWidth="3" strokeLinecap="round" />
                    </Svg>
                    <Text style={styles.signatureValidationText}>Validé par le client</Text>
                    <Text style={styles.signatureValidationDate}>{formatDate(new Date().toISOString())}</Text>
                  </>
                ) : (
                  <Text style={styles.signaturePendingText}>En attente de validation client</Text>
                )}
              </View>
              <Text style={styles.signatureDate}>
                {interventionPourSignature?.client_valide
                  ? `Date : ${formatDate(new Date().toISOString())}`
                  : 'Date : _______________'}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={{ position: 'absolute', bottom: 30, left: 30, right: 30 }}>
          <Text style={{ fontSize: 7, textAlign: 'center', marginBottom: 10 }}>
            Document non géré - Page 1/1 - Imprimé le {new Date().toLocaleDateString('fr-FR')} à{' '}
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export const generateOTCPdfReact = async (
  ordre: OrdreTravailDetail & { interventions?: any[] },
  options: { download?: boolean } = {}
) => {
  try {
    // Générer le QR code
    let qrCodeDataUrl: string | undefined;
    if (ordre.machine?.id) {
      const QRCode = await import('qrcode');
      const url = `${window.location.origin}/machine/${ordre.machine.id}/?tab=historique`;
      qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: {
          dark: '#1e293b',
          light: '#ffffff',
        },
        
      });
    }

    // Générer le PDF
    const blob = await pdf(<OTCPdfDocument ordre={ordre} qrCodeDataUrl={qrCodeDataUrl} />).toBlob();
    
    if (options.download !== false) {
      const fileName = `OTC_${ordre.numot}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    return blob;
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
};
