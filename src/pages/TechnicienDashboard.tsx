import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, PlayCircle, CheckCircle2, ClipboardList, 
  AlertCircle, Calendar, Wrench, Settings, ChevronRight, XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import TechnicienLayout from '../components/TechnicienLayout';
import { getOtStatusLabel, normalizeOtStatus } from '../utils/otStatus';
import { getInterventionValidationLabel } from '../utils/interventionStatus';

interface OrdreTravail {
  id: string;
  numot: number | null;
  type: string;
  statut: string;
  date_programmee: string | null;
  created_at: string;
  machine: {
    id: string;
    nom: string;
    modele: string | null;
    localisation: string | null;
    client: {
      raison_sociale: string;
      prenom: string;
    } | null;
  } | null;
  interventions: Array<{
    id: string;
    valide: boolean | null;
  }> | null;
}

export default function TechnicienDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [ordresTravail, setOrdresTravail] = useState<OrdreTravail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadOrdresTravail();
    }
  }, [profile?.id]);

  async function loadOrdresTravail() {
    if (!profile?.id) return;

    setLoading(true);
    try {
      // Charger les OT assignés au technicien qui ne sont PAS clôturés
      const { data, error } = await supabase
        .from('ordres_travail')
        .select(`
          id,
          numot,
          type,
          statut,
          date_programmee,
          created_at,
          machine:machines!inner(
            id,
            nom,
            modele,
            localisation,
            client:clients(
              raison_sociale,
              prenom
            )
          ),
          interventions:interventions!interventions_ot_fkey(
            id,
            valide
          )
        `)
        .eq('technicien_id', profile.id)
        .neq('statut', 'terminé')
        .neq('statut', 'clôturé_avec_anomalie')
        .order('date_programmee', { ascending: true });

      if (error) throw error;

      setOrdresTravail(data || []);
    } catch (error) {
      console.error('Erreur chargement OT:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatutConfig = (statut: string) => {
    const configs: Record<string, { label: string; color: string; icon: typeof Clock }> = {
      'prévu': { label: 'À faire', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
      'en_cours': { label: 'En cours', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: PlayCircle },
      'terminé': { label: 'Clôturé', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
      'clôturé_avec_anomalie': { label: 'Clôturé avec anomalie', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle },
      'annulé': { label: 'Annulé', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    };
    const normalizedStatus = normalizeOtStatus(statut);
    const config = normalizedStatus ? configs[normalizedStatus] : undefined;
    return config
      ? { ...config, label: getOtStatusLabel(normalizedStatus) }
      : { label: getOtStatusLabel(statut), color: 'bg-slate-100 text-slate-800 border-slate-200', icon: Clock };
  };

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      'préventif': { label: 'Préventif', color: 'bg-purple-100 text-purple-800' },
      'correctif': { label: 'Correctif', color: 'bg-orange-100 text-orange-800' },
      'curatif': { label: 'Curatif', color: 'bg-red-100 text-red-800' },
    };
    return configs[type?.toLowerCase()] || { label: type, color: 'bg-slate-100 text-slate-800' };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  const stats = {
    total: ordresTravail.length,
    aFaire: ordresTravail.filter(ot => ot.statut === 'prévu').length,
    enCours: ordresTravail.filter(ot => ot.statut === 'en_cours').length,
  };

  if (loading) {
    return (
      <TechnicienLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-600 font-semibold">Chargement de vos OT...</p>
          </div>
        </div>
      </TechnicienLayout>
    );
  }

  return (
    <TechnicienLayout>
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900">
              Bonjour {profile?.nom} 👋
            </h1>
            <p className="text-sm md:text-base text-slate-600 mt-1">
              Vous avez <span className="font-bold text-blue-600">{stats.total}</span> ordres de travail actifs
            </p>
          </div>
          <ClipboardList className="text-blue-600" size={32} />
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 md:p-5 text-white shadow-lg shadow-blue-200/50">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-2xl md:text-3xl font-black">{stats.total}</div>
              <div className="text-xs md:text-sm font-bold uppercase tracking-wide mt-1">Total</div>
            </div>
            <div className="h-10 w-10 md:h-12 md:w-12 bg-white/20 rounded-lg flex items-center justify-center">
              <ClipboardList size={20} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-4 md:p-5 text-white shadow-lg shadow-amber-200/50">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-2xl md:text-3xl font-black">{stats.aFaire}</div>
              <div className="text-xs md:text-sm font-bold uppercase tracking-wide mt-1">À faire</div>
            </div>
            <div className="h-10 w-10 md:h-12 md:w-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 md:p-5 text-white shadow-lg shadow-green-200/50 col-span-2 md:col-span-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-2xl md:text-3xl font-black">{stats.enCours}</div>
              <div className="text-xs md:text-sm font-bold uppercase tracking-wide mt-1">En cours</div>
            </div>
            <div className="h-10 w-10 md:h-12 md:w-12 bg-white/20 rounded-lg flex items-center justify-center">
              <PlayCircle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Liste des OT */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-slate-100 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-black text-slate-900">Mes ordres de travail</h2>
          <button
            onClick={() => navigate('/toutes-machines')}
            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Toutes les machines
            <ChevronRight size={16} />
          </button>
        </div>

        {ordresTravail.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <CheckCircle2 size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Aucun OT en cours</h3>
            <p className="text-slate-600">Tous vos ordres de travail sont à jour !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ordresTravail.map((ot) => {
              const statutConfig = getStatutConfig(ot.statut);
              const typeConfig = getTypeConfig(ot.type);
              const StatutIcon = statutConfig.icon;

              return (
                <div
                  key={ot.id}
                  onClick={() => navigate(`/ordres-travail/${ot.id}`)}
                  className="group cursor-pointer bg-slate-50 hover:bg-slate-100 rounded-lg p-3 md:p-4 border border-slate-200 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <ClipboardList size={16} className="text-blue-600 flex-shrink-0" />
                        <h3 className="text-base md:text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                          OT #{ot.numot || 'N/A'}
                        </h3>
                      </div>
                      {ot.machine && (
                        <>
                          <p className="text-sm font-semibold text-slate-700 truncate">{ot.machine.nom}</p>
                          {ot.machine.client && (
                            <p className="text-xs text-slate-500 truncate">
                              {ot.machine.client.raison_sociale || ot.machine.client.prenom}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${statutConfig.color}`}>
                        <StatutIcon size={12} />
                        {statutConfig.label}
                      </span>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    {ot.machine?.modele && (
                      <div className="flex items-center gap-1">
                        <Settings size={12} className="text-slate-400" />
                        <span className="font-medium">{ot.machine.modele}</span>
                      </div>
                    )}
                    {ot.date_programmee && (
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        <span className="font-medium">{formatDate(ot.date_programmee)}</span>
                      </div>
                    )}
                  </div>

                  {ot.interventions && ot.interventions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-1.5 text-xs">
                        {ot.interventions.some(i => i.valide === true) ? (
                          <>
                            <CheckCircle2 size={12} className="text-green-600" />
                            <span className="font-semibold text-green-700">{getInterventionValidationLabel(true, 'admin')}</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={12} className="text-amber-600" />
                            <span className="font-semibold text-amber-700">{getInterventionValidationLabel(false, 'admin')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Raccourci Scanner QR */}
      <div className="mt-4 md:mt-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 md:p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 md:h-16 md:w-16 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Wrench size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-base md:text-lg font-black mb-1">Besoin d'intervenir sur une machine ?</h3>
            <p className="text-xs md:text-sm text-blue-100">Scannez le QR code de la machine pour accéder rapidement à sa fiche</p>
          </div>
        </div>
      </div>
    </TechnicienLayout>
  );
}
