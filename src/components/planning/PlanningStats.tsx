import { Calendar } from 'lucide-react';
import { PlanningItem } from '../../lib/supabase';

interface PlanningStatsProps {
  planningData: PlanningItem[];
}

export function PlanningStats({ planningData }: PlanningStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Calendar className="text-blue-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-600">Total équipements</p>
            <p className="text-2xl font-bold text-slate-800">{planningData.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 rounded-lg">
            <Calendar className="text-slate-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-600">Hebdomadaires</p>
            <p className="text-2xl font-bold text-slate-800">
              {planningData.filter(p => p.hebdomadaire).length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <Calendar className="text-green-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-600">Mensuelles</p>
            <p className="text-2xl font-bold text-slate-800">
              {planningData.filter(p => p.mensuel).length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Calendar className="text-orange-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-600">Trimestrielles</p>
            <p className="text-2xl font-bold text-slate-800">
              {planningData.filter(p => p.trimestriel).length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-100 rounded-lg">
            <Calendar className="text-red-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-600">Annuelles</p>
            <p className="text-2xl font-bold text-slate-800">
              {planningData.filter(p => p.annuelle).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
