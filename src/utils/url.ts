export function getInterventionIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}
