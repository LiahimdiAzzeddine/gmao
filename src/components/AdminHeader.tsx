import { useNavigate } from 'react-router-dom';
import { LogOut, User, Shield, Wrench, Home, ChevronLeft, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showHome?: boolean;
  showSettings?: boolean;
  customActions?: React.ReactNode;
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
}

export default function AdminHeader({
  title,
  subtitle,
  showBack = false,
  showHome = true,
  showSettings = false,
  customActions,
  variant = 'default',
  className = ''
}: AdminHeaderProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  const getRoleIcon = () => {
    switch (profile?.role) {
      case 'admin':
        return <Shield size={14} className="text-white" />;
      case 'technicien':
        return <Wrench size={14} className="text-orange-300" />;
      default:
        return <User size={14} className="text-slate-300" />;
    }
  };

  const getRoleBadgeStyle = () => {
    switch (profile?.role) {
      case 'admin':
        return 'bg-slate-700/80 text-white border-slate-600';
      case 'technicien':
        return 'bg-orange-500/20 text-orange-300 border-orange-400/30';
      default:
        return 'bg-white/10 text-slate-300 border-white/20';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return {
          container: 'py-2 sm:py-3',
          title: 'text-base sm:text-lg',
          logo: 'h-6 sm:h-7'
        };
      case 'minimal':
        return {
          container: 'py-2',
          title: 'text-sm sm:text-base',
          logo: 'h-5 sm:h-6'
        };
      default:
        return {
          container: 'py-3 sm:py-4',
          title: 'text-lg sm:text-2xl',
          logo: 'h-8'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl sticky top-0 z-50 backdrop-blur-sm ${className}`}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 ${styles.container}`}>
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          {/* LEFT SECTION */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            {/* LOGO */}
            {variant === 'default' && (
              <div className="hidden sm:flex p-2.5 bg-gradient-to-br from-[#f15c00] to-orange-600 rounded-xl shadow-lg flex-shrink-0 ring-2 ring-orange-400/30">
                <img
                  src="/FSG-Brandmark-CMYK2-01.png"
                  className={styles.logo}
                  alt="FSG Logo"
                />
              </div>
            )}

            {/* TITLE + USER SECTION */}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <h1 className={`${styles.title} font-bold text-white truncate`}>
                  {title}
                </h1>
                {variant !== 'minimal' && profile && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${getRoleBadgeStyle()} flex-shrink-0 shadow-sm`}>
                    {getRoleIcon()}
                    <span className="hidden sm:inline capitalize">
                      {profile.role || 'chargement...'}
                    </span>
                  </div>
                )}
              </div>

              {subtitle && (
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}

              {variant !== 'minimal' && profile && (
                <div className="flex items-center gap-2 mt-1 min-w-0">
                  <User size={14} className="text-orange-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-slate-300 font-medium truncate max-w-[140px] sm:max-w-none">
                    {profile.nom || 'Utilisateur'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SECTION */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* CUSTOM ACTIONS */}
            {customActions}

            {/* BACK BUTTON */}
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all shadow-sm flex-shrink-0 group backdrop-blur-sm border border-white/10"
                title="Retour"
              >
                <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* SETTINGS BUTTON */}
            {showSettings && (
              <button
                onClick={() => navigate('/admin')}
                className="group flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all shadow-sm backdrop-blur-sm border border-white/10"
                title="Paramètres"
              >
                <Settings
                  size={18}
                  className="group-hover:rotate-90 transition-transform duration-300"
                />
                <span className="hidden md:inline font-medium">Paramètres</span>
              </button>
            )}

            {/* HOME BUTTON */}
            {showHome && (
              <button
                onClick={() => navigate('/')}
                className="group flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-[#f15c00] to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-orange-500/50 border border-orange-400/30"
                title="Accueil"
              >
                <Home
                  size={18}
                  className="group-hover:scale-110 transition-transform"
                />
                <span className="hidden md:inline font-medium">Accueil</span>
              </button>
            )}

            {/* LOGOUT BUTTON */}
            <button
              onClick={handleSignOut}
              className="group flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-red-600/90 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm border border-red-500/30"
              title="Déconnexion"
            >
              <LogOut
                size={18}
                className="group-hover:translate-x-0.5 transition-transform"
              />
              <span className="hidden md:inline font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Decorative line with glow effect */}
      <div className="h-1 bg-gradient-to-r from-[#f15c00] via-orange-500 to-orange-600 shadow-lg shadow-orange-500/50" />
    </div>
  );
}
