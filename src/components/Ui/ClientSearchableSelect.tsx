import { useEffect, useRef, useState } from "react";
import { Client } from "../../lib/supabase";
import { Building2, CheckCircle2, Search, X } from "lucide-react";

export function ClientSearchableSelect({
  clients,
  value,
  onChange,
  placeholder = "Rechercher un client..."
}: {
  clients: Client[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedClient = clients.find(c => c.id === value);

  const filteredClients = clients.filter(client =>
    (client.raison_sociale?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (client.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (client.telephone?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

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
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white cursor-pointer hover:border-blue-400 transition-colors flex items-center justify-between"
      >
        {selectedClient ? (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-slate-900">
              {selectedClient.raison_sociale || selectedClient.prenom || 'Client sans nom'}
            </span>
            {selectedClient.telephone && (
              <span className="text-slate-500 text-sm">({selectedClient.telephone})</span>
            )}
          </div>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <Search className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
          <div className="p-3 border-b border-slate-200">
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
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredClients.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                Aucun client trouvé
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(client.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`p-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0 ${value === client.id ? 'bg-blue-50' : ''
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-900">
                      {client.raison_sociale || client.prenom || 'Client sans nom'}
                    </span>
                    {value === client.id && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 ml-auto" />
                    )}
                  </div>
                  <div className="text-sm text-slate-500 ml-6">
                    {client.telephone && `Tel: ${client.telephone}`}
                    {client.adresse && ` - ${client.adresse}`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}