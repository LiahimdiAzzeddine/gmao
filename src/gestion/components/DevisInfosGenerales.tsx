import { Building2 } from 'lucide-react';
import Select from 'react-select';
import { ClientDevisInsert, Interlocuteur, Emetteur, Contact, Monetaire } from '../../types/devis';
import { useMemo } from 'react';

interface FormData {
  numDevis: string;
  emetteur: any;
  client_devis_id: number | null;
  contact_num: number | null;
  kgMO: number;
  kgMAT: number;
  monetaire_id: number | null;
  ht_ttc: 'HT' | 'TTC';
  type_devis_id: number | null; 
  domaine_id: number | null;
}

interface Props {
  formData: FormData;
  setFormData: any;
  clients: ClientDevisInsert[];
  monetaires: Monetaire[];
  contactOptions: Contact[];
  interlocuteurs: Interlocuteur[];
  emetteurs: Emetteur[];
  setSymbol: any;
  domaines: any[];
}

export default function DevisInfosGenerales({
  formData,
  setFormData,
  clients,
  contactOptions,
  monetaires,
  emetteurs,
  setSymbol,
  domaines,
}: Props) {
  // Styles personnalisés pour react-select
  const customStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: 'white',
      borderColor: '#fed7aa',
      borderRadius: '0.5rem',
      padding: '0.125rem',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#fdba74',
      },
      '&:focus-within': {
        borderColor: 'transparent',
        boxShadow: '0 0 0 2px #fdba74',
      },
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: '0.5rem',
      marginTop: '0.25rem',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected ? '#f97316' : state.isFocused ? '#fed7aa' : 'white',
      color: state.isSelected ? 'white' : '#1f2937',
      '&:active': {
        backgroundColor: '#ea580c',
      },
    }),
  };

  // Options pour Type de devis
  const typeDomineOptions = domaines.map((d: any) => ({
    value: d.id,
    label: d.libelle+"(" + d.code + ")",
  }));
  // Options pour Émetteur
  const emetteurOptions = emetteurs.map((e) => ({
    value: e.id,
    label: e.nom,
  }));

  // Options pour Client
  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: c.client,
  }));

  // Filtrer les contacts en fonction du client sélectionné
  const filteredContactOptions = useMemo(() => {
    if (!formData.client_devis_id) {
      return [];
    }
    return contactOptions.filter((contact) => {
      return contact.client_id === formData.client_devis_id;
    });
  }, [contactOptions, formData.client_devis_id]);

  // Options pour Contact (filtrées)
  const contactOptionsFormatted = filteredContactOptions.map((c) => ({
    value: c.num_contact,
    label: c.nom,
  }));

  // Options pour Monétaire
  const monetaireOptions = monetaires.map((m) => ({
    value: m.id,
    label: `${m.id} - ${m.unite || 'N/A'}`,
  }));

  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-t-xl shadow-lg">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Building2 className="w-5 h-5" />
        Informations générales
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* N° Devis */}
        <div>
          <label className="block text-orange-50 text-sm font-medium mb-2">N° Devis *</label>
          <input
            type="text"
            readOnly
            disabled
            value={formData.numDevis}
            onChange={(e) => setFormData({ ...formData, numDevis: e.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-transparent"
            placeholder="DEV-2025-001"
          />
        </div>

        {/* Domaine */}
        <div>
          <label className="block text-orange-50 text-sm font-medium mb-2">Domaine *</label>
          <Select
            value={typeDomineOptions.find((option) => option.value === formData.domaine_id)}
            onChange={(option) => setFormData({ ...formData, domaine_id: option?.value || null })}
            options={typeDomineOptions}
            styles={customStyles}
            placeholder="Sélectionner un domaine..."
            isSearchable
            isClearable
            noOptionsMessage={() => 'Aucun domaine trouvé'}
          />
        </div>

        {/* Émetteur */}
        <div>
          <label className="block text-orange-50 text-sm font-medium mb-2">Émetteur *</label>
          <Select
            value={emetteurOptions.find((option) => option.value === formData.emetteur)}
            onChange={(option) => setFormData({ ...formData, emetteur: option?.value })}
            options={emetteurOptions}
            styles={customStyles}
            placeholder="Rechercher un émetteur..."
            isSearchable
            noOptionsMessage={() => 'Aucun émetteur trouvé'}
          />
        </div>

        {/* Client */}
        <div>
          <label className="block text-orange-50 text-sm font-medium mb-2">Client *</label>
          <Select
            value={clientOptions.find((option) => option.value === formData.client_devis_id)}
            onChange={(option) => {
              setFormData({ 
                ...formData, 
                client_devis_id: option?.value || null,
                contact_num: null
              });
            }}
            options={clientOptions}
            styles={customStyles}
            placeholder="Rechercher un client..."
            isSearchable
            isClearable
            noOptionsMessage={() => 'Aucun client trouvé'}
          />
        </div>

        {/* Monétaire */}
        <div>
          <label className="block text-orange-50 text-sm font-medium mb-2">Devise *</label>
          <Select
            value={monetaireOptions.find((option) => option.value === formData.monetaire_id)}
            onChange={(option) => {
              setFormData({ ...formData, monetaire_id: option?.value || null });
              setSymbol(
                monetaires.find((m) => m.id === option?.value)?.symbol || ''
              );
            }}
            options={monetaireOptions}
            styles={customStyles}
            placeholder="Sélectionner une devise..."
            isSearchable
            isClearable
            noOptionsMessage={() => 'Aucune devise trouvée'}
          />
        </div>

        {/* Contact */}
        <div>
          <label className="block text-orange-50 text-sm font-medium mb-2">Contact</label>
          <Select
            value={contactOptionsFormatted.find((option) => Number(option.value) === Number(formData.contact_num))}
            onChange={(option) =>
              setFormData({ ...formData, contact_num: option?.value || null })
            }
            options={contactOptionsFormatted}
            styles={customStyles}
            placeholder={
              formData.client_devis_id 
                ? "Rechercher un contact..." 
                : "Sélectionner d'abord un client"
            }
            isSearchable
            isClearable
            isDisabled={!formData.client_devis_id}
            noOptionsMessage={() => 
              formData.client_devis_id 
                ? 'Aucun contact trouvé pour ce client' 
                : 'Sélectionner d\'abord un client'
            }
          />
        </div>

        {/* HT / TTC */}
        <div>
          <label className="block text-orange-50 text-sm font-medium mb-2">Type de prix *</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, ht_ttc: 'HT' })}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                formData.ht_ttc === 'HT'
                  ? 'bg-orange-400 text-white border-red-500 shadow-md'
                  : 'bg-white text-orange-600 shadow-md hover:bg-orange-300'
              }`}
            >
              HT
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, ht_ttc: 'TTC' })}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                formData.ht_ttc === 'TTC'
                  ? 'bg-orange-400 text-white border-red-500 shadow-md'
                  : 'bg-white text-orange-600 shadow-md hover:bg-orange-300'
              }`}
            >
              TTC
            </button>
          </div>
        </div>

        {/* KG MO */}
        <div>
          <label className="block text-orange-50 text-sm font-medium mb-2">KG Main d'œuvre</label>
          <input
            type="number"
            step="0.01"
            value={formData.kgMO}
            onChange={(e) => setFormData({ ...formData, kgMO: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2.5 bg-white border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-transparent"
          />
        </div>

        {/* KG MAT */}
        <div>
          <label className="block text-orange-50 text-sm font-medium mb-2">KG Matériel</label>
          <input
            type="number"
            step="0.01"
            value={formData.kgMAT}
            onChange={(e) => setFormData({ ...formData, kgMAT: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2.5 bg-white border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}