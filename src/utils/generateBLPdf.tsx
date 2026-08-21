import { Document, Page, Text, View, StyleSheet, Image, pdf, Font } from '@react-pdf/renderer';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DevisTheme } from '../types/DevisTheme';
import { defaultTheme } from './generateDeviPDF';

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

// Fonction pour récupérer le thème depuis Supabase
export const fetchBLTheme = async (): Promise<DevisTheme> => {
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
    paddingBottom: 100,
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
  blInfo: {
    fontSize: 11,
    textAlign: 'right',
  },
  blNumber: {
    fontWeight: 'bold',
    color: theme.header.devisNumber,
    fontSize: 11,
  },
  boxesContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
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
  table: {
    marginTop: 0,
    border: `2px solid ${theme.table.border}`,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.table.headerBackground,
    fontWeight: 'bold',
    color: theme.table.headerText,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 4,
  },
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: theme.table.rowAltBackground,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 4,
  },
  tableCell: {
    fontSize: 9,
    padding: 8,
  },
  tableCellHeader: {
    fontSize: 9,
    padding: 8,
    fontWeight: 'bold',
  },
  tableCellLast: {
    fontSize: 9,
    padding: 8,
  },
  col1: { width: '18%' },
  col2: { width: '82%' },
  col3: { width: '12%', textAlign: 'center' },
  infoRow: {
    backgroundColor: theme.table.headerBackground,
    color: theme.table.headerText,
    padding: 8,
    borderRadius: 4,
    marginBottom: 15,
    fontWeight: 'bold',
  },
  siteInfoBox: {},
  tableFooter: {
    paddingTop: 0,
    paddingBottom: 20,
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 10,
  },
  signatureSection: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  signatureBox: {
    flex: 1,
    border: `2px solid ${theme.boxes.border}`,
    borderRadius: 6,
    padding: 8,
    backgroundColor: theme.boxes.background,
    minHeight: 120,
    maxHeight: 120,
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
  reserveBox: {
    border: `1.5px solid ${theme.boxes.border}`,
    borderRadius: 4,
    padding: 8,
    minHeight: 70,
    backgroundColor: theme.boxes.background,
    marginTop: 8,
  },
  reserveLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.boxes.titleText,
    marginBottom: 8,
  },
  totalRow: {
    backgroundColor: theme.table.headerBackground,
    color: theme.table.headerText,
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
    color: theme.footer.text,
  },
});

export interface LigneBL {
  reference?: string;
  designation: string;
  quantite: number;
  type?: string;
}

export interface BonLivraison {
  id: string;
  num_bl: string;
  date_bl: string;
  numero_commande?: string;
  client?: {
    site?: string;
    telephone?: string;
    ice?: string;
    adresse?: string;
    nom?: string;
  };
  contact?: string;
  emetteur?: {
    fax: string;
    nom?: string;
    telephone?: string;
    portable?: string;
    email?: string;
  };
  site?: string;
  designation?: string;
  chantier?: string;
  bc_numero?: string;
  lignes?: LigneBL[];
  reserve?: string;
  main_oeuvre_total?: number;
}

interface BLPDFProps {
  bl: BonLivraison;
  theme?: DevisTheme;
}

const BonLivraisonPDFDocument = ({ bl, theme = defaultTheme }: BLPDFProps) => {
  const styles = createStyles(theme);

  const dateStr = bl.date_bl
    ? new Date(bl.date_bl).toLocaleDateString("fr-FR")
    : new Date().toLocaleDateString("fr-FR");

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header avec logo et numéro de BL */}
        <View style={styles.header}>
          <Image src="/FSGlogo.png" style={styles.logo} />
          <View style={styles.blInfo}>
            <Text>Bon de Livraison N°</Text>
            <Text style={styles.blNumber}>{bl.id} </Text>
            <Text style={{ fontSize: 8, marginTop: 4, color: '#666' }}>Date de devis: {dateStr}</Text>
          </View>
        </View>

        {/* Boîtes Destinataire et Expéditeur */}
        <View style={styles.boxesContainer}>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>DESTINATAIRE</Text>
            <View style={styles.boxContent}>
              {bl.client?.site && (
                <Text style={styles.bold}>Société : {bl.client.nom}</Text>
              )}
              {bl.contact && <Text>Contact : {bl.contact}</Text>}
              {bl.client?.telephone && <Text>Tél : {bl.client.telephone}</Text>}
              {bl.client?.ice && <Text>ICE : {bl.client.ice}</Text>}
              {bl?.numero_commande && <Text>Commande N° : {bl.numero_commande}</Text>}
              {bl.client?.adresse && <Text>Adresse : {bl.client.adresse}</Text>}
            </View>
          </View>

          <View style={styles.box}>
            <Text style={styles.boxTitle}>EXPÉDITEUR</Text>
            <View style={styles.boxContent}>
              {bl.emetteur?.nom && <Text>Émis par : {bl.emetteur.nom}</Text>}
              {bl.emetteur?.portable && <Text>Tél Mobile : {bl.emetteur.portable}</Text>}
              {bl.emetteur?.telephone && <Text>Tél Fixe : {bl.emetteur.telephone}</Text>}
              {bl.emetteur?.email && <Text>Email : {bl.emetteur.email}</Text>}
            </View>
          </View>
        </View>

        {/* Tableau */}
        <View style={styles.table}>
          {/* En-tête du tableau */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, styles.col1]}>RÉFÉRENCE</Text>
            {/* col2 contient désignation + quantité pour aligner avec les lignes */}
            <View style={[styles.col2, { flexDirection: 'row' }]}>
              <Text style={[styles.tableCellHeader, { flex: 1 }]}>DÉSIGNATION:{bl.designation ? bl.designation : ''}</Text>
              <Text style={[styles.tableCellHeader, { width: '14.6%', textAlign: 'center' }]}>QUANTITÉ</Text>
            </View>
          </View>

          {/* Informations Site et Chantier */}
          <View style={[styles.tableRow, { backgroundColor: theme.table.rowAltBackground }]}>
            <View style={[styles.tableCell, styles.col1]}>
              <View style={styles.siteInfoBox}>
                <Text style={{ fontSize: 8, fontWeight: 'bold', color: theme.boxes.titleText, marginBottom: 4 }}>
                  Site :
                </Text>
                <Text style={{ fontSize: 8 }}>{bl.client?.site || 'N/A'}</Text>
                <Text style={{ fontSize: 8, fontWeight: 'bold', color: theme.boxes.titleText, marginTop: 8, marginBottom: 4 }}>
                  Code Chantier :
                </Text>
                <Text style={{ fontSize: 8 }}>{bl.chantier || 'N/A'}</Text>
              </View>
            </View>

            {/* Colonne Désignations + Quantités — une row par ligne */}
            <View style={[styles.col2, { padding: 0, flexDirection: 'column' }]}>
              {(bl.lignes || []).map((ligne, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    backgroundColor: index % 2 === 0 ? '#FFFFFF' : theme.table.rowAltBackground,
                  }}
                >
                  {/* Désignation */}
                  <View style={{ flex: 1, padding: 8 }}>
                    <Text style={{ fontSize: 9 }}>{ligne.designation}</Text>
                  </View>
                  {/* Quantité — même hauteur automatique */}
                  <View style={{ width: '14.6%', padding: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{ligne.quantite}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Total Main d'oeuvre */}
          <View style={[styles.tableRow, styles.totalRow]}>
            <Text style={[styles.tableCell, styles.col1]}></Text>
            <View style={[styles.col2, { flexDirection: 'row' }]}>
              <Text style={[styles.tableCell, { flex: 1 }]}></Text>
              <Text style={[styles.tableCellLast, { width: '14.6%' }]}></Text>
            </View>
          </View>
        </View>

        {/* Section Pied de page avec signatures et réserve */}
        <View style={styles.tableFooter}>
          {/* Réserve */}
          <View style={{ marginTop: 15 }}>
            <Text style={styles.reserveLabel}>RÉSERVE :</Text>
            <View style={styles.reserveBox}>
              <Text style={{ fontSize: 9, color: '#666' }}>
                {bl.reserve || ''}
              </Text>
            </View>
          </View>

          {/* Signatures */}
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>FSG - CACHET ET SIGNATURE</Text>
              <Text style={styles.signatureText}>Nom et signature</Text>
            </View>

            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>CLIENT - SIGNATURE</Text>
              <Text style={styles.signatureText}>
                Nom et signature :{'\n'}
                Date réception : 
              </Text>
            </View>
          </View>
        </View>

        {/* Footer fixe */}
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

// Fonction pour générer et télécharger le PDF avec thème
export const handleGenerateBL = async (bl: BonLivraison) => {
  // Récupérer le thème avant de générer le PDF
  const theme = await fetchBLTheme();
  
  const blob = await pdf(<BonLivraisonPDFDocument bl={bl} theme={theme} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `BL_${bl.num_bl || "export"}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

// Hook personnalisé pour utiliser le thème dans un composant React
export const useBLTheme = () => {
  const [theme, setTheme] = useState<DevisTheme>(defaultTheme);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      const fetchedTheme = await fetchBLTheme();
      setTheme(fetchedTheme);
      setLoading(false);
    };
    loadTheme();
  }, []);

  return { theme, loading };
};

// Composant de prévisualisation qui charge le thème
export const BLPDFPreview = ({ bl }: { bl: BonLivraison }) => {
  const { theme, loading } = useBLTheme();

  if (loading) {
    return null; // ou un loader
  }

  return <BonLivraisonPDFDocument bl={bl} theme={theme} />;
};