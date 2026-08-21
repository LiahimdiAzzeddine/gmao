export const formatDate = (date: string | null): string => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatShortDate = (date: string | null): string => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR');
};

export const getJourSemaine = (jour: number | null): string => {
  if (jour === null) return '—';
  const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return jours[jour] || '—';
};
