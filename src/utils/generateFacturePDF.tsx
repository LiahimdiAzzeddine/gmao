import { Document, Page, Text, View, StyleSheet, Image, pdf, Font } from '@react-pdf/renderer';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Contact } from '../types/devis';
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

const TVA_RATE = 0.20;

// Fonction pour récupérer le thème depuis Supabase
export const fetchFactureTheme = async (): Promise<DevisTheme> => {
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
  factureInfo: {
    fontSize: 11,
    textAlign: 'right',
  },
  factureNumber: {
    fontWeight: 'bold',
    color: theme.header.devisNumber,
    fontSize: 11,
  },
  boxesContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
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
  colRef: { width: '11%' },
  colDesign: { width: '61%' },
  colQty: { width: '5%', textAlign: 'center' },
  colPrixUnit: { width: '11%', textAlign: 'right' },
  colTotal: { width: '12%', textAlign: 'right' },
  tableFooter: {
    paddingTop: 15,
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
    flex: 1,
  },
  signatureBox: {
    border: `2px solid ${theme.boxes.border}`,
    borderRadius: 6,
    padding: 8,
    backgroundColor: theme.boxes.background,
    minHeight: 100,
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
  totalsSection: {
    flex: 1,
    border: `1.5px solid ${theme.boxes.border}`,
    borderRadius: 6,
    padding: 8,
    backgroundColor: theme.boxes.background,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
    fontSize: 9,
  },
  totalRowBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    fontSize: 10,
    fontWeight: 'bold',
    paddingTop: 5,
    borderTop: `1px solid ${theme.boxes.border}`,
    color: theme.boxes.titleText,
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

export interface LigneFacture {
  designation: string;
  quantite: number;
  prix_unit: number;
  type?: 'materiel' | 'main d\'oeuvre';
}

export interface Facture {
  ref_cc: string;
  designation: string;
  num_facture: string;
  date_facture: string;
  date_echeance?: string;
  kg_mat: number;
  kg_mo: number;
  adresse_facturation?: string;
  monetaire?:any;
  client?: {
    nom?: string;
    site?: string;
    ice?: string;
    adresse?: string;
    numero_fournisseur?: string;
  };
  contact?: Contact;
  telephone?: string;
  commande_numero?: string;
  payment_mode?: string;
  lignes?: LigneFacture[];
}

interface FacturePDFProps {
  facture: Facture;
  afficherTTC?: boolean;
  theme?: DevisTheme;
}

const FacturePDFDocument = ({ facture, afficherTTC = false, theme = defaultTheme }: FacturePDFProps) => {
  const styles = createStyles(theme);

  const dateFacture = facture.date_facture
    ? new Date(facture.date_facture).toLocaleDateString("fr-FR")
    : new Date().toLocaleDateString("fr-FR");

  const dateEcheance = facture.date_echeance
    ? new Date(facture.date_echeance).toLocaleDateString("fr-FR")
    : "";

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const totalHT = facture.lignes?.reduce((acc, l) => {
    let porceHT = 0;

    if (l.type === 'materiel') {
      porceHT = Number(facture.kg_mat);
    } else {
      porceHT = Number(facture.kg_mo);
    }

    return acc + ((l.quantite || 0) * (l.prix_unit || 0) * porceHT);
  }, 0) || 0;

  const tva = totalHT * TVA_RATE;
  const totalTTC = totalHT + tva;

  const getPrixUnitaire = (ligne: LigneFacture) => {
    let porceHT = 0;
    if (ligne.type === 'materiel') {
      porceHT = Number(facture.kg_mat);
    } else {
      porceHT = Number(facture.kg_mo);
    }
    const prixHT = ligne.prix_unit * porceHT || 0;
    return prixHT;
  };

  const getPrixTotal = (ligne: LigneFacture) => {
    const quantite = ligne.quantite || 0;
    const prixUnit = getPrixUnitaire(ligne);
    return quantite * prixUnit;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header avec logo et numéro de facture */}
        <View style={styles.header}>
          <Image src="/FSGlogo.png" style={styles.logo} />
          <View style={styles.factureInfo}>
            <Text>Facture N°</Text>
            <Text style={styles.factureNumber}>{facture.num_facture}</Text>
          </View>
        </View>

        {/* Boîtes Client et Informations de facturation */}
        <View style={styles.boxesContainer}>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>CLIENT</Text>
            <View style={styles.boxContent}>
              {facture.client?.nom && (
                <Text style={styles.bold}>Société : {facture.client.nom}</Text>
              )}
              {facture.client?.ice && <Text>ICE : {facture.client.ice}</Text>}
              {facture.client?.adresse && <Text>Adresse : {facture.client.adresse}</Text>}
              {facture?.adresse_facturation && <Text>Adresse facturation : {facture.adresse_facturation}</Text>}
              {facture.contact && (
                <>
                  <Text>Contact : {facture.contact.nom}</Text>
                  {facture.contact.tel && <Text>Tél : {facture.contact.tel}</Text>}
                </>
              )}
            </View>
          </View>

          <View style={styles.box}>
            <Text style={styles.boxTitle}>INFORMATIONS FACTURE</Text>
            <View style={styles.boxContent}>
              <Text>Date de facture : {dateFacture}</Text>
              {dateEcheance && <Text>Date d'échéance : {dateEcheance}</Text>}
              {facture.commande_numero && <Text>Commande N° : {facture.commande_numero}</Text>}
              {facture.payment_mode && <Text>Mode de paiement : {facture.payment_mode}</Text>}
              {facture?.client?.numero_fournisseur && <Text>Numéro fournisseur : {facture.client.numero_fournisseur}</Text>}
            </View>
          </View>
        </View>

        {/* Tableau */}
        <View style={styles.table}>
          {/* En-tête du tableau */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, styles.colRef]}>RÉF.CC</Text>
            <Text style={[styles.tableCellHeader, styles.colDesign]}>DÉSIGNATION</Text>
            <Text style={[styles.tableCellHeader, styles.colQty]}>Qte</Text>
            <Text style={[styles.tableCellHeader, styles.colPrixUnit]}>P.U HT</Text>
            <Text style={[styles.tableCellHeader, styles.colTotal]}>P.T HT</Text>
          </View>

          <View style={{
            flexDirection: 'row',
            backgroundColor: theme.table.rowAltBackground,
          }}>
            <Text style={[styles.tableCellHeader, styles.colRef]}>{facture.ref_cc}</Text>
            <Text style={[styles.tableCell, styles.colDesign, { justifyContent: 'center' }]}>{facture.designation}</Text>
            <Text style={[styles.tableCellHeader, styles.colQty]}></Text>
            <Text style={[styles.tableCellHeader, styles.colPrixUnit]}></Text>
            <Text style={[styles.tableCellHeader, styles.colTotal]}></Text>
          </View>

          {/* Lignes du tableau */}
          {facture.lignes?.map((ligne, index) => {
            let prixUnit = 0;
            prixUnit = getPrixUnitaire(ligne);
            const quantite = ligne.quantite || 0;
            const total = getPrixTotal(ligne);
            const estimatedLines = Math.ceil(ligne.designation.length / 50);
            const rowHeight = Math.max(30, estimatedLines * 15 + 16);

            return (
              <View 
                key={index} 
                style={{
                  flexDirection: 'row',
                  backgroundColor: index % 2 === 0 ? '#FFFFFF' : theme.table.rowAltBackground,
                }}
              >
                <View style={[styles.tableCell, styles.colRef, { height: rowHeight, justifyContent: 'center' }]}>
                  <Text></Text>
                </View>
                <View style={[styles.tableCell, styles.colDesign, { height: rowHeight, justifyContent: 'center' }]}>
                  <Text>{ligne.designation || ""}</Text>
                </View>
                <View style={[styles.tableCell, styles.colQty, { height: rowHeight, justifyContent: 'center' }]}>
                  <Text style={{ fontWeight: 'bold' }}>{quantite}</Text>
                </View>
                <View style={[styles.tableCell, styles.colPrixUnit, { height: rowHeight, justifyContent: 'center' }]}>
                  <Text>{prixUnit.toFixed(2)}</Text>
                </View>
                <View style={[styles.tableCell, styles.colTotal, { height: rowHeight, justifyContent: 'center' }]}>
                  <Text style={{ fontWeight: 'bold' }}>{total.toFixed(2)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Section Pied de page avec signature et totaux */}
        <View style={styles.tableFooter}>
          <View style={styles.footerRow}>
            {/* Signature */}
            <View style={styles.signatureSection}>
              <View style={styles.signatureBox}>
                <Text style={styles.signatureTitle}>CACHET ET SIGNATURE FSG</Text>
                <Text style={styles.signatureText}>
                  Nom et signature{'\n'}
                </Text>
              </View>
            </View>

            {/* Totaux */}
            <View style={styles.totalsSection}>
              {afficherTTC ? (
                <>
                  <View style={styles.totalRow}>
                    <Text style={styles.bold}>Sous-total HT</Text>
                    <Text>{totalHT.toFixed(1)} {facture.monetaire?.symbol || 'Dhs'}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.bold}>TVA (20%)</Text>
                    <Text>{tva.toFixed(1)} {facture.monetaire?.symbol || 'Dhs'}</Text>
                  </View>
                  <View style={styles.totalRowBold}>
                    <Text>TOTAL TTC</Text>
                    <Text>{totalTTC.toFixed(1)} {facture.monetaire?.symbol || 'Dhs'}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.totalRow}>
                    <Text style={styles.bold}>Sous-total HT</Text>
                    <Text>{totalHT.toFixed(1)} {facture.monetaire?.symbol || 'Dhs'}</Text>
                  </View>
                  <View style={styles.totalRowBold}>
                    <Text>TOTAL HT</Text>
                    <Text>{totalHT.toFixed(1)} {facture.monetaire?.symbol || 'Dhs'}</Text>
                  </View>
                </>
              )}
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
          <Text style={{ marginTop: 3, fontSize: 5, color: '#999' }}>
            Document généré le {today}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

// Fonction pour générer et télécharger le PDF avec thème
export const handleGenerateFacture = async (facture: Facture, afficherTTC: boolean = true) => {
  // Récupérer le thème avant de générer le PDF
  const theme = await fetchFactureTheme();
  
  const blob = await pdf(<FacturePDFDocument facture={facture} afficherTTC={afficherTTC} theme={theme} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `facture_${facture.num_facture || "export"}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

// Hook personnalisé pour utiliser le thème dans un composant React
export const useFactureTheme = () => {
  const [theme, setTheme] = useState<DevisTheme>(defaultTheme);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      const fetchedTheme = await fetchFactureTheme();
      setTheme(fetchedTheme);
      setLoading(false);
    };
    loadTheme();
  }, []);

  return { theme, loading };
};

// Composant de prévisualisation qui charge le thème
export const FacturePDFPreview = ({ facture, afficherTTC = true }: { facture: Facture; afficherTTC?: boolean }) => {
  const { theme, loading } = useFactureTheme();

  if (loading) {
    return null; // ou un loader
  }

  return <FacturePDFDocument facture={facture} afficherTTC={afficherTTC} theme={theme} />;
};