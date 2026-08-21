import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
}

const Loading: React.FC<LoadingProps> = ({
  message = 'Chargement en cours...',
  fullScreen = true,
  size = 'md',
  variant = 'spinner'
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const containerClasses = fullScreen 
    ? 'h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100' 
    : 'py-12 flex items-center justify-center';

  const renderSpinner = () => (
    <div className="relative">
      <div className={`${sizeClasses[size]} border-4 rounded-full animate-spin`} style={{ borderColor: '#f15c0033', borderTopColor: '#f15c00' }}></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-5 h-5' : 'w-8 h-8'} rounded-full animate-ping opacity-20`} style={{ backgroundColor: '#f15c00' }}></div>
      </div>
    </div>
  );

  const renderDots = () => (
    <div className="flex items-center gap-2">
      <div className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'} rounded-full animate-bounce`} style={{ backgroundColor: '#f15c00', animationDelay: '0ms' }}></div>
      <div className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'} rounded-full animate-bounce`} style={{ backgroundColor: '#f15c00', animationDelay: '150ms' }}></div>
      <div className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'} rounded-full animate-bounce`} style={{ backgroundColor: '#f15c00', animationDelay: '300ms' }}></div>
    </div>
  );

  const renderPulse = () => (
    <Loader2 
      className={`${sizeClasses[size]} animate-spin`}
      strokeWidth={2.5}
      style={{ color: '#f15c00' }}
    />
  );

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div className="inline-flex items-center justify-center mb-4">
          {renderLoader()}
        </div>
        
        {message && (
          <p className={`text-slate-600 font-medium ${
            size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'
          }`}>
            {message}
          </p>
        )}

      </div>
    </div>
  );
};

export default Loading;