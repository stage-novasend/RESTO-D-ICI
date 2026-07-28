/* ═══════════════════════════════════════════════════════════════
   _shared.jsx — Éléments partagés par les onglets du GerantDashboard
   (constantes couleurs, badge compte à rebours B2B, carte des zones)
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { LocateFixed } from "lucide-react";


/* ── Badge compte à rebours B2B ── */
export function B2BCountdown({ deadlineAt, statut }) {
  const DONE = ['LIVREE', 'ANNULEE'];
  const [ms, setMs] = useState(() => deadlineAt ? new Date(deadlineAt) - Date.now() : null);

  useEffect(() => {
    if (!deadlineAt || DONE.includes(statut)) return;
    const id = setInterval(() => setMs(new Date(deadlineAt) - Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadlineAt, statut]);

  if (!deadlineAt || DONE.includes(statut) || ms === null) return null;
  if (ms <= 0) {
    return <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-bold">⏱ Délai dépassé</span>;
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const urgent = ms < 60 * 60 * 1000;
  const warn = ms < 2 * 60 * 60 * 1000;
  return (
    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${urgent ? 'bg-red-100 text-red-700' : warn ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
      ⏱ {h}h {String(m).padStart(2, '0')}m {String(s).padStart(2, '0')}s
    </span>
  );
}

/* ── Carte des zones de livraison (Leaflet) ── */
function DeliveryMapEvents({ onPick }) {
  useMapEvents({
    click(event) {
      onPick({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
}

function DeliveryMapView({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

export function DeliveryZonesMap({ restaurantPosition, selectedPosition, zones, onPick }) {
  const [locating, setLocating] = useState(false);

  const restaurantCenter = [
    Number(restaurantPosition.lat) || 5.3364,
    Number(restaurantPosition.lng) || -4.0267,
  ];
  const pendingCenter = [
    Number(selectedPosition.lat) || restaurantCenter[0],
    Number(selectedPosition.lng) || restaurantCenter[1],
  ];

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onPick({ lat: Number(coords.latitude.toFixed(6)), lng: Number(coords.longitude.toFixed(6)) });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="mt-4 overflow-hidden rounded-[20px] border border-amber-200">
      <div className="flex justify-end bg-amber-50/50 px-3 py-2">
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-[#1A0C00] shadow-sm transition hover:bg-[#FFF0DF] hover:text-[#EA580C] disabled:opacity-50"
        >
          <LocateFixed className={`h-4 w-4 ${locating ? 'animate-pulse' : ''}`} />
          {locating ? 'Localisation…' : 'Utiliser ma position'}
        </button>
      </div>
      <MapContainer center={pendingCenter} zoom={12} scrollWheelZoom className="h-72 w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DeliveryMapEvents onPick={onPick} />
        <DeliveryMapView center={pendingCenter} />

        <CircleMarker
          center={restaurantCenter}
          radius={10}
          pathOptions={{ color: "#00A7CB", fillColor: "#00A7CB", fillOpacity: 0.9 }}
        >
          <Popup>Position du restaurant</Popup>
        </CircleMarker>

        {zones
          .filter((zone) => Number.isFinite(Number(zone.lat)) && Number.isFinite(Number(zone.lng)))
          .map((zone, index) => (
            <CircleMarker
              key={`${zone.nom}-${index}`}
              center={[Number(zone.lat), Number(zone.lng)]}
              radius={8}
              pathOptions={{ color: "#2ECC71", fillColor: "#2ECC71", fillOpacity: 0.85 }}
            >
              <Popup>{zone.nom}</Popup>
            </CircleMarker>
          ))}

        <CircleMarker
          center={pendingCenter}
          radius={9}
          pathOptions={{ color: "#E8906A", fillColor: "#E8906A", fillOpacity: 0.95 }}
        >
          <Popup>Nouvelle zone en préparation</Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
