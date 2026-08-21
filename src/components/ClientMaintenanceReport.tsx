import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Wrench, AlertCircle, CheckCircle, Clock, Printer, Search, Users } from 'lucide-react';
import { UseClientMaintenanceRapportParams } from '../hooks/UseClientMaintenanceRapportParams';
import { Client, DemandeIntervention, Intervention, Machine, supabase } from '../lib/supabase';
import { MachineState, getMachineStateConfig, normalizeMachineState } from '../types/machineState';


const ClientMaintenanceReport: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loadingClients, setLoadingClients] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const {
    machines,
    demandes,
    interventions,
    planningData,
    loading,
    currentYear,
    setCurrentYear
  } = UseClientMaintenanceRapportParams({ clientId: selectedClientId });

  // Charger la liste des clients
  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients(): Promise<void> {
    setLoadingClients(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('raison_sociale');

    if (!error && data) {
      setClients(data as Client[]);
    }
    setLoadingClients(false);
  }

  // Filtrer les clients selon la recherche
  const filteredClients = clients.filter(client => 
    client.raison_sociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.telephone?.includes(searchTerm)
  );

  // Gérer la sélection d'un client
  const handleSelectClient = (client: Client): void => {
    setSelectedClientId(client.id);
    setSelectedClient(client);
    setShowDetails(false);
  };

  // Statistiques calculées
  const stats = {
    totalMachines: machines.length,
    totalDemandes: demandes.length,
    totalInterventions: interventions.length,
    demandesPreventives: demandes.filter((d: DemandeIntervention) => d.type_intervention === 'preventive').length,
    demandeCorrectives: demandes.filter((d: DemandeIntervention) => d.type_intervention === 'corrective').length,
    interventionsApprouvees: interventions.filter((i: Intervention) => i.status === 'approved').length,
    interventionsPending: interventions.filter((i: Intervention) => i.status === 'pending').length,
    interventionsRejected: interventions.filter((i: Intervention) => i.status === 'rejected').length
  };

  // Fonction pour exporter en PDF
  const handleExportPDF = (): void => {
    window.print();
  };

  // Fonction pour télécharger le rapport
  const handleDownloadReport = (): void => {
    if (!selectedClient) return;
    
    const reportData = {
      client: selectedClient.raison_sociale || selectedClient.prenom,
      annee: currentYear,
      dateGeneration: new Date().toLocaleDateString('fr-FR'),
      statistiques: stats,
      machines: machines,
      interventions: interventions,
      demandes: demandes
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-maintenance-${selectedClient.raison_sociale || selectedClient.prenom}-${currentYear}.json`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto p-6  min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Rapports de Maintenance
        </h1>
        <p className="text-gray-600">Sélectionnez un client pour générer son rapport</p>
      </div>

      {/* Sélection du client */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6 print:hidden">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">Sélectionner un client</h2>
        </div>

        {/* Barre de recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un client par nom, raison sociale ou téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Liste des clients */}
        {loadingClients ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredClients.map((client) => (
              <button
                key={client.id}
                onClick={() => handleSelectClient(client)}
                className={`text-left p-4 border-2 rounded-lg transition-all hover:shadow-md ${
                  selectedClientId === client.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {client.raison_sociale || client.prenom || 'Sans nom'}
                    </h3>
                    {client.telephone && (
                      <p className="text-sm text-gray-600 mt-1">
                        📞 {client.telephone}
                      </p>
                    )}
                    {client.adresse && (
                      <p className="text-xs text-gray-500 mt-1">
                        📍 {client.adresse}
                      </p>
                    )}
                  </div>
                  {selectedClientId === client.id && (
                    <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {filteredClients.length === 0 && !loadingClients && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Aucun client trouvé</p>
          </div>
        )}
      </div>

      {/* Message si aucun client sélectionné */}
      {!selectedClientId && (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun client sélectionné
          </h3>
          <p className="text-gray-600">
            Veuillez sélectionner un client ci-dessus pour générer son rapport de maintenance
          </p>
        </div>
      )}

      {/* Rapport du client sélectionné */}
      {selectedClientId && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* En-tête du rapport */}
              <div className="bg-white rounded-lg shadow-lg p-8 mb-6 print:shadow-none">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      Rapport de Maintenance
                    </h2>
                    <p className="text-lg text-gray-600">
                      {selectedClient?.raison_sociale || selectedClient?.prenom}
                    </p>
                    <p className="text-sm text-gray-500">
                      Généré le {new Date().toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex gap-2 print:hidden">
                    <select
                      value={currentYear}
                      onChange={(e) => setCurrentYear(Number(e.target.value))}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    {/* <button
                      onClick={handleExportPDF}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimer
                    </button> */}
                    <button
                      onClick={handleDownloadReport}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger
                    </button>
                  </div>
                </div>

                {/* Statistiques principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Machines</p>
                        <p className="text-3xl font-bold mt-1">{stats.totalMachines}</p>
                      </div>
                      <Wrench className="w-12 h-12 opacity-80" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Demandes</p>
                        <p className="text-3xl font-bold mt-1">{stats.totalDemandes}</p>
                      </div>
                      <FileText className="w-12 h-12 opacity-80" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Interventions</p>
                        <p className="text-3xl font-bold mt-1">{stats.totalInterventions}</p>
                      </div>
                      <CheckCircle className="w-12 h-12 opacity-80" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium">En attente</p>
                        <p className="text-3xl font-bold mt-1">{stats.interventionsPending}</p>
                      </div>
                      <Clock className="w-12 h-12 opacity-80" />
                    </div>
                  </div>
                </div>

                {/* Répartition des interventions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Types d'interventions
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Préventives</span>
                        <span className="font-semibold text-blue-600">{stats.demandesPreventives}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Correctives</span>
                        <span className="font-semibold text-orange-600">{stats.demandeCorrectives}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Statut des interventions
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Approuvées</span>
                        <span className="font-semibold text-green-600">{stats.interventionsApprouvees}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">En attente</span>
                        <span className="font-semibold text-yellow-600">{stats.interventionsPending}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Rejetées</span>
                        <span className="font-semibold text-red-600">{stats.interventionsRejected}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section détaillée */}
              <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4 print:hidden hover:text-blue-600"
                >
                  <FileText className="w-5 h-5" />
                  Détails des machines et interventions
                  <span className="text-sm text-gray-500">
                    ({showDetails ? 'Masquer' : 'Afficher'})
                  </span>
                </button>

                {showDetails && (
                  <div className="space-y-6">
                    {/* Liste des machines */}
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        Machines ({machines.length})
                      </h3>
                      {machines.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Aucune machine pour ce client</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Nom
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Modèle
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  N° Série
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  État
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Localisation
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {machines.map((machine: Machine) => (
                                <tr key={machine.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {machine.nom}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {machine.modele}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {machine.numero_serie}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                      normalizeMachineState(machine.etat) === MachineState.EN_SERVICE
                                        ? 'bg-green-100 text-green-800'
                                        : getMachineStateConfig(machine.etat).bgColor + ' ' + getMachineStateConfig(machine.etat).textColor
                                    }`}>
                                      {getMachineStateConfig(machine.etat).label}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {machine.localisation}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Liste des interventions récentes */}
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        Interventions {currentYear} ({interventions.length})
                      </h3>
                      {interventions.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Aucune intervention pour cette année</p>
                      ) : (
                        <div className="space-y-4">
                          {interventions.slice(0, 10).map((intervention: Intervention) => {
                            const demande = demandes.find((d: DemandeIntervention) => d.id === intervention.demande_id);
                            const machine = machines.find((m: Machine) => m.id === demande?.machine_id);
                            
                            return (
                              <div key={intervention.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h4 className="font-semibold text-gray-900">
                                      {machine?.nom || 'Machine inconnue'}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                      {new Date(intervention.date_intervention).toLocaleDateString('fr-FR')}
                                    </p>
                                  </div>
                                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                    intervention.status === 'approved' 
                                      ? 'bg-green-100 text-green-800'
                                      : intervention.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {intervention.status === 'approved' ? 'Approuvée' : 
                                     intervention.status === 'pending' ? 'En attente' : 'Rejetée'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 mb-2">{intervention.description}</p>
                                {intervention.type_action && (
                                  <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                    {intervention.type_action}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {interventions.length > 10 && (
                            <p className="text-sm text-gray-500 text-center">
                              ... et {interventions.length - 10} autres interventions
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Pied de page du rapport */}
              <div className="mt-6 text-center text-sm text-gray-500 print:mt-12">
                <p>Ce rapport a été généré automatiquement le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
              </div>
            </>
          )}
        </>
      )}

      {/* Style d'impression */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:mt-12 {
            margin-top: 3rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ClientMaintenanceReport;
