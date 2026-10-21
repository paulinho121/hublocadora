import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, AttributionControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useDeliveryTracking } from '../hooks/useDeliveryTracking';
import { getRoute, distanceMeters, LatLng, Route, MAP_TILES } from '@/lib/geo';
import { Car, Crosshair, Loader2, MapPin, Minus, Plus } from 'lucide-react';

// Carro visto de cima, apontando para cima (0°); girado conforme a direção do trajeto
const carIcon = (heading: number) => L.divIcon({
  className: '',
  html: `
    <div style="width:52px;height:52px;border-radius:9999px;background:rgba(225,29,72,.14);display:flex;align-items:center;justify-content:center">
      <div style="width:38px;height:38px;border-radius:9999px;background:#fff;box-shadow:0 0 0 4px rgba(225,29,72,.18),0 6px 16px rgba(225,29,72,.35);display:flex;align-items:center;justify-content:center">
        <svg width="22" height="22" viewBox="0 0 24 24" style="transform:rotate(${heading}deg);transition:transform .6s ease">
          <rect x="6" y="2" width="12" height="20" rx="4" fill="#e11d48"/>
          <rect x="8" y="5" width="8" height="4" rx="1.5" fill="#fecdd3"/>
          <rect x="8" y="15" width="8" height="3" rx="1.5" fill="#fecdd3"/>
          <rect x="7.5" y="10" width="9" height="4.5" rx="1" fill="#be123c"/>
        </svg>
      </div>
    </div>`,
  iconSize: [52, 52],
  iconAnchor: [26, 26],
});

const destinationIcon = L.divIcon({
  className: '',
  html: `
    <svg width="34" height="42" viewBox="0 0 34 42" style="filter:drop-shadow(0 4px 6px rgba(0,0,0,.25))">
      <path d="M17 41s14-13.3 14-24A14 14 0 0 0 3 17c0 10.7 14 24 14 24z" fill="#111827"/>
      <circle cx="17" cy="17" r="5.5" fill="#fff"/>
    </svg>`,
  iconSize: [34, 42],
  iconAnchor: [17, 41],
});

// Recalcula a rota só quando o veículo andou isso (poupa a cota da API de rotas)
const ROUTE_REFRESH_METERS = 200;

/** Direção (graus, 0 = norte) de a para b */
function bearing(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat))
    - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Enquadra veículo + destino, deixando espaço para o cartão de baixo
const FIT_OPTIONS = { paddingTopLeft: [40, 60] as [number, number], paddingBottomRight: [40, 130] as [number, number] };

function fitPoints(map: L.Map, points: LatLng[], zoomIfSingle = 16) {
  if (points.length === 1) map.flyTo([points[0].lat, points[0].lng], zoomIfSingle);
  else if (points.length > 1) map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), FIT_OPTIONS);
}

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!points.length) return;
    // O mapa pode montar dentro de um modal ainda animando: recalcula o tamanho antes de enquadrar
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (!fitted.current) fitPoints(map, points);
      else map.panTo([points[0].lat, points[0].lng]);
      fitted.current = true;
    }, 250);
    return () => clearTimeout(timer);
  }, [points.map(p => `${p.lat},${p.lng}`).join('|'), map]);
  return null;
}

/** Captura a instância do mapa para os botões flutuantes (fora do MapContainer) */
function MapRef({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const floatingButton =
  'h-11 w-11 flex items-center justify-center bg-white text-zinc-800 hover:bg-zinc-50 active:bg-zinc-100 transition-colors';

interface TrackingMapProps {
  position: LatLng | null;
  destination: LatLng | null;
  waitingMessage?: string;
  /** Título do cartão de baixo (ex.: "Seu pedido está a caminho") */
  title?: string;
  onRoute?: (route: Route) => void;
}

/** Mapa claro com o veículo, o destino, a rota e o tempo estimado de chegada. */
export function TrackingMap({ position, destination, waitingMessage, title = 'Seu pedido está a caminho', onRoute }: TrackingMapProps) {
  const [route, setRoute] = useState<Route | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const lastRouted = useRef<LatLng | null>(null);

  // Direção do carro: calculada pelo deslocamento entre um ponto de GPS e o seguinte
  const lastPos = useRef<LatLng | null>(null);
  const [heading, setHeading] = useState(0);
  useEffect(() => {
    if (!position) return;
    const prev = lastPos.current;
    if (prev && distanceMeters(prev, position) > 5) setHeading(bearing(prev, position));
    else if (!prev && destination) setHeading(bearing(position, destination));
    lastPos.current = position;
  }, [position?.lat, position?.lng]);
  const icon = useMemo(() => carIcon(heading), [Math.round(heading)]);

  useEffect(() => {
    if (!position || !destination) return;
    if (lastRouted.current && distanceMeters(lastRouted.current, position) < ROUTE_REFRESH_METERS) return;
    lastRouted.current = position;
    getRoute(position, destination).then(r => {
      if (!r) return;
      setRoute(r);
      onRoute?.(r);
    }).catch(() => {});
  }, [position?.lat, position?.lng, destination?.lat, destination?.lng]);

  if (!position) {
    return (
      <div className="palette-original h-full w-full bg-[#eef0f3] flex flex-col items-center justify-center gap-3 text-center px-6">
        <div className="h-12 w-12 rounded-full bg-white shadow-md flex items-center justify-center">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <p className="text-zinc-600 font-semibold text-sm">{waitingMessage || 'Aguardando sinal GPS do veículo...'}</p>
      </div>
    );
  }

  const points = destination ? [position, destination] : [position];
  const minutes = route ? Math.max(1, Math.round(route.durationMin)) : null;

  return (
    <div className="palette-original relative h-full w-full z-0">
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={16}
        zoomControl={false}
        attributionControl={false}
        className="cinehub-map"
        style={{ height: '100%', width: '100%' }}
      >
        <AttributionControl position="topleft" prefix={false} />
        <TileLayer url={MAP_TILES.url} className={MAP_TILES.className} maxZoom={19} attribution={MAP_TILES.attribution} />
        <MapRef onReady={setMap} />
        <FitBounds points={points} />
        {route && (
          <>
            {/* Contorno branco por baixo deixa a rota legível sobre as ruas */}
            <Polyline positions={route.coords} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9 }} />
            <Polyline positions={route.coords} pathOptions={{ color: '#e11d48', weight: 5, opacity: 0.95 }} />
          </>
        )}
        {destination && <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />}
        <Marker position={[position.lat, position.lng]} icon={icon} />
      </MapContainer>

      {/* Zoom */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col rounded-2xl overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.15)] divide-y divide-zinc-200">
        <button aria-label="Aproximar" onClick={() => map?.zoomIn()} className={floatingButton}><Plus className="h-5 w-5" /></button>
        <button aria-label="Afastar" onClick={() => map?.zoomOut()} className={floatingButton}><Minus className="h-5 w-5" /></button>
      </div>

      {/* Recentralizar no veículo e no destino */}
      <button
        aria-label="Centralizar"
        onClick={() => map && fitPoints(map, points)}
        className={`${floatingButton} absolute right-3 bottom-[92px] z-[400] rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.15)]`}
      >
        <Crosshair className="h-5 w-5" />
      </button>

      {/* Cartão de status */}
      <div className="absolute left-3 right-3 bottom-3 z-[400] flex items-center gap-3 bg-white rounded-2xl px-3 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        <div className="h-11 w-11 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
          <Car className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-zinc-900 truncate">{title}</p>
          <p className="text-xs text-zinc-500 truncate">
            {minutes !== null
              ? `Chegada em aproximadamente ${minutes} min · ${route!.distanceKm.toFixed(1)} km`
              : destination
                ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Calculando rota...</span>
                : 'Endereço de entrega sem localização no mapa'}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * "Acompanhe sua entrega" no detalhe do pedido. Acompanha a entrega em tempo real
 * (Realtime) e aparece sozinho, para a locadora e para o cliente, assim que o pedido é
 * despachado. O mapa fica recolhido e abre no botão "Ver no mapa".
 */
export function OrderLiveLocation({ bookingId, title }: { bookingId: string; title?: string }) {
  const { delivery } = useDeliveryTracking(bookingId);
  const [open, setOpen] = useState(false);
  if (!delivery || delivery.status !== 'shipped') return null;

  const position = delivery.current_lat != null && delivery.current_lng != null
    ? { lat: Number(delivery.current_lat), lng: Number(delivery.current_lng) }
    : null;
  const destination = delivery.dest_lat != null && delivery.dest_lng != null
    ? { lat: Number(delivery.dest_lat), lng: Number(delivery.dest_lng) }
    : null;
  const eta = delivery.estimated_arrival
    ? new Date(delivery.estimated_arrival).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900/30">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-4 p-4 md:p-5 text-left hover:bg-zinc-900/60 transition-colors"
      >
        <span className="relative h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <Car className="relative h-5 w-5 text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-black text-white">Acompanhe sua entrega</span>
          <span className="block text-sm text-zinc-400 truncate">
            {position
              ? eta ? `Em trânsito · chegada prevista às ${eta}` : 'Em trânsito agora'
              : 'Em trânsito · aguardando o GPS do veículo'}
          </span>
        </span>
        <span className="shrink-0 h-11 px-4 rounded-xl bg-white text-zinc-900 text-[11px] font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4" /> {open ? 'Fechar' : 'Ver no mapa'}
        </span>
      </button>

      {open && (
        <div className="h-96 md:h-[28rem] border-t border-zinc-800">
          <TrackingMap position={position} destination={destination} title={title} waitingMessage="Aguardando sinal GPS do veículo..." />
        </div>
      )}
    </div>
  );
}
