/**
 * Détermine si un restaurant est ouvert à l'instant présent, à partir de ses
 * horaires. Gère les créneaux traversant minuit (ex: 11:00–00:00, 18:00–02:00) —
 * une heure de fermeture numériquement avant l'heure d'ouverture signifie que
 * le restaurant ferme le lendemain, pas qu'il est fermé toute la journée.
 *
 * Seule source de vérité pour ce calcul — utilisée à la fois par
 * HorairesGuard (bloque le paiement si fermé) et par les endpoints qui
 * listent des restaurants (affiche le vrai statut ouvert/fermé côté client).
 */
export function isRestaurantOpenNow(
  openingTime?: string | null,
  closingTime?: string | null,
  now: Date = new Date(),
): boolean {
  if (!openingTime || !closingTime) return true; // horaires non configurés

  const [openH, openM] = openingTime.split(':').map(Number);
  const [closeH, closeM] = closingTime.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + openM;
  let closeMinutes = closeH * 60 + closeM;

  const overnight = closeMinutes <= openMinutes;
  if (overnight) closeMinutes += 24 * 60;
  const effectiveCurrent =
    overnight && currentMinutes < openMinutes
      ? currentMinutes + 24 * 60
      : currentMinutes;

  return effectiveCurrent >= openMinutes && effectiveCurrent <= closeMinutes;
}
