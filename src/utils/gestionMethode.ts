import { Devis } from "../types/devis";

  // Fonction pour calculer le total HT d'un devis
  export const calculateTotalHT = (devis: Devis): number => {
    if (!devis.lignes || devis.lignes.length === 0) return 0;
    return devis.lignes.reduce((total, ligne) => {
      const type = ligne.type;
      let coefficient = 1;
      if (type == 'materiel') {
        coefficient = devis.kg_mat || 1;
      } else {
        coefficient = devis.kg_mo || 1;
      }
      const quantite = ligne.quantite || 0;
      const prix = ligne.prix || 0;
      return total + (quantite * prix * coefficient);
    }, 0);
  };
  export const formatNumber = (value: number) => {
    return Number.isInteger(value)
      ? value.toString()
      : value.toFixed(2);
  };




  // Fonction pour calculer le total TTC (avec TVA à 20%)
  export const calculateTotalTTC = (totalHT: number): number => {
    return totalHT * 1.20;
  };
   export  const getStatutColor = (statut: string) => {
    const colors: { [key: string]: { bg: string; text: string; border: string; chart: string } } = {
      en_attente: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', chart: '#FCD34D' },
      en_cours: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', chart: '#60A5FA' },
      facturé: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', chart: '#34D399' },
      annule: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', chart: '#F87171' },
      payé: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', chart: '#A78BFA' },
      terminé: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300', chart: '#2DD4BF' },
      accepte: { bg: 'bg-green-200', text: 'text-green-900', border: 'border-green-400', chart: '#10B981' },
    };
    return colors[statut] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', chart: '#9CA3AF' };
  };
  export const statutLabels: { [key: string]: string } = {
    en_attente: 'En attente',
    en_cours: 'En cours',
    accepte: 'Accepté',
    terminé: 'Terminé',
    facturé: 'Facturé',
    payé: 'Payé',
    annule: 'Annulé',
  };