import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase, Client, Machine, Profile } from '../../lib/supabase';
import { Calendar, Wrench, AlertCircle, Loader2, PenTool } from 'lucide-react';
import { toast } from 'react-toastify';
import Select from 'react-select';

interface FormData {
  client_id: string;
  machine_id: string;
  date_programmee: string;
  technicien_id: string;
  observations: string;
  cause: string;
  statut: 'prévu' | 'en_cours' | 'terminé' | 'annulé';
}

export default function DemandeCorrectiveForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [clients, setClients] = useState<Client[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [techniciens, setTechniciens] = useState<Profile[]>([]);
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    client_id: '',
    machine_id: '',
    date_programmee: new Date().toISOString().split('T')[0],
    technicien_id: '',
    observations: '',
    cause: '',
    statut: 'prévu'
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (isEditMode && id) {
      loadOrdreTravail(id);
    }
  }, [id, isEditMode]);

  useEffect(() => {
    if (formData.client_id) {
      const filtered = machines.filter(m => m.client_id === formData.client_id);
      setFilteredMachines(filtered);
      // Ne réinitialiser machine_id que si on n'est pas en mode édition
      if (!isEditMode) {
        setFormData(prev => ({ ...prev, machine_id: '' }));
      }
    } else {
      setFilteredMachines([]);
    }
  }, [formData.client_id, machines, isEditMode]);

  const loadInitialData = async () => {
    try {
      const [clientsRes, machinesRes, techniciensRes] = await Promise.all([
        supabase.from('clients').select('*').order('raison_sociale'),
        supabase.from('machines').select('*, client:clients(*)').order('nom'),
        supabase.from('profiles').select('*').eq('role', 'technicien').order('nom')
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (machinesRes.error) throw machinesRes.error;
      if (techniciensRes.error) throw techniciensRes.error;

      setClients(clientsRes.data || []);
      setMachines(machinesRes.data || []);
      setTechniciens(techniciensRes.data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Impossible de charger les données. Veuillez réessayer.');
    }
  };

  const loadOrdreTravail = async (otId: string) => {
    try {
      setLoadingData(true);
      
      const { data, error } = await supabase
        .from('ordres_travail')
        .select(`
          *,
          machine:machines(
            id,
            nom,
            client_id
          )
        `)
        .eq('id', otId)
        .eq('type', 'correctif')
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          client_id: data.machine?.client_id || '',
          machine_id: data.machine_id,
          date_programmee: data.date_programmee?.split('T')[0] || '',
          technicien_id: data.technicien_id || '',
          observations: data.observations || '',
          cause: data.cause || '',
          statut: data.statut || 'prévu'
        });
      }
    } catch (err) {
      console.error('Erreur lors du chargement de l\'OT:', err);
      toast.error('Erreur lors du chargement de l\'ordre de travail');
      navigate('/admin/ot-correctifs');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.machine_id) {
      toast.error('Veuillez sélectionner une machine');
      return;
    }

    if (!formData.date_programmee) {
      toast.error('Veuillez sélectionner une date d\'intervention');
      return;
    }

    setLoading(true);

    try {
      const otData = {
        machine_id: formData.machine_id,
        technicien_id: formData.technicien_id || null,
        date_programmee: formData.date_programmee,
        observations: formData.observations || null,
        cause: formData.cause || null,
        statut: formData.statut,
        type: 'correctif'
      };

      if (isEditMode && id) {
        // Mode édition
        const { error: updateError } = await supabase
          .from('ordres_travail')
          .update(otData)
          .eq('id', id);

        if (updateError) throw updateError;

        toast.success('Ordre de travail modifié avec succès');
      } else {
        // Mode création
        const { error: insertError } = await supabase
          .from('ordres_travail')
          .insert([otData]);

        if (insertError) throw insertError;

        toast.success('Ordre de travail correctif créé avec succès');
      }
      
      setTimeout(() => {
        navigate('/admin/ot-correctifs');
      }, 500);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      toast.error(`Erreur lors de la ${isEditMode ? 'modification' : 'création'} de l'ordre de travail`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/ot-correctifs');
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200">
          <div className="border-b border-slate-200 bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6 rounded-t-xl">
            <div className="flex items-center gap-3">
              <PenTool className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {isEditMode ? 'Modifier l\'Ordre de Travail Correctif' : 'Créer un Ordre de Travail Correctif'}
                </h1>
                <p className="text-orange-100 text-sm mt-1">
                  {isEditMode ? 'Modifiez les détails de l\'intervention corrective' : 'Planifiez une intervention corrective sur une machine'}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-8 mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* SECTION 1: SÉLECTION MACHINE */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-bold">1</span>
                </div>
                Machine concernée
              </div>

              <div className="ml-10 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Client
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                    required
                    disabled={isEditMode}
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.raison_sociale || client.prenom}
                      </option>
                    ))}
                  </select>
                  {isEditMode && (
                    <p className="text-xs text-slate-500 mt-2">
                      Le client ne peut pas être modifié en mode édition
                    </p>
                  )}
                </div>

                {formData.client_id && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Machine
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={formData.machine_id}
                      onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                      required
                      disabled={isEditMode}
                    >
                      <option value="">Sélectionner une machine</option>
                      {filteredMachines.map((machine) => (
                        <option key={machine.id} value={machine.id}>
                          {machine.nom} {machine.numero_serie && `- ${machine.numero_serie}`}
                        </option>
                      ))}
                    </select>
                    {isEditMode && (
                      <p className="text-xs text-slate-500 mt-2">
                        La machine ne peut pas être modifiée en mode édition
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: PLANIFICATION */}
            <div className="border-t border-slate-200 pt-8 space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-bold">2</span>
                </div>
                Planification de l'intervention
              </div>

              <div className="ml-10 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date d'intervention souhaitée
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date_programmee}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, date_programmee: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                {isEditMode && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Statut
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={formData.statut}
                      onChange={(e) => setFormData({ ...formData, statut: e.target.value as any })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                      required
                    >
                      <option value="prévu">À faire</option>
                      <option value="en_cours">En cours</option>
                      <option value="terminé">Clôturé</option>
                      <option value="annulé">Annulé</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: DÉTAILS DE L'INTERVENTION */}
            <div className="border-t border-slate-200 pt-8 space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-bold">3</span>
                </div>
                Détails de l'intervention
              </div>

              <div className="ml-10 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Technicien assigné (optionnel)
                  </label>
                  <Select
                    value={
                      formData.technicien_id
                        ? (() => {
                            const tech = techniciens.find(t => t.id === formData.technicien_id);
                            return tech ? { value: tech.id, label: tech.nom } : null;
                          })()
                        : null
                    }
                    onChange={(option) => setFormData({ ...formData, technicien_id: option?.value || '' })}
                    options={techniciens.map(tech => ({
                      value: tech.id,
                      label: tech.nom
                    }))}
                    isClearable
                    placeholder="Sélectionner un technicien..."
                    noOptionsMessage={() => "Aucun technicien disponible"}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        padding: '0.5rem',
                        borderColor: state.isFocused ? '#f97316' : '#cbd5e1',
                        boxShadow: state.isFocused ? '0 0 0 2px rgba(249, 115, 22, 0.2)' : 'none',
                        '&:hover': {
                          borderColor: '#f97316'
                        }
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected
                          ? '#f97316'
                          : state.isFocused
                          ? '#fed7aa'
                          : 'white',
                        color: state.isSelected ? 'white' : '#334155',
                        cursor: 'pointer',
                        '&:active': {
                          backgroundColor: '#ea580c'
                        }
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: '#94a3b8'
                      })
                    }}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Vous pouvez assigner un technicien maintenant ou plus tard
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cause / Origine de l'intervention
                  </label>
                  <input
                    type="text"
                    value={formData.cause}
                    onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Ex: Panne électrique, fuite d'huile, bruit anormal..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Observations / Description du problème
                  </label>
                  <textarea
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    placeholder="Décrivez le problème rencontré, les symptômes observés, ou toute autre information utile pour le technicien..."
                  />
                </div>
              </div>
            </div>

            {/* BOUTONS D'ACTION */}
            <div className="border-t border-slate-200 pt-8 flex justify-end gap-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isEditMode ? 'Modification en cours...' : 'Création en cours...'}
                  </>
                ) : (
                  <>
                    <Wrench className="w-5 h-5" />
                    {isEditMode ? 'Modifier l\'ordre de travail' : 'Créer l\'ordre de travail'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}