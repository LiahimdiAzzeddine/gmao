import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, pdf, Svg, Line } from '@react-pdf/renderer';
import { OrdreTravailDetail } from '../types/ot';

// Styles professionnels et bien organisés
const styles = StyleSheet.create({
  page: {
    padding: 25,
    fontSize: 9,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  
  // ========== EN-TÊTE ==========
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottom: '2pt solid #1e40af',
  },
  logo: {
    width: 110,
    height: 40,
  },
  qrCode: {
    width: 70,
    height: 70,
    border: '1pt solid #cbd5e1',
  },
  
  // ========== TITRE ==========
  titleContainer: {
    backgroundColor: '#1e40af',
    padding: 12,
    marginBottom: 15,
    borderRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffffff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 10,
    textAlign: 'center',
    color: '#e0e7ff',
    marginTop: 3,
  },
  
  // ========== INFORMATIONS GÉNÉRALES ==========
  infoSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1pt solid #cbd5e1',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  infoBox: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 4,
    borderRadius: 3,
    border: '0.5pt solid #e2e8f0',
  },
  infoLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  
  // ========== AVERTISSEMENT SÉCURITÉ ==========
  securityWarning: {
    backgroundColor: '#fef3c7',
    padding: 10,
    marginVertical: 0,
    borderLeft: '4pt solid #f59e0b',
    borderRadius: 3,
  },
  securityText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#92400e',
  },
  
  // ========== TABLEAU DES ÉTAPES ==========
  tableContainer: {
    marginBottom: 15,
  },
  tableHeader: {
    backgroundColor: '#1e40af',
    flexDirection: 'row',
    padding: 8,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #e2e8f0',
    borderLeft: '0.5pt solid #e2e8f0',
    borderRight: '0.5pt solid #e2e8f0',
    padding: 6,
    minHeight: 25,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 8,
    padding: 2,
    color: '#1e293b',
  },
  checkbox: {
    width: 10,
    height: 10,
    border: '1pt solid #64748b',
    borderRadius: 2,
  },
  
  // ========== OBSERVATIONS ==========
  observationsBox: {
    backgroundColor: '#fffbeb',
    padding: 10,
    marginVertical: 12,
    border: '1pt solid #fbbf24',
    borderRadius: 3,
  },
  observationsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#92400e',
  },
  observationsText: {
    fontSize: 8,
    lineHeight: 1.6,
    color: '#1e293b',
  },
  
  // ========== COMPTE-RENDU INTERVENTION ==========
  interventionSection: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f0f9ff',
    border: '1pt solid #3b82f6',
    borderRadius: 4,
  },
  interventionMainHeader: {
    backgroundColor: '#3b82f6',
    padding: 10,
    marginBottom: 12,
    borderRadius: 3,
  },
  interventionMainHeaderText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  interventionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  interventionColumn: {
    flex: 1,
  },
  interventionDetailRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  interventionDetailLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    width: '40%',
    color: '#475569',
  },
  interventionDetailValue: {
    fontSize: 8,
    width: '60%',
    color: '#1e293b',
  },
  
  // ========== BADGES ==========
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#ffffff',
    alignSelf: 'flex-start',
  },
  badgeSuccess: {
    backgroundColor: '#10b981',
  },
  badgeWarning: {
    backgroundColor: '#f59e0b',
  },
  badgeError: {
    backgroundColor: '#ef4444',
  },
  
  // ========== SECTIONS SPÉCIFIQUES ==========
  sectionHeader: {
    backgroundColor: '#1e40af',
    padding: 8,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 3,
  },
  sectionHeaderText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  sectionContent: {
    padding: 10,
    backgroundColor: '#f8fafc',
    border: '0.5pt solid #e2e8f0',
    borderRadius: 3,
  },
  
  // ========== PIÈCES REMPLACÉES ==========
  pieceItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottom: '0.5pt solid #e2e8f0',
  },
  pieceNumber: {
    width: 25,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  pieceDetails: {
    flex: 1,
    fontSize: 8,
    color: '#1e293b',
  },
  pieceQuantity: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748b',
  },
  
  // ========== IMAGES ==========
  imagesSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
    border: '0.5pt solid #e2e8f0',
    borderRadius: 3,
  },
  imageLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 6,
    color: '#1e40af',
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 3,
  },
  image: {
    height: 260,
    maxWidth: 760,
    objectFit: 'contain',
    borderRadius: 3,
  },
  imageCaption: {
    fontSize: 7,
    color: '#64748b',
    marginTop: 3,
    textAlign: 'center',
  },
  
  // ========== RÉSUMÉ INTERVENTION ==========
  interventionSummaryBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    border: '1pt solid #e2e8f0',
    borderRadius: 3,
    marginBottom: 10,
  },
  
  // ========== SECTIONS COLORÉES ==========
  sectionHeaderBlue: {
    backgroundColor: '#3b82f6',
    padding: 8,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 3,
  },
  sectionHeaderViolet: {
    backgroundColor: '#8b5cf6',
    padding: 8,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 3,
  },
  sectionHeaderOrange: {
    backgroundColor: '#f97316',
    padding: 8,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 3,
  },
  
  // ========== SIGNATURES ==========
  signaturesContainer: {
    marginTop: 25,
    paddingTop: 15,
    borderTop: '1pt solid #cbd5e1',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  signatureBox: {
    width: '48%',
    padding: 10,
    backgroundColor: '#f8fafc',
    border: '1pt solid #e2e8f0',
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
    border: '1pt dashed #cbd5e1',
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
  
  // ========== FOOTER ==========
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 25,
    right: 25,
    paddingTop: 8,
    borderTop: '0.5pt solid #e2e8f0',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
  },
  
  // ========== DIVIDER ==========
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
});


interface OTPdfDocumentProps {
  ordre: OrdreTravailDetail & { interventions?: any[] };
  qrCodeDataUrl?: string;
}

const OTPdfDocument: React.FC<OTPdfDocumentProps> = ({ ordre, qrCodeDataUrl }) => {
  const plan = ordre.plans_maintenance;
  const machine = ordre?.machine;
  const gamme = plan?.gamme;
  const poste_technique = machine?.poste_technique;
  const client = machine?.client;
  const interventionValidee = ordre.interventions?.find(i => i.valide === true);
  const interventionPourSignature = interventionValidee || ordre.interventions?.[0];

  // Debug: vérifier les données reçues
  console.log('=== DEBUG React PDF - DÉTAILS ===');
  console.log('Ordre complet:', ordre);
  console.log('Interventions:', ordre.interventions);
  
  if (ordre.interventions && ordre.interventions.length > 0) {
    ordre.interventions.forEach((interv, idx) => {
      console.log(`Intervention ${idx}:`, {
        id: interv.id,
        valide: interv.valide,
        technicien: interv.technicien?.nom,
        etapes_checkees: interv.etapes_gamme_checkees,
        type_etapes: typeof interv.etapes_gamme_checkees,
        is_array: Array.isArray(interv.etapes_gamme_checkees),
        length: Array.isArray(interv.etapes_gamme_checkees) ? interv.etapes_gamme_checkees.length : 'N/A'
      });
    });
  }

  if (interventionValidee) {
    console.log('Intervention validée:', {
      id: interventionValidee.id,
      technicien: interventionValidee.technicien?.nom,
      date_debut: interventionValidee.date_debut,
      date_fin: interventionValidee.date_fin,
      etapes_gamme_checkees: interventionValidee.etapes_gamme_checkees,
      type: typeof interventionValidee.etapes_gamme_checkees,
      isArray: Array.isArray(interventionValidee.etapes_gamme_checkees),
      length: Array.isArray(interventionValidee.etapes_gamme_checkees) ? interventionValidee.etapes_gamme_checkees.length : 'N/A',
      sample: Array.isArray(interventionValidee.etapes_gamme_checkees) ? interventionValidee.etapes_gamme_checkees.slice(0, 3) : 'N/A'
    });
  } else {
    console.log('❌ Aucune intervention validée trouvée');
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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

  const totalDuree = gamme?.etapes_gamme?.reduce((sum, e) => sum + (e.duree_estimee || 0), 0) || 0;
  const heures = Math.floor(totalDuree / 60);
  const minutes = totalDuree % 60;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ========== EN-TÊTE ========== */}
        <View style={styles.headerRow}>
          <Image src="/FSGlogo.png" style={styles.logo} />
          {qrCodeDataUrl && <Image src={qrCodeDataUrl} style={styles.qrCode} />}
          {client?.logo_url && <Image src={client.logo_url} style={styles.logo} />}
        </View>

        {/* ========== TITRE ========== */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>ORDRE DE TRAVAIL PRÉVENTIF</Text>
          <Text style={styles.subtitle}>N° {ordre.numot}</Text>
        </View>

        {/* ========== INFORMATIONS GÉNÉRALES ========== */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>INFORMATIONS GÉNÉRALES</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Machine</Text>
              <Text style={styles.infoValue}>{machine?.nom || 'N/A'}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>Préventif systématique</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Date prévue</Text>
              <Text style={styles.infoValue}>
                {ordre.date_programmee ? formatDate(ordre.date_programmee) : 'N/A'}
              </Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Semaine</Text>
              <Text style={styles.infoValue}>
                {ordre.date_programmee 
                  ? `S${getWeekNumber(new Date(ordre.date_programmee)).toString().padStart(2, '0')}`
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Date d'intervention</Text>
              <Text style={styles.infoValue}>
                {interventionValidee?.date_debut 
                  ? formatDate(interventionValidee.date_debut)
                  : 'N/A'}
              </Text>
            </View>
            {client?.raison_sociale && (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Client</Text>
                <Text style={styles.infoValue}>{client.raison_sociale}</Text>
              </View>
            )}
              {plan && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Plan de maintenance</Text>
                  <Text style={styles.infoValue}>Préventif systématique</Text>
                </View>
              )}
          </View>
        </View>

        {/* ========== LOCALISATION ========== */}
        {poste_technique && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>LOCALISATION</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Poste technique</Text>
                <Text style={styles.infoValue}>
                  {poste_technique.code_pt}_{machine.nom.replace(/\s+/g, '').replace(/[^A-Z0-9_]/gi, '').toUpperCase()}
                </Text>
              </View>
              {poste_technique.site?.nom && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Site</Text>
                  <Text style={styles.infoValue}>{poste_technique.site.nom}</Text>
                </View>
              )}
              {poste_technique.batiment && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Bâtiment</Text>
                  <Text style={styles.infoValue}>{poste_technique.batiment}</Text>
                </View>
              )}
              {poste_technique.domaine?.libelle && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Domaine</Text>
                  <Text style={styles.infoValue}>{poste_technique.domaine.libelle}</Text>
                </View>
              )}
              {poste_technique.secteur?.libelle && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Secteur</Text>
                  <Text style={styles.infoValue}>{poste_technique.secteur.libelle}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ========== INFORMATIONS TECHNIQUES ========== */}
        {gamme?.etapes_gamme && gamme.etapes_gamme.length > 0 && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>INFORMATIONS TECHNIQUES</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Durée totale estimée</Text>
                <Text style={styles.infoValue}>{heures}h {minutes}min</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Nombre d'étapes</Text>
                <Text style={styles.infoValue}>{gamme.etapes_gamme.length}</Text>
              </View>
              {gamme && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Gamme</Text>
                  <Text style={styles.infoValue}>{gamme.description || 'Gamme de maintenance'}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ========== AVERTISSEMENT SÉCURITÉ ========== */}
        <View style={styles.securityWarning}>
          <Text style={styles.securityText}>⚠ RESPECTER LES CONSIGNES DE SÉCURITÉ</Text>
        </View>

        {/* ========== LÉGENDE DES STATUTS ========== */}
        {gamme?.etapes_gamme && gamme.etapes_gamme.length > 0 && (
          <View style={{ 
            marginTop: 10, 
            marginBottom: 15, 
            padding: 10, 
            backgroundColor: '#f0f9ff', 
            border: '1pt solid #3b82f6',
            borderRadius: 3
          }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 8, color: '#1e40af' }}>
              LÉGENDE DES STATUTS
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {/* Conforme - Carré noir avec checkmark vert */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Svg width="16" height="16" viewBox="0 0 20 20">
                  {/* Carré avec 4 lignes */}
                  <Line x1="2" y1="2" x2="18" y2="2" stroke="black" strokeWidth="1" />
                  <Line x1="18" y1="2" x2="18" y2="18" stroke="black" strokeWidth="1" />
                  <Line x1="18" y1="18" x2="2" y2="18" stroke="black" strokeWidth="1" />
                  <Line x1="2" y1="18" x2="2" y2="2" stroke="black" strokeWidth="1" />
                  {/* Checkmark */}
                  <Line x1="6" y1="10" x2="8.5" y2="13" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
                  <Line x1="8.5" y1="13" x2="14" y2="7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
                </Svg>
                <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#16a34a' }}>Conforme</Text>
              </View>
              
              {/* Reporté - Carré noir avec tiret bleu */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Svg width="16" height="16" viewBox="0 0 20 20">
                  {/* Carré avec 4 lignes */}
                  <Line x1="2" y1="2" x2="18" y2="2" stroke="black" strokeWidth="1" />
                  <Line x1="18" y1="2" x2="18" y2="18" stroke="black" strokeWidth="1" />
                  <Line x1="18" y1="18" x2="2" y2="18" stroke="black" strokeWidth="1" />
                  <Line x1="2" y1="18" x2="2" y2="2" stroke="black" strokeWidth="1" />
                  {/* Tiret */}
                  <Line x1="6" y1="10" x2="14" y2="10" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                </Svg>
                <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#2563eb' }}>Reporté</Text>
              </View>
              
              {/* Action corrective - Carré noir avec X rouge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Svg width="16" height="16" viewBox="0 0 20 20">
                  {/* Carré avec 4 lignes */}
                  <Line x1="2" y1="2" x2="18" y2="2" stroke="black" strokeWidth="1" />
                  <Line x1="18" y1="2" x2="18" y2="18" stroke="black" strokeWidth="1" />
                  <Line x1="18" y1="18" x2="2" y2="18" stroke="black" strokeWidth="1" />
                  <Line x1="2" y1="18" x2="2" y2="2" stroke="black" strokeWidth="1" />
                  {/* X */}
                  <Line x1="7" y1="7" x2="13" y2="13" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
                  <Line x1="13" y1="7" x2="7" y2="13" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
                </Svg>
                <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#dc2626' }}>Action corrective</Text>
              </View>
            </View>
          </View>
        )}

        {/* ========== TABLEAU DES ÉTAPES ========== */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { textAlign: 'center', width: 25 }]}>N°</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, paddingLeft: 5 }]}>DESCRIPTION DE L'ACTIVITÉ</Text>
            <Text style={[styles.tableHeaderText, { textAlign: 'center', width: 40 }]}>DURÉE</Text>
            <Text style={[styles.tableHeaderText, { textAlign: 'center', width: 55 }]}>STATUT</Text>
          </View>

        {/* Lignes du tableau */}
        {gamme?.etapes_gamme?.sort((a, b) => a.ordre - b.ordre).map((etape, index) => {
          // Vérifier si l'étape est cochée et récupérer son statut
          let isChecked = false;
          let etapeCheckee: any = null;
          let statut = '';
          
          if (interventionValidee?.etapes_gamme_checkees) {
            const checkees = interventionValidee.etapes_gamme_checkees;
            
            if (Array.isArray(checkees) && checkees.length > 0) {
              // Cas 1: Tableau de strings (IDs) - ancien système
              if (typeof checkees[0] === 'string') {
                isChecked = checkees.includes(etape.id);
              }
              // Cas 2: Tableau d'objets - nouveau système avec statuts
              else if (typeof checkees[0] === 'object' && checkees[0] !== null) {
                etapeCheckee = checkees.find((e: any) => {
                  if (typeof e === 'string') return e === etape.id;
                  if (e.id) return e.id === etape.id;
                  if (e.etape_id) return e.etape_id === etape.id;
                  return false;
                });
                isChecked = !!etapeCheckee;
                statut = etapeCheckee?.statut || '';
              }
            }
          }
          
          let description = etape.description;
          if (etape.outil) description += `\n[Outil: ${etape.outil}]`;
          if (etape.consigne_securite) description += `\n[!] ${etape.consigne_securite}`;
          
          // Ajouter le commentaire du technicien si l'étape est cochée
          const hasComment = etapeCheckee?.commentaire && etapeCheckee.commentaire.trim() !== '';
          const hasImages = (etapeCheckee?.image_avant_urls?.length > 0) || (etapeCheckee?.image_apres_urls?.length > 0);

          return (
            <View key={etape.id} wrap={false}>
              <View style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
                <Text style={[styles.tableCell, { textAlign: 'center', width: 20, fontWeight: 'bold' }]}>
                  {(index + 1).toString().padStart(2, '0')}
                </Text>
                <Text style={[styles.tableCell, { flex: 1, paddingLeft: 5 }]}>{description}</Text>
                <Text style={[styles.tableCell, { textAlign: 'center', width: 35 }]}>
                  {etape.duree_estimee ? `${etape.duree_estimee}min` : '-'}
                </Text>
                <View style={{ width: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}>
                  {statut ? (
                    <View>
                      {/* Conforme - Carré noir avec checkmark vert */}
                      {statut === 'Conforme' && (
                        <Svg width="18" height="18" viewBox="0 0 20 20">
                          {/* Carré avec 4 lignes */}
                          <Line x1="2" y1="2" x2="18" y2="2" stroke="black" strokeWidth="1" />
                          <Line x1="18" y1="2" x2="18" y2="18" stroke="black" strokeWidth="1" />
                          <Line x1="18" y1="18" x2="2" y2="18" stroke="black" strokeWidth="1" />
                          <Line x1="2" y1="18" x2="2" y2="2" stroke="black" strokeWidth="1" />
                          {/* Checkmark */}
                          <Line x1="6" y1="10" x2="8.5" y2="13" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
                          <Line x1="8.5" y1="13" x2="14" y2="7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
                        </Svg>
                      )}
                      
                      {/* Reporté - Carré noir avec tiret bleu */}
                      {statut === 'Reporté/Replanification' && (
                        <Svg width="18" height="18" viewBox="0 0 20 20">
                          {/* Carré avec 4 lignes */}
                          <Line x1="2" y1="2" x2="18" y2="2" stroke="black" strokeWidth="1" />
                          <Line x1="18" y1="2" x2="18" y2="18" stroke="black" strokeWidth="1" />
                          <Line x1="18" y1="18" x2="2" y2="18" stroke="black" strokeWidth="1" />
                          <Line x1="2" y1="18" x2="2" y2="2" stroke="black" strokeWidth="1" />
                          {/* Tiret */}
                          <Line x1="6" y1="10" x2="14" y2="10" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                        </Svg>
                      )}
                      
                      {/* Action corrective - Carré noir avec X rouge */}
                      {statut === 'Action corrective requise' && (
                        <Svg width="18" height="18" viewBox="0 0 20 20">
                          {/* Carré avec 4 lignes */}
                          <Line x1="2" y1="2" x2="18" y2="2" stroke="black" strokeWidth="1" />
                          <Line x1="18" y1="2" x2="18" y2="18" stroke="black" strokeWidth="1" />
                          <Line x1="18" y1="18" x2="2" y2="18" stroke="black" strokeWidth="1" />
                          <Line x1="2" y1="18" x2="2" y2="2" stroke="black" strokeWidth="1" />
                          {/* X */}
                          <Line x1="7" y1="7" x2="13" y2="13" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
                          <Line x1="13" y1="7" x2="7" y2="13" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
                        </Svg>
                      )}
                    </View>
                  ) : (
                    <View style={styles.checkbox}>
                      {isChecked && (
                        <Svg width="8" height="8" viewBox="0 0 8 8">
                          <Line x1="1" y1="1" x2="7" y2="7" stroke="black" strokeWidth="1" />
                          <Line x1="7" y1="1" x2="1" y2="7" stroke="black" strokeWidth="1" />
                        </Svg>
                      )}
                    </View>
                  )}
                </View>
              </View>
              
              {/* Commentaire du technicien pour cette étape */}
              {hasComment && (
                <View style={{
                  backgroundColor: '#fffbeb',
                  padding: 5,
                  marginLeft: 25,
                  marginRight: 10,
                  marginTop: 2,
                  marginBottom: 2,
                  borderLeft: '2pt solid #f59e0b',
                  borderRadius: 1,
                }}>
                  <Text style={{ 
                    fontSize: 7, 
                    color: '#78716c', 
                    lineHeight: 1.5,
                    fontStyle: 'italic'
                  }}>
                    {etapeCheckee.commentaire}
                  </Text>
                </View>
              )}
              
              {/* Images avant/après pour cette étape */}
              {hasImages && (
                <View style={{
                  backgroundColor: '#f8fafc',
                  padding: 6,
                  marginLeft: 25,
                  marginRight: 10,
                  marginTop: 2,
                  marginBottom: 2,
                  border: '0.5pt solid #cbd5e1',
                  borderRadius: 2,
                }}>
                  {etapeCheckee.image_avant_urls?.length > 0 && (
                    <View>
                      <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#000000', marginBottom: 3 }}>
                        📷 Avant:
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                        {etapeCheckee.image_avant_urls.slice(0, 3).map((url: string, idx: number) => (
                          <View key={idx}>
                            <Image src={url} style={{ height: 55, maxWidth: 130, objectFit: 'contain', border: '0.5pt solid #cbd5e1' }} />
                            <Text style={{ fontSize: 5, color: '#64748b', marginTop: 1, textAlign: 'center' }}>
                              {idx + 1}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  
                  {etapeCheckee.image_apres_urls?.length > 0 && (
                    <View>
                      <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#000000', marginBottom: 3 }}>
                        📷 Après:
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                        {etapeCheckee.image_apres_urls.slice(0, 3).map((url: string, idx: number) => (
                          <View key={idx}>
                            <Image src={url} style={{ height: 55, maxWidth: 130, objectFit: 'contain', border: '0.5pt solid #cbd5e1' }} />
                            <Text style={{ fontSize: 5, color: '#64748b', marginTop: 1, textAlign: 'center' }}>
                              {idx + 1}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
        </View>

        {/* Observations */}
        {(ordre.observations || interventionValidee?.commentaire) && (
          <View style={styles.observationsBox}>
            <Text style={styles.observationsTitle}>OBSERVATIONS:</Text>
            {ordre.observations && (
              <Text style={styles.observationsText}>{ordre.observations}</Text>
            )}
            {interventionValidee?.commentaire && (
              <>
                {ordre.observations && (
                  <View style={{ height: 3 }} />
                )}
                <Text style={[styles.observationsText, { fontStyle: 'italic', color: '#78716c' }]}>
                  {interventionValidee.commentaire}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Compte-rendu intervention - RÉORGANISÉ ET AMÉLIORÉ */}
        {interventionValidee && (
          <View>
            {/* En-tête principal */}
            <View style={styles.interventionMainHeader}>
              <Text style={styles.interventionMainHeaderText}>
                ✓ COMPTE-RENDU D'INTERVENTION VALIDÉE
              </Text>
            </View>

            {/* Résumé de l'intervention */}
            <View style={styles.interventionSummaryBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {/* Colonne gauche */}
                <View style={{ width: '48%' }}>
                  <View style={styles.interventionDetailRow}>
                    <Text style={styles.interventionDetailLabel}>Technicien:</Text>
                    <Text style={styles.interventionDetailValue}>
                      {interventionValidee.technicien?.nom || 'N/A'}
                    </Text>
                  </View>
                  
                  {interventionValidee.date_debut && (
                    <View style={styles.interventionDetailRow}>
                      <Text style={styles.interventionDetailLabel}>Début:</Text>
                      <Text style={styles.interventionDetailValue}>
                        {formatDateTime(interventionValidee.date_debut)}
                      </Text>
                    </View>
                  )}
                  
                  {interventionValidee.date_fin && (
                    <View style={styles.interventionDetailRow}>
                      <Text style={styles.interventionDetailLabel}>Fin:</Text>
                      <Text style={styles.interventionDetailValue}>
                        {formatDateTime(interventionValidee.date_fin)}
                      </Text>
                    </View>
                  )}
                  
                  {interventionValidee.duree_minutes && (
                    <View style={styles.interventionDetailRow}>
                      <Text style={styles.interventionDetailLabel}>Durée totale:</Text>
                      <Text style={[styles.interventionDetailValue, { fontWeight: 'bold' }]}>
                        {Math.floor(interventionValidee.duree_minutes / 60)}h {interventionValidee.duree_minutes % 60}min
                      </Text>
                    </View>
                  )}
                </View>

                {/* Colonne droite */}
                <View style={{ width: '48%' }}>
                  {interventionValidee.resultat && (
                    <View style={styles.interventionDetailRow}>
                      <Text style={styles.interventionDetailLabel}>Résultat:</Text>
                      <View style={[styles.badge, getBadgeStyle(interventionValidee.resultat)]}>
                        <Text>{interventionValidee.resultat.toUpperCase()}</Text>
                      </View>
                    </View>
                  )}
                  
                  {interventionValidee.etat_machine_apres && (
                    <View style={styles.interventionDetailRow}>
                      <Text style={styles.interventionDetailLabel}>État machine:</Text>
                      <Text style={[styles.interventionDetailValue, { fontWeight: 'bold' }]}>
                        {interventionValidee.etat_machine_apres}
                      </Text>
                    </View>
                  )}
                  
                  {interventionValidee.validateur && interventionValidee.valide_le && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.interventionDetailRow}>
                        <Text style={[styles.interventionDetailLabel, { fontSize: 7 }]}>Validé par:</Text>
                        <Text style={[styles.interventionDetailValue, { fontSize: 7 }]}>
                          {interventionValidee.validateur.nom}
                        </Text>
                      </View>
                      <View style={styles.interventionDetailRow}>
                        <Text style={[styles.interventionDetailLabel, { fontSize: 7 }]}>Le:</Text>
                        <Text style={[styles.interventionDetailValue, { fontSize: 7 }]}>
                          {formatDate(interventionValidee.valide_le)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Commentaire du technicien */}
            {interventionValidee.commentaire && (
              <View style={styles.observationsBox}>
                <Text style={styles.observationsTitle}>COMMENTAIRE DU TECHNICIEN</Text>
                <Text style={styles.observationsText}>{interventionValidee.commentaire}</Text>
              </View>
            )}

            {/* Actions réalisées */}
            {interventionValidee.actions_realisees && (
              <View>
                <View style={styles.sectionHeaderBlue}>
                  <Text style={styles.sectionHeaderText}>ACTIONS RÉALISÉES</Text>
                </View>
                <Text style={styles.sectionContent}>{interventionValidee.actions_realisees}</Text>
              </View>
            )}

            {/* Pièces remplacées */}
            {interventionValidee.pieces_remplacees && interventionValidee.pieces_remplacees.length > 0 && (
              <View>
                <View style={styles.sectionHeaderViolet}>
                  <Text style={styles.sectionHeaderText}>
                    PIÈCES REMPLACÉES ({interventionValidee.pieces_remplacees.length})
                  </Text>
                </View>
                <View style={styles.sectionContent}>
                  {interventionValidee.pieces_remplacees.map((piece: any, idx: number) => (
                    <View key={idx} style={styles.pieceItem}>
                      <Text style={styles.pieceNumber}>{idx + 1}.</Text>
                      <Text style={styles.pieceDetails}>
                        {piece.nom || piece.reference || 'Pièce non spécifiée'}
                        {piece.reference && piece.nom && ` (Réf: ${piece.reference})`}
                      </Text>
                      <Text style={styles.pieceQuantity}>
                        Qté: {piece.quantite || 1}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Photos de l'intervention */}
            {(interventionValidee.image_avant_urls?.length > 0 || interventionValidee.image_apres_urls?.length > 0) && (
              <View>
                <View style={styles.sectionHeaderOrange}>
                  <Text style={styles.sectionHeaderText}>PHOTOS DE L'INTERVENTION</Text>
                </View>
                <View style={styles.imagesSection}>
                  {/* Images AVANT */}
                  {interventionValidee.image_avant_urls?.length > 0 && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={styles.imageLabel}>AVANT ({interventionValidee.image_avant_urls.length} photo{interventionValidee.image_avant_urls.length > 1 ? 's' : ''}):</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {interventionValidee.image_avant_urls.map((url: string, idx: number) => (
                          <View key={idx} style={{ marginBottom: 4, marginRight: 4, alignItems: 'center' }}>
                            <Image 
                              src={url} 
                              style={{ 
                                height: 120, 
                                maxWidth: 300,
                                objectFit: 'contain',
                                border: '0.5pt solid #cbd5e1',
                                borderRadius: 2
                              }} 
                            />
                            <Text style={[styles.imageCaption, { marginTop: 2, textAlign: 'center', fontSize: 6 }]}>
                              Photo {idx + 1}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  
                  {/* Images APRÈS */}
                  {interventionValidee.image_apres_urls?.length > 0 && (
                    <View>
                      <Text style={styles.imageLabel}>APRÈS ({interventionValidee.image_apres_urls.length} photo{interventionValidee.image_apres_urls.length > 1 ? 's' : ''}):</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {interventionValidee.image_apres_urls.map((url: string, idx: number) => (
                          <View key={idx} style={{ marginBottom: 4, marginRight: 4, alignItems: 'center' }}>
                            <Image 
                              src={url} 
                              style={{ 
                                height: 120, 
                                maxWidth: 300,
                                objectFit: 'contain',
                                border: '0.5pt solid #cbd5e1',
                                borderRadius: 2
                              }} 
                            />
                            <Text style={[styles.imageCaption, { marginTop: 2, textAlign: 'center', fontSize: 6 }]}>
                              Photo {idx + 1}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ========== SIGNATURES ========== */}
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

        {/* ========== FOOTER ========== */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Document généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export const generateOTPdfReact = async (
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
    const blob = await pdf(<OTPdfDocument ordre={ordre} qrCodeDataUrl={qrCodeDataUrl} />).toBlob();
    
    if (options.download !== false) {
      const fileName = `OT_${ordre.numot}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
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
