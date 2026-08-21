import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type ConfigFacturation = {
  id: number;
  annee_reference: number;
};

type FactureCompteur = {
  annee_offset: number;
  last_value: number;
};

const FacturationAdmin: React.FC = () => {
  const [config, setConfig] = useState<ConfigFacturation | null>(null);
  const [compteurs, setCompteurs] = useState<FactureCompteur[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les données
  const fetchData = async () => {
    setLoading(true);
    const { data: cfg } = await supabase
      .from("config_facturation")
      .select("*")
      .limit(1)
      .single() as any as { data: ConfigFacturation | null };

    const { data: cnt } = await supabase
      .from("facture_compteur")
      .select("*")
      .order("annee_offset", { ascending: true }) as any as { data: FactureCompteur[] | null };

    setConfig(cfg ?? null);
    setCompteurs(cnt ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    
  }, []);

  // Mettre à jour la config
  const updateConfig = async (annee_reference: number) => {
    if (!config) return;
    await supabase
      .from("config_facturation")
      .update({ annee_reference })
      .eq("id", config.id);
    fetchData();
  };

  // Mettre à jour un compteur
  const updateCompteur = async (annee_offset: number, last_value: number) => {
    await supabase
      .from("facture_compteur")
      .update({ last_value })
      .eq("annee_offset", annee_offset);
    fetchData();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold">Configuration Facturation</h2>
      {config && (
        <div className="flex items-center space-x-2">
          <label>Année de référence:</label>
          <input
            type="number"
            value={config.annee_reference}
            onChange={(e) => updateConfig(Number(e.target.value))}
            className="border px-2 py-1 rounded"
          />
        </div>
      )}

      <h2 className="text-xl font-bold mt-6">Compteurs Factures</h2>
      <table className="table-auto border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border px-2 py-1">Année Offset</th>
            <th className="border px-2 py-1">Last Value</th>
            <th className="border px-2 py-1">Action</th>
          </tr>
        </thead>
        <tbody>
          {compteurs.map((c) => (
            <tr key={c.annee_offset}>
              <td className="border px-2 py-1">{c.annee_offset}</td>
              <td className="border px-2 py-1">
                <input
                  type="number"
                  value={c.last_value}
                  onChange={(e) =>
                    setCompteurs((prev) =>
                      prev.map((p) =>
                        p.annee_offset === c.annee_offset
                          ? { ...p, last_value: Number(e.target.value) }
                          : p
                      )
                    )
                  }
                  className="border px-1 py-0.5 w-20"
                />
              </td>
              <td className="border px-2 py-1">
                <button
                  onClick={() => updateCompteur(c.annee_offset, c.last_value)}
                  className="bg-blue-500 text-white px-2 py-1 rounded"
                >
                  Save
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FacturationAdmin;
