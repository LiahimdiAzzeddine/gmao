import { useState, useEffect } from 'react';
import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Filter, X, ChevronDown, Search, ClipboardList, Wrench, Activity, AlertCircle, Settings } from 'lucide-react';
import { supabase, Machine } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import MainHeader from './MainHeader';
import ClientLayout from './ClientLayout';
import EmptyState from './Ui/EmptyState';
import { Clock, ArrowRight } from 'lucide-react';
import OrdresTravailList from './ot/OrdresTravailList';
import { ALL_MACHINE_STATES, MachineState, getMachineStateConfig, normalizeMachineState } from '../types/machineState';
// Import des composants refactorisés
import {
  MachineStatusDonutChart,
  PlanActionPreview,
  InterventionValidationBar,
  OTNonTraitesChart,
  ClientStats,
  OTByType,
  emptyClientStats
} from './ClientDashboard';

// export default function Dashboard() {
//   const navigate = useNavigate();
//   const [demandes, setDemandes] = useState<DemandeWithMachine[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterStatut, setFilterStatut] = useState<'tous' | 'en attente' | 'validÃƒÂ©e' | 'annulÃƒÂ©e' | string>('tous');
//   const [filterUrgence, setFilterUrgence] = useState<'tous' | 'faible' | 'moyenne' | 'ÃƒÂ©levÃƒÂ©e' | string>('tous');
//   const [filterPeriode, setFilterPeriode] = useState<'mois' | '3mois' | '6mois' | 'annee' | 'tous' | string>('mois');
//   const { profile } = useAuth();

//   // Pagination
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalCount, setTotalCount] = useState(0);
//   const itemsPerPage = 10;

//   const [showFilters, setShowFilters] = useState(false);

//   // Mock data
//   const activeFiltersCount = [
//     filterStatut !== 'tous',
//     filterUrgence !== 'tous',
//     filterPeriode !== 'mois',
//     searchTerm.trim() !== ''
//   ].filter(Boolean).length;


//   useEffect(() => {
//     loadDemandes();
//   }, [currentPage, filterStatut, filterUrgence, filterPeriode, searchTerm]);


//   function getDateFilter() {
//     const now = new Date();
//     let startDate = new Date();
//     switch (filterPeriode) {
//       case 'mois':
//         startDate.setMonth(now.getMonth() - 1);
//         break;
//       case '3mois':
//         startDate.setMonth(now.getMonth() - 3);
//         break;
//       case '6mois':
//         startDate.setMonth(now.getMonth() - 6);
//         break;
//       case 'annee':
//         startDate.setFullYear(now.getFullYear() - 1);
//         break;
//       case 'tous':
//         return null;
//     }
//     return startDate.toISOString();
//   }

//  async function loadDemandes() {
//   setLoading(true);

//   try {
//     let query = supabase
//       .from("demande_intervention")
//       .select(`
//         *,
//         machine:machines!inner (
//           *,
//           client:clients (*)
//         )
//       `, { count: "exact" });

//     // Ã°Å¸â€â€™ Consultant Ã¢â€ â€™ filtrer par SON client
//     if (profile?.role === "consultant") {
//       const { data: clientData, error: clientError } = await supabase
//         .from("clients")
//         .select("id")
//         .eq("profile_id", profile.id)
//         .single();

//       if (clientError) {
//         console.error("Erreur client:", clientError);
//       } else if (clientData) {
//         query = query.eq("machine.client_id", clientData.id);
//       }
//     }

//     // Filtre date
//     const dateFilter = getDateFilter();
//     if (dateFilter) {
//       query = query.gte("date_demande", dateFilter);
//     }

//     // Filtre statut
//     if (filterStatut !== "tous") {
//       query = query.eq("statut", filterStatut);
//     }

//     // Filtre urgence
//     if (filterUrgence !== "tous") {
//       query = query.eq("urgence", filterUrgence);
//     }

//     // Recherche
//     if (searchTerm.trim()) {
//       query = query.ilike("label", `%${searchTerm}%`);
//     }

//     // Pagination
//     const from = (currentPage - 1) * itemsPerPage;
//     const to = from + itemsPerPage - 1;

//     const { data, count, error } = await query
//       .order("date_demande", { ascending: false })
//       .range(from, to);

//     if (error) throw error;

//     setDemandes(data || []);
//     setTotalCount(count || 0);

//   } catch (error) {
//     console.error("Erreur lors du chargement des demandes:", error);
//   } finally {
//     setLoading(false);
//   }
// }




//   const totalPages = Math.ceil(totalCount / itemsPerPage);

//   const handlePageChange = (newPage: number) => {
//     if (newPage >= 1 && newPage <= totalPages) {
//       setCurrentPage(newPage);
//       window.scrollTo({ top: 0, behavior: 'smooth' });
//     }
//   };

//   const resetFilters = () => {
//     setFilterStatut('tous');
//     setFilterUrgence('tous');
//     setFilterPeriode('mois');
//     setSearchTerm('');
//     setCurrentPage(1);
//   };

//   return (
//     <div className="min-h-screen bg-slate-50">
//       {/* Header */}
//       <MainHeader title="Demandes d'Intervention" showAdminButton={profile?.role === 'admin'} />
//       {/* Filtres */}
//       <div className="max-w-6xl mx-auto px-4 py-6">
//         <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
//           {/* Barre de recherche + Bouton filtres */}
//           <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
//             <div className="flex gap-3 flex-col sm:flex-row">
//               {/* Champ de recherche */}
//               <div className="flex-1 relative group">
//                 <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
//                 <input
//                   type="text"
//                   value={searchTerm}
//                   onChange={(e) => {
//                     setSearchTerm(e.target.value);
//                     setCurrentPage(1);
//                   }}
//                   placeholder="Rechercher une machine..."
//                   className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
//                 />
//                 {searchTerm && (
//                   <button
//                     onClick={() => setSearchTerm('')}
//                     className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
//                   >
//                     <X size={16} />
//                   </button>
//                 )}
//               </div>

//               {/* Bouton Filtres */}
//               <button
//                 onClick={() => setShowFilters(!showFilters)}
//                 className={`relative flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-200 ${showFilters
//                   ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
//                   : activeFiltersCount > 0
//                     ? 'bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100'
//                     : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
//                   }`}
//               >
//                 <Filter size={18} className={showFilters ? 'rotate-180 transition-transform duration-300' : 'transition-transform duration-300'} />
//                 <span className="hidden sm:inline">Filtres</span>
//                 {activeFiltersCount > 0 && (
//                   <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[22px] h-[22px] px-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
//                     {activeFiltersCount}
//                   </span>
//                 )}
//                 <ChevronDown size={16} className={`ml-1 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
//               </button>
//             </div>
//           </div>

//           {/* Panel de filtres (collapsible avec animation) */}
//           <div
//             className={`overflow-hidden transition-all duration-300 ${showFilters ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
//               }`}
//           >
//             <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 space-y-6">
//               {/* Filtre PÃƒÂ©riode */}
//               <div>
//                 <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
//                   <div className="p-1.5 bg-indigo-100 rounded-lg">
//                     <Calendar size={16} className="text-indigo-600" />
//                   </div>
//                   PÃƒÂ©riode
//                 </label>
//                 <div className="flex gap-2 flex-wrap">
//                   {[
//                     { value: 'mois', label: 'Dernier mois' },
//                     { value: '3mois', label: '3 derniers mois' },
//                     { value: '6mois', label: '6 derniers mois' },
//                     { value: 'annee', label: 'DerniÃƒÂ¨re annÃƒÂ©e' },
//                     { value: 'tous', label: 'Toutes' }
//                   ].map((periode) => (
//                     <button
//                       key={periode.value}
//                       onClick={() => {
//                         setFilterPeriode(periode.value);
//                         setCurrentPage(1);
//                       }}
//                       className={`relative px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${filterPeriode === periode.value
//                         ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30 scale-105'
//                         : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
//                         }`}
//                     >
//                       {periode.label}
//                       {filterPeriode === periode.value && (
//                         <span className="absolute inset-0 rounded-xl bg-white/20 animate-pulse"></span>
//                       )}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               {/* Filtre Statut */}
//               <div>
//                 <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
//                   <div className="p-1.5 bg-blue-100 rounded-lg">
//                     <CheckCircle size={16} className="text-blue-600" />
//                   </div>
//                   Statut
//                 </label>
//                 <div className="flex gap-2 flex-wrap">
//                   {[
//                     { value: 'tous', label: 'Tous', icon: null },
//                     { value: 'en attente', label: 'En attente', color: 'blue' },
//                     { value: 'validÃƒÂ©e', label: 'ValidÃƒÂ©e', color: 'green' },
//                     { value: 'annulÃƒÂ©e', label: 'AnnulÃƒÂ©e', color: 'slate' }
//                   ].map((statut) => (
//                     <button
//                       key={statut.value}
//                       onClick={() => {
//                         setFilterStatut(statut.value);
//                         setCurrentPage(1);
//                       }}
//                       className={`relative px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${filterStatut === statut.value
//                         ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105'
//                         : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
//                         }`}
//                     >
//                       {statut.label}
//                       {filterStatut === statut.value && (
//                         <span className="absolute inset-0 rounded-xl bg-white/20 animate-pulse"></span>
//                       )}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               {/* Filtre Urgence */}
//               <div>
//                 <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
//                   <div className="p-1.5 bg-orange-100 rounded-lg">
//                     <AlertTriangle size={16} className="text-orange-600" />
//                   </div>
//                   Urgence
//                 </label>
//                 <div className="flex gap-2 flex-wrap">
//                   {[
//                     { value: 'tous', label: 'Tous', color: 'slate' },
//                     { value: 'faible', label: 'Faible', color: 'green' },
//                     { value: 'moyenne', label: 'Moyenne', color: 'yellow' },
//                     { value: 'ÃƒÂ©levÃƒÂ©e', label: 'Ãƒâ€°levÃƒÂ©e', color: 'red' }
//                   ].map((urgence) => (
//                     <button
//                       key={urgence.value}
//                       onClick={() => {
//                         setFilterUrgence(urgence.value);
//                         setCurrentPage(1);
//                       }}
//                       className={`relative px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${filterUrgence === urgence.value
//                         ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/30 scale-105'
//                         : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
//                         }`}
//                     >
//                       {urgence.label}
//                       {filterUrgence === urgence.value && (
//                         <span className="absolute inset-0 rounded-xl bg-white/20 animate-pulse"></span>
//                       )}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               {/* SÃƒÂ©parateur et bouton reset */}
//               {activeFiltersCount > 0 && (
//                 <div className="pt-4 border-t border-slate-200">
//                   <button
//                     onClick={resetFilters}
//                     className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:text-red-700 font-semibold hover:bg-red-50 rounded-xl transition-all group"
//                   >
//                     <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
//                     RÃƒÂ©initialiser tous les filtres
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Compteur de rÃƒÂ©sultats */}
//           <div className="flex items-center justify-between">
//             <div className="flex items-baseline gap-2">
//               <span className="text-3xl font-bold text-slate-800">{totalCount}</span>
//               <span className="text-sm font-medium text-slate-600">
//                 demande{totalCount > 1 ? 's' : ''} trouvÃƒÂ©e{totalCount > 1 ? 's' : ''}
//               </span>
//               {totalCount > 0 && (
//                 <>
//                   <span className="text-slate-300 mx-1">Ã¢â‚¬Â¢</span>
//                   <span className="text-sm text-slate-500 font-medium">
//                     Page {currentPage} sur {totalPages}
//                   </span>
//                 </>
//               )}
//             </div>

//             {/* Tags des filtres actifs (optionnel) */}
//             {activeFiltersCount > 0 && (
//               <div className="flex items-center gap-2 flex-wrap">
//                 {searchTerm && (
//                   <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
//                     <Search size={12} />
//                     {searchTerm}
//                     <button
//                       onClick={() => setSearchTerm('')}
//                       className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
//                     >
//                       <X size={12} />
//                     </button>
//                   </span>
//                 )}
//                 {filterStatut !== 'tous' && (
//                   <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-200">
//                     Statut: {filterStatut}
//                     <button
//                       onClick={() => setFilterStatut('tous')}
//                       className="hover:bg-purple-100 rounded-full p-0.5 transition-colors"
//                     >
//                       <X size={12} />
//                     </button>
//                   </span>
//                 )}
//                 {filterUrgence !== 'tous' && (
//                   <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-medium rounded-full border border-orange-200">
//                     Urgence: {filterUrgence}
//                     <button
//                       onClick={() => setFilterUrgence('tous')}
//                       className="hover:bg-orange-100 rounded-full p-0.5 transition-colors"
//                     >
//                       <X size={12} />
//                     </button>
//                   </span>
//                 )}
//                 {filterPeriode !== 'mois' && (
//                   <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
//                     PÃƒÂ©riode: {filterPeriode}
//                     <button
//                       onClick={() => setFilterPeriode('mois')}
//                       className="hover:bg-indigo-100 rounded-full p-0.5 transition-colors"
//                     >
//                       <X size={12} />
//                     </button>
//                   </span>
//                 )}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Liste des demandes */}
//         {loading ? (
//           <Loading
//             variant="dots"
//             size='sm'
//             fullScreen={false}
//             message="Chargement des donnÃƒÂ©es..."
//           />
//         ) : demandes.length === 0 ? (
//           <EmptyState
//             title="Aucune demande"
//             message="Aucune demande d'intervention pour les filtres sÃƒÂ©lectionnÃƒÂ©s."
//           />
//         ) : (
//           <div className='h-screen'>
//             <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
//               {demandes.map((demande) => (
//                 <DemandeCard
//                   key={demande.id}
//                   demande={demande}
//                   profile={profile as Profile}
//                   onEdit={() => {
//                     navigate(`/admin/demandes/edit/${demande.id}`);
//                   }}
//                   onClick={() => navigate(`/machine/${demande?.machine?.id}/${demande.id}`)}
//                 />
//               ))}
//             </div>

//             {/* Pagination */}
//             {totalPages > 1 && (
//               <div className="mt-8 flex items-center justify-center gap-2">
//                 <button
//                   onClick={() => handlePageChange(currentPage - 1)}
//                   disabled={currentPage === 1}
//                   className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors ${currentPage === 1
//                     ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
//                     : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
//                     }`}
//                 >
//                   <ChevronLeft size={18} />
//                   PrÃƒÂ©cÃƒÂ©dent
//                 </button>

//                 <div className="flex gap-1">
//                   {Array.from({ length: totalPages }, (_, i) => i + 1)
//                     .filter(page => {
//                       // Afficher les 3 premiÃƒÂ¨res pages, les 3 derniÃƒÂ¨res, et les pages autour de la page actuelle
//                       return (
//                         page === 1 ||
//                         page === totalPages ||
//                         (page >= currentPage - 1 && page <= currentPage + 1)
//                       );
//                     })
//                     .map((page, index, array) => {
//                       // Ajouter des ellipses si nÃƒÂ©cessaire
//                       if (index > 0 && page - array[index - 1] > 1) {
//                         return [
//                           <span key={`ellipsis-${page}`} className="px-3 py-2 text-slate-400">
//                             ...
//                           </span>,
//                           <button
//                             key={page}
//                             onClick={() => handlePageChange(page)}
//                             className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentPage === page
//                               ? 'bg-blue-600 text-white'
//                               : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
//                               }`}
//                           >
//                             {page}
//                           </button>
//                         ];
//                       }
//                       return (
//                         <button
//                           key={page}
//                           onClick={() => handlePageChange(page)}
//                           className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentPage === page
//                             ? 'bg-blue-600 text-white'
//                             : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
//                             }`}
//                         >
//                           {page}
//                         </button>
//                       );
//                     })}
//                 </div>

//                 <button
//                   onClick={() => handlePageChange(currentPage + 1)}
//                   disabled={currentPage === totalPages}
//                   className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors ${currentPage === totalPages
//                     ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
//                     : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
//                     }`}
//                 >
//                   Suivant
//                   <ChevronRight size={18} />
//                 </button>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


export function MachinesDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allMachines, setAllMachines] = useState<Machine[]>([]); // Toutes les machines chargées
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // État pour les compteurs d'OT par machine
  const [otCounts, setOtCounts] = useState<Record<string, number>>({});
  const [otClosedCounts, setOtClosedCounts] = useState<Record<string, number>>({});
  
  // Filtres et recherche - Initialiser depuis les URL params
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [filterEtat, setFilterEtat] = useState<string>(searchParams.get('etat') || 'tous');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination pour infinite scroll
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 9; // 3x3 grille

  // Ref pour l'observer
  const observerTarget = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Réinitialiser et charger depuis le début quand les filtres changent
    setAllMachines([]);
    setCurrentPage(1);
    setHasMore(true);
    loadClientMachines(1, true);
  }, [profile, searchTerm, filterEtat]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadClientMachines(currentPage + 1, false);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, loadingMore, currentPage]);

  // Charger les compteurs d'OT quand les machines changent
  useEffect(() => {
    if (allMachines.length > 0) {
      loadOTCounts();
    }
  }, [allMachines]);

  async function loadOTCounts() {
    const machineIds = allMachines.map(m => m.id);
    
    // Compter les OT non fermés (statut !== 'terminé' et !== 'clôturé_avec_anomalie')
    const { data: openData, error: openError } = await supabase
      .from('ordres_travail')
      .select('machine_id, statut')
      .in('machine_id', machineIds)
      .not('statut', 'in', '("terminé","clôturé_avec_anomalie")');

    if (!openError && openData) {
      const counts: Record<string, number> = {};
      openData.forEach(ot => {
        counts[ot.machine_id] = (counts[ot.machine_id] || 0) + 1;
      });
      setOtCounts(counts);
    }

    // Pour les consultants, compter aussi les OT clôturés
    if (profile?.role === 'consultant') {
      const { data: closedData, error: closedError } = await supabase
        .from('ordres_travail')
        .select('machine_id, statut')
        .in('machine_id', machineIds)
        .in('statut', ['terminé', 'clôturé_avec_anomalie']);

      if (!closedError && closedData) {
        const counts: Record<string, number> = {};
        closedData.forEach(ot => {
          counts[ot.machine_id] = (counts[ot.machine_id] || 0) + 1;
        });
        setOtClosedCounts(counts);
      }
    }
  }

  // Mettre à jour les URL params quand les filtres changent
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filterEtat !== 'tous') params.set('etat', filterEtat);
    
    setSearchParams(params, { replace: true });
  }, [searchTerm, filterEtat]);

  async function loadClientMachines(page: number, reset: boolean) {
    if (!profile) return;

    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Si c'est un consultant, récupérer son client_id
      if (profile.role === 'consultant') {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (clientError) {
          console.error('Erreur récupération client:', clientError);
          setLoading(false);
          setLoadingMore(false);
          return;
        }

        // Construire la requête avec filtres
        let query = supabase
          .from('machines')
          .select(`
            *,
            client:clients(*),
            poste_technique:postes_techniques(
              *,
              site:sites(*),
              domaine:domaines(*),
              lot:lots(*),
              secteur:secteurs(*)
            )
          `, { count: 'exact' })
          .eq('client_id', clientData.id);

        // Filtre par état
        if (filterEtat !== 'tous') {
          query = query.eq('etat', filterEtat);
        }

        // Recherche
        if (searchTerm.trim()) {
          query = query.or(`nom.ilike.%${searchTerm}%,modele.ilike.%${searchTerm}%,localisation.ilike.%${searchTerm}%`);
        }

        // Pagination
        const from = (page - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data: machinesData, count, error: machinesError } = await query
          .order('nom')
          .range(from, to);

        if (machinesError) throw machinesError;

        if (reset) {
          setAllMachines(machinesData || []);
        } else {
          setAllMachines(prev => [...prev, ...(machinesData || [])]);
        }
        
        setTotalCount(count || 0);
        setCurrentPage(page);
        setHasMore((machinesData?.length || 0) === itemsPerPage);
      } else if (profile.role === 'technicien') {
        // Les techniciens voient toutes les machines
        let query = supabase
          .from('machines')
          .select(`
            *,
            client:clients(*),
            poste_technique:postes_techniques(
              *,
              site:sites(*),
              domaine:domaines(*),
              lot:lots(*),
              secteur:secteurs(*)
            )
          `, { count: 'exact' });

        // Filtre par état
        if (filterEtat !== 'tous') {
          query = query.eq('etat', filterEtat);
        }

        // Recherche
        if (searchTerm.trim()) {
          query = query.or(`nom.ilike.%${searchTerm}%,modele.ilike.%${searchTerm}%,localisation.ilike.%${searchTerm}%`);
        }

        // Pagination
        const from = (page - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data: machinesData, count, error: machinesError } = await query
          .order('nom')
          .range(from, to);

        if (machinesError) throw machinesError;

        if (reset) {
          setAllMachines(machinesData || []);
        } else {
          setAllMachines(prev => [...prev, ...(machinesData || [])]);
        }
        
        setTotalCount(count || 0);
        setCurrentPage(page);
        setHasMore((machinesData?.length || 0) === itemsPerPage);
      } else {
        // Pour les admins, afficher les ordres de travail
        setAllMachines([]);
      }
    } catch (error) {
      console.error('Erreur chargement machines:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const resetFilters = () => {
    setSearchTerm('');
    setFilterEtat('tous');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filterEtat !== 'tous') count++;
    return count;
  };

  // Si c'est un admin, afficher les ordres de travail
  if (profile?.role === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50">
        <MainHeader title="Ordres de Travail" showAdminButton={true} />
        <div className="max-w-6xl mx-auto px-4 py-6">
          <OrdresTravailList />
        </div>
      </div>
    );
  }

  // Pour les consultants et techniciens, afficher les machines
  const pageTitle = profile?.role === 'consultant' ? 'Mes Machines' : 'Toutes les Machines';
  
  return (
    <ClientLayout>
      {/* En-tête */}
      <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 md:text-2xl lg:text-3xl">{pageTitle}</h1>
          <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm">
            Consultez votre parc de machines industrielles
          </p>
        </div>
        <div className="hidden rounded-lg border border-[#ff6b57]/30 bg-white px-3 py-1.5 text-xs font-bold text-[#ff6b57] md:block md:px-4 md:py-2 md:text-sm">
          {allMachines.length} / {totalCount} machines
        </div>
      </div>
        {/* Barre de recherche et filtres */}
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Barre de recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher une machine..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#ff6b57] focus:border-transparent text-sm transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Bouton Filtres */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                showFilters || getActiveFiltersCount() > 0
                  ? 'bg-[#ff6b57] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Filter size={18} />
              Filtres
              {getActiveFiltersCount() > 0 && (
                <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                  {getActiveFiltersCount()}
                </span>
              )}
              <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Panel de filtres */}
          {showFilters && (
            <div className="pt-4 mt-4 border-t border-slate-200">
              <div className="flex flex-wrap gap-3">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Filter size={16} />
                  État:
                </label>
                <button
                  onClick={() => {
                    setFilterEtat('tous');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterEtat === 'tous'
                      ? 'bg-[#ff6b57] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tous
                </button>
                {ALL_MACHINE_STATES.map((state) => {
                  const config = getMachineStateConfig(state);
                  return (
                    <button
                      key={state}
                      onClick={() => {
                        setFilterEtat(state);
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterEtat === state
                          ? 'bg-[#ff6b57] text-white'
                          : `${config.bgColor} ${config.textColor} hover:${config.hoverBg}`
                      }`}
                    >
                      {config.icon} {config.label}
                    </button>
                  );
                })}

                {getActiveFiltersCount() > 0 && (
                  <button
                    onClick={resetFilters}
                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-all"
                  >
                    <X size={16} />
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Compteur de résultats */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              <span className="font-semibold">{allMachines.length}</span> machine{allMachines.length > 1 ? 's' : ''} chargée{allMachines.length > 1 ? 's' : ''}
              {totalCount > allMachines.length && (
                <>
                  <span className="text-slate-300 mx-2">•</span>
                  <span>{totalCount} au total</span>
                </>
              )}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Skeleton cards */}
              {[...Array(itemsPerPage)].map((_, index) => (
                <div
                  key={index}
                  className="bg-white border-2 border-slate-200 rounded-xl p-5 animate-pulse"
                >
                  {/* Header skeleton */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    </div>
                    <div className="w-5 h-5 bg-slate-200 rounded ml-2"></div>
                  </div>

                  {/* Location skeleton */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-slate-200 rounded"></div>
                      <div className="h-4 bg-slate-200 rounded flex-1"></div>
                    </div>
                  </div>

                  {/* Badge skeleton */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-6 bg-slate-200 rounded-full w-24"></div>
                    <div className="h-6 bg-slate-200 rounded-full w-16"></div>
                  </div>

                  {/* Footer skeleton */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-slate-200 rounded"></div>
                      <div className="h-4 bg-slate-200 rounded w-40"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : allMachines.length === 0 ? (
          <div className="mt-4 md:mt-6">
            <EmptyState
              title="Aucune machine trouvée"
              message={
                getActiveFiltersCount() > 0
                  ? "Aucune machine ne correspond à vos critères de recherche."
                  : "Vous n'avez pas encore de machines enregistrées."
              }
            />
          </div>
        ) : (
          <>
            {/* Liste des machines */}
            <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allMachines.map((machine) => (
                  <button
                    key={machine.id}
                    onClick={() => navigate(`/machine/${machine.id}/?tab=historique`)}
                    className="group bg-white border-2 border-slate-200 hover:border-[#ff6b57] rounded-xl p-5 transition-all hover:shadow-lg text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-[#ff6b57] transition-colors truncate">
                          {machine.nom}
                        </h3>
                        <p className="text-sm text-slate-500 truncate">{machine.modele}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#ff6b57] group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
                    </div>

                    <div className="space-y-2">
                      {machine.poste_technique && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">
                            {machine.poste_technique.site?.nom} - {machine.poste_technique.batiment}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          getMachineStateConfig(machine.etat).bgColor
                        } ${getMachineStateConfig(machine.etat).textColor}`}>
                          <span className={`w-2 h-2 rounded-full ${
                            getMachineStateConfig(machine.etat).dotColor
                          }`} />
                          {getMachineStateConfig(machine.etat).label}
                        </span>
                        
                        {otCounts[machine.id] > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {otCounts[machine.id]} OT
                          </span>
                        )}
                        
                        {profile?.role === 'consultant' && otClosedCounts[machine.id] > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {otClosedCounts[machine.id]} Clôturés
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-sm text-[#ff6b57] font-semibold group-hover:text-[#f04438]">
                        <Clock className="w-4 h-4" />
                        <span>Voir les ordres de travail</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Infinite scroll observer target */}
            <div ref={observerTarget} className="flex justify-center py-4 md:py-8">
              {loadingMore && (
                <div className="flex flex-col items-center gap-2 md:gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-2 border-slate-300 border-t-[#ff6b57]"></div>
                  <p className="text-xs md:text-sm text-slate-600">Chargement...</p>
                </div>
              )}
              {!hasMore && allMachines.length > 0 && (
                <p className="text-xs md:text-sm text-slate-500 font-medium">
                  Toutes les machines ont été chargées
                </p>
              )}
            </div>
          </>
        )}
    </ClientLayout>
  );
}

// Les types et composants ont été déplacés dans ClientDashboard/

function normalizeOtType(value?: string | null): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function ClientStatsDashboard() {
  const { profile, client, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ClientStats>(emptyClientStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [profile?.id, client?.id]);

  async function loadStats() {
    if (!profile) return;

    try {
      setLoading(true);
      setError(null);

      let clientId = client?.id;
      if (!clientId) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (clientError) throw clientError;
        clientId = clientData?.id;
      }

      if (!clientId) {
        setStats(emptyClientStats);
        return;
      }

      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select('id, etat')
        .eq('client_id', clientId);

      if (machinesError) throw machinesError;

      const machines = machinesData || [];
      const machineIds = machines.map((machine) => machine.id);

      const nextStats: ClientStats = {
        ...emptyClientStats,
        machines: machines.length,
        machinesEnService: machines.filter((machine) => normalizeMachineState(machine.etat) === MachineState.EN_SERVICE).length,
        machinesEnPanne: machines.filter((machine) => normalizeMachineState(machine.etat) === MachineState.EN_PANNE).length,
        machinesHorsService: machines.filter((machine) => normalizeMachineState(machine.etat) === MachineState.HORS_SERVICE).length,
      };

      if (machineIds.length > 0) {
        // Calculer la date de début de l'année en cours
        const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
        
        const [
          ordresTraitement,
          interventions,
          interventionsValidees,
          interventionsValideesByClient,
          interventionsValideesByAdmin,
          otNonTraites,
          planActions,
        ] = await Promise.all([
          supabase
            .from('ordres_travail')
            .select(`
              id,
              interventions:interventions!interventions_ot_fkey(
                id,
                valide
              )
            `)
            .in('machine_id', machineIds),
          supabase.from('interventions').select('*', { count: 'exact', head: true }).in('machine_id', machineIds),
          supabase.from('interventions').select('*', { count: 'exact', head: true }).in('machine_id', machineIds).eq('valide', true),
          // Interventions validées par le client (année en cours)
          supabase.from('interventions')
            .select('*', { count: 'exact', head: true })
            .in('machine_id', machineIds)
            .eq('client_valide', true)
            .gte('date_debut', startOfYear),
          // Interventions validées par l'admin (année en cours)
          supabase.from('interventions')
            .select('*', { count: 'exact', head: true })
            .in('machine_id', machineIds)
            .eq('valide', true)
            .gte('date_debut', startOfYear),
          // OT non traités (récupérer tous les OT avec leur type de l'année en cours)
          supabase
            .from('ordres_travail')
            .select(`
              id,
              type,
              created_at,
              interventions:interventions!interventions_ot_fkey(
                id,
                valide
              )
            `)
            .in('machine_id', machineIds)
            .gte('created_at', startOfYear),
          // Actions correctives issues des OT préventifs
          supabase
            .from('ordres_travail')
            .select(`
              id,
              type,
              ot_parent_id,
              mode_defaillance,
              action_recommandee,
              rpn,
              date_expression,
              date_programmee,
              machine:machines(nom, modele),
              interventions:interventions!interventions_ot_fkey(id, valide)
            `)
            .in('machine_id', machineIds)
            .not('mode_defaillance', 'is', null)
            .not('ot_parent_id', 'is', null)
            .order('date_expression', { ascending: false }),
        ]);

        if (ordresTraitement.error) throw ordresTraitement.error;
        if (interventions.error) throw interventions.error;
        if (interventionsValidees.error) throw interventionsValidees.error;
        if (interventionsValideesByClient.error) throw interventionsValideesByClient.error;
        if (interventionsValideesByAdmin.error) throw interventionsValideesByAdmin.error;
        if (otNonTraites.error) throw otNonTraites.error;
        if (planActions.error) throw planActions.error;

        const ordres = ordresTraitement.data || [];
        const otNonTraitesCount = ordres.filter((ordre) =>
          !(ordre.interventions || []).some((intervention) => intervention.valide === true)
        ).length;

        // Calculer les OT non traités par type
        const otNonTraitesData = otNonTraites.data || [];
        const otNonTraitesFiltered = otNonTraitesData.filter((ot) =>
          !(ot.interventions || []).some((intervention) => intervention.valide === true)
        );

        const typeColors: Record<string, string> = {
          'préventif': '#3b82f6',    // Bleu
          'correctif': '#f59e0b',    // Orange
          'curatif': '#ef4444',      // Rouge
        };

        const typeLabels: Record<string, string> = {
          'préventif': 'Préventif',
          'correctif': 'Correctif',
          'curatif': 'Curatif',
        };

        // Grouper par type
        const otByTypeMap = otNonTraitesFiltered.reduce((acc, ot) => {
          const type = ot.type || 'autre';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const otNonTraitesParType: OTByType[] = Object.entries(otByTypeMap).map(([type, count]) => ({
          type: typeLabels[type] || type,
          count,
          color: typeColors[type] || '#6b7280', // Gris par défaut
        }));

        const planActionCandidates = (planActions.data || []) as any[];
        const parentIds = Array.from(new Set(
          planActionCandidates.map((action) => action.ot_parent_id).filter(Boolean)
        ));
        let preventiveParentIds = new Set<string>();

        if (parentIds.length > 0) {
          const { data: parents, error: parentsError } = await supabase
            .from('ordres_travail')
            .select('id, type')
            .in('id', parentIds);

          if (parentsError) throw parentsError;
          preventiveParentIds = new Set(
            (parents || [])
              .filter((parent) => normalizeOtType(parent.type).includes('preventif'))
              .map((parent) => parent.id)
          );
        }

        const clientPlanActions = planActionCandidates
          .filter((action) =>
            normalizeOtType(action.type).includes('correctif') &&
            preventiveParentIds.has(action.ot_parent_id)
          )
          .sort((a, b) => new Date(b.date_expression || b.date_programmee || 0).getTime() - new Date(a.date_expression || a.date_programmee || 0).getTime());

        const planActionsCloturees = clientPlanActions.filter((action) =>
          (action.interventions || []).some((intervention: any) => intervention.valide === true)
        ).length;

        nextStats.ordresTravail = ordres.length;
        nextStats.otOuverts = otNonTraitesCount;
        nextStats.interventions = interventions.count || 0;
        nextStats.interventionsValidees = interventionsValidees.count || 0;
        nextStats.interventionsValideesByClient = interventionsValideesByClient.count || 0;
        nextStats.interventionsValideesByAdmin = interventionsValideesByAdmin.count || 0;
        nextStats.otNonTraitesParType = otNonTraitesParType;
        nextStats.planActionsTotal = clientPlanActions.length;
        nextStats.planActionsCloturees = planActionsCloturees;
        nextStats.planActionsRpnEleve = clientPlanActions.filter((action) => (action.rpn || 0) >= 60).length;
        nextStats.planActionsRecentes = clientPlanActions.slice(0, 3).map((action) => ({
          id: action.id,
          equipment: [action.machine?.nom, action.machine?.modele].filter(Boolean).join(' · ') || 'Équipement',
          modeDefaillance: action.mode_defaillance || 'Défaillance non précisée',
          actionRecommandee: action.action_recommandee || 'Action non précisée',
          rpn: action.rpn,
          dateExpression: action.date_expression || action.date_programmee,
          cloturee: (action.interventions || []).some((intervention: any) => intervention.valide === true),
        }));
      }

      setStats(nextStats);
    } catch (err) {
      console.error('Erreur chargement statistiques client:', err);
      setError("Impossible de charger les statistiques du tableau de bord.");
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      label: 'Machines',
      value: stats.machines,
      subtitle: `${stats.machinesEnService} en service`,
      icon: Settings,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: 'OT non traités',
      value: stats.otOuverts,
      subtitle: 'Sans validation admin',
      icon: ClipboardList,
      color: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-100',
    },
    {
      label: 'Interventions',
      value: stats.interventions,
      subtitle: `${stats.interventionsValidees} validées`,
      icon: Wrench,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: 'Machines en panne',
      value: stats.machinesEnPanne,
      subtitle: stats.machinesEnPanne > 0 ? 'À surveiller' : 'Aucune panne',
      icon: AlertCircle,
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-100',
    },
  ];

  return (
    <FitnessStyleClientDashboard
      stats={stats}
      loading={loading}
      error={error}
      profile={profile}
      client={client}
      navigate={navigate}
      statCards={statCards}
      signOut={signOut}
    />
  );
}

type DashboardStatCard = {
  label: string;
  value: number;
  subtitle: string;
  icon: any; // LucideIcon
  color: string;
  bg: string;
  border: string;
};

type FitnessStyleClientDashboardProps = {
  stats: ClientStats;
  loading: boolean;
  error: string | null;
  profile: any;
  client: any;
  navigate: (path: string) => void;
  statCards: DashboardStatCard[];
  signOut: () => Promise<void>;
};

function FitnessStyleClientDashboard({
  stats,
  loading,
  error,
  client,
  navigate,
}: FitnessStyleClientDashboardProps) {
  const clientName = client?.raison_sociale || client?.prenom || 'Mon espace';
  const machineHealth = stats.machines > 0 ? Math.round((stats.machinesEnService / stats.machines) * 100) : 0;
  const interventionRate = stats.interventions > 0 ? Math.round((stats.interventionsValidees / stats.interventions) * 100) : 0;
  const otRate = stats.ordresTravail > 0 ? Math.round((stats.otOuverts / stats.ordresTravail) * 100) : 0;

  const statCardsDisplay = [
    {
      label: 'Machines',
      value: stats.machines,
      subtitle: `${stats.machinesEnService} en service`,
      icon: Settings,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: 'OT non traités',
      value: stats.otOuverts,
      subtitle: 'Sans validation admin',
      icon: ClipboardList,
      color: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-100',
    },
    {
      label: 'Interventions',
      value: stats.interventions,
      subtitle: `${stats.interventionsValidees} validées`,
      icon: Wrench,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
  ];

  return (
    <ClientLayout>
      {/* Header - Optimisé mobile */}
      <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          {/* Logo client */}
          {client?.logo_url ? (
            <img
              src={client.logo_url}
              alt={`Logo ${clientName}`}
              className="h-12 w-12 rounded-lg bg-white object-contain p-1.5 ring-2 ring-slate-200 md:h-16 md:w-16 md:p-2"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff735f] to-[#f04438] text-lg font-black text-white shadow-lg md:h-16 md:w-16 md:text-xl">
              {clientName.substring(0, 2).toUpperCase()}
            </div>
          )}
          
          <div>
            <h1 className="text-xl font-black text-slate-900 md:text-2xl lg:text-3xl">Hello, {clientName}</h1>
            <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm">Suivi de votre parc machines et maintenance</p>
          </div>
        </div>
        <div className="hidden rounded-lg border border-[#ff6b57]/30 bg-white px-3 py-1.5 text-xs font-bold text-[#ff6b57] md:block md:px-4 md:py-2 md:text-sm">
          {new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}
        </div>
      </div>

              {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5">
                  {[...Array(6)].map((_, index) => (
                    <div key={index} className="h-28 animate-pulse rounded-lg bg-white md:h-32" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Cartes statistiques - 2 colonnes mobile, 3 colonnes desktop */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5">
                    {statCardsDisplay.map((card) => {
                      const Icon = card.icon;
                      return (
                        <div key={card.label} className="rounded-lg bg-gradient-to-br from-[#ff735f] to-[#f04438] p-3 text-white shadow-lg shadow-red-200 sm:p-4 md:p-5">
                          <div className="flex items-start justify-between gap-2 md:gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="text-xl font-black sm:text-2xl">{card.value}</div>
                              <div className="mt-1 text-xs font-bold sm:text-sm md:mt-2">{card.label}</div>
                              <div className="mt-0.5 text-[10px] font-medium text-white/80 sm:text-xs md:mt-1">{card.subtitle}</div>
                            </div>
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-black/20 sm:h-10 sm:w-10 md:h-11 md:w-11">
                              <Icon size={16} className="sm:w-[18px] sm:h-[18px] md:w-[20px] md:h-[20px]" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Diagrammes principaux - Stack vertical sur mobile */}
                  <div className="mt-4 grid grid-cols-1 gap-4 md:mt-6 md:gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    {/* Aperçu du plan d'action */}
                    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
                      <div className="mb-4 flex items-center gap-2 sm:mb-5">
                        <ClipboardList className="text-[#ff6b57]" size={18} />
                        <h2 className="text-base font-black text-slate-900 md:text-lg">Aperçu du plan d’action</h2>
                      </div>
                      <PlanActionPreview
                        total={stats.planActionsTotal}
                        cloturees={stats.planActionsCloturees}
                        rpnEleve={stats.planActionsRpnEleve}
                        actions={stats.planActionsRecentes}
                        onOpen={() => navigate('/mon-plan-action')}
                      />
                    </div>

                    {/* État du parc */}
                    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
                      <div className="mb-4 flex items-center gap-2 sm:mb-5">
                        <Activity className="text-[#ff6b57]" size={18} />
                        <h2 className="text-base font-black text-slate-900 md:text-lg">État du parc</h2>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <MiniMetric label="En service" value={stats.machinesEnService} tone="emerald" />
                        <MiniMetric label="En panne" value={stats.machinesEnPanne} tone="red" />
                        <MiniMetric label="Hors service" value={stats.machinesHorsService} tone="slate" />
                      </div>
                      <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
                        <ProgressLine label="Santé machines" value={machineHealth} />
                        <ProgressLine label="Interventions validées" value={interventionRate} />
                        <ProgressLine label="OT non traités" value={otRate} />
                      </div>
                    </div>
                  </div>

                  {/* Nouveaux diagrammes - Stack vertical sur mobile */}
                  <div className="mt-4 grid grid-cols-1 gap-4 md:mt-6 md:gap-5 xl:grid-cols-2">
                    {/* Diagramme: Machines par statut */}
                    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
                      <div className="mb-4 flex items-center gap-2 sm:mb-5">
                        <Settings className="text-[#ff6b57]" size={18} />
                        <h2 className="text-base font-black text-slate-900 md:text-lg">Machines par statut</h2>
                      </div>
                      <div className="flex items-center justify-center py-6 sm:py-8">
                        <MachineStatusDonutChart stats={stats} />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-3">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-emerald-700 sm:gap-2 sm:text-xs">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 sm:h-3 sm:w-3" />
                            En service
                          </div>
                          <div className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">{stats.machinesEnService}</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-red-700 sm:gap-2 sm:text-xs">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-500 sm:h-3 sm:w-3" />
                            En panne
                          </div>
                          <div className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">{stats.machinesEnPanne}</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-700 sm:gap-2 sm:text-xs">
                            <span className="h-2.5 w-2.5 rounded-full bg-slate-400 sm:h-3 sm:w-3" />
                            Hors service
                          </div>
                          <div className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">{stats.machinesHorsService}</div>
                        </div>
                      </div>
                    </div>

                    {/* Diagramme: Interventions validées (année en cours) */}
                    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
                      <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <Wrench className="text-[#ff6b57]" size={18} />
                          <h2 className="text-base font-black text-slate-900 md:text-lg">Validations {new Date().getFullYear()}</h2>
                        </div>
                        <span className="inline-block rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 sm:px-3 sm:text-xs">
                          Année en cours
                        </span>
                      </div>
                      <div className="flex items-end justify-center gap-6 py-6 sm:gap-8 sm:py-8">
                        <InterventionValidationBar 
                          label="Client"
                          value={stats.interventionsValideesByClient}
                          color="bg-blue-500"
                          maxValue={Math.max(stats.interventionsValideesByClient, stats.interventionsValideesByAdmin, 1)}
                        />
                        <InterventionValidationBar 
                          label="Admin"
                          value={stats.interventionsValideesByAdmin}
                          color="bg-[#ff6b57]"
                          maxValue={Math.max(stats.interventionsValideesByClient, stats.interventionsValideesByAdmin, 1)}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:mt-4 sm:gap-4 sm:pt-4">
                        <div className="rounded-lg bg-blue-50 p-2.5 text-center sm:p-3">
                          <div className="text-[10px] font-semibold text-blue-700 sm:text-xs">Validées par client</div>
                          <div className="mt-1 text-xl font-black text-blue-900 sm:text-2xl">{stats.interventionsValideesByClient}</div>
                        </div>
                        <div className="rounded-lg bg-red-50 p-2.5 text-center sm:p-3">
                          <div className="text-[10px] font-semibold text-red-700 sm:text-xs">Validées par admin</div>
                          <div className="mt-1 text-xl font-black text-red-900 sm:text-2xl">{stats.interventionsValideesByAdmin}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Diagramme: OT non traités par type */}
                  <div className="mt-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 md:mt-6 md:p-5">
                    <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="text-[#ff6b57]" size={18} />
                        <h2 className="text-base font-black text-slate-900 md:text-lg">OT non traités par type</h2>
                      </div>
                      <span className="inline-block rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-700 sm:px-3 sm:text-xs">
                        {stats.otOuverts} OT • {new Date().getFullYear()}
                      </span>
                    </div>
                    <OTNonTraitesChart otByType={stats.otNonTraitesParType} />
                  </div>
                </>
              )}
    </ClientLayout>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'red' | 'orange' | 'slate' }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    orange: 'bg-orange-50 text-orange-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className={`rounded-lg px-2 py-3 text-center sm:px-3 sm:py-4 ${tones[tone]}`}>
      <div className="text-lg font-black sm:text-xl">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold sm:mt-1 sm:text-xs">{label}</div>
    </div>
  );
}

function ProgressLine({ label, value }: { label: string; value: number }) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-black text-slate-900">{normalized}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#ff6b57]" style={{ width: `${normalized}%` }} />
      </div>
    </div>
  );
}

// Les composants ont été déplacés dans ClientDashboard/
// - MachineStatusDonutChart
// - MaintenanceActivityChart
// - InterventionValidationBar
// - OTNonTraitesChart

export default function Dashboard() {
  const { profile } = useAuth();

  if (profile?.role === 'consultant') {
    return <ClientStatsDashboard />;
  }

  return <MachinesDashboard />;
}
