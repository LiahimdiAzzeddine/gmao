import { StatutEtapeGamme } from '../types/etapeGamme';

interface StatutIconProps {
  statut: StatutEtapeGamme;
  size?: number;
}

export function StatutIcon({ statut, size = 16 }: StatutIconProps) {
  const viewBox = "0 0 20 20";
  
  // Carré noir avec bordure fine
  const Square = () => (
    <>
      <line x1="2" y1="2" x2="18" y2="2" stroke="black" strokeWidth="1" />
      <line x1="18" y1="2" x2="18" y2="18" stroke="black" strokeWidth="1" />
      <line x1="18" y1="18" x2="2" y2="18" stroke="black" strokeWidth="1" />
      <line x1="2" y1="18" x2="2" y2="2" stroke="black" strokeWidth="1" />
    </>
  );

  if (statut === StatutEtapeGamme.CONFORME) {
    return (
      <svg width={size} height={size} viewBox={viewBox} className="inline-block">
        <Square />
        {/* Checkmark vert */}
        <line x1="6" y1="10" x2="8.5" y2="13" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
        <line x1="8.5" y1="13" x2="14" y2="7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (statut === StatutEtapeGamme.REPORTE) {
    return (
      <svg width={size} height={size} viewBox={viewBox} className="inline-block">
        <Square />
        {/* Tiret bleu */}
        <line x1="6" y1="10" x2="14" y2="10" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (statut === StatutEtapeGamme.ACTION_CORRECTIVE) {
    return (
      <svg width={size} height={size} viewBox={viewBox} className="inline-block">
        <Square />
        {/* X rouge */}
        <line x1="7" y1="7" x2="13" y2="13" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
        <line x1="13" y1="7" x2="7" y2="13" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return null;
}
