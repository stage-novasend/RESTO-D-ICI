import { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin } from 'lucide-react';

const DEFAULT_CENTER = { lat: 5.3417, lng: -4.0262 }; // Abidjan

export default function DeliveryMap({ value, onChange, heightClassName = 'h-72', className = '' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  const center = {
    lat: value?.lat ? Number(value.lat) : DEFAULT_CENTER.lat,
    lng: value?.lng ? Number(value.lng) : DEFAULT_CENTER.lng,
  };

  // Geocode with Nominatim (OpenStreetMap, free, no key)
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      const address = data.display_name || '';
      onChange?.({ lat, lng, address });
    } catch {
      onChange?.({ lat, lng, address: '' });
    }
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non supportée');
      return;
    }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        markerRef.current?.setLatLng([lat, lng]);
        mapRef.current?.setView([lat, lng], 15, { animate: true });
        await reverseGeocode(lat, lng);
        setLocating(false);
      },
      () => {
        setGeoError('Position non disponible');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import('leaflet').then((L) => {
      // Guard: effect was cleaned up while the async import was in flight
      if (cancelled || !containerRef.current || mapRef.current) return;
      // Guard: container already has a Leaflet instance (StrictMode double-mount)
      if (containerRef.current._leaflet_id) return;

      delete L.default.Icon.Default.prototype._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.default.map(containerRef.current, { zoomControl: true }).setView(
        [center.lat, center.lng],
        14,
      );

      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const marker = L.default.marker([center.lat, center.lng], { draggable: true }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        reverseGeocode(pos.lat, pos.lng);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      setReady(true);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes to marker position
  useEffect(() => {
    if (!ready || !markerRef.current || !mapRef.current) return;
    if (!value?.lat || !value?.lng) return;
    const newPos = { lat: Number(value.lat), lng: Number(value.lng) };
    markerRef.current.setLatLng([newPos.lat, newPos.lng]);
    mapRef.current.setView([newPos.lat, newPos.lng], mapRef.current.getZoom(), { animate: true });
  }, [ready, value?.lat, value?.lng]);

  return (
    <div className={`relative ${heightClassName} ${className}`} style={{ isolation: 'isolate' }}>
      <div
        ref={containerRef}
        className="absolute inset-0 rounded-xl overflow-hidden border border-[#E2E8F0] bg-[#FFF0DF]"
      />
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#FFF0DF]">
          <div className="text-center text-sm text-[#8B6E50]">
            <MapPin className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Chargement de la carte…
          </div>
        </div>
      )}
      {ready && (
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          title="Utiliser ma position"
          className="absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#1A0C00] shadow-md transition hover:bg-[#FFF0DF] hover:text-[#EA580C] disabled:opacity-50"
        >
          <LocateFixed className={`h-4 w-4 ${locating ? 'animate-pulse' : ''}`} />
          {locating ? 'Localisation…' : 'Ma position'}
        </button>
      )}
      {geoError && (
        <p className="absolute bottom-14 right-3 z-[1000] rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 shadow">
          {geoError}
        </p>
      )}
    </div>
  );
}
