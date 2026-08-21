import { Download, Loader } from 'lucide-react';

interface DownloadButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}

export function DownloadButton({ onClick, loading, disabled }: DownloadButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-[#f15c00] hover:bg-[#d14f00] disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 shadow-md"
    >
      {loading ? (
        <>
          <Loader className="w-5 h-5 animate-spin" />
          Génération en cours...
        </>
      ) : (
        <>
          <Download className="w-5 h-5" />
          Générer le PDF
        </>
      )}
    </button>
  );
}
