// src/common/utils/delivery-zones.util.ts
// Normalisation partagée des zones de livraison (audit §5.8)
// Accepte des chaînes ou des objets { nom|name, lat, lng } et renvoie une forme homogène.

export interface DeliveryZone {
  nom: string;
  lat: number | null;
  lng: number | null;
}

export function normalizeDeliveryZones(zones?: unknown): DeliveryZone[] {
  if (!Array.isArray(zones)) return [];

  return zones
    .map((zone): DeliveryZone | null => {
      if (typeof zone === 'string') {
        const trimmed = zone.trim();
        return trimmed ? { nom: trimmed, lat: null, lng: null } : null;
      }

      if (zone && typeof zone === 'object') {
        const record = zone as Record<string, unknown>;
        const rawNom =
          typeof record.nom === 'string'
            ? record.nom
            : typeof record.name === 'string'
              ? record.name
              : '';
        const nom = rawNom.trim();
        if (!nom) return null;
        const lat = Number(record.lat);
        const lng = Number(record.lng);
        return {
          nom,
          lat: Number.isFinite(lat) ? lat : null,
          lng: Number.isFinite(lng) ? lng : null,
        };
      }

      return null;
    })
    .filter((zone): zone is DeliveryZone => zone !== null);
}
