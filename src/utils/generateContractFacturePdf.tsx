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
export const fetchContractFactureTheme = async (): Promise<DevisTheme> => {
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
    marginBottom: 12,
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
    fontSize: 14,
  },
  boxesContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
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
    marginBottom: 6,
    color: theme.boxes.titleText,
    borderBottom: `1.2px solid ${theme.boxes.border}`,
    paddingBottom: 3,
  },
  boxContent: {
    fontSize: 9,
    lineHeight: 1.4,
  },
  bold: {
    fontWeight: 'bold',
  },
  table: {
    marginTop: 8,
    border: `2px solid ${theme.table.border}`,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.table.headerBackground,
    fontWeight: 'bold',
    color: theme.table.headerText,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: theme.table.rowAltBackground,
  },
  tableCell: {
    fontSize: 9,
    padding: 8,
    borderRight: `1px solid ${theme.table.border}`,
  },
  tableCellHeader: {
    fontSize: 10,
    padding: 8,
    fontWeight: 'bold',
    borderRight: `1px solid ${theme.table.border}`,
  },
  tableCellLast: {
    fontSize: 9,
    padding: 8,
  },
  colRef: { width: '11%' },
  col1: { width: '44%' },
  col2: { width: '15%', textAlign: 'center' },
  col3: { width: '15%', textAlign: 'right' },
  col4: { width: '15%', textAlign: 'right' },
  periodInfo: {
    backgroundColor: theme.table.headerBackground,
    color: theme.table.headerText,
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
    fontSize: 10,
  },
  totalSection: {
    marginTop: 10,
    padding: 0,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: theme.table.headerBackground,
    color: theme.table.headerText,
    fontWeight: 'bold',
    fontSize: 11,
  },
  paymentInfo: {
    marginTop: 12,
    padding: 8,
    border: `1.5px solid ${theme.boxes.border}`,
    borderRadius: 6,
    backgroundColor: theme.boxes.background,
  },
  paymentTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.boxes.titleText,
    marginBottom: 6,
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

export interface ContractFactureData {
  period: ContractPeriod;
  contract: {
    id: number;
    nom: string;
    description?: string;
    chantier_code: string;
    numero_commande?: string;
    date_debut?: string;
    facturation?: 'mensuelle' | 'trimestrielle' | 'annuelle';
    ht_ttc?: 'HT' | 'TTC';
    client?: {
      id: number;
      client: string;
      ice?: string;
      telephone?: string;
      adresse?: string;
      numero_fournisseur?: string;
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
  facture?: {
    id: number;
    numero_facture: string;
    date_facture: string;
    date_echeance?: string;
    statut: string;
    methode_paiement?: string;
  };
  factureNumber: string;
  ref_cc?: string;
  services: Array<{
    description: string;
    quantite: number;
    prixUnitaire: number;
    total: number;
  }>;
  correctifs?: Array<{
    id: number;
    description: string;
    prix_unitaire: number;
    quantite: number;
    total: number;
    created_at: string;
  }>;
  tva?: number;
  notes?: string;
}

interface ContractFacturePDFProps {
  factureData: ContractFactureData;
  theme?: DevisTheme;
}

const ContractFacturePDFDocument = ({ factureData, theme = defaultTheme }: ContractFacturePDFProps) => {
  const styles = createStyles(theme);
  const { period, contract, facture, factureNumber, services, correctifs, tva = 20 } = factureData;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    // Formatage manuel pour éviter les problèmes de locale
    const formattedNumber = amount.toFixed(2);
    const parts = formattedNumber.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Ajouter des espaces pour les milliers
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    
    return `${formattedInteger},${decimalPart} MAD`;
  };

  const getPaymentMethodLabel = (paymentMode: string) => {
    const labels = {
      'especes': 'Espèces',
      'virement': 'Virement',
      'cheque': 'Chèque',
      'carte': 'Carte bancaire',
      'en_ligne': 'Paiement en ligne'
    };
    return labels[paymentMode as keyof typeof labels] || paymentMode;
  };

  // Calculer les totaux selon le type HT/TTC du contrat
  const sousTotal = services.reduce((sum, service) => sum + service.total, 0);
  const correctifsTotal = correctifs ? correctifs.reduce((sum, correctif) => sum + correctif.total, 0) : 0;
  
  // Déterminer si les montants sont en HT ou TTC
  const isHT = contract.ht_ttc === 'HT' || !contract.ht_ttc; // Par défaut HT si non spécifié
  
  let totalHT: number;
  let montantTVA: number;
  let totalTTC: number;
  
  if (isHT) {
    // Les montants sont en HT - pas de calcul de TVA
    totalHT = sousTotal + correctifsTotal;
    montantTVA = 0; // Pas de TVA pour les contrats HT
    totalTTC = totalHT; // Total = montant HT
  } else {
    // Pour les contrats TTC : les montants saisis sont en HT, on calcule le TTC
    totalHT = sousTotal + correctifsTotal;
    montantTVA = totalHT * (tva / 100);
    totalTTC = totalHT + montantTVA; // TTC = HT + TVA
  }

  // Utiliser les dates de la facture si disponibles, sinon utiliser les dates de la période
  const dateFacture = facture?.date_facture || new Date().toISOString();
  const dateEcheance = facture?.date_echeance || period.periode_fin;
  const numeroFacture = facture?.numero_facture || factureNumber;

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header avec logo et numéro de facture */}
        <View style={styles.header}>
          <Image src="/FSGlogo.png" style={styles.logo} />
          <View style={styles.factureInfo}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>FACTURE</Text>
            <Text style={styles.factureNumber}>{numeroFacture}</Text>
            <Text style={{ fontSize: 8, marginTop: 4, color: '#666' }}>
              Date d'émission: {formatDate(dateFacture)}
            </Text>
     
          </View>
        </View>


        {/* Boîtes Client et Fournisseur */}
        <View style={styles.boxesContainer}>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>FACTURÉ À</Text>
            <View style={styles.boxContent}>
              {contract.client?.client && (
                <Text style={styles.bold}>Société : {contract.client.client}</Text>
              )}
              {contract.client?.adresse && <Text>{contract.client.adresse}</Text>}
              {contract.client?.telephone && <Text>Tél: {contract.client.telephone}</Text>}
              {contract.client?.ice && <Text>ICE: {contract.client.ice}</Text>}
              
              {/* Informations du contact */}
              {contract.contact && (
                <View style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${theme.boxes.border}` }}>
                  <Text style={[styles.bold, { fontSize: 8, color: theme.boxes.titleText }]}>CONTACT:</Text>
                  <Text style={{ fontSize: 8 }}> {contract.contact.nom}</Text>
                  {contract.contact.tel && <Text style={{ fontSize: 8 }}>Tél: {contract.contact.tel}</Text>}
                  {contract.contact.email && <Text style={{ fontSize: 8 }}>Email: {contract.contact.email}</Text>}
                  {contract.contact.email && <Text style={{ fontSize: 8 }}>Adresse: {contract.contact.adresse}</Text>}
                  {contract.contact.adresse_facturation && (
                    <Text style={{ fontSize: 8, marginTop: 2 }}>
                      Adresse Facturation: {contract.contact.adresse_facturation}
                    </Text>
                  )}
                </View>
              )}
              
              <Text style={{ marginTop: 4 }}>Chantier: {contract.chantier_code}</Text>
            </View>
          </View>

          <View style={styles.box}>
            <Text style={styles.boxTitle}>INFORMATIONS FACTURE</Text>
            <View style={styles.boxContent}>
              <Text>Date de facture: {formatDate(dateFacture)}</Text>
              <Text>Date d'échéance: {formatDate(dateEcheance)}</Text>
              <Text>Mode de paiement: {getPaymentMethodLabel(period.payment_mode || 'Non spécifié')}</Text>
              {contract.numero_commande && (
                <Text>N° Commande: {contract.numero_commande}</Text>
              )}
              {contract.client?.numero_fournisseur && (
                <Text>N° Fournisseur: {contract.client.numero_fournisseur}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Tableau des services */}
        <View style={styles.table}>
          {/* En-tête du tableau */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, styles.colRef]}>RÉF.CC</Text>
            <Text style={[styles.tableCellHeader, styles.col1]}>DÉSIGNATION</Text>
            <Text style={[styles.tableCellHeader, styles.col2]}>QTÉ</Text>
            <Text style={[styles.tableCellHeader, styles.col3]}>P.U {contract.ht_ttc || 'HT'}</Text>
            <Text style={[styles.tableCellHeader, styles.col4]}>TOTAL {contract.ht_ttc || 'HT'}</Text>
          </View>

          {/* Services contractuels */}
          {services.map((service, index) => (
            <View key={`service-${index}`} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, styles.colRef]}>{factureData.ref_cc || contract.chantier_code}</Text>
              <View style={[styles.tableCell, styles.col1]}>
                <Text>{service.description}</Text>
                {contract.description && (
                  <Text style={{ fontSize: 8, color: '#666', marginTop: 4, fontStyle: 'italic' }}>
                    Description: {contract.description}
                  </Text>
                )}
              </View>
              <Text style={[styles.tableCell, styles.col2]}>{service.quantite}</Text>
              <Text style={[styles.tableCell, styles.col3]}>{formatCurrency(service.prixUnitaire)}</Text>
              <Text style={[styles.tableCellLast, styles.col4]}>{formatCurrency(service.total)}</Text>
            </View>
          ))}

          {/* Travaux correctifs */}
          {correctifs && correctifs.length > 0 && correctifs.map((correctif, index) => {
            const rowIndex = services.length + index;
            return (
              <View key={`correctif-${correctif.id}`} style={rowIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, styles.colRef]}>{factureData.ref_cc || contract.chantier_code}</Text>
                <View style={[styles.tableCell, styles.col1]}>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#d97706' }}>
                    TRAVAIL CORRECTIF #{index+1}
                  </Text>
                  <Text style={{ fontSize: 8, marginTop: 2 }}>
                    {correctif.description}
                  </Text>
                 
                </View>
                <Text style={[styles.tableCell, styles.col2]}>{correctif.quantite}</Text>
                <Text style={[styles.tableCell, styles.col3]}>{formatCurrency(correctif.prix_unitaire)}</Text>
                <Text style={[styles.tableCellLast, styles.col4]}>{formatCurrency(correctif.total)}</Text>
              </View>
            );
          })}
        </View>

        {/* Section des totaux avec signature */}
        <View style={styles.totalSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 20 }}>
            {/* Bloc de signature à gauche */}
            <View style={{ width: '50%' }}>
              <View style={{
                border: `2px solid ${theme.table.border}`,
                borderRadius: 8,
                padding: 12,
                height: 120,
                backgroundColor: '#f9f9f9'
              }}>
                <Text style={{
                  fontSize: 10,
                  fontWeight: 'bold',
                  marginBottom: 2,
                  textAlign: 'center',
                  color: theme.table.headerText
                }}>
                  CACHET ET SIGNATURE FSG
                </Text>
                <Text style={{
                  fontSize: 9,
                  color: '#666',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  marginTop: 4
                }}>
                  Nom et signature
                </Text>
              </View>
            </View>

            {/* Totaux à droite */}
            <View style={{ width: '40%' }}>
              <View style={{
                border: `2px solid ${theme.table.border}`,
                borderRadius: 8,
                padding: 12,
                backgroundColor: '#f9f9f9'
              }}>
                {isHT ? (
                  // Affichage pour contrats HT - sans TVA
                  <>
                    {correctifs && correctifs.length > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 6, borderBottom: `1px solid ${theme.table.border}` }}>
                        <Text style={{ fontSize: 10, color: '#d97706', flex: 1 }}>Travaux correctifs HT</Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#d97706', textAlign: 'right' }}>{formatCurrency(correctifsTotal)}</Text>
                      </View>
                    )}
                    <View style={[styles.totalRow, { marginTop: 8 }]}>
                      <Text style={{ flex: 1 }}>TOTAL HT</Text>
                      <Text style={{ textAlign: 'right' }}>{formatCurrency(totalHT)}</Text>
                    </View>
                  </>
                ) : (
                  // Affichage pour contrats TTC
                  <>
                    {correctifs && correctifs.length > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 6, borderBottom: `1px solid ${theme.table.border}` }}>
                        <Text style={{ fontSize: 10, color: '#d97706', flex: 1 }}>Travaux correctifs HT</Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#d97706', textAlign: 'right' }}>{formatCurrency(correctifsTotal)}</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 6, borderBottom: `1px solid ${theme.table.border}` }}>
                      <Text style={{ fontSize: 10, flex: 1 }}>Sous-total HT</Text>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(totalHT)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 6, borderBottom: `1px solid ${theme.table.border}` }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', flex: 1 }}>TVA ({tva}%)</Text>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(montantTVA)}</Text>
                    </View>
                    <View style={[styles.totalRow, { marginTop: 8 }]}>
                      <Text style={{ flex: 1 }}>TOTAL TTC</Text>
                      <Text style={{ textAlign: 'right' }}>{formatCurrency(totalTTC)}</Text>
                    </View>
                  </>
                )}
              </View>
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
            Document généré le {today} - Facture N° {factureNumber}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

// Fonction pour générer et télécharger le PDF avec thème
export const handleGenerateContractFacture = async (factureData: ContractFactureData) => {
  // Récupérer le thème avant de générer le PDF
  const theme = await fetchContractFactureTheme();
  
  const blob = await pdf(<ContractFacturePDFDocument factureData={factureData} theme={theme} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Facture_${factureData.contract.nom}_Periode_${factureData.period.id}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

// Fonction utilitaire pour créer les données de facture à partir d'une période et d'un contrat
export const createContractFactureData = (
  period: ContractPeriod,
  contract: any,
  customServices?: Array<{
    description: string;
    quantite: number;
    prixUnitaire: number;
    total: number;
  }>,
  correctifs?: Array<{
    id: number;
    description: string;
    prix_unitaire: number;
    quantite: number;
    total: number;
    created_at: string;
  }>,
  facture?: {
    id: number;
    numero_facture: string;
    date_facture: string;
    date_echeance?: string;
    statut: string;
    methode_paiement?: string;
  },
  tva: number = 20,
  notes?: string,
  ref_cc?: string
): ContractFactureData => {
  // Générer un numéro de facture unique basé sur la période et la date (fallback si pas de facture)
  const factureNumber = facture?.numero_facture || `FACT-${contract.chantier_code}-${period.id}-${new Date().getFullYear()}`;
  
  // Services par défaut si non spécifiés
  const designation = contract.date_debut && contract.facturation
    ? generateContractDesignation(period, contract.date_debut, contract.facturation)
    : generateSimpleDesignation(period);

  const defaultServices = [{
    description: designation,
    quantite: 1,
    prixUnitaire: period.montant,
    total: period.montant
  }];
  
  return {
    period,
    contract,
    facture,
    factureNumber,
    ref_cc,
    services: customServices || defaultServices,
    correctifs,
    tva,
    notes
  };
};

// Hook personnalisé pour utiliser le thème dans un composant React
export const useContractFactureTheme = () => {
  const [theme, setTheme] = useState<DevisTheme>(defaultTheme);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      const fetchedTheme = await fetchContractFactureTheme();
      setTheme(fetchedTheme);
      setLoading(false);
    };
    loadTheme();
  }, []);

  return { theme, loading };
};

// Composant de prévisualisation qui charge le thème
export const ContractFacturePDFPreview = ({ factureData }: { factureData: ContractFactureData }) => {
  const { theme, loading } = useContractFactureTheme();

  if (loading) {
    return null; // ou un loader
  }

  return <ContractFacturePDFDocument factureData={factureData} theme={theme} />;
};