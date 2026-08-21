import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { OrdreTravailDetail, TypeOt } from "../types/ot";
export type StatutOT = 'prévu' | 'en_cours' | 'terminé' | 'clôturé_avec_anomalie' | 'annulé'
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
export function useOrdresTravail(filters: Filters, page: number) {
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

        // Si on recherche par nom de machine, récupérer les IDs des machines correspondantes
        if (filters.machineSearch && filters.machineSearch.trim()) {
          const searchLower = filters.machineSearch.toLowerCase().trim();
          const { data: searchMachines, error: searchError } = await supabase
            .from('machines')
            .select('id, nom, modele')
            .or(`nom.ilike.%${searchLower}%,modele.ilike.%${searchLower}%`);
          
          if (searchError) throw searchError;
          
          const searchMachineIds = searchMachines?.map(m => m.id) || [];
          
          // Si on a déjà filtré par client, faire l'intersection
          if (filters.clientId && machineIds.length > 0) {
            machineIds = machineIds.filter(id => searchMachineIds.includes(id));
          } else {
            machineIds = searchMachineIds;
          }
          
          // Si aucune machine ne correspond, retourner un résultat vide
          if (machineIds.length === 0) {
            setOrdres([]);
            setTotalCount(0);
            setLoading(false);
            return;
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
        if (filters.dateTo) query = query.lte('date_programmee', filters.dateTo)

        // Filtrer par type de plan uniquement pour les OT préventifs
        if (filters.typeOt) {
          query = query.eq('type', filters.typeOt)
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
  }, [filters, page])

  return { ordres, loading, error, totalCount, clients }
}
