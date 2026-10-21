import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, AttributionControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useDeliveryTracking } from '../hooks/useDeliveryTracking';
import { getRoute, distanceMeters, LatLng, Route, MAP_TILES } from '@/lib/geo';
import { MapPin } from 'lucide-react';

// Ícones em HTML puro (sem depender de imagens externas)
const truckIcon = L.divIcon({
  className: '',
  html: '<div style="width:40px;height:40px;border-radius:9999px;background:#e11d48;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 20px rgba(225,29,72,.6)">🚚</div>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const destinationIcon = L.divIcon({
  className: '',
  html: '<div style="width:32px;height:32px;border-radius:9999px;background:#10b981;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 16px rgba(16,185,129,.6)">📍</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Recalcula a rota só quando o veículo andou isso (evita abusar do OSRM público)
const ROUTE_REFRESH_METERS = 200;

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!points.length) return;
    // O mapa pode montar dentro de um modal ainda animando: recalcula o tamanho antes de enquadrar
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (points.length === 1) {
        map.flyTo([points[0].lat, points[0].lng], fitted.current ? map.getZoom() : 15);
      } else if (!fitted.current) {
        // Folga extra embaixo para o painel de distância/tempo não cobrir o destino
        map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), {
          paddingTopLeft: [40, 50],
          paddingBottomRight: [40, 100],
        });
      } else {
        map.panTo([points[0].lat, points[0].lng]);
      }
      fitted.current = true;
    }, 250);
    return () => clearTimeout(timer);
  }, [points.map(p => `${p.lat},${p.lng}`).join('|'), map]);
  return null;
}

interface TrackingMapProps {
  position: LatLng | null;
  destination: LatLng | null;
  waitingMessage?: string;
  onRoute?: (route: Route) => void;
}

/** Mapa com o veículo, o destino e a rota entre eles (km e tempo restantes). */
export function TrackingMap({ position, destination, waitingMessage, onRoute }: TrackingMapProps) {
  const [route, setRoute] = useState<Route | null>(null);
  const lastRouted = useRef<LatLng | null>(null);

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
      <div className="h-full w-full bg-zinc-950 flex items-center justify-center">
        <p className="text-white font-medium flex items-center gap-2 text-sm">
          <MapPin className="text-red-500" /> {waitingMessage || 'Aguardando sinal GPS do veículo...'}
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full z-0">
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={15}
        attributionControl={false}
        className="cinehub-map"
        style={{ height: '100%', width: '100%' }}
      >
        {/* Créditos no topo: o painel de distância/tempo ocupa a parte de baixo */}
        <AttributionControl position="topright" prefix={false} />
        {/* Geoapify (tema escuro) quando há chave; senão OSM escurecido por CSS — ver geo.ts */}
        <TileLayer
          url={MAP_TILES.url}
          className={MAP_TILES.className}
          maxZoom={19}
          attribution={MAP_TILES.attribution}
        />
        <FitBounds points={destination ? [position, destination] : [position]} />
        {route && <Polyline positions={route.coords} pathOptions={{ color: '#e11d48', weight: 5, opacity: 0.85 }} />}
        {destination && <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />}
        <Marker position={[position.lat, position.lng]} icon={truckIcon} />
      </MapContainer>

      {route && (
        <div className="absolute bottom-3 left-3 right-3 z-[400] flex justify-between gap-2 bg-black/80 backdrop-blur-md border border-zinc-800 rounded-2xl px-4 py-3">
          <div>
            <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Distância</p>
            <p className="text-sm font-black text-white">{route.distanceKm.toFixed(1)} km</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Chegada estimada</p>
            <p className="text-sm font-black text-white">{Math.max(1, Math.round(route.durationMin))} min</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Bloco "Localização do equipamento" do detalhe do pedido. Acompanha a entrega em
 * tempo real (Realtime) e aparece sozinho, para a locadora e para o cliente, assim que
 * o pedido é despachado — sem depender da lista de pedidos ser recarregada.
 */
export function OrderLiveLocation({ bookingId }: { bookingId: string }) {
  const { delivery } = useDeliveryTracking(bookingId);
  if (!delivery || delivery.status !== 'shipped') return null;

  const position = delivery.current_lat != null && delivery.current_lng != null
    ? { lat: Number(delivery.current_lat), lng: Number(delivery.current_lng) }
    : null;
  const destination = delivery.dest_lat != null && delivery.dest_lng != null
    ? { lat: Number(delivery.dest_lat), lng: Number(delivery.dest_lng) }
    : null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" /> Localização do equipamento
      </h3>
      <div className="h-80 md:h-96 rounded-3xl overflow-hidden border border-zinc-800">
        <TrackingMap position={position} destination={destination} waitingMessage="Aguardando sinal GPS do veículo..." />
      </div>
    </div>
  );
}
