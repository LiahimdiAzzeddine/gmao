import { ContractPeriod } from '../hooks/useContractPeriods';

/**
 * Calcule le numéro d'attachement et l'année du contrat pour une période donnée
 */
export const calculateContractDesignation = (
  period: ContractPeriod,
  contractStartDate: string,
  facturation: 'mensuelle' | 'trimestrielle' | 'annuelle' = 'mensuelle'
) => {
  const periodStart = new Date(period.periode_debut);
  const periodEnd = new Date(period.periode_fin);
  const contractStart = new Date(contractStartDate);

  // Calculer l'année du contrat (1ère année, 2ème année, etc.)
  const yearsDiff = periodStart.getFullYear() - contractStart.getFullYear();
  const contractYear = yearsDiff + 1;

  // Calculer le numéro d'attachement selon la facturation
  let attachmentNumber = 1;
  
  if (facturation === 'mensuelle') {
    // Pour mensuelle : calculer le nombre de mois depuis le début du contrat
    const monthsDiff = (periodStart.getFullYear() - contractStart.getFullYear()) * 12 + 
                      (periodStart.getMonth() - contractStart.getMonth());
    attachmentNumber = monthsDiff + 1;
  } else if (facturation === 'trimestrielle') {
    // Pour trimestrielle : calculer le nombre de trimestres depuis le début du contrat
    const monthsDiff = (periodStart.getFullYear() - contractStart.getFullYear()) * 12 + 
                      (periodStart.getMonth() - contractStart.getMonth());
    attachmentNumber = Math.floor(monthsDiff / 3) + 1;
  } else if (facturation === 'annuelle') {
    // Pour annuelle : l'attachement correspond à l'année du contrat
    attachmentNumber = contractYear;
  }

  return {
    attachmentNumber,
    contractYear,
    periodStart,
    periodEnd
  };
};

/**
 * Génère la désignation complète pour un contrat et une période
 */
export const generateContractDesignation = (
  period: ContractPeriod,
  contractStartDate: string,
  facturation: 'mensuelle' | 'trimestrielle' | 'annuelle' = 'mensuelle'
): string => {
  const { attachmentNumber, contractYear, periodStart, periodEnd } = calculateContractDesignation(
    period,
    contractStartDate,
    facturation
  );

  // Formatage des dates en français
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    }).replace('.', '');
  };

  // Conversion du numéro d'année en ordinal français
  const getOrdinalYear = (year: number): string => {
    if (year === 1) return '1ère';
    return `${year}ème`;
  };

  const startDateFormatted = formatDate(periodStart);
  const endDateFormatted = formatDate(periodEnd);
  const ordinalYear = getOrdinalYear(contractYear);

  return `ATTACHEMENT N°${attachmentNumber} de la ${ordinalYear} ANNÉE du contrat du ${startDateFormatted} AU ${endDateFormatted}`;
};

/**
 * Génère une désignation simplifiée pour les cas où on n'a pas toutes les données
 */
export const generateSimpleDesignation = (
  period: ContractPeriod,
  attachmentNumber?: number
): string => {
  const periodStart = new Date(period.periode_debut);
  const periodEnd = new Date(period.periode_fin);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    }).replace('.', '');
  };

  const startDateFormatted = formatDate(periodStart);
  const endDateFormatted = formatDate(periodEnd);
  
  if (attachmentNumber) {
    return `ATTACHEMENT N°${attachmentNumber} du contrat du ${startDateFormatted} AU ${endDateFormatted}`;
  }

  return `Services contractuels du ${startDateFormatted} AU ${endDateFormatted}`;
};