import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface InfoFieldProps {
  label: string;
  value?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export const InfoField = ({ label, value, icon: Icon, className = '' }: InfoFieldProps) => {
  return (
    <div className={`group ${className}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      {Icon ? (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-100 group-hover:border-orange-200 transition-colors">
          <Icon className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <p className="text-sm text-gray-900 font-medium">{value || '—'}</p>
        </div>
      ) : (
        <div className="p-2 rounded-lg bg-white border border-gray-100 group-hover:border-orange-200 transition-colors">
          <p className="text-sm text-gray-900 font-medium">{value || '—'}</p>
        </div>
      )}
    </div>
  );
};
