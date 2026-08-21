import { Calendar, CheckCircle, Clock } from 'lucide-react';
import { OrdreTravailDetail } from '../../types/ot';
import { formatDate } from '../../utils/dateFormatters';

interface DateCardsProps {
  ordre: OrdreTravailDetail;
}

export const DateCards = ({ ordre }: DateCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="group relative bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 hover:border-orange-400 rounded-xl p-4 transition-all duration-300 hover:shadow-lg overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100/50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative flex items-center gap-2.5 mb-2">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md group-hover:scale-110 transition-transform">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">Date programmée</h3>
        </div>
        <p className="relative text-base font-bold text-orange-700">
          {formatDate(ordre.date_programmee)}
        </p>
      </div>

      <div className="group relative bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 hover:border-emerald-400 rounded-xl p-4 transition-all duration-300 hover:shadow-lg overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-100/50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative flex items-center gap-2.5 mb-2">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-md group-hover:scale-110 transition-transform">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">Date d'exécution</h3>
        </div>
        <p className="relative text-base font-bold text-emerald-700">
          {ordre.date_execution ? formatDate(ordre.date_execution) : 'Non exécuté'}
        </p>
      </div>

      <div className="group relative bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 hover:border-slate-400 rounded-xl p-4 transition-all duration-300 hover:shadow-lg overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-slate-100/50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative flex items-center gap-2.5 mb-2">
          <div className="p-2 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg shadow-md group-hover:scale-110 transition-transform">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">Date de création</h3>
        </div>
        <p className="relative text-base font-bold text-slate-700">
          {formatDate(ordre.created_at)}
        </p>
      </div>
    </div>
  );
};
