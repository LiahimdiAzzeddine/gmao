export function InterventionValidationBar({ 
  label, 
  value, 
  color, 
  maxValue 
}: { 
  label: string; 
  value: number; 
  color: string; 
  maxValue: number;
}) {
  const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const displayHeight = Math.max(heightPercent, 8); // Hauteur minimale pour la visibilité

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-48 w-20 items-end">
        <div 
          className={`w-full rounded-t-lg ${color} transition-all duration-500 ease-out`}
          style={{ height: `${displayHeight}%` }}
        >
          {value > 0 && (
            <div className="flex h-full items-center justify-center">
              <span className="text-lg font-black text-white">{value}</span>
            </div>
          )}
        </div>
      </div>
      <div className="text-sm font-bold text-slate-700">{label}</div>
    </div>
  );
}
