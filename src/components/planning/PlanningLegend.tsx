import { Check } from 'lucide-react';

export function PlanningLegend() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mt-4">
      <h3 className="font-semibold text-slate-800 mb-4">Légende</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">✓</span>
          </div>
          <span className="text-sm text-slate-600">Maintenance planifiée</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-6 h-6">
            <div className="absolute inset-0 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white">
              <Check size={8} className="text-white" />
            </div>
          </div>
          <span className="text-sm text-slate-600">Intervention approuvée</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-6 h-6">
            <div className="absolute inset-0 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
          </div>
          <span className="text-sm text-slate-600">Intervention en attente</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">!</span>
          </div>
          <span className="text-sm text-slate-600">Intervention non planifiée</span>
        </div>
      </div>
    </div>
  );
}
