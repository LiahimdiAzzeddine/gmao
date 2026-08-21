import { useState, useEffect, useRef, useCallback } from 'react'
import { Filter, X, Wrench, XCircle, LayoutGrid, List, Calendar, User, Building2, Loader2 } from 'lucide-react'
import { Filters, ITEMS_PER_PAGE, useOrdresTravail } from '../../hooks/useOrdresTravail'
import {  getStatutConfig, getTypePlanColor } from './getStatutConfig'
import OrdreTravailCard from './OrdreTravailCard'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { renderRecurrence } from '../../utils/renderRecurrence'
import { TypeOt } from '../../types/ot'

// Composant principal
type OrdresTravailListProps = {
  fixedTypeOt?: TypeOt
  hideTypeFilter?: boolean
}

export default function OrdresTravailList({ fixedTypeOt, hideTypeFilter = false }: OrdresTravailListProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const observerTarget = useRef<HTMLDivElement>(null)
  
  // Initialiser depuis les URL params
  const [page, setPage] = useState(1)
  const [allOrdres, setAllOrdres] = useState<any[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>((searchParams.get('view') as 'grid' | 'list') || 'list')
  const [filters, setFilters] = useState<Filters>({
    clientId: searchParams.get('client') || '',
    machineSearch: searchParams.get('machine') || '',
    statut: searchParams.get('statut') || '',
    typeOt: fixedTypeOt || searchParams.get('type') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || ''
  })
  
  const { ordres, loading, error, totalCount, clients } = useOrdresTravail(filters, page)
  
  // Réinitialiser quand les filtres changent
  useEffect(() => {
    setAllOrdres([])
    setPage(1)
    setHasMore(true)
  }, [filters])
  
  // Ajouter les nouveaux ordres à la liste
  useEffect(() => {
    if (ordres.length > 0) {
      setAllOrdres(prev => {
        // Éviter les doublons
        const existingIds = new Set(prev.map(o => o.id))
        const newOrdres = ordres.filter(o => !existingIds.has(o.id))
        return [...prev, ...newOrdres]
      })
      
      // Vérifier s'il y a encore des éléments à charger
      setHasMore(allOrdres.length + ordres.length < totalCount)
    }
  }, [ordres, totalCount])
  
  // Intersection Observer pour le scroll infini
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1)
        }
      },
      { threshold: 0.1 }
    )
    
    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }
    
    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loading])
  
  // Mettre à jour les URL params quand les filtres changent
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.clientId) params.set('client', filters.clientId)
    if (filters.machineSearch) params.set('machine', filters.machineSearch)
    if (filters.statut) params.set('statut', filters.statut)
    if (filters.typeOt && !fixedTypeOt) params.set('type', filters.typeOt)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    if (viewMode !== 'list') params.set('view', viewMode)
    
    setSearchParams(params, { replace: true })
  }, [filters, viewMode, setSearchParams])
  
  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }
  
  const clearFilters = () => {
    setFilters({
      clientId: '',
      machineSearch: '',
      statut: '',
      typeOt: fixedTypeOt || '',
      dateFrom: '',
      dateTo: ''
    })
  }
  
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (fixedTypeOt && key === 'typeOt') return false
    return value !== ''
  })
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (fixedTypeOt && key === 'typeOt') return false
    return value !== ''
  }).length
  
  // Utiliser allOrdres au lieu de ordres pour l'affichage
  const displayOrdres = allOrdres.length > 0 ? allOrdres : ordres

  if (loading && displayOrdres.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="h-40 bg-gradient-to-r from-orange-400/20 to-orange-500/20 rounded-2xl animate-pulse" />
            <div className="h-32 bg-white/50 rounded-xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-72 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-red-800 mb-2">Erreur de chargement</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Barre de filtres - Design amélioré */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Filtres de recherche</h3>
                <p className="text-xs text-gray-500">Affinez vos résultats</p>
              </div>
              {hasActiveFilters && (
                <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full border border-orange-200">
                  {activeFiltersCount} actif{activeFiltersCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-orange-600 hover:text-white hover:bg-orange-600 font-medium flex items-center gap-2 transition-all px-4 py-2 rounded-lg border border-orange-200 hover:border-orange-600"
              >
                <X className="w-4 h-4" />
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Client</label>
              <select
                value={filters.clientId}
                onChange={(e) => updateFilter('clientId', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white hover:border-gray-400"
              >
                <option value="">Tous les clients</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.raison_sociale}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Rechercher Machine</label>
              <input
                type="text"
                value={filters.machineSearch}
                onChange={(e) => updateFilter('machineSearch', e.target.value)}
                placeholder="Nom ou modèle..."
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white hover:border-gray-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Statut</label>
              <select
                value={filters.statut}
                onChange={(e) => updateFilter('statut', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white hover:border-gray-400"
              >
                <option value="">Tous les statuts</option>
                <option value="prévu">À faire</option>
                <option value="en_cours">En cours</option>
                <option value="terminé">Clôturé</option>
                <option value="clôturé_avec_anomalie">Clôturé avec anomalie</option>
                <option value="annulé">Annulé</option>
              </select>
            </div>

            {!hideTypeFilter && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</label>
                <select
                  value={filters.typeOt}
                  onChange={(e) => updateFilter('typeOt', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white hover:border-gray-400"
                >
                  <option value="">Tous les types</option>
                  <option value="préventif">Préventif</option>
                  <option value="correctif">Correctif</option>
                  <option value="curatif">Curatif</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date début</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white hover:border-gray-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date fin</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white hover:border-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Compteur de résultats et contrôles - Design amélioré */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">{totalCount}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {totalCount} ordre{totalCount > 1 ? 's' : ''} trouvé{totalCount > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-gray-500">
                  {displayOrdres.length} chargé{displayOrdres.length > 1 ? 's' : ''}
                  {hasMore && ' • Scroll pour plus'}
                </p>
              </div>
            </div>

            {/* Toggle vue grille/liste - Design amélioré */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-orange-600 border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Vue grille"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Grille</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${
                  viewMode === 'list'
                    ? 'bg-white shadow-sm text-orange-600 border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Vue liste"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Liste</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cards/Liste des ordres */}
      {loading && displayOrdres.length === 0 ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-3'}>
          {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
            <div key={i} className={viewMode === 'grid' ? 'h-72 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl animate-pulse' : 'h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg animate-pulse'} />
          ))}
        </div>
      ) : displayOrdres.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-gray-300 p-16 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wrench className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun ordre de travail trouvé</h3>
          <p className="text-gray-500 mb-6">
            {hasActiveFilters 
              ? 'Aucun résultat ne correspond à vos critères de recherche.' 
              : 'Commencez par créer votre premier ordre de travail.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all font-medium shadow-md hover:shadow-lg"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayOrdres.map(ot => {
            const statutConfig = getStatutConfig(ot.statut)
            const StatutIcon = statutConfig.icon

            return (
              <OrdreTravailCard
                key={ot.id}
                ot={ot}
                statutConfig={statutConfig}
                StatutIcon={StatutIcon}
                getTypePlanColor={getTypePlanColor}
              />
            )
          })}
        </div>
        
        {/* Indicateur de chargement et trigger pour infinite scroll */}
        <div ref={observerTarget} className="flex justify-center py-8">
          {loading && (
            <div className="flex items-center gap-3 text-orange-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm font-medium">Chargement...</span>
            </div>
          )}
          {!loading && !hasMore && displayOrdres.length > 0 && (
            <div className="text-sm text-gray-500 font-medium">
              ✓ Tous les ordres ont été chargés
            </div>
          )}
        </div>
      </>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Machine</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Client</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Technicien</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayOrdres.map(ot => {
                  const statutConfig = getStatutConfig(ot.statut)
                  const StatutIcon = statutConfig.icon
                  const machine = ot.machine
                  const plan = ot.plan

                  return (
                    <tr
                      key={ot.id}
                      onClick={() => navigate(`/ordres-travail/${ot.id}`)}
                      className="hover:bg-orange-50 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900 text-sm group-hover:text-orange-600 transition-colors">
                            {machine?.nom || 'Machine inconnue'}
                          </span>
                          {machine?.modele && (
                            <span className="text-xs text-gray-500 font-mono mt-0.5">
                              {machine.modele}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {machine?.client?.raison_sociale || 'Client inconnu'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border w-fit ${getTypePlanColor(ot.type)}`}>
                            {ot.type === 'préventif'
                              ? '🛡️ Préventive'
                              : ot.type === 'correctif'
                              ? '⚡ Corrective'
                              : '⚡ Curatif'}
                          </span>
                          {plan?.type_recurrence && renderRecurrence(plan) && (
                            <span className="text-xs text-gray-500">
                              🔄 {renderRecurrence(plan)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {new Date(ot.date_programmee).toLocaleDateString('fr-FR', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {ot.technicien?.nom || '⚠️ Non assigné'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <StatutIcon className="w-4 h-4" style={{ color: statutConfig.iconColor }} />
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statutConfig.bgLight} ${statutConfig.textColor} border ${statutConfig.borderColor}`}>
                            {ot.statut === 'prévu' && 'À faire'}
                            {ot.statut === 'en_cours' && 'En cours'}
                            {ot.statut === 'terminé' && 'Clôturé'}
                            {ot.statut === 'clôturé_avec_anomalie' && 'Avec anomalie'}
                            {ot.statut === 'annulé' && 'Annulé'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Indicateur de chargement et trigger pour infinite scroll */}
        <div ref={observerTarget} className="flex justify-center py-8">
          {loading && (
            <div className="flex items-center gap-3 text-orange-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm font-medium">Chargement...</span>
            </div>
          )}
          {!loading && !hasMore && displayOrdres.length > 0 && (
            <div className="text-sm text-gray-500 font-medium">
              ✓ Tous les ordres ont été chargés
            </div>
          )}
        </div>
      </>
      )}
        </div>
      </div>
    </div>
  )
}
