import { XCircle } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
}

export const ErrorState = ({ message }: ErrorStateProps) => {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-gradient-to-br from-rose-50 to-rose-100 border-2 border-rose-200 rounded-2xl p-8 text-center shadow-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-200 rounded-full mb-4">
          <XCircle className="w-8 h-8 text-rose-600" />
        </div>
        <h3 className="text-xl font-bold text-rose-900 mb-2">Erreur de chargement</h3>
        <p className="text-rose-700">{message || "Ordre de travail introuvable"}</p>
      </div>
    </div>
  );
};
