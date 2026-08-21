import { useDevisTable } from "../../hooks/useDevisTable";
import DevisTableUI from "./DevisTableUI";

// Composant de test pour vérifier la pagination côté serveur
export default function DevisTableTest() {
  const devisTableProps = useDevisTable();

  return (
    <div>
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800">Debug Info:</h3>
        <p className="text-sm text-blue-600">
          Total: {devisTableProps.totalCount} | 
          Page: {devisTableProps.currentPage}/{devisTableProps.totalPages} | 
          Affichés: {devisTableProps.currentDevis.length} | 
          Loading: {devisTableProps.loading ? 'Oui' : 'Non'}
        </p>
        {devisTableProps.searchTerm && (
          <p className="text-sm text-blue-600">
            Recherche: "{devisTableProps.searchTerm}"
          </p>
        )}
      </div>
      <DevisTableUI {...devisTableProps} />
    </div>
  );
}