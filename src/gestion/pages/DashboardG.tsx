import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import DashboardHome from '../components/DashboardHome';
import FournisseursTable from '../components/FournisseursTable';
import ClientsDevisTable from '../components/ClientsDevisTable';
import DevisTable from '../components/DevisTable';
import ChantiersTable from '../components/ChantiersTable';
import ContractsTable from '../components/ContractsTable';
import InterlocuteursTable from '../components/fetchInterlocuteurs';
import EmetteursTable from '../components/EmetteursTable';
import MonetaireTable from '../components/MonetaireTable';
import CombinedDataTable from '../components/CombinedDataTable';
import { Menu } from 'lucide-react';
import DevisForm from './DevisForm';
import AllClientsStats from '../components/AllClientsStats';
import ContractPeriodsP2Table from '../components/ContractPeriodsP2Table';
import { supabase } from '../../lib/supabase';

function DashboardG() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Ouvert par défaut sur desktop
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Sur mobile, fermer la sidebar par défaut
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Extraire la vue actuelle depuis l'URL
  const getCurrentView = () => {
    const pathSegments = location.pathname.split('/');
    return pathSegments[pathSegments.length - 1] || 'home';
  };

  const currentView = getCurrentView();

  const handleNavigate = (view: string) => {
    navigate(`/gestion/${view}`);
    // Fermer la sidebar sur mobile après navigation
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Bouton menu mobile */}
      <button
        onClick={handleToggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-orange-600 text-white rounded-lg shadow-lg hover:bg-orange-700 transition-colors"
        aria-label="Toggle menu"
      >
        <Menu size={24} />
      </button>

      {/* Overlay pour mobile */}
      {isSidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={handleCloseSidebar}
        />
      )}

      {/* Sidebar - toujours présente sur desktop */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        onToggle={handleToggleSidebar}
      />

      {/* Contenu principal - largeur adaptative */}
      <main className={`
        flex-1 overflow-y-auto p-4 md:p-6 transition-all duration-300
        ${isMobile ? 'pt-16' : 'pt-6'}
      `}>
        <Routes>
          <Route path="/" element={<Navigate to="/gestion/home" replace />} />
          <Route path="/home" element={<DashboardHome onNavigate={handleNavigate} />} />
          <Route path="/fournisseurs" element={<FournisseursTable />} />
          <Route path="/clients" element={<ClientsDevisTable />} />
          <Route path="/stats" element={<AllClientsStats supabase={supabase} />} />
          <Route path="/devis-liste" element={<DevisTable />} />
          <Route path="/devis-p2" element={<ContractPeriodsP2Table />} />
          <Route path="/export-combine" element={<CombinedDataTable />} />
          <Route path="/devis-nouveau" element={<DevisForm />} />
          <Route path="/chantiers" element={<ChantiersTable />} />
          <Route path="/contracts" element={<ContractsTable />} />
          <Route path="/emetteurs" element={<EmetteursTable />} />
          <Route path="/interlocuteurs" element={<InterlocuteursTable />} />
          <Route path="/monetaire" element={<MonetaireTable />} />
          {/* Route par défaut pour les vues non trouvées */}
          <Route path="*" element={<Navigate to="/gestion/home" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default DashboardG;