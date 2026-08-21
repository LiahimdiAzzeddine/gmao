import React from 'react';
import { AlertCircle, FileX, Inbox, Search, Filter, Package } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: 'alert' | 'file' | 'inbox' | 'search' | 'filter' | 'package';
  fullScreen?: boolean;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Aucune demande',
  message = 'Aucune demande d\'intervention pour les filtres sélectionnés.',
  icon = 'alert',
  fullScreen = true,
  actionButton
}) => {
  const containerClasses = fullScreen 
    ? 'h-screen' 
    : 'py-12';

  const iconComponents = {
    alert: AlertCircle,
    file: FileX,
    inbox: Inbox,
    search: Search,
    filter: Filter,
    package: Package
  };

  const IconComponent = iconComponents[icon];

  return (
    <div className={containerClasses}>
      <div className="bg-white rounded-lg shadow-sm px-16 py-16 text-center max-w-6xl m-4">
        <IconComponent className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-600">{message}</p>
        
        {actionButton && (
          <button
            onClick={actionButton.onClick}
            className="mt-6 px-6 py-2.5 text-white rounded-lg font-medium transition-colors"
            style={{ backgroundColor: '#f15c00' }}
          >
            {actionButton.label}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;