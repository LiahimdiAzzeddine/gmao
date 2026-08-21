import { Intervention } from '../lib/supabase';
import { Calendar, User, Wrench } from 'lucide-react';

type Props = {
  interventions: Intervention[];
};

export default function InterventionHistory({ interventions }: Props) {
  if (interventions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <Wrench size={48} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-600">Aucune intervention enregistrée</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {interventions.map((intervention) => (
        <div key={intervention.id} className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  intervention.type_intervention === 'preventive'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {intervention.type_intervention === 'preventive' ? 'Préventive' : 'Corrective'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3">
                {intervention.description}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-slate-600">
              <User size={16} />
              <span className="text-sm">{intervention.technicien_nom}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar size={16} />
              <span className="text-sm">
                {new Date(intervention.date_intervention).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {intervention.pieces_remplacees && (
            <div className="mb-3">
              <label className="text-sm font-medium text-slate-500">Pièces remplacées</label>
              <p className="text-slate-700">{intervention.pieces_remplacees}</p>
            </div>
          )}

          {intervention.photos_urls && intervention.photos_urls.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-500 mb-2 block">Photos</label>
              <div className="flex gap-2 flex-wrap">
                {intervention.photos_urls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Photo {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
