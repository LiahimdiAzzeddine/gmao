import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LogOut, QrCode, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import jsQR from 'jsqr';

type TechnicienLayoutProps = {
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

export default function TechnicienLayout({ children }: TechnicienLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showScanner, setShowScanner] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/toutes-machines', icon: Home, label: 'Accueil' },
  ];

  // Scanner QR Code
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
        const ctx = canvas.getContext('2d');

        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            stopScanner();
            handleQRCodeDetected(code.data);
          }
        }
      }
    }, 100);
  };

  const handleQRCodeDetected = (url: string) => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search;
      if (urlObj.origin === window.location.origin) {
        navigate(path);
      } else {
        alert('QR Code détecté: ' + url);
      }
    } catch (err) {
      void err;
      alert('QR Code détecté: ' + url);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#eef2fb] p-0">
      <div className="min-h-screen overflow-hidden bg-white">
        {/* Sidebar navigation */}
        <aside className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-[76px] lg:flex-col lg:justify-start lg:px-0 lg:py-7">
          {/* Logo */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-black text-blue-600 shadow-sm lg:h-11 lg:w-11">
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

            {/* Bouton Scanner QR */}
            <RailButton
              title="Scanner QR Code"
              onClick={startScanner}
            >
              <QrCode size={18} className="lg:w-[19px] lg:h-[19px]" />
            </RailButton>
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

        {/* Modal Scanner QR */}
        {showScanner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-90 p-4">
            <div className="relative w-full max-w-lg">
              <button
                onClick={stopScanner}
                className="absolute -top-12 right-0 flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-semibold text-slate-800 shadow-lg transition-colors hover:bg-slate-100"
              >
                <X size={20} />
                Fermer
              </button>

              <div className="relative overflow-hidden rounded-xl bg-black shadow-2xl">
                <video
                  ref={videoRef}
                  className="w-full"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay de scan */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-64 w-64 border-4 border-blue-500 shadow-lg">
                    <div className="absolute -left-1 -top-1 h-8 w-8 border-l-4 border-t-4 border-white"></div>
                    <div className="absolute -right-1 -top-1 h-8 w-8 border-r-4 border-t-4 border-white"></div>
                    <div className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-white"></div>
                    <div className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-white"></div>
                  </div>
                </div>

                <div className="bg-gradient-to-t from-black/80 to-transparent p-4 text-center text-white">
                  <p className="text-sm font-semibold">Placez le QR code dans le cadre</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
