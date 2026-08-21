import { useEffect, useRef, useState } from "react";
import { Machine } from "../../lib/supabase";
import { AlertCircle, CheckCircle2, Search, Wrench, X } from "lucide-react";

export function MachineMultiSelect({
  machines,
  selectedIds,
  onChange,
  placeholder = "Sélectionner des machines..."
}: {
  machines: Machine[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredMachines = machines.filter(machine =>
    machine.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.localisation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleMachine = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(mid => mid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onChange(filteredMachines.map(m => m.id));
  };

  const deselectAll = () => {
    onChange([]);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="space-y-3 relative" ref={dropdownRef}>
           <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-1">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p>Créez des demandes groupées pour machines similaires.</p>
            </div>
          </div>
        </div>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white cursor-pointer hover:border-blue-400 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-blue-600" />
          {selectedIds.length > 0 ? (
            <span className="font-medium text-slate-900">
              {selectedIds.length} machine{selectedIds.length > 1 ? 's' : ''} sélectionnée{selectedIds.length > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <Search className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
          <div className="p-3 border-b border-slate-200 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Rechercher..."
                className="w-full pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm('');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  selectAll();
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium transition-colors"
              >
                Tout sélectionner
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deselectAll();
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 font-medium transition-colors"
              >
                Tout désélectionner
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredMachines.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                Aucune machine trouvée
              </div>
            ) : (
              filteredMachines.map((machine) => (
                <div
                  key={machine.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMachine(machine.id);
                  }}
                  className={`p-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0 ${selectedIds.includes(machine.id) ? 'bg-blue-50' : ''
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedIds.includes(machine.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-slate-300'
                      }`}>
                      {selectedIds.includes(machine.id) && (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <Wrench className="w-4 h-4 text-slate-400" />
                    <div className="flex-1">
                      <span className="font-medium text-slate-900">{machine.nom}</span>
                      <div className="text-sm text-slate-500">{machine.localisation}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const machine = machines.find(m => m.id === id);
            if (!machine) return null;
            return (
              <div
                key={id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm"
              >
                <Wrench className="w-3 h-3" />
                <span className="font-medium">{machine.nom}</span>
                <button
                  type="button"
                  onClick={() => toggleMachine(id)}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}