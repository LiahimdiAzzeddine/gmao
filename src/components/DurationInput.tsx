import { useState } from 'react';

interface DurationInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

interface ParsedTime {
  hours: string;
  minutes: string;
}

// Composant Input Durée
export function DurationInput({ 
  value, 
  onChange, 
  label = "Temps passé", 
  required = false 
}: DurationInputProps) {
  
  // Convertir la valeur interval PostgreSQL (HH:MM:SS) en heures et minutes
  const parseInterval = (intervalStr: string): ParsedTime => {
    if (!intervalStr) return { hours: '', minutes: '' };
    
    // Format PostgreSQL: "HH:MM:SS" ou "HH:MM:SS.ms"
    const match = intervalStr.match(/^(\d+):(\d+):(\d+)/);
    if (match) {
      return {
        hours: match[1],
        minutes: match[2]
      };
    }
    return { hours: '', minutes: '' };
  };

  // Convertir heures et minutes en format interval PostgreSQL
  const formatInterval = (hours: string, minutes: string): string => {
    const h = hours || '0';
    const m = minutes || '0';
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
  };

  const parsed = parseInterval(value);
  const [hours, setHours] = useState<string>(parsed.hours);
  const [minutes, setMinutes] = useState<string>(parsed.minutes);

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHours = e.target.value;
    setHours(newHours);
    onChange(formatInterval(newHours, minutes));
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newMinutes = e.target.value;
    // Limiter les minutes à 59
    if (parseInt(newMinutes) > 59) newMinutes = '59';
    setMinutes(newMinutes);
    onChange(formatInterval(hours, newMinutes));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <input
            type="number"
            min="0"
            value={hours}
            onChange={handleHoursChange}
            required={required}
            placeholder="0"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-xs text-slate-500 mt-1 block">Heures</span>
        </div>
        <span className="text-slate-400 text-xl pb-5">:</span>
        <div className="flex-1">
          <input
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={handleMinutesChange}
            placeholder="0"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-xs text-slate-500 mt-1 block">Minutes</span>
        </div>
      </div>
    </div>
  );
}