import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface InfoCardProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
  iconColor?: string;
}

export const InfoCard = ({
  icon: Icon,
  title,
  children,
  className = '',
  iconColor = 'text-orange-600'
}: InfoCardProps) => {
  return (
    <div className={`group bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-orange-200 ${className}`}>
      <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-gray-100">
        <div className={`p-2 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 group-hover:from-orange-100 group-hover:to-orange-200 transition-all duration-300 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{title}</h2>
      </div>
      <div className="space-y-2.5">
        {children}
      </div>
    </div>
  );
};
