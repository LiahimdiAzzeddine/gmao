import { useState } from 'react';
import { supabase, Machine } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Save, Upload, X } from 'lucide-react';

type Props = {
  machine: Machine;
  onSuccess: () => void;
};

export default function NewIntervention({ machine, onSuccess }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageBefore, setImageBefore] = useState<File[]>([]);
  const [imageAfter, setImageAfter] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [formData, setFormData] = useState({
    type_intervention: 'preventive' as 'preventive' | 'corrective',
    description: '',
    pieces_remplacees: '',
    temps_passe: '',
    date_intervention: new Date().toISOString().slice(0, 16),
  });

  async function uploadPhotos(images: File[], folderPrefix: string): Promise<string[]> {
    if (images.length === 0) return [];

    const uploadedUrls: string[] = [];

    try {
      for (const image of images) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${machine.id}/${folderPrefix}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('gmao-photos')
          .upload(fileName, image, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('gmao-photos')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      return uploadedUrls;
    } catch (err) {
      throw err;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setError('');

    try {
      setUploadingPhotos(true);
      const imageAvantUrls = await uploadPhotos(imageBefore, 'avant');
      const imageApresUrls = await uploadPhotos(imageAfter, 'apres');
      setUploadingPhotos(false);

      const { error: insertError } = await supabase.from('interventions').insert({
        machine_id: machine.id,
        technicien_id: profile.id,
        technicien_nom: profile.nom,
        date_intervention: formData.date_intervention,
        type_intervention: formData.type_intervention,
        description: formData.description,
        pieces_remplacees: formData.pieces_remplacees || null,
        temps_passe: formData.temps_passe ? parseInt(formData.temps_passe) : null,
        image_avant_url: imageAvantUrls.length > 0 ? imageAvantUrls : null,
        image_apres_url: imageApresUrls.length > 0 ? imageApresUrls : null,
      });

      if (insertError) throw insertError;

      setFormData({
        type_intervention: 'preventive',
        description: '',
        pieces_remplacees: '',
        temps_passe: '',
        date_intervention: new Date().toISOString().slice(0, 16),
      });
      setImageBefore([]);
      setImageAfter([]);

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  }

  function handleBeforePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length !== files.length) {
      setError('Seuls les fichiers images sont acceptés');
      setTimeout(() => setError(''), 3000);
    }

    setImageBefore((prev) => [...prev, ...imageFiles]);
  }

  function handleAfterPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length !== files.length) {
      setError('Seuls les fichiers images sont acceptés');
      setTimeout(() => setError(''), 3000);
    }

    setImageAfter((prev) => [...prev, ...imageFiles]);
  }

  function removeBeforePhoto(index: number) {
    setImageBefore((prev) => prev.filter((_, i) => i !== index));
  }

  function removeAfterPhoto(index: number) {
    setImageAfter((prev) => prev.filter((_, i) => i !== index));
  }

  function renderPhotosSection(title: string, photos: File[], onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void, onRemove: (index: number) => void) {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {title} (optionnel)
        </label>
        <div className="space-y-3">
          <label className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
            <div className="text-center">
              <Upload className="mx-auto mb-2 text-slate-400" size={32} />
              <span className="text-sm text-slate-600">
                Cliquez pour ajouter des photos
              </span>
              <span className="block text-xs text-slate-400 mt-1">
                JPG, PNG, GIF jusqu'à 10MB
              </span>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={onAdd}
              className="hidden"
            />
          </label>

          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`${title} ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                    {(photo.size / 1024).toFixed(0)} KB
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-6">Nouvelle intervention</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Type d'intervention
          </label>
          <select
            value={formData.type_intervention}
            onChange={(e) =>
              setFormData({ ...formData, type_intervention: e.target.value as typeof formData.type_intervention })
            }
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="preventive">Préventive</option>
            <option value="corrective">Corrective</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Date et heure
          </label>
          <input
            type="datetime-local"
            value={formData.date_intervention}
            onChange={(e) => setFormData({ ...formData, date_intervention: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description de l'intervention
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Décrivez l'intervention effectuée..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Pièces remplacées (optionnel)
          </label>
          <textarea
            value={formData.pieces_remplacees}
            onChange={(e) => setFormData({ ...formData, pieces_remplacees: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Liste des pièces remplacées..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Temps passé (minutes) (optionnel)
          </label>
          <input
            type="number"
            value={formData.temps_passe}
            onChange={(e) => setFormData({ ...formData, temps_passe: e.target.value })}
            min="0"
            placeholder="Durée en minutes"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {renderPhotosSection('Photos avant intervention', imageBefore, handleBeforePhotoChange, removeBeforePhoto)}

        {renderPhotosSection('Photos après intervention', imageAfter, handleAfterPhotoChange, removeAfterPhoto)}

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            'Enregistrement...'
          ) : (
            <>
              <Save size={20} />
              Enregistrer l'intervention
            </>
          )}
        </button>
      </form>
    </div>
  );
}
