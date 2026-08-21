import { ReactNode } from "react";
import { Eye, Download, Edit2 } from "lucide-react";

type Props = {
  title: string;
  description: string;
  icon: ReactNode;
  infoBlock?: ReactNode;

  canAccess: boolean;
  previewLabel?: string;
  downloadLabel: string;

  onPreview: () => void;
  onDownload: () => void;
  onEdit?: () => void; // Nouvelle prop optionnelle

  colorClasses: {
    bgLight: string;
    text: string;
    btnLight: string;
    btnSolid: string;
  };
};

export default function DocumentActionCard({
  title,
  description,
  icon,
  infoBlock,
  canAccess,
  previewLabel = "Prévisualiser",
  downloadLabel,
  onPreview,
  onDownload,
  onEdit, // Nouvelle prop
  colorClasses,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${canAccess ? colorClasses.bgLight : "bg-gray-100"}`}>
            {icon}
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        
        {/* Bouton d'édition si onEdit est fourni */}
        {onEdit && (
          <button
            onClick={onEdit}
            className={`p-2 rounded-lg transition-all hover:scale-110 ${colorClasses.btnLight} ${colorClasses.text}`}
            title="Modifier"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-4">{description}</p>

      {infoBlock && <div className="mb-4">{infoBlock}</div>}

      <div className="space-y-2">
        <button
          onClick={onPreview}
          disabled={!canAccess}
          className={`w-full py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors
            ${canAccess
              ? `${colorClasses.btnLight} ${colorClasses.text}`
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
        >
          <Eye className="w-5 h-5" />
          {previewLabel}
        </button>

        <button
          onClick={onDownload}
          disabled={!canAccess}
          className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors
            ${canAccess
              ? `${colorClasses.btnSolid} text-white`
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
        >
          <Download className="w-5 h-5" />
          {downloadLabel}
        </button>
      </div>
    </div>
  );
}
