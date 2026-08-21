import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  User, 
  Shield, 
  Wrench, 
  Settings, 
  QrCode, 
  X, 
  Menu,
  Bell,
  Search,
  ChevronDown
} from 'lucide-react';
import jsQR from 'jsqr';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface MainHeaderProps {
  title: string;
  subtitle?: string;
  showAdminButton?: boolean;
  showQRScanner?: boolean;
  showNotifications?: boolean;
  showSearch?: boolean;
  customActions?: React.ReactNode;
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
  onSearch?: (query: string) => void;
  notificationCount?: number;
}

export default function MainHeader({ 
  title, 
  subtitle,
  showAdminButton = true,
  showQRScanner = true,
  showNotifications = false,
  showSearch = false,
  customActions,
  variant = 'default',
  className = '',
  onSearch,
  notificationCount = 0
}: MainHeaderProps) {
  const navigate = useNavigate();
  const { profile, client } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  const startScanner = async () => {
    setShowScanner(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.play();
        startQRScanning();
      }
    } catch (err) {
      console.error('Erreur d\'accès à la caméra:', err);
      alert('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      setShowScanner(false);
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setShowScanner(false);
  };

  const startQRScanning = () => {
    scanIntervalRef.current = window.setInterval(() => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            stopScanner();
            handleQRCodeDetected(code.data);
          }
        }
      }
    }, 300);
  };

  const handleQRCodeDetected = (url: string) => {
    try {
      const urlObj = new URL(url);
      
      if (urlObj.hostname === window.location.hostname) {
        navigate(urlObj.pathname + urlObj.search);
      } else {
        window.open(url, '_blank');
      }
    } catch (err) {
      alert('QR Code détecté: ' + url);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

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
          logo: 'h-7 sm:h-8'
        };
    }
  };

  const styles = getVariantStyles();

  const getUserDisplayName = () => {
    if (profile?.role === 'consultant') {
      return client?.raison_sociale || client?.prenom + ' ' + profile.nom;
    }
    return profile?.nom || 'Utilisateur';
  };

  return (
    <>
      <div className={`bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl sticky top-0 z-50 backdrop-blur-sm ${className}`}>
        <div className={`max-w-7xl mx-auto px-3 sm:px-6 ${styles.container}`}>
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* LEFT SECTION */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 overflow-hidden flex-1">
              {/* LOGO */}
              {variant !== 'minimal' && (
                <div className="hidden sm:flex p-2 sm:p-2.5 bg-gradient-to-br from-[#f15c00] to-orange-600 rounded-lg sm:rounded-xl flex-shrink-0 ring-2 ring-orange-400/30 shadow-lg">
                  <img src='/FSG-Brandmark-CMYK2-01.png' className={styles.logo + ' w-auto'} alt="FSG Logo" />
                </div>
              )}

              {/* MOBILE MENU BUTTON */}
              {isMobile && (
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="flex sm:hidden items-center justify-center w-10 h-10 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all flex-shrink-0 backdrop-blur-sm border border-white/10"
                >
                  <Menu size={20} />
                </button>
              )}

              {/* TITLE & USER INFO */}
              <div className="flex flex-col min-w-0 overflow-hidden flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className={`${styles.title} font-bold text-white truncate leading-tight`}>
                    {title}
                  </h1>
                  {variant !== 'minimal' && profile && !isMobile && (
                    <div className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${getRoleBadgeStyle()} flex-shrink-0 shadow-sm`}>
                      {getRoleIcon()}
                      <span className="capitalize">{profile.role || '...'}</span>
                    </div>
                  )}
                </div>

                {subtitle && (
                  <p className="text-xs sm:text-sm text-slate-300 mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}

                {variant !== 'minimal' && profile && !isMobile && (
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                    <User size={14} className="text-orange-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-slate-300 font-medium truncate">
                      {getUserDisplayName()}
                    </span>
                  </div>
                )}
              </div>

              {/* SEARCH BAR - Desktop */}
              {showSearch && !isMobile && (
                <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center gap-2 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher..."
                      className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all w-64 backdrop-blur-sm"
                    />
                  </div>
                </form>
              )}
            </div>

            {/* RIGHT SECTION */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* CUSTOM ACTIONS */}
              {customActions}

              {/* NOTIFICATIONS */}
              {showNotifications && (
                <button
                  className="relative flex items-center justify-center w-10 h-10 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all flex-shrink-0 backdrop-blur-sm border border-white/10"
                  title="Notifications"
                >
                  <Bell size={20} />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </button>
              )}

              {/* QR SCANNER */}
              {showQRScanner && isMobile && (
                <button
                  onClick={startScanner}
                  className="group flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-blue-500/50 flex-shrink-0 border border-blue-400/30"
                  title="Scanner QR Code"
                >
                  <QrCode size={20} className="group-hover:scale-110 transition-transform duration-300" />
                </button>
              )}

              {/* ADMIN BUTTON */}
              {showAdminButton && profile?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="group flex items-center justify-center gap-2 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 shadow-sm font-medium flex-shrink-0 backdrop-blur-sm border border-white/10"
                  title="Panneau d'administration"
                >
                  <Settings size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                  <span className="hidden md:inline">Admin</span>
                </button>
              )}

              {/* USER MENU - Desktop */}
              {!isMobile && (
                <button
                  onClick={handleSignOut}
                  className="group flex items-center justify-center gap-2 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 bg-red-600/90 text-white rounded-lg hover:bg-red-700 transition-all duration-200 shadow-sm font-medium flex-shrink-0 border border-red-500/30"
                  title="Déconnexion"
                >
                  <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
                  <span className="hidden md:inline">Déconnexion</span>
                </button>
              )}

              {/* LOGOUT BUTTON - Mobile */}
              {isMobile && (
                <button
                  onClick={handleSignOut}
                  className="group flex items-center justify-center w-10 h-10 bg-red-600/90 text-white rounded-lg hover:bg-red-700 transition-all duration-200 shadow-sm flex-shrink-0 border border-red-500/30"
                  title="Se déconnecter"
                >
                  <LogOut size={20} className="group-hover:translate-x-0.5 transition-transform duration-300" />
                </button>
              )}
            </div>
          </div>

          {/* MOBILE SEARCH BAR */}
          {showSearch && isMobile && (
            <form onSubmit={handleSearchSubmit} className="mt-3 md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all backdrop-blur-sm"
                />
              </div>
            </form>
          )}
        </div>

        {/* Decorative line with glow effect */}
        <div className="h-1 bg-gradient-to-r from-[#f15c00] via-orange-500 to-orange-600 shadow-lg shadow-orange-500/50"></div>
      </div>

      {/* MOBILE MENU */}
      {showMobileMenu && isMobile && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-70 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)}>
          <div className="bg-gradient-to-b from-slate-900 to-slate-800 w-64 h-full shadow-2xl p-4 border-r border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Menu</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {profile && (
              <div className="mb-6 p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                <p className="font-medium text-white">{getUserDisplayName()}</p>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeStyle()} mt-2 w-fit`}>
                  {getRoleIcon()}
                  <span className="capitalize">{profile.role}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {showAdminButton && profile?.role === 'admin' && (
                <button
                  onClick={() => {
                    navigate('/admin');
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Settings size={20} />
                  Administration
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR SCANNER MODAL */}
      {showScanner && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex items-center justify-center">
          <div className="relative w-full h-full max-w-md mx-auto flex flex-col">
            <div className="bg-white p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Scanner QR Code</h2>
              <button
                onClick={stopScanner}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-600" />
              </button>
            </div>

            <div className="flex-1 relative bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
              />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-4 border-white rounded-xl opacity-50"></div>
              </div>

              <div className="absolute bottom-8 left-0 right-0 text-center">
                <p className="text-white text-sm bg-black bg-opacity-50 px-4 py-2 rounded-full mx-8">
                  Placez le QR code dans le cadre
                </p>
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </>
  );
}