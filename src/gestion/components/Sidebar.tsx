import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  UserCircle,
  Truck,
  DollarSign,
  MessageSquare,
  X,
  ChevronDown,
  ChevronRight,
  FileSignature,
  ChevronLeft,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

interface SubNavItem {
  id: string;
  label: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  subItems?: SubNavItem[];
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Tableau de bord', icon: LayoutDashboard },
  { 
    id: 'devis', 
    label: 'Gestion des travaux', 
    icon: FileText,
    subItems: [
      { id: 'devis-liste', label: 'Gestion des travaux P5' },
      { id: 'devis-p2', label: 'Gestion des travaux P2' },
      { id: 'export-combine', label: 'Export Combiné P2 & P5' },
      { id: 'devis-nouveau', label: 'Nouveau devis' },
    ]
  },
  { 
    id: 'clients', 
    label: 'Clients', 
    icon: Users,
    subItems: [
      { id: 'clients', label: 'Liste des Clients' },
      // { id: 'stats', label: 'Statistiques Clients' },
    ]
  },
  { 
    id: 'chantiers', 
    label: 'Chantiers', 
    icon: Building2,
   
  },
  { 
    id: 'contracts', 
    label: 'Contrats', 
    icon: FileSignature,
   
  },
  { 
    id: 'fournisseurs', 
    label: 'Fournisseurs', 
    icon: Truck,
   
  },
  { id: 'emetteurs', label: 'Émetteurs', icon: UserCircle },
  { id: 'interlocuteurs', label: 'Interlocuteurs', icon: MessageSquare },
  { 
    id: 'monetaire', 
    label: 'Monétaire', 
    icon: DollarSign,
   
  },
  
];

function Sidebar({ currentView, onNavigate, isOpen, onClose, onToggle }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNavigate = (view: string) => {
    onNavigate(view);
    
    // Ferme le menu sur mobile après navigation
    if (isMobile) {
      onClose();
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Empêche le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen, isMobile]);

  return (
    <>
      {/* Overlay pour mobile avec animation */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar améliorée */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          bg-gradient-to-b from-orange-600 via-orange-650 to-orange-700 
          text-white shadow-2xl lg:shadow-xl
          transform transition-all duration-300 ease-out
          flex flex-col
          ${isMobile ? 'border-r-4 border-orange-400' : ''}
          ${isOpen 
            ? 'translate-x-0 w-80 sm:w-96 lg:w-72' 
            : '-translate-x-full lg:translate-x-0 w-80 sm:w-96 lg:w-16'
          }
        `}
      >
        {/* Header amélioré */}
        <div className={`p-4 sm:p-6 lg:p-4 border-b border-orange-500/50 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-orange-600 to-orange-700 ${!isOpen ? 'lg:justify-center lg:p-2' : ''}`}>
          <div className={`min-w-0 flex-1 ${!isOpen ? 'lg:hidden' : ''}`}>
            <h1 className="text-xl sm:text-2xl lg:text-xl font-bold truncate bg-gradient-to-r from-white to-orange-100 bg-clip-text text-transparent">
              Gestion Devis
            </h1>
            <p className="text-orange-100/80 text-sm sm:text-base lg:text-sm mt-1 truncate font-medium">
              Maintenances & Factures
            </p>
          </div>
          
          {/* Bouton fermer/réduire */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {/* Bouton réduire pour desktop */}
            <button
              onClick={onToggle}
              className="hidden lg:flex p-2 hover:bg-orange-500/50 active:bg-orange-400/50 rounded-lg transition-all duration-200 group"
              aria-label="Réduire/Agrandir le menu"
            >
              <ChevronLeft size={18} className={`group-hover:scale-110 transition-transform duration-200 ${!isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Bouton fermer pour mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-3 hover:bg-orange-500/50 active:bg-orange-400/50 rounded-xl transition-all duration-200 group"
              aria-label="Fermer le menu"
            >
              <X size={24} className="group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>
        </div>

        {/* Navigation améliorée */}
        <nav className={`flex-1 overflow-y-auto p-3 sm:p-4 lg:p-3 scrollbar-thin scrollbar-thumb-orange-400 scrollbar-track-transparent ${!isOpen ? 'lg:hidden' : ''}`}>
          <ul className="space-y-2 sm:space-y-3 lg:space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id || item.subItems?.some(sub => sub.id === currentView);
              const isExpanded = expandedSections.includes(item.id);
              const hasSubItems = item.subItems && item.subItems.length > 0;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      if (hasSubItems) {
                        toggleSection(item.id);
                      } else {
                        handleNavigate(item.id);
                      }
                    }}
                    className={`
                      w-full flex items-center gap-3 sm:gap-4 lg:gap-3 
                      px-4 sm:px-5 lg:px-4 py-3 sm:py-4 lg:py-3 
                      rounded-xl sm:rounded-2xl lg:rounded-xl 
                      transition-all duration-200 
                      touch-manipulation
                      group relative overflow-hidden
                      ${isActive
                        ? 'bg-white text-orange-600 shadow-lg transform scale-[1.02] font-semibold'
                        : 'text-orange-50 hover:bg-orange-500/70 hover:text-white active:bg-orange-400/70 hover:transform hover:scale-[1.01]'
                      }
                    `}
                  >
                    {/* Effet de brillance au survol */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    
                    <Icon size={22} className="flex-shrink-0 relative z-10" />
                    <span className="font-medium text-base sm:text-lg lg:text-base flex-1 text-left truncate relative z-10">
                      {item.label}
                    </span>
                    {hasSubItems && (
                      <span className="flex-shrink-0 relative z-10">
                        {isExpanded ? 
                          <ChevronDown size={18} className="transform rotate-0 transition-transform duration-200" /> : 
                          <ChevronRight size={18} className="transform rotate-0 transition-transform duration-200" />
                        }
                      </span>
                    )}
                  </button>
                  
                  {/* Sous-menu avec animation améliorée */}
                  {hasSubItems && (
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-out ${
                        isExpanded ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <ul className="ml-4 sm:ml-6 lg:ml-4 space-y-1.5 border-l-2 border-orange-400/60 pl-3 sm:pl-4 lg:pl-3">
                        {item.subItems!.map((subItem) => {
                          const isSubActive = currentView === subItem.id;
                          
                          return (
                            <li key={subItem.id}>
                              <button
                                onClick={() => handleNavigate(subItem.id)}
                                className={`
                                  w-full flex items-center gap-3 
                                  px-3 sm:px-4 lg:px-3 py-2.5 sm:py-3 lg:py-2.5 
                                  rounded-lg sm:rounded-xl lg:rounded-lg 
                                  text-sm sm:text-base lg:text-sm 
                                  transition-all duration-200 
                                  touch-manipulation
                                  group relative overflow-hidden
                                  ${isSubActive
                                    ? 'bg-orange-400 text-white shadow-md transform scale-[1.02] font-semibold'
                                    : 'text-orange-100 hover:bg-orange-500/60 hover:text-white active:bg-orange-400/60 hover:transform hover:scale-[1.01]'
                                  }
                                `}
                              >
                                {/* Effet de brillance au survol */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                                
                                <span className="w-2 h-2 rounded-full bg-current flex-shrink-0 relative z-10"></span>
                                <span className="truncate relative z-10">{subItem.label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Navigation réduite pour desktop quand fermée */}
        {!isOpen && (
          <nav className="hidden lg:flex flex-1 flex-col items-center py-4 space-y-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id || item.subItems?.some(sub => sub.id === currentView);

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.subItems && item.subItems.length > 0) {
                      // Pour les items avec sous-menus, ouvrir la sidebar
                      onToggle();
                    } else {
                      handleNavigate(item.id);
                    }
                  }}
                  className={`
                    p-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                    ${isActive
                      ? 'bg-white text-orange-600 shadow-lg'
                      : 'text-orange-50 hover:bg-orange-500/70 hover:text-white'
                    }
                  `}
                  title={item.label}
                >
                  <Icon size={20} className="relative z-10" />
                </button>
              );
            })}
          </nav>
        )}

        {/* Footer amélioré */}
        <div className={`p-4 sm:p-5 lg:p-4 border-t border-orange-500/50 text-xs sm:text-sm lg:text-xs text-orange-100/80 flex-shrink-0 bg-gradient-to-r from-orange-700 to-orange-800 ${!isOpen ? 'lg:hidden' : ''}`}>
          <div className="flex items-center justify-between">
            <p className="truncate font-medium">© 2026 Gestion Devis</p>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs">En ligne</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;