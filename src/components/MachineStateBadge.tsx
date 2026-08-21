import { getMachineStateConfig } from '../types/machineState';

interface MachineStateBadgeProps {
  etat: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showDot?: boolean;
}

export default function MachineStateBadge({ 
  etat, 
  size = 'md', 
  showIcon = true,
  showDot = true 
}: MachineStateBadgeProps) {
  const config = getMachineStateConfig(etat);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm'
  };

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  };

  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${config.bgColor} ${config.textColor} ${sizeClasses[size]}`}
      title={config.description}
    >
      {showDot && (
        <span className={`rounded-full ${config.dotColor} ${dotSizeClasses[size]}`} />
      )}
      {showIcon && config.icon}
      {config.label}
    </span>
  );
}
