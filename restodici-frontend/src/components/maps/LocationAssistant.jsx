import { MapPin, Navigation, Sparkles } from 'lucide-react';
import DeliveryMap from './DeliveryMap';
import { FREQUENT_LOCATION_ZONES } from './locationAssistantData';

function getToneStyles(tone) {
  if (tone === 'green') {
    return {
      badge: 'bg-[#EAF8F0] text-[#2ECC71]',
      chip: 'border-[#BFE9CD] bg-[#F4FCF7] text-[#238B55] hover:border-[#2ECC71] hover:bg-[#EAF8F0]',
      card: 'border-[#D9F2E2] bg-[#F8FDF9]',
      input: 'focus:border-[#2ECC71] focus:ring-[#2ECC71]/15',
      icon: 'text-[#2ECC71]',
    };
  }

  if (tone === 'blue') {
    return {
      badge: 'bg-[#EAF7FB] text-[#00A7CB]',
      chip: 'border-[#CDECF5] bg-[#F5FCFE] text-[#007C98] hover:border-[#00A7CB] hover:bg-[#EAF7FB]',
      card: 'border-[#D8EEF4] bg-[#F7FCFD]',
      input: 'focus:border-[#00A7CB] focus:ring-[#00A7CB]/15',
      icon: 'text-[#00A7CB]',
    };
  }

  return {
    badge: 'bg-[#FBE8DC] text-[#E8906A]',
    chip: 'border-[#FFD8CC] bg-[#FBE8DC] text-[#7A2E0A] hover:border-[#E8906A] hover:bg-[#FBE8DC]',
    card: 'border-[#F4DED3] bg-[#FFFCFA]',
    input: 'focus:border-[#E8906A] focus:ring-[#E8906A]/15',
    icon: 'text-[#E8906A]',
  };
}

export default function LocationAssistant({
  title = 'Localisation',
  description = 'Choisissez une zone fréquente ou placez le point sur la carte.',
  tone = 'orange',
  addressLabel = 'Adresse',
  addressValue = '',
  onAddressChange,
  addressPlaceholder = 'Adresse complète',
  zoneLabel = 'Zone',
  zoneValue = '',
  onZoneChange,
  mapValue,
  onMapChange,
  frequentZones = FREQUENT_LOCATION_ZONES,
  errorAddress,
  errorZone,
  showZoneField = true,
  showMap = true,
}) {
  const styles = getToneStyles(tone);

  const handleQuickSelect = (zone) => {
    onZoneChange?.(zone.name, zone);
    onAddressChange?.(zone.address, zone);
    onMapChange?.({ lat: zone.lat, lng: zone.lng, address: zone.address }, zone);
  };

  return (
    <div className={`rounded-[24px] border p-4 ${styles.card}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white ${styles.icon}`}>
          <Navigation className="h-5 w-5" />
        </div>
        <div>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${styles.badge}`}>
            <Sparkles className="h-3.5 w-3.5" />
            Zones fréquentes
          </span>
          <h4 className="mt-3 text-base font-bold text-[#0F172A]">{title}</h4>
          <p className="mt-1 text-sm text-[#7A6A58]">{description}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {frequentZones.map((zone) => (
          <button
            key={zone.id}
            type="button"
            onClick={() => handleQuickSelect(zone)}
            className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${styles.chip}`}
          >
            {zone.name}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr,1fr]">
        <div className="space-y-4">
          {showZoneField && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#0F172A]">{zoneLabel}</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737373]" />
                <input
                  type="text"
                  value={zoneValue}
                  onChange={(event) => onZoneChange?.(event.target.value)}
                  placeholder="Ex: Cocody"
                  className={`w-full rounded-2xl border bg-white py-3 pl-11 pr-4 outline-none transition ${styles.input} ${
                    errorZone ? 'border-red-300 bg-red-50' : 'border-[#E2E8F0]'
                  }`}
                />
              </div>
              {errorZone && <p className="mt-2 text-sm font-medium text-red-600">{errorZone}</p>}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#0F172A]">{addressLabel}</label>
            <textarea
              value={addressValue}
              onChange={(event) => onAddressChange?.(event.target.value)}
              rows={3}
              placeholder={addressPlaceholder}
              className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition ${styles.input} ${
                errorAddress ? 'border-red-300 bg-red-50' : 'border-[#E2E8F0]'
              }`}
            />
            {errorAddress && <p className="mt-2 text-sm font-medium text-red-600">{errorAddress}</p>}
          </div>
        </div>

        {showMap && (
          <div>
            <p className="mb-2 text-sm font-semibold text-[#0F172A]">Carte</p>
            <DeliveryMap value={mapValue} onChange={onMapChange} heightClassName="h-72" />
          </div>
        )}
      </div>
    </div>
  );
}
