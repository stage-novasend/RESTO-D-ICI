// src/utils/onboarding.js — déclenchement des wizards de première connexion.
//
// Un seul endroit décide si un utilisateur doit passer par son wizard, pour que
// Login, Register et les dashboards restent cohérents.

/**
 * Adresse factice posée par Register.jsx : le backend exige une adresse pour
 * créer le restaurant, mais le gérant ne la saisit qu'au wizard d'onboarding.
 * Elle doit donc être traitée comme "pas encore renseignée".
 */
export const ADRESSE_PLACEHOLDER = 'À compléter';

/** Clé localStorage marquant l'onboarding comme terminé ou explicitement passé. */
export const onboardingKey = (userId) => `rdi_ob_${userId}`;

/** Marque l'onboarding comme fait pour cet utilisateur (terminé ou passé). */
export function markOnboardingDone(userId) {
  if (!userId) return;
  try {
    localStorage.setItem(onboardingKey(userId), '1');
    // Clé historique lue par le OnboardingWizard modal des dashboards.
    localStorage.setItem(`wizard_done_${userId}`, '1');
  } catch {
    /* stockage indisponible (navigation privée) — non bloquant */
  }
}

/**
 * Marque le parcours B2B comme traité. Clé distincte de `rdi_ob_` : elle empêche
 * B2BDashboard et BulkOrder de rouvrir le wizard tant qu'aucun compte entreprise
 * n'existe.
 */
export function markB2BOnboarded(userId) {
  if (!userId) return;
  try {
    localStorage.setItem(`b2b_onboarded_${userId}`, '1');
  } catch {
    /* stockage indisponible — non bloquant */
  }
}

export function isOnboardingDone(userId) {
  if (!userId) return false;
  try {
    return !!localStorage.getItem(onboardingKey(userId));
  } catch {
    return false;
  }
}

const isBlank = (v) => !v || !String(v).trim();

/**
 * Le restaurant d'un gérant est-il encore à configurer ?
 * L'adresse placeholder et l'absence d'horaires comptent comme non configuré.
 */
export function restaurantNeedsSetup(restaurant) {
  if (!restaurant) return true;
  const adresse = String(restaurant.adresse ?? '').trim();
  if (!adresse || adresse === ADRESSE_PLACEHOLDER) return true;
  return isBlank(restaurant.openingTime) || isBlank(restaurant.closingTime);
}

/**
 * Faut-il rediriger cet utilisateur vers son wizard après connexion ?
 *
 * B2B est volontairement exclu : le seul signal fiable est l'existence d'un
 * compte entreprise, que seul B2BDashboard connaît (il ouvre son propre wizard
 * quand `compte === null`). Le rediriger ici afficherait le wizard à des
 * entreprises déjà enregistrées.
 */
export function needsOnboarding(user) {
  if (!user?.id) return false;
  if (isOnboardingDone(user.id)) return false;

  const role = user.role?.toUpperCase();
  if (role === 'ADMIN' || role === 'B2B') return false;
  if (role === 'GERANT') return restaurantNeedsSetup(user.restaurant);
  return isBlank(user.telephone); // CLIENT, STAFF
}

/** Route du wizard correspondant au rôle. */
export function onboardingPath(role) {
  switch (role?.toUpperCase()) {
    case 'GERANT': return '/onboarding/gerant';
    case 'B2B':    return '/onboarding/b2b';
    case 'STAFF':  return '/onboarding/staff';
    default:       return '/onboarding/client';
  }
}
