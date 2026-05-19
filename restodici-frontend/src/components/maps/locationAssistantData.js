export const FREQUENT_LOCATION_ZONES = [
  {
    id: 'cocody',
    name: 'Cocody',
    address: 'Cocody Centre, Abidjan',
    lat: 5.347,
    lng: -3.986,
  },
  {
    id: 'plateau',
    name: 'Plateau',
    address: 'Plateau Centre, Abidjan',
    lat: 5.3237,
    lng: -4.0267,
  },
  {
    id: 'marcory',
    name: 'Marcory',
    address: 'Marcory Résidentiel, Abidjan',
    lat: 5.2958,
    lng: -3.985,
  },
  {
    id: 'treichville',
    name: 'Treichville',
    address: 'Treichville Arras, Abidjan',
    lat: 5.2945,
    lng: -4.0152,
  },
  {
    id: 'yopougon',
    name: 'Yopougon',
    address: 'Yopougon Millionnaire, Abidjan',
    lat: 5.3361,
    lng: -4.0891,
  },
  {
    id: 'angre',
    name: 'Angré',
    address: 'Angré 8e Tranche, Abidjan',
    lat: 5.4048,
    lng: -3.9577,
  },
  {
    id: 'riviera',
    name: 'Riviera',
    address: 'Riviera Palmeraie, Abidjan',
    lat: 5.3759,
    lng: -3.9714,
  },
  {
    id: 'zone-4',
    name: 'Zone 4',
    address: 'Zone 4, Marcory, Abidjan',
    lat: 5.2784,
    lng: -3.9727,
  },
];

export function appendUniqueCsvValue(currentValue = '', nextValue = '') {
  const candidate = String(nextValue || '').trim();
  if (!candidate) {
    return currentValue || '';
  }

  const values = String(currentValue || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.some((value) => value.toLowerCase() === candidate.toLowerCase())) {
    return values.join(', ');
  }

  return [...values, candidate].join(', ');
}
