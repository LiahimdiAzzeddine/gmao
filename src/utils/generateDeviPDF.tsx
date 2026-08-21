import { Document, Page, Text, View, StyleSheet, Image, pdf, Font } from '@react-pdf/renderer';
import { Devis } from '../types/devis';
import { DevisTheme } from '../types/DevisTheme';
import { supabase } from '../lib/supabase';

// Enregistrer les polices Bahij pour react-pdf
Font.register({
  family: 'BahijTheSansArabic',
  fonts: [
    { src: '/fonts/Bahij_TheSansArabic-Light.ttf', fontWeight: 300 },
    { src: '/fonts/Bahij_TheSansArabic-SemiLight.ttf', fontWeight: 350 },
    { src: '/fonts/Bahij_TheSansArabic-Plain.ttf', fontWeight: 400 },
    { src: '/fonts/Bahij_TheSansArabic-Plain.ttf', fontWeight: 400, fontStyle: 'italic' }, // Utiliser Plain pour italic
    { src: '/fonts/Bahij_TheSansArabic-SemiBold.ttf', fontWeight: 600 },
    { src: '/fonts/Bahij_TheSansArabic-Bold.ttf', fontWeight: 700 },
    { src: '/fonts/Bahij_TheSansArabic-Bold.ttf', fontWeight: 700, fontStyle: 'italic' }, // Utiliser Bold pour bold italic
    { src: '/fonts/Bahij_TheSansArabic-ExtraBold.ttf', fontWeight: 800 },
  ]
});

const TVA_RATE = 0.20;

export function formatPrice(value: number) {
  if(value == 0){
    return '-'
  } else {
    return value.toFixed(2);
  }
}

// Thème par défaut (fallback)
export const defaultTheme: DevisTheme = {
  header: {
    borderBottom: "#f97316",
    devisNumber: "#f97316"
  },
  boxes: {
    background: "#FFFBF7",
    border: "#f97316",
    titleText: "#f97316"
  },
  table: {
    headerBackground: "#f97316",
    headerText: "#FFFFFF",
    rowAltBackground: "#FFF7F0",
    border: "#f97316"
  },
  summary: {
    htBackground: "#FFF7F0",
    tvaBackground: "#FFF7F0",
    totalBackground: "#f97316",
    totalText: "#FFFFFF"
  },
  footer: {
    borderTop: "#f97316",
    text: "#000000"
  }
};

// Fonction pour récupérer le thème depuis Supabase
export const fetchDevisTheme = async (): Promise<DevisTheme> => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('data')
      .eq('id', 'ca3c2d25-ebd3-4bfd-81dc-b9a9ec656b96')
      .single();

    if (error) {
      console.error('Erreur lors de la récupération du thème:', error);
      return defaultTheme;
    }

    if (!data?.data) {
      console.warn('Aucun thème trouvé, utilisation du thème par défaut');
      return defaultTheme;
    }

    return data.data as DevisTheme;
  } catch (err) {
    console.error('Erreur lors du chargement du thème:', err);
    return defaultTheme;
  }
};

// Fonction pour créer les styles dynamiques basés sur le thème
const createStyles = (theme: DevisTheme) => StyleSheet.create({
  page: {
    padding: 30,
    paddingBottom: 80,
    fontSize: 10,
    fontFamily: 'BahijTheSansArabic',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottom: `2px solid ${theme.header.borderBottom}`,
  },
  logo: {
    width: 100,
    height: 37,
  },
  devisInfo: {
    fontSize: 11,
    textAlign: 'right',
  },
  devisNumber: {
    fontWeight: 'bold',
    color: theme.header.devisNumber,
    fontSize: 11,
  },
  boxesContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
    wrap: false,
  },
  box: {
    flex: 1,
    border: `1.5px solid ${theme.boxes.border}`,
    padding: 8,
    borderRadius: 6,
    backgroundColor: theme.boxes.background,
  },
  boxTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.boxes.titleText,
    borderBottom: `1.2px solid ${theme.boxes.border}`,
    paddingBottom: 4,
  },
  boxContent: {
    fontSize: 9,
    lineHeight: 1.4,
  },
  bold: {
    fontWeight: 'bold',
  },
  tableContainer: {
    marginTop: 10,
  },
  table: {
    border: `2px solid ${theme.table.border}`,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableNoBorder: {
    borderTop: 'none',
    borderRadius: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.table.headerBackground,
    fontWeight: 'bold',
    color: theme.table.headerText,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #E5E7EB',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1px solid #E5E7EB',
    backgroundColor: theme.table.rowAltBackground,
  },
  tableCell: {
    fontSize: 9,
    padding: 8,
  },
  tableCellHeader: {
    fontSize: 9,
    padding: 6,
    fontWeight: 'bold',
  },
  tableCellLast: {
    fontSize: 9,
    padding: 8,
  },
  col1: { width: '62%' },
  col2: { width: '5%', textAlign: 'center' },
  col3: { width: '8%', textAlign: 'center' },
  col4: { width: '12%', textAlign: 'right' },
  col5: { width: '13%', textAlign: 'right' },
  footerSection: {
    marginTop: 20,
  },
  validityNote: {
    fontSize: 9,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
    backgroundColor: theme.summary.htBackground,
    padding: 8,
    borderRadius: 4,
    borderLeft: `3px solid ${theme.boxes.border}`,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  footerLeft: {
    flex: 1,
  },
  signatureBox: {
    border: `2px solid ${theme.boxes.border}`,
    borderRadius: 6,
    padding: 8,
    backgroundColor: theme.boxes.background,
    minHeight: 108,
    maxHeight: 108,
  },
  signatureTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.boxes.titleText,
    marginBottom: 6,
  },
  signatureText: {
    fontSize: 8,
    color: '#666',
    fontStyle: 'italic',
  },
  footerRight: {
    width: '230px',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  footerRightHT: {
    backgroundColor: theme.summary.htBackground,
    border: `2px solid ${theme.boxes.border}`,
  },
  footerRightTVA: {
    backgroundColor: theme.summary.tvaBackground,
    border: `2px solid ${theme.boxes.border}`,
  },
  totalRow: {
    backgroundColor: theme.summary.totalBackground,
    color: theme.summary.totalText,
    border: `2px solid ${theme.summary.totalBackground}`,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 30,
    right: 30,
    fontSize: 7,
    textAlign: 'left',
    borderTop: `2px solid ${theme.footer.borderTop}`,
    paddingTop: 8,
    color: theme.footer.text,
  },
  footerBold: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 3,
    color: theme.boxes.titleText,
  },
  infoRow: {
    backgroundColor: theme.table.headerBackground,
    color: theme.table.headerText,
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  continuationText: {
    fontSize: 8,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'right',
    marginTop: 5,
    marginBottom: 10,
  },
});

interface DevisPDFProps {
  devis: Devis;
  afficherTTC?: boolean;
  theme?: DevisTheme;
}

export const DevisPDFDocument = ({ devis, afficherTTC = false, theme = defaultTheme }: DevisPDFProps) => {
  const styles = createStyles(theme);

  const dateStr = devis.date_devis
    ? new Date(devis.date_devis).toLocaleDateString("fr-FR")
    : new Date().toLocaleDateString("fr-FR");

  const totalHT =
    devis.lignes?.reduce((total, ligne) => {
      const quantite = ligne.quantite || 0;
      const prix = ligne.prix || 0;

      if (ligne.type === 'materiel') {
        return total + quantite * prix * Number(devis.kg_mat);
      } else {
        return total + quantite * prix * Number(devis.kg_mo);
      }
    }, 0) || 0;

  const tva = totalHT * TVA_RATE;
  const totalTTC = totalHT + tva;

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header fixe */}
        <View style={styles.header} fixed>
          <Image src="/FSGlogo.png" style={styles.logo} />
          <View style={styles.devisInfo}>
            <Text>Devis N°</Text>
            <Text style={styles.devisNumber}>{devis.num_devis || ""}</Text>
            <Text style={{ fontSize: 8, marginTop: 4, color: '#666' }}>{dateStr}</Text>
          </View>
        </View>

        {/* Bloc 1 : Boîtes - Ne se divise jamais */}
        <View style={styles.boxesContainer}>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>DESTINATAIRE</Text>
            <View style={styles.boxContent}>
              {devis.clients_devis?.client && (
                <Text style={styles.bold}>
                  Société : {devis.clients_devis.client || 'N/A'}
                </Text>
              )}
              {devis.contact && (
                <Text>Contact : {devis.contact.nom}</Text>
              )}
              {devis.contact?.tel && <Text>Tél : {devis.contact.tel}</Text>}
              {devis.clients_devis?.ice && <Text>ICE : {devis.clients_devis.ice}</Text>}
              {devis.contact?.email && <Text>Email : {devis.contact.email}</Text>}
              {devis.contact?.adresse && (
                <Text>Adresse : {devis.contact.adresse}</Text>
              )}
            </View>
          </View>

          <View style={styles.box}>
            <Text style={styles.boxTitle}>EXPÉDITEUR</Text>
            <View style={styles.boxContent}>
              <Text style={styles.bold}>FACILITY SOLUTION GROUP</Text>
              {devis.emetteur?.nom && <Text>Émis par : {devis.emetteur.nom}</Text>}
              {devis.emetteur?.telephone && <Text>Tél : {devis.emetteur.telephone}</Text>}
              {devis.emetteur?.adresse && <Text>Adresse : {devis.emetteur.adresse}</Text>}
              {devis.emetteur?.email && <Text>Email : {devis.emetteur.email}</Text>}
            </View>
          </View>
        </View>

        {/* Bloc 2 : Informations du projet */}
        {devis.designation && (
          <View style={styles.infoRow}>
            <Text>DÉSIGNATION : {devis.designation}</Text>
          </View>
        )}

        {/* Bloc 3 : Tableau avec header répété automatiquement */}
        <View style={styles.tableContainer}>
          <View style={styles.table}>
            {/* En-tête du tableau (se répète automatiquement sur chaque page) */}
            <View style={styles.tableHeader} fixed>
              <Text style={[styles.tableCellHeader, styles.col1]}>DÉSIGNATION</Text>
              <Text style={[styles.tableCellHeader, styles.col2]}>QTÉ</Text>
              <Text style={[styles.tableCellHeader, styles.col3]}>UNITÉ</Text>
              <Text style={[styles.tableCellHeader, styles.col4]}>P.UNIT HT</Text>
              <Text style={[styles.tableCellHeader, styles.col5]}>TOTAL HT</Text>
            </View>

            {/* Lignes du tableau - se divisent naturellement */}
            {devis.lignes?.map((ligne, index) => {
              let prixHT = 0;
              if (ligne.type === 'materiel') {
                prixHT = Number(ligne.prix) * Number(devis.kg_mat);
              } else {
                prixHT = Number(ligne.prix) * Number(devis.kg_mo);
              }
              const quantite = ligne.quantite || 0;
              const totalLigneHT = quantite * prixHT;

              return (
                <View 
                  key={index} 
                  style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <Text style={[styles.tableCell, styles.col1]}>
                    {ligne.materiel || ""}
                  </Text>
                  <Text style={[styles.tableCell, styles.col2]}>{quantite == 0 ? '-' : quantite}</Text>
                  <Text style={[styles.tableCell, styles.col3]}>
                    {ligne.unite || "Un"}
                  </Text>
                  <Text style={[styles.tableCell, styles.col4]}>
                    {formatPrice(prixHT)}
                  </Text>
                  <Text style={[styles.tableCellLast, styles.col5]}>
                    {formatPrice(totalLigneHT)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Bloc 4 : Footer avec totaux - wrap={false} pour éviter la division */}
        <View style={styles.footerSection} wrap={false}>
          {devis.validity_notes && devis.validity_notes.length > 0 && (
            <Text style={styles.validityNote}>
              {'- ' + devis.validity_notes.map(note => note.contenu).join('\n - ')}
            </Text>
          )}

          <View style={styles.footerRow}>
            {/* Zone de signature */}
            <View style={styles.footerLeft}>
              <View style={styles.signatureBox}>
                <Text style={styles.signatureTitle}>CACHET ET SIGNATURE</Text>
                <Text style={styles.signatureText}>
                  Le {dateStr}
                </Text>
              </View>
            </View>

            {/* Totaux */}
            <View style={styles.footerRight}>
              <View style={[styles.summaryRow, styles.footerRightHT]}>
                <Text style={styles.bold}>Total HT</Text>
                <Text style={styles.bold}>{formatPrice(totalHT)} {devis.monetaire?.symbol || 'Dhs'}</Text>
              </View>

              {afficherTTC && (
                <>
                  <View style={[styles.summaryRow, styles.footerRightTVA]}>
                    <Text style={styles.bold}>TVA (20%)</Text>
                    <Text style={styles.bold}>{formatPrice(tva)} {devis.monetaire?.symbol || 'Dhs'}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.bold}>NET À PAYER</Text>
                    <Text style={styles.bold}>{formatPrice(totalTTC)} {devis.monetaire?.symbol || 'Dhs'}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Footer fixe sur toutes les pages */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerBold}>
            FACILITY SOLUTION GROUP SARL | Lighting › Electrical › Energy › Air conditioner › Cold
          </Text>
          <Text>
            Capital de 10,000 Dhs · RC N° 128813 · Patente N° 50414241 · Id fiscale N° 52551610 · CNSS N° 4383786 · ICE 003110444000030
          </Text>
          <Text>
            Siège social : 29 Rue AMR IBN ASS N26 Tanger MA · RIB IBAN MA64 164 640 212115397093000 1 83 · SWIFT BCPOMAMC
          </Text>
          <Text style={{ marginTop: 3, fontSize: 6, color: '#999' }}>
            Document généré le {today}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export const handleGeneratePDF = async (devis: Devis, afficherTTC: boolean = true) => {
  // Récupérer le thème avant de générer le PDF
  const theme = await fetchDevisTheme();
  
  const blob = await pdf(<DevisPDFDocument devis={devis} afficherTTC={afficherTTC} theme={theme} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `devis_${devis.num_devis || "export"}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

// Hook personnalisé pour utiliser le thème dans un composant React
import { useState, useEffect } from 'react';

export const useDevisTheme = () => {
  const [theme, setTheme] = useState<DevisTheme>(defaultTheme);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      const fetchedTheme = await fetchDevisTheme();
      setTheme(fetchedTheme);
      setLoading(false);
    };
    loadTheme();
  }, []);

  return { theme, loading };
};

// Composant de prévisualisation qui charge le thème
export const DevisPDFPreview = ({ devis, afficherTTC = true }: DevisPDFProps) => {
  const { theme, loading } = useDevisTheme();

  if (loading) {
    return null; // ou un loader
  }

  return <DevisPDFDocument devis={devis} afficherTTC={afficherTTC} theme={theme} />;
};
