import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Settings, Wrench, FileSpreadsheet, LogOut, ClipboardList, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type ClientLayoutProps = {
  children: React.ReactNode;
};

type RailButtonProps = {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
};

function RailButton({ children, title, onClick, active = false }: RailButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:scale-110 hover:bg-white/20 lg:h-9 lg:w-9 ${
        active ? 'bg-white/20 scale-110' : ''
      }`}
    >
      {children}
    </button>
  );
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, client } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const clientName = client?.raison_sociale || client?.prenom || profile?.nom || 'Mon espace';

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/mes-interventions', icon: Wrench, label: 'Mes interventions' },
    { path: '/mes-machines', icon: Settings, label: 'Mes machines' },
    { path: '/mon-plan-action', icon: FileSpreadsheet, label: 'Plan d\'action' },
    { path: '/mes-ot-non-traites', icon: ClipboardList, label: 'OT non traités' },
    { path: '/ma-planification', icon: Calendar, label: 'Ma planification' },
  ];

  return (
    <div className="min-h-screen bg-[#eef2fb] p-0">
      <div className="min-h-screen overflow-hidden bg-white">
        {/* Sidebar navigation - Style identique au Dashboard */}
        <aside className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-[#ff6b57] px-4 py-3 text-white lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-[76px] lg:flex-col lg:justify-start lg:px-0 lg:py-7">
          {/* Logo FSG */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-black text-[#ff6b57] shadow-sm lg:h-11 lg:w-11">
            FSG
          </div>

          {/* Navigation mobile horizontale / desktop verticale */}
          <div className="flex gap-2 lg:mt-8 lg:flex-col lg:gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <RailButton
                  key={item.path}
                  title={item.label}
                  onClick={() => navigate(item.path)}
                  active={isActive(item.path)}
                >
                  <Icon size={18} className="lg:w-[19px] lg:h-[19px]" />
                </RailButton>
              );
            })}
          </div>

          {/* Déconnexion */}
          <div className="lg:fixed lg:bottom-7 lg:left-4">
            <RailButton title="Déconnexion" onClick={handleLogout}>
              <LogOut size={18} className="lg:w-[19px] lg:h-[19px]" />
            </RailButton>
          </div>
        </aside>

        {/* Contenu principal avec padding pour sidebar desktop */}
        <main className="min-h-screen bg-slate-50 px-3 py-4 sm:px-6 lg:ml-[76px] lg:px-8 lg:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}
