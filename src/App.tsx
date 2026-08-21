import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard, { MachinesDashboard } from './components/Dashboard';
import MachineDetail from './components/MachineDetail';
import AdminPanel from './components/AdminPanel';
import ReportingStats from './components/ReportingStats';
import PlanificationClients from './pages/PlanificationClients';
import ClientOrdresTravail from './pages/ClientOrdresTravail';
import ClientInterventions from './pages/ClientInterventions';
import ClientInterventionDetails from './pages/ClientInterventionDetails';
import ClientMachines from './pages/ClientMachines';
import ClientPlanAction from './pages/ClientPlanAction';
import ClientOTNonTraites from './pages/ClientOTNonTraites';
import ClientPlanification from './pages/ClientPlanification';
import TechnicienMachines from './pages/TechnicienMachines';
import TechnicienMachineDetail from './pages/TechnicienMachineDetail';
import MachineForm from './components/MachineForm';
import ClientForm from './components/ClientForm';
import ClientsList from './components/ClientsList';
import InterventionForm from './components/InterventionForm';
import MachinesList from './components/MachinesList';
import DemandesList from './components/DemandesList';
import DemandeInterventionEdit from './components/DemandeInterventionEdit';
import DemandeInterventionView from './components/DemandeInterventionView';
import MaintenancePDFGenerator from './components/MaintenancePDFGenerator';
import MaintenancePDFGeneratorNew from './components/MaintenancePDFGeneratorNew';
import BonPDFApp from './components/BonPDFApp';
import { AdminLayout } from './components/Layout/AdminLayout';
import AdminRoute from './components/Control/AdminRoute';
import { ProtectedRoute } from './components/Control/ProtectedRoute';
import InterventionsTable from './components/InterventionsTable';
import TechniciensTable from './components/TechniciensTable';
import MaintenancePlanning from './components/planning/MaintenancePlanning';
import InterventionDetails from './pages/InterventionDetails';
import ClientMaintenanceReport from './components/ClientMaintenanceReport';
import { ProtectedMachineRoute } from './components/Control/ProtectedMachineRoute';
import Page403 from './pages/Page403';
import GammesList from './components/gamme/GammesList';
import MaintenancePlanForm from './components/plans/MaintenancePlanForm';
import MaintenancePlansTable from './components/plans/MaintenancePlansTable';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CreateOTFromPlan from './components/ot/CreateOTFromPlan';
import DemandeCorrectiveForm from './components/plans/DemandeCorrectiveForm';
import GenererOTForm from './components/ot/GenererOTForm';
import OTPreventifsPage from './components/ot/OTPreventifsPage';
import OrdreTravailDetails from './components/ordre-travail-details/OrdreTravailDetails';
import OTCorrectifsList from './components/ot/OTCorrectifsList';
import PlanActionTable from './components/PlanActionTable';
import { Toaster } from 'react-hot-toast';
import MachineConfigManagement from './components/MachineConfigManagement';
import PlanActionOptionsManagement from './pages/PlanActionOptionsManagement';

function AppRoutes() {
  const { user, profile } = useAuth();


  return (
    <>
      <Routes>
        {/* Login */}
        <Route
          path="/login"
          element={
            user && profile ? (
              profile.role === "admin" ? (
                <Navigate to="/admin" replace />
              ) : profile.role === "technicien" ? (
                <Navigate to="/toutes-machines" replace />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Login />
            )
          }
        />
        {/* Admin sections */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout title="Tableau de bord admin">
                <AdminPanel />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/reporting"
          element={
            <AdminRoute>
              <AdminLayout title="Reporting & Statistiques" showBack={true}>
                <ReportingStats />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/planification-clients"
          element={
            <AdminRoute>
              <PlanificationClients />
            </AdminRoute>
          }
        />
        <Route path="/admin/machines"
          element={
            <AdminRoute>
              <AdminLayout title="Machines" showBack={true}>
                <MachinesList />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route path="/admin/machines/config"
          element={
            <AdminRoute>
              <AdminLayout title="Configuration Machines" showBack={true}>
                <MachineConfigManagement />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route path="/admin/addOT"
          element={
            <AdminRoute>
              <AdminLayout title="OT" showBack={true}>
                <GenererOTForm />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route path="/admin/ot-correctifs"
          element={
            <AdminRoute>
              <AdminLayout title="OT Correctifs" showBack={true}>
                <OTCorrectifsList />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route path="/admin/ot-preventif"
          element={
            <AdminRoute>
              <AdminLayout title="OT Préventifs" showBack={true}>
                <OTPreventifsPage />
              </AdminLayout>
            </AdminRoute>
          }
        />

        <Route path="/admin/plan-action"
          element={
            <AdminRoute>
              <AdminLayout title="Plan d'action" showBack={true}>
                <PlanActionTable />
              </AdminLayout>
            </AdminRoute>
          }
        />

        <Route path="/admin/plan-action/options"
          element={
            <AdminRoute>
              <AdminLayout title="Options du plan d'action" showBack={true}>
                <PlanActionOptionsManagement />
              </AdminLayout>
            </AdminRoute>
          }
        />

        <Route path="/admin/interventions"
          element={
            <AdminRoute>
              <AdminLayout title="Interventions" showBack={true}>
                <InterventionsTable />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route path="/admin/intervention/:id"
          element={
            <AdminRoute>
              <AdminLayout title="Détails intervention" showBack={true}>
                <InterventionDetails />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route path="/admin/gammeslist"
          element={
            <AdminRoute>
              <AdminLayout title="Interventions" showBack={true}>
                <GammesList />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route path="/admin/plans-maintenance/new"
          element={
            <AdminRoute>
              <AdminLayout title="planifier une intervention" showBack={true}>
                <MaintenancePlanForm />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route path="/admin/demande-maintenance/new"
          element={
            <AdminRoute>
              <AdminLayout title="Demande corrective" showBack={true}>
                <DemandeCorrectiveForm />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route path="/admin/demande-maintenance/:id/edit"
          element={
            <AdminRoute>
              <AdminLayout title="Demande corrective" showBack={true}>
                <DemandeCorrectiveForm />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/plans-maintenance/:id"
          element={
            <AdminRoute>
              <AdminLayout title="Modifier planification" showBack={true}>
                <MaintenancePlanForm /></AdminLayout>
            </AdminRoute>
          }
        />
        <Route path="/admin/plans-maintenance"
          element={
            <AdminRoute>
              <AdminLayout title="Plans maintenance" showBack={true}>
                <MaintenancePlansTable />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route path="/admin/plans-maintenance/:planId/create-ot"
          element={
            <AdminRoute>
              <AdminLayout title="OT" showBack={true}>
                <CreateOTFromPlan />
              </AdminLayout>
            </AdminRoute>
          }
        />

        <Route path="/admin/techniciens"
          element={
            <AdminRoute>
              <AdminLayout title="Techniciens" showBack={true}>
                <TechniciensTable />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/machine/:id"
          element={
            <AdminRoute>
              <AdminLayout title="Fiche machine" showBack={true}>
                <MachineForm />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/clients"
          element={
            <AdminRoute>
              <AdminLayout title="Clients" showBack={true}>
                <ClientsList /></AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/client/:id"
          element={
            <AdminRoute>
              <AdminLayout title="Fiche client" showBack={true}>
                <ClientForm /></AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/planning"
          element={
            <AdminRoute>
              <AdminLayout title="Planning" showBack={true}>
                <MaintenancePlanning />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/report"
          element={
            <AdminRoute>
              <AdminLayout title="report" showBack={true}>
                <ClientMaintenanceReport />
              </AdminLayout>
            </AdminRoute>
          }
        />
        {/* <Route path="/admin/demande/new" element={<AdminRoute><AdminLayout title="Nouvelle demande d'intervention" showBack={true}><DemandeInterventionNew /></AdminLayout></AdminRoute>} /> */}
        {/* <Route path="/admin/demande/new/:machine_id" element={<AdminRoute><DemandeInterventionNew /></AdminRoute>} /> */}
        <Route path="/admin/demandes" element={<AdminRoute><AdminLayout title="Demandes" showBack={true}><DemandesList /></AdminLayout></AdminRoute>} />
        <Route path="/admin/demandes/edit/:id" element={<AdminRoute><AdminLayout title="Modifier une demande d'intervention" showBack={true}><DemandeInterventionEdit /></AdminLayout></AdminRoute>} />
        <Route path="/admin/demandes/:id" element={<AdminLayout title="Consulter une demande d'intervention" showBack={true}><DemandeInterventionView /></AdminLayout>} />
        
        {/* Route principale - Dashboard selon le rôle */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {profile?.role === 'technicien' ? <Navigate to="/toutes-machines" replace /> : <Dashboard />}
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/toutes-machines"
          element={
            <ProtectedRoute>
              {profile?.role === 'technicien' ? <TechnicienMachines /> : <MachinesDashboard />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/mes-ot-technicien"
          element={<Navigate to="/toutes-machines" replace />}
        />
        <Route
          path="/mes-ot"
          element={
            <ProtectedRoute>
              <ClientOrdresTravail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mes-interventions"
          element={
            <ProtectedRoute>
              <ClientInterventions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mes-interventions/:id"
          element={
            <ProtectedRoute>
              <ClientInterventionDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mes-machines"
          element={
            <ProtectedRoute>
              <ClientMachines />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mon-plan-action"
          element={
            <ProtectedRoute>
              <ClientPlanAction />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mes-ot-non-traites"
          element={
            <ProtectedRoute>
              <ClientOTNonTraites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ma-planification"
          element={
            <ProtectedRoute>
              <ClientPlanification />
            </ProtectedRoute>
          }
        />

        {/* Route protégée pour MachineDetail */}
        <Route
          path="/mon-plan-action"
          element={
            <ProtectedRoute>
              <PlanActionTable />
            </ProtectedRoute>
          }
        />
        <Route
          path="/machine/:machineId/:demandeId?"
          element={
            <ProtectedMachineRoute>
              {profile?.role === 'technicien' ? <TechnicienMachineDetail /> : <MachineDetail />}
            </ProtectedMachineRoute>
          }
        />

        <Route path="/intervention/nouvelle"
          element={
            <ProtectedRoute>
              <InterventionForm />
            </ProtectedRoute>
          }
        />
        <Route path="/ordres-travail/:id" element={<ProtectedRoute><OrdreTravailDetails /></ProtectedRoute>} />

        <Route path="/intervention/edit"
          element={
            <ProtectedRoute>
              <InterventionForm />
            </ProtectedRoute>
          }
        />




        <Route path="/maintenance-pdf" element={<MaintenancePDFGeneratorNew />} />
        <Route path="/bon-pdf" element={<BonPDFApp />} />
        <Route path="/403" element={<Page403 />} />
        <Route path="/maintenance-pdf/:interventionId" element={<MaintenancePDFGenerator />} />


        {/* La gestion de projet est désormais hébergée dans une application séparée. */}
        <Route path="/gestion/*" element={<Navigate to="/admin" replace />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />

    </>
  );
}

function App() {
  return (
    <>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
    <Toaster/>
    </>
  );
}

export default App;
