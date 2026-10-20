/**
 * Serviços de mapa.
 *
 * Provedor principal: Geoapify (uma chave para mapa, geocodificação e rotas).
 *   Chave em VITE_GEOAPIFY_KEY — restrinja-a ao domínio do app no painel do Geoapify,
 *   já que chaves VITE_* ficam visíveis no navegador.
 *
 * Reserva (enquanto a chave não estiver configurada ou se o Geoapify falhar):
 *   Nominatim (geocodificação) e OSRM público (rotas). O OSRM público é de
 *   demonstração e não permite uso comercial — não deve ser o caminho de produção.
 */

const GEOAPIFY_KEY: string | undefined = import.meta.env.VITE_GEOAPIFY_KEY || undefined;

export type LatLng = { lat: number; lng: number };

export type Route = {
  coords: [number, number][]; // [lat, lng] — formato do Leaflet
  distanceKm: number;
  durationMin: number;
};

/** Camada de mapa para o Leaflet. Com Geoapify, usa o estilo escuro nativo. */
export const MAP_TILES = GEOAPIFY_KEY
  ? {
      url: `https://maps.geoapify.com/v1/tile/dark-matter/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_KEY}`,
      attribution:
        'Powered by <a href="https://www.geoapify.com/">Geoapify</a> | &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      className: undefined as string | undefined,
    }
  : {
      // Tiles claros do OSM escurecidos por CSS (.map-tiles-dark em index.css)
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      className: 'map-tiles-dark' as string | undefined,
    };

// ── Geocodificação ───────────────────────────────────────────────────────────

async function geocodeGeoapify(address: string): Promise<LatLng | null> {
  const params = new URLSearchParams({
    text: address,
    filter: 'countrycode:br',
    lang: 'pt',
    limit: '1',
    format: 'json',
    apiKey: GEOAPIFY_KEY!,
  });
  const res = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`);
  if (!res.ok) return null;
  const result = (await res.json())?.results?.[0];
  return result ? { lat: Number(result.lat), lng: Number(result.lon) } : null;
}

async function geocodeNominatim(address: string): Promise<LatLng | null> {
  const params = new URLSearchParams({ q: address, format: 'json', limit: '1', countrycodes: 'br' });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'Accept-Language': 'pt-BR' },
  });
  if (!res.ok) return null;
  const results = await res.json();
  if (!results?.length) return null;
  return { lat: Number(results[0].lat), lng: Number(results[0].lon) };
}

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (GEOAPIFY_KEY) {
    const result = await geocodeGeoapify(address).catch(() => null);
    if (result) return result;
  }
  return geocodeNominatim(address);
}

// ── Rotas ────────────────────────────────────────────────────────────────────

async function routeGeoapify(from: LatLng, to: LatLng): Promise<Route | null> {
  const params = new URLSearchParams({
    waypoints: `${from.lat},${from.lng}|${to.lat},${to.lng}`,
    mode: 'drive',
    apiKey: GEOAPIFY_KEY!,
  });
  const res = await fetch(`https://api.geoapify.com/v1/routing?${params}`);
  if (!res.ok) return null;
  const feature = (await res.json())?.features?.[0];
  if (!feature) return null;

  // A geometria vem como LineString ou MultiLineString de [lng, lat]
  const lines: [number, number][][] =
    feature.geometry.type === 'MultiLineString' ? feature.geometry.coordinates : [feature.geometry.coordinates];

  return {
    coords: lines.flat().map(([lng, lat]) => [lat, lng]),
    distanceKm: feature.properties.distance / 1000,
    durationMin: feature.properties.time / 60,
  };
}

async function routeOsrm(from: LatLng, to: LatLng): Promise<Route | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const route = (await res.json())?.routes?.[0];
  if (!route) return null;
  return {
    coords: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
  };
}

export async function getRoute(from: LatLng, to: LatLng): Promise<Route | null> {
  if (GEOAPIFY_KEY) {
    const result = await routeGeoapify(from, to).catch(() => null);
    if (result) return result;
  }
  return routeOsrm(from, to);
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
