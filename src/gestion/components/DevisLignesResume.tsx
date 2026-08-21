import { DevisLigne } from "../../types/devis";


type Props = {
  lignes: DevisLigne[];
  total: number;
    kg_mat: number | null;
    kg_mo: number | null;
  symbol?: string;
  afficherTTC?: boolean;
};


export default function DevisLignesResume({
  lignes,
  total,
  kg_mat,
  kg_mo,
  symbol = "Dhs",
  afficherTTC = false,
}: Props) {
  const tva = total * 0.2;
  const totalTTC = total + tva;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Lignes du devis ({lignes.length})
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 font-semibold text-gray-700">
                Matériel
              </th>
              <th className="text-center p-3 font-semibold text-gray-700">
                Quantité
              </th>
              <th className="text-right p-3 font-semibold text-gray-700">
                Facteur
              </th>
              <th className="text-right p-3 font-semibold text-gray-700">
                Prix unitaire
              </th>
              <th className="text-right p-3 font-semibold text-gray-700">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {lignes.map((ligne, index) => {
              const qte = Number(ligne.quantite) || 0;
              const prix = Number(ligne.prix) || 0;
              
              // Correction: matériel utilise kg_mat, main d'œuvre utilise kg_mo
              const facteur = ligne.type === "materiel" ? (kg_mat || 1) : (kg_mo || 1);
              const totalLigne = qte * prix * facteur;

              return (
                <tr
                  key={ligne.id ?? index}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-3">{ligne.materiel}</td>
                  <td className="p-3 text-center">{qte}</td>
                  <td className="p-3 text-right">{facteur.toFixed(2)}</td>
                  <td className="p-3 text-right">
                    {prix.toFixed(2)} {symbol}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {totalLigne.toFixed(2)} {symbol}
                  </td>
                </tr>
              );
            })}

            <tr className="bg-gray-50 font-bold">
              <td colSpan={4} className="p-3 text-right">
                Total HT :
              </td>
              <td className="p-3 text-right">
                {total.toFixed(2)} {symbol}
              </td>
            </tr>

            {afficherTTC && (
              <>
                <tr className="bg-gray-50">
                  <td colSpan={4} className="p-3 text-right">
                    TVA (20%) :
                  </td>
                  <td className="p-3 text-right">
                    {tva.toFixed(2)} {symbol}
                  </td>
                </tr>
                <tr className="bg-gray-100 font-bold text-lg">
                  <td colSpan={4} className="p-3 text-right">
                    Total TTC :
                  </td>
                  <td className="p-3 text-right">
                    {totalTTC.toFixed(2)} {symbol}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
