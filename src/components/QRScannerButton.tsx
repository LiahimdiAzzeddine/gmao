import { useEffect, useRef, useState } from 'react';
import { QrCode, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';

type QRScannerButtonProps = {
  className?: string;
  label?: string;
};

export default function QRScannerButton({
  className = '',
  label = 'Scanner QR',
}: QRScannerButtonProps) {
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const stopScanner = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (scanIntervalRef.current !== null) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    setShowScanner(false);
  };

  const handleQRCodeDetected = (value: string) => {
    try {
      const detectedUrl = new URL(value, window.location.origin);
      if (detectedUrl.origin !== window.location.origin) {
        alert(`QR Code détecté : ${value}`);
        return;
      }

      navigate(`${detectedUrl.pathname}${detectedUrl.search}${detectedUrl.hash}`);
    } catch {
      alert(`QR Code détecté : ${value}`);
    }
  };

  const startQRScanning = () => {
    if (scanIntervalRef.current !== null) window.clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context || video.videoWidth === 0 || video.videoHeight === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        stopScanner();
        handleQRCodeDetected(code.data);
      }
    }, 120);
  };

  const startScanner = async () => {
    setShowScanner(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        startQRScanning();
      }
    } catch (error) {
      console.error('Erreur d’accès à la caméra :', error);
      stopScanner();
      alert('Impossible d’accéder à la caméra. Vérifiez les permissions de votre navigateur.');
    }
  };

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (scanIntervalRef.current !== null) window.clearInterval(scanIntervalRef.current);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={startScanner}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 ${className}`}
      >
        <QrCode size={18} />
        {label}
      </button>

      {showScanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-lg">
            <button
              type="button"
              onClick={stopScanner}
              className="absolute -top-12 right-0 flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-lg hover:bg-slate-100"
            >
              <X size={20} />
              Fermer
            </button>

            <div className="overflow-hidden rounded-lg bg-black shadow-2xl">
              <div className="relative">
                <video ref={videoRef} className="w-full" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-64 w-64 rounded-lg border-4 border-[#ff6b57] shadow-lg" />
                </div>
              </div>
              <div className="p-4 text-center text-white">
                <p className="text-sm font-semibold">Placez le QR code de la machine dans le cadre</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
