/**
 * Serviços de mapa gratuitos (sem chave de API):
 *  - Geocodificação: Nominatim / OpenStreetMap (limite: 1 requisição por segundo)
 *  - Rotas: OSRM público (router.project-osrm.org) — servidor de demonstração, sem SLA.
 * Para volume maior, trocar por instâncias próprias ou um provedor pago com a mesma interface.
 */

export type LatLng = { lat: number; lng: number };

export type Route = {
  coords: [number, number][]; // [lat, lng] — formato do Leaflet
  distanceKm: number;
  durationMin: number;
};

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    limit: '1',
    countrycodes: 'br',
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'Accept-Language': 'pt-BR' },
  });
  if (!res.ok) return null;
  const results = await res.json();
  if (!results?.length) return null;
  return { lat: Number(results[0].lat), lng: Number(results[0].lon) };
}

export async function getRoute(from: LatLng, to: LatLng): Promise<Route | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const route = data?.routes?.[0];
  if (!route) return null;
  return {
    coords: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
  };
}

/** Distância em linha reta (metros) — usada para decidir quando reenviar GPS/recalcular rota. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
