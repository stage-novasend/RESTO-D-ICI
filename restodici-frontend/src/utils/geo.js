/**
 * Calcule la distance entre deux points géographiques en kilomètres
 * en utilisant la formule de Haversine.
 * 
 * @param {number} lat1 Latitude du point 1
 * @param {number} lon1 Longitude du point 1
 * @param {number} lat2 Latitude du point 2
 * @param {number} lon2 Longitude du point 2
 * @returns {number} Distance en kilomètres
 */
export function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  
  const R = 6371; // Rayon de la terre en km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance en km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Récupère la position actuelle de l'utilisateur (si autorisée)
 * 
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        resolve(null); // Refus ou erreur
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  });
}
