import { useState } from 'react';

export default function AppPanneInfo() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">⚠️ Application temporairement indisponible</h1>
        <p className="mb-6 text-gray-700">
          L'application est actuellement en maintenance. Elle sera de nouveau disponible au plus tard dans 2 jours, d'ici demain soir.
        </p>
        <p className="text-gray-500 text-sm">
          Merci de votre compréhension.
        </p>
      </div>
    </div>
  );
}
