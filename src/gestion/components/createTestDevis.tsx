import { useState } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { DevisTheme } from '../../types/DevisTheme';
import { DevisPDFDocument } from '../../utils/generateDeviPDF';


// Données de test pour le devis
const createTestDevis = (): any => {
  return {
    id: 'test-123',
    num_devis: 'DEV-2026-001',
    date_devis: new Date().toISOString(),
    designation: 'Installation électrique complète - Bâtiment commercial',
    kg_mat: 1.15, // Coefficient matériel
    kg_mo: 1.10,  // Coefficient main d'œuvre
    
    // Client
    clients_devis: {
      client: 'ENTREPRISE MODERNE SARL',
      ice: '002345678901234'
    },
    
    // Contact
    contact: {
      nom: 'Mohammed ALAMI',
      tel: '+212 6 12 34 56 78',
      email: 'malami@entreprise-moderne.ma',
      adresse: '45 Boulevard Mohamed V, Casablanca'
    },
    
    // Émetteur
    emetteur: {
      nom: 'Ahmed BENALI',
      telephone: '+212 5 39 94 00 00',
      email: 'a.benali@fsg.ma',
      adresse: '29 Rue AMR IBN ASS N26 Tanger'
    },
    
    // Monnaie
    monetaire: {
      symbol: 'Dhs',
      code: 'MAD'
    },
    
    // Lignes du devis
    lignes: [
      {
        id: '1',
        materiel: 'Câble électrique 3x2.5mm² (rouleau 100m)',
        quantite: 5,
        unite: 'Rouleau',
        prix: 450,
        type: 'materiel'
      },
      {
        id: '2',
        materiel: 'Tableau électrique 4 rangées avec disjoncteurs',
        quantite: 2,
        unite: 'Un',
        prix: 1200,
        type: 'materiel'
      },
      {
        id: '3',
        materiel: 'Gaine ICTA Ø20mm',
        quantite: 150,
        unite: 'ML',
        prix: 8,
        type: 'materiel'
      },
      {
        id: '4',
        materiel: 'Prises électriques 2P+T',
        quantite: 25,
        unite: 'Un',
        prix: 35,
        type: 'materiel'
      },
      {
        id: '5',
        materiel: 'Interrupteurs va-et-vient',
        quantite: 15,
        unite: 'Un',
        prix: 28,
        type: 'materiel'
      },
      {
        id: '6',
        materiel: 'Installation et raccordement du tableau électrique',
        quantite: 8,
        unite: 'Heure',
        prix: 150,
        type: 'main_oeuvre'
      },
      {
        id: '7',
        materiel: 'Pose de câbles et gaines',
        quantite: 16,
        unite: 'Heure',
        prix: 120,
        type: 'main_oeuvre'
      },
      {
        id: '8',
        materiel: 'Installation des prises et interrupteurs',
        quantite: 6,
        unite: 'Heure',
        prix: 100,
        type: 'main_oeuvre'
      },
      {
        id: '9',
        materiel: 'Tests et mise en service',
        quantite: 4,
        unite: 'Heure',
        prix: 150,
        type: 'main_oeuvre'
      },
      {
        id: '10',
        materiel: 'Luminaires LED 40W',
        quantite: 12,
        unite: 'Un',
        prix: 250,
        type: 'materiel'
      }
    ],
    
    // Notes de validité
    validity_notes: [
      {
        id: '1',
        contenu: 'Devis valable 30 jours à compter de la date d\'émission'
      },
      {
        id: '2',
        contenu: 'Les prix sont exprimés en Dirhams hors taxes'
      },
      {
        id: '3',
        contenu: 'Acompte de 30% à la commande, solde à la fin des travaux'
      },
      {
        id: '4',
        contenu: 'Garantie de 2 ans sur le matériel et la main d\'œuvre'
      }
    ]
  };
};

interface DevisTestPreviewProps {
  theme: DevisTheme;
}

// Composant de test avec prévisualisation PDF
const DevisTestPreview = ({ theme }: DevisTestPreviewProps) => {
  const [afficherTTC, setAfficherTTC] = useState(true);
  const testDevis = createTestDevis();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Barre de contrôle */}
      <div style={{ 
        padding: '12px 16px', 
        backgroundColor: '#f9fafb', 
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
          Prévisualisation en temps réel
        </h2>
        
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          cursor: 'pointer',
          marginLeft: 'auto'
        }}>
          <input
            type="checkbox"
            checked={afficherTTC}
            onChange={(e) => setAfficherTTC(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '14px' }}>Afficher TTC</span>
        </label>
        
        <div style={{ 
          padding: '4px 10px', 
          backgroundColor: '#dbeafe', 
          borderRadius: '6px',
          fontSize: '13px',
          color: '#1e40af',
          fontWeight: '500'
        }}>
          {testDevis.num_devis}
        </div>
      </div>

      {/* Prévisualisation PDF */}
      <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
        <DevisPDFDocument 
          devis={testDevis} 
          afficherTTC={afficherTTC} 
          theme={theme} 
        />
      </PDFViewer>
    </div>
  );
};

export default DevisTestPreview;