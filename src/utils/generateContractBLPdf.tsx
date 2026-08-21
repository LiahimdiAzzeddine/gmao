import { Document, Page, Text, View, StyleSheet, Image, pdf, Font } from '@react-pdf/renderer';
import { useState, useEffect } from 'react';
import { supabaseGes } from '../lib/supagestion';
import { DevisTheme } from '../types/DevisTheme';
import { defaultTheme } from './generateDeviPDF';
import { ContractPeriod } from '../hooks/useContractPeriods';
import { generateContractDesignation, generateSimpleDesignation } from './contractDesignationUtils';

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
export const fetchContractBLTheme = async (): Promise<DevisTheme> => {
  try {
    const { data, error } = await supabaseGes
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
  col1: { width: '15%' },
  col2: { width: '45%' },
  col3: { width: '15%', textAlign: 'center' },
  col4: { width: '25%', textAlign: 'center' },
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
  periodInfo: {
    backgroundColor: theme.table.headerBackground,
    color: theme.table.headerText,
    padding: 10,
    borderRadius: 4,
    marginBottom: 15,
    fontSize: 10,
  },
  statusBadge: {
    padding: 4,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
  statusEnAttente: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  statusPayee: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  statusAnnulee: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
});

export interface ContractBLData {
  period: ContractPeriod;
  contract: {
    id: number;
    nom: string;
    description?: string;
    chantier_code: string;
    numero_commande?: string;
    date_debut?: string;
    facturation?: 'mensuelle' | 'trimestrielle' | 'annuelle';
    client?: {
      id: number;
      client: string;
      ice?: string;
      telephone?: string;
      adresse?: string;
    };
    contact?: {
      num_contact: number;
      nom: string;
      adresse?: string;
      tel?: string;
      adresse_facturation?: string;
      email?: string;
    };
    emetteur?: {
      id: number;
      nom: string;
      telephone?: string;
      portable?: string;
      email?: string;
      adresse?: string;
    };
  };
  blNumber: string;
  services: string[];
  correctifs?: Array<{
    id: number;
    description: string;
    prix_unitaire: number;
    quantite: number;
    total: number;
    created_at: string;
  }>;
  notes?: string;
}

interface ContractBLPDFProps {
  blData: ContractBLData;
  theme?: DevisTheme;
}

const ContractBonLivraisonPDFDocument = ({ blData, theme = defaultTheme }: ContractBLPDFProps) => {
  const styles = createStyles(theme);
  const { period, contract, blNumber, services, correctifs, notes } = blData;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Générer la désignation automatique
  const designation = contract.date_debut && contract.facturation
    ? generateContractDesignation(period, contract.date_debut, contract.facturation)
    : generateSimpleDesignation(period);





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
            <Text style={styles.blNumber}>{blNumber}</Text>
            <Text style={{ fontSize: 8, marginTop: 4, color: '#666' }}>
              Date d'émission: {formatDate(new Date().toISOString())}
            </Text>
          </View>
        </View>

        {/* Boîtes Destinataire et Expéditeur */}
        <View style={styles.boxesContainer}>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>DESTINATAIRE</Text>
            <View style={styles.boxContent}>
              {contract.client?.client && (
                <Text style={styles.bold}>Socièté: {contract.client.client}</Text>
              )}
              {contract.client?.telephone && <Text>Tél: {contract.client.telephone}</Text>}
              {contract.client?.ice && <Text>ICE: {contract.client.ice}</Text>}
              {contract.numero_commande && <Text>N° Commande: {contract.numero_commande}</Text>}
              {contract.client?.adresse && <Text>Adresse: {contract.client.adresse}</Text>}
              
              {/* Informations du contact */}
              {contract.contact && (
                <View style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${theme.boxes.border}` }}>
                  <Text style={[styles.bold, { fontSize: 8, color: theme.boxes.titleText }]}>CONTACT:</Text>
                  <Text style={{ fontSize: 8 }}>Nom de contact:{contract.contact.nom}</Text>
                  {contract.contact.tel && <Text style={{ fontSize: 8 }}>Tél: {contract.contact.tel}</Text>}
                  {contract.contact.email && <Text style={{ fontSize: 8 }}>Email: {contract.contact.email}</Text>}
                  {contract.contact.adresse && (
                    <Text style={{ fontSize: 8, marginTop: 2 }}>
                      Adresse: {contract.contact.adresse}
                    </Text>
                  )}
                  {contract.contact.adresse_facturation && (
                    <Text style={{ fontSize: 8, marginTop: 2 }}>
                      Adresse Facturation: {contract.contact.adresse_facturation}
                    </Text>
                  )}
                </View>
              )}
              
            </View>
          </View>

          <View style={styles.box}>
            <Text style={styles.boxTitle}>EXPÉDITEUR</Text>
            <View style={styles.boxContent}>
              {contract.emetteur ? (
                <>
                  <Text style={styles.bold}>{contract.emetteur.nom}</Text>
                  {contract.emetteur.adresse && <Text>{contract.emetteur.adresse}</Text>}
                  {contract.emetteur.telephone && <Text>Tél: {contract.emetteur.telephone}</Text>}
                  {contract.emetteur.portable && <Text>Portable: {contract.emetteur.portable}</Text>}
                  {contract.emetteur.email && <Text>Email: {contract.emetteur.email}</Text>}
                </>
              ) : (
                <>
                  <Text style={styles.bold}>FACILITY SOLUTION GROUP SARL</Text>
                  <Text>29 Rue AMR IBN ASS N26</Text>
                  <Text>Tanger, Maroc</Text>
                  <Text>ICE: 003110444000030</Text>
                  <Text>Tél: +212 539 94 00 00</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Tableau des services */}
        <View style={styles.table}>
          {/* En-tête du tableau */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, styles.col1]}>RÉFÉRENCE</Text>
            <Text style={[styles.tableCellHeader, styles.col2]}>DÉSIGNATION</Text>
            <Text style={[styles.tableCellHeader, styles.col3]}>QUANTITÉ</Text>
            <Text style={[styles.tableCellHeader, styles.col4]}>PÉRIODE</Text>
          </View>

          {/* Ligne principale du contrat */}
          <View style={[styles.tableRow, { backgroundColor: theme.table.rowAltBackground }]}>
            <View style={[styles.tableCell, styles.col1]}>
              <Text style={{ fontSize: 8, fontWeight: 'bold' }}>Site:</Text>
              <Text style={{ fontSize: 8 }}>{contract.client?.client || 'Non spécifié'}</Text>
            
              <Text style={{ fontSize: 8, fontWeight: 'bold', marginTop: 4 }}>Chantier:</Text>
              <Text style={{ fontSize: 8 }}>{contract.chantier_code}</Text>
            </View>

            {/* Services fournis */}
            <View style={[styles.tableCell, styles.col2]}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 4 }}>
                {designation}
              </Text>
              {services.length > 0 ? (
                services.map((service, index) => (
                  <Text key={index} style={{ fontSize: 9, marginBottom: 2 }}>
                    • {service}
                  </Text>
                ))
              ) : (
                <Text style={{ fontSize: 9 }}>
                  Services de maintenance selon contrat {contract.nom}
                </Text>
              )}
              {/* Afficher la description du contrat en complément si elle existe et n'est pas déjà dans les services */}
              {contract.description && !services.includes(contract.description) && (
                <Text style={{ fontSize: 8, color: '#666', marginTop: 4, fontStyle: 'italic' }}>
                  Description: {contract.description}
                </Text>
              )}
            </View>

            {/* Quantité */}
            <View style={[styles.tableCell, styles.col3]}>
              <Text style={{ fontSize: 9, textAlign: 'center', fontWeight: 'bold' }}>
                1
              </Text>
            </View>

            {/* Période */}
            <View style={[styles.tableCell, styles.col4]}>
              <Text style={{ fontSize: 8, textAlign: 'center' }}>
                {formatDate(period.periode_debut)}
              </Text>
              <Text style={{ fontSize: 8, textAlign: 'center', marginTop: 2 }}>
                au
              </Text>
              <Text style={{ fontSize: 8, textAlign: 'center', marginTop: 2 }}>
                {formatDate(period.periode_fin)}
              </Text>
            </View>
          </View>

          {/* Lignes pour les travaux correctifs */}
          {correctifs && correctifs.length > 0 && correctifs.map((correctif, index) => (
            <View key={correctif.id} style={[styles.tableRow, index % 2 === 0 ? { backgroundColor: theme.table.rowAltBackground } : {}]}>
              <View style={[styles.tableCell, styles.col1]}>
                <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#666' }}>Correctif: #{correctif.id}</Text>
              </View>

              <View style={[styles.tableCell, styles.col2]}>
                <Text style={{ fontSize: 9, color: '#555' }}>
                  {correctif.description}
                </Text>
              </View>

              <View style={[styles.tableCell, styles.col3]}>
                <Text style={{ fontSize: 9, textAlign: 'center' }}>
                  {correctif.quantite}
                </Text>
              </View>

              <View style={[styles.tableCell, styles.col4]}>
                
                <Text style={{ fontSize: 8, textAlign: 'center', marginTop: 1 }}>
                  {formatDate(correctif.created_at)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Section Pied de page avec notes et signatures */}
        <View style={styles.tableFooter}>
          {/* Notes */}
          {notes && (
            <View style={{ marginTop: 15 }}>
              <Text style={styles.reserveLabel}>NOTES :</Text>
              <View style={styles.reserveBox}>
                <Text style={{ fontSize: 9, color: '#666' }}>
                  {notes}
                </Text>
              </View>
            </View>
          )}

          {/* Signatures */}
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>FSG - CACHET ET SIGNATURE</Text>
              <Text style={styles.signatureText}>Nom et signature du responsable</Text>
            </View>

            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>CLIENT - SIGNATURE</Text>
              <Text style={styles.signatureText}>
                Nom et signature :{'\n'}
                Date de réception : {'\n'}
                Services conformes : ☐ Oui ☐ Non
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
            Document généré le {today} - BL Contrat N° {blNumber}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

// Fonction pour générer et télécharger le PDF avec thème
export const handleGenerateContractBL = async (blData: ContractBLData) => {
  // Récupérer le thème avant de générer le PDF
  const theme = await fetchContractBLTheme();
  
  const blob = await pdf(<ContractBonLivraisonPDFDocument blData={blData} theme={theme} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `BL_Contrat_${blData.contract.nom}_Periode_${blData.period.id}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

// Fonction utilitaire pour créer les données BL à partir d'une période et d'un contrat
export const createContractBLData = (
  period: ContractPeriod,
  contract: any,
  services: string[] = [],
  correctifs?: Array<{
    id: number;
    description: string;
    prix_unitaire: number;
    quantite: number;
    total: number;
    created_at: string;
  }>,
  notes?: string
): ContractBLData => {
  // Générer un numéro de BL unique basé sur le code chantier (sans les 2 derniers caractères) et l'ID de la période
  const chantierCodeShort = contract.chantier_code.length > 2 
    ? contract.chantier_code.slice(0, -2) 
    : contract.chantier_code;
  const blNumber = `BL: ${chantierCodeShort}${period.id}`;
  
  // Utiliser les services fournis, ou la description du contrat, ou un service minimal
  let finalServices = services;
  if (services.length === 0) {
    if (contract.description) {
      finalServices = [contract.description];
    } else {
      // Service minimal si pas de description
      finalServices = [`Services selon contrat ${contract.nom}`];
    }
  }
  
  return {
    period,
    contract,
    blNumber,
    services: finalServices,
    correctifs,
    notes
  };
};

// Hook personnalisé pour utiliser le thème dans un composant React
export const useContractBLTheme = () => {
  const [theme, setTheme] = useState<DevisTheme>(defaultTheme);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      const fetchedTheme = await fetchContractBLTheme();
      setTheme(fetchedTheme);
      setLoading(false);
    };
    loadTheme();
  }, []);

  return { theme, loading };
};

// Composant de prévisualisation qui charge le thème
export const ContractBLPDFPreview = ({ blData }: { blData: ContractBLData }) => {
  const { theme, loading } = useContractBLTheme();

  if (loading) {
    return null; // ou un loader
  }

  return <ContractBonLivraisonPDFDocument blData={blData} theme={theme} />;
};