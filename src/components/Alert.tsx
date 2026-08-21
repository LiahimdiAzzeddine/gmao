import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface AlertProps {
  type: 'error' | 'success' | 'info';
  message: string;
}

export function Alert({ type, message }: AlertProps) {
  const styles = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
    }
  };

  const style = styles[type];

  return (
    <div className={`mb-6 p-4 ${style.bg} border ${style.border} rounded-lg flex items-center gap-3`}>
      {style.icon}
      <p className={style.text}>{message}</p>
    </div>
  );
}
