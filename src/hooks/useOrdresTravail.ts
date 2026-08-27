import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { OrdreTravailDetail, TypeOt } from "../types/ot";
import type { OtStatus } from "../utils/otStatus";
export type StatutOT = OtStatus
export type TypePlan = 'préventive' | 'corrective'

export type TypeRecurrence = 'journalière' | 'hebdomadaire' | 'mensuelle' | 'trimestriel' | 'semestriel' | 'annuelle'
export const ITEMS_PER_PAGE = 9

export type Filters = {
  clientId: string
  machineSearch: string
  statut: StatutOT | ''
  typeOt: TypeOt | ''
  dateFrom: string
  dateTo: string
}

// Hook personnalisé pour charger les données avec pagination
export function useOrdresTravail(filters: Filters, page: number, refreshKey = 0) {
  const [ordres, setOrdres] = useState<OrdreTravailDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [clients, setClients] = useState<Array<{ id: string, raison_sociale: string }>>([])

  // Charger clients
  useEffect(() => {
    supabase.from('clients')
      .select('id, raison_sociale')
      .order('raison_sociale', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setClients(data)
      })
  }, [])

  // Charger les ordres avec filtres et pagination
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Si on filtre par client, d'abord récupérer les IDs des machines de ce client
        let machineIds: string[] = [];
        let matchingMachineIds: string[] = [];
        if (filters.clientId) {
          const { data: clientMachines, error: machinesError } = await supabase
            .from('machines')
            .select('id')
            .eq('client_id', filters.clientId);
          
          if (machinesError) throw machinesError;
          machineIds = clientMachines?.map(m => m.id) || [];
          
          // Si le client n'a pas de machines, retourner un résultat vide
          if (machineIds.length === 0) {
            setOrdres([]);
            setTotalCount(0);
            setLoading(false);
            return;
          }
        }

        // La recherche globale accepte machine, modèle, numéro OT et identifiant court/complet.
        if (filters.machineSearch && filters.machineSearch.trim()) {
          const searchValue = filters.machineSearch.trim();
          const safeSearchValue = searchValue.replace(/[,%()]/g, ' ').trim();
          if (safeSearchValue) {
            const { data: searchMachines, error: searchError } = await supabase
              .from('machines')
              .select('id, nom, modele')
              .or(`nom.ilike.%${safeSearchValue}%,modele.ilike.%${safeSearchValue}%`);

            if (searchError) throw searchError;

            matchingMachineIds = searchMachines?.map(m => m.id) || [];
          }
        }

        let query = supabase
          .from('ordres_travail')
          .select(`
            id,
            date_programmee,
            date_execution,
            statut,
            observations,
            type,
            priorite,
            cause,
            numot,
            created_at,
            machine:machine_id (
              id,
              nom,
              modele,
              numero_serie,
              poste_technique:poste_technique_id (
                id,
                code_pt,
                batiment,
                site:site_id (
                  code,
                  nom
                ),
                domaine:domaine_id (
                  code,
                  libelle
                ),
                secteur:secteur_id (
                  code,
                  libelle
                ),
                lot:lot_id (
                  code,
                  nom,
                  description
                )
              ),
              client:client_id (
                id,
                raison_sociale
              )
            ),
            plan:plan_id (
              id,
              type,
              type_recurrence,
              intervalle
            ),
            technicien:technicien_id (
              id,
              nom
            )
          `, { count: 'exact' })

        // Filtres simples
        if (filters.statut) query = query.eq('statut', filters.statut)
        if (filters.dateFrom) query = query.gte('date_programmee', filters.dateFrom)
        if (filters.dateTo) {
          const endExclusive = new Date(`${filters.dateTo}T00:00:00Z`)
          endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
          query = query.lt('date_programmee', endExclusive.toISOString())
        }

        // Filtrer par type de plan uniquement pour les OT préventifs
        if (filters.typeOt) {
          query = query.eq('type', filters.typeOt)
        }

        if (filters.machineSearch.trim()) {
          const normalizedSearch = filters.machineSearch.trim().toLowerCase().replace(/^#/, '');
          const searchClauses: string[] = [];

          if (matchingMachineIds.length > 0) {
            searchClauses.push(`machine_id.in.(${matchingMachineIds.join(',')})`);
          }
          if (/^[0-9a-f-]{1,36}$/.test(normalizedSearch)) {
            searchClauses.push(`search_id.ilike.${normalizedSearch.slice(0, 8)}%`);
          }
          if (/^\d+$/.test(normalizedSearch)) {
            searchClauses.push(`numot.eq.${Number(normalizedSearch)}`);
          }

          if (searchClauses.length === 0) {
            setOrdres([]);
            setTotalCount(0);
            return;
          }

          query = query.or(searchClauses.join(','));
        }

        // Filtrer par machines (client et/ou recherche)
        if (machineIds.length > 0) {
          query = query.in('machine_id', machineIds)
        }

        // Pagination
        const from = (page - 1) * ITEMS_PER_PAGE
        const to = from + ITEMS_PER_PAGE - 1
        query = query.order('date_programmee', { ascending: true }).range(from, to)

        const { data, error: supabaseError, count } = await query
        if (supabaseError) throw supabaseError
        
        // Transformation
        const transformedData: OrdreTravailDetail[] = (data || []).map((ot: any) => {
          return {

            id: ot.id,
            numot: ot.numot,
            created_at: ot.created_at,
            date_programmee: ot.date_programmee,
            date_execution: ot.date_execution,
            statut: ot.statut,
            observations: ot.observations,
            type: ot.type,
            plan: ot.plan ? {
              id: ot.plan.id,
              type_recurrence: ot.plan.type_recurrence,
              intervalle: ot.plan.intervalle,
            } : null,
            machine: ot.machine
              ? {
                id: ot.machine.id,
                nom: ot.machine.nom,
                modele: ot.machine.modele,
                numero_serie: ot.machine.numero_serie,
                poste_technique:ot.machine.poste_technique,
                client: ot.machine.client
                  ? {
                    id: ot.machine.client.id,
                    raison_sociale: ot.machine.client.raison_sociale,
                  }
                  : null,
              }
              : null,

            technicien: ot.technicien ? {
              id: ot.technicien.id,
              nom: ot.technicien.nom
            } : null
          };
        })

        setOrdres(transformedData)
        setTotalCount(count || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [filters, page, refreshKey])

  return { ordres, loading, error, totalCount, clients }
}
