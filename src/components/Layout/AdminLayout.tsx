import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, BarChart3, ChevronLeft, ClipboardList, Cpu, FileSpreadsheet, Home, Inbox, LogOut, Menu, Users, Wrench, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type LayoutProps = {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
};

type AdminNavItem = {
  path: string;
  label: string;
  icon: typeof Home;
  matches?: string[];
};

const navItems: AdminNavItem[] = [
  { path: '/admin', label: 'Dashboard', icon: Home },
  { path: '/admin/machines', label: 'Machines', icon: Cpu, matches: ['/admin/machine/'] },
  { path: '/admin/clients', label: 'Clients', icon: Users, matches: ['/admin/client/'] },
  { path: '/admin/demandes', label: 'Demandes clients', icon: Inbox },
  { path: '/admin/ot-preventif', label: 'OT préventifs', icon: ClipboardList, matches: ['/admin/addOT'] },
  { path: '/admin/ot-correctifs', label: 'OT correctifs', icon: AlertTriangle, matches: ['/admin/demande-maintenance/'] },
  { path: '/admin/interventions', label: 'Interventions', icon: Wrench, matches: ['/admin/intervention/'] },
  { path: '/admin/plan-action', label: "Plan d'action", icon: FileSpreadsheet },
  { path: '/admin/reporting', label: 'Reporting', icon: BarChart3 },
];

export function AdminLayout({ children, title = 'Administration', showBack = false }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isActive = (item: AdminNavItem) => {
    if (item.path === '/admin') return location.pathname === '/admin';
    return location.pathname === item.path
      || location.pathname.startsWith(`${item.path}/`)
      || item.matches?.some((path) => location.pathname.startsWith(path));
  };

  const goTo = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#eef2fb]">
      <div className="min-h-screen overflow-hidden bg-white">
        <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[76px] flex-col items-center bg-[#f98440] py-7 text-white shadow-lg lg:flex">
          <button onClick={() => navigate('/admin')} title="Dashboard admin" className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-sm font-black text-[#f98440] shadow-sm">FSG</button>
          <nav className="mt-8 flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.path} onClick={() => goTo(item.path)} title={item.label} aria-label={item.label} className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:scale-110 hover:bg-white/20 ${isActive(item) ? 'scale-110 bg-white/20 shadow-sm' : ''}`}>
                  <Icon size={19} />
                </button>
              );
            })}
          </nav>
          <button onClick={handleLogout} title="Déconnexion" className="absolute bottom-7 flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:scale-110 hover:bg-white/20"><LogOut size={19} /></button>
        </aside>

        <header className="sticky top-0 z-40 flex items-center justify-between bg-[#f98440] px-4 py-3 text-white shadow-md lg:hidden">
          <button onClick={() => navigate('/admin')} className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-black text-[#f98440]">FSG</button>
          <span className="max-w-[60%] truncate text-sm font-bold">{title}</span>
          <button onClick={() => setMobileMenuOpen((open) => !open)} className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15" aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
            <nav className="absolute left-0 right-0 top-16 grid grid-cols-2 gap-2 bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.path} onClick={() => goTo(item.path)} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold ${isActive(item) ? 'bg-orange-50 text-[#f98440]' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <Icon size={18} />{item.label}
                  </button>
                );
              })}
              <button onClick={handleLogout} className="col-span-2 flex items-center gap-3 rounded-lg bg-red-50 px-3 py-3 text-sm font-bold text-red-700"><LogOut size={18} />Déconnexion</button>
            </nav>
          </div>
        )}

        <main className="min-h-screen bg-slate-50 px-3 py-4 sm:px-6 lg:ml-[76px] lg:px-8 lg:py-5">
          {(showBack || location.pathname !== '/admin') && (
            <div className="mx-auto mb-4 flex max-w-7xl items-center gap-3">
              {showBack && (
                <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-[#f98440]/40 hover:text-[#f98440]" title="Retour"><ChevronLeft size={20} /></button>
              )}
              <h1 className="text-lg font-black text-slate-900 sm:text-xl">{title}</h1>
            </div>
          )}
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
