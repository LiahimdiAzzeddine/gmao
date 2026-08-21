import { Calendar } from 'lucide-react';
import React from 'react';

interface FormData {
  date_devis: string; // Format ISO 8601 pour timestamptz
}

interface Props {
  formData: FormData;
  setFormData: any;
}

export default function DevisPeriode({ formData, setFormData }: Props) {
  // Convertir timestamptz en format date pour l'input
  const getDateValue = () => {
    if (!formData.date_devis) return '';
    
    try {
      const date = new Date(formData.date_devis);
      // Retourner au format YYYY-MM-DD pour l'input
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    
    if (dateValue) {
      // Convertir la date sélectionnée en timestamptz (ISO 8601)
      const date = new Date(dateValue);
      // Mettre l'heure à midi pour éviter les problèmes de timezone
      date.setHours(12, 0, 0, 0);
      
      setFormData({ 
        ...formData, 
        date_devis: date.toISOString() // Format timestamptz
      });
    } else {
      setFormData({ ...formData, date_devis: '' });
    }
  };

  // Formater la date pour l'affichage
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Aucune date sélectionnée';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return 'Date invalide';
    }
  };

  return (
    <div className="p-6 bg-orange-50 border-b border-orange-100 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-orange-600" />
        Date du Devis
      </h3>

      <div className="grid grid-cols-1 gap-4">
        {/* Date du devis */}
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Date du devis *
          </label>
          <input
            type="date"
            value={getDateValue()}
            onChange={handleDateChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            required
          />
        </div>
      </div>

      {/* Affichage de la date sélectionnée */}
      <div className="mt-4 p-3 bg-white rounded-lg border border-orange-200">
        <p className="text-sm text-gray-600">
          Date sélectionnée : 
          <span className="font-semibold text-orange-600 ml-2">
            {formatDate(formData.date_devis)}
          </span>
        </p>
      </div>
    </div>
  );
}