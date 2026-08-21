import { Calendar } from 'lucide-react';
import React from 'react';

interface Props {
  formData: {
    dateFacture: string;
    dateEcheance: string;
    dateFinTrv: string;
    factureReference: string;
  };
  setFormData: any;
}

export default function DatesFacturation({ formData, setFormData }: Props) {
  return (
    <div className="p-6 bg-orange-50 border-t border-orange-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-orange-600" />
        Dates et facturation
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Date facture
          </label>
          <input
            type="date"
            value={formData.dateFacture}
            onChange={(e) => setFormData({ ...formData, dateFacture: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Date échéance
          </label>
          <input
            type="date"
            value={formData.dateEcheance}
            onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Date fin travaux
          </label>
          <input
            type="date"
            value={formData.dateFinTrv}
            onChange={(e) => setFormData({ ...formData, dateFinTrv: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Référence facture
          </label>
          <input
            type="text"
            value={formData.factureReference}
            onChange={(e) => setFormData({ ...formData, factureReference: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="N° facture"
          />
        </div>
      </div>
    </div>
  );
}
