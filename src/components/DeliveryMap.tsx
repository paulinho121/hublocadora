import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useDeliveryTracking } from '../hooks/useDeliveryTracking';
import { getRoute, distanceMeters, LatLng, Route } from '@/lib/geo';
import { MapPin, Loader2 } from 'lucide-react';

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
    if (points.length === 1) {
      map.flyTo([points[0].lat, points[0].lng], fitted.current ? map.getZoom() : 15);
    } else if (!fitted.current) {
      map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [40, 40] });
    } else {
      map.panTo([points[0].lat, points[0].lng]);
    }
    fitted.current = true;
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
      <MapContainer center={[position.lat, position.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
        {/* Tema escuro do OpenStreetMap via CARTO (gratuito) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
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

interface DeliveryMapProps {
  bookingId: string;
}

/** Visão do cliente: acompanha em tempo real o GPS enviado pela logística. */
export function DeliveryMap({ bookingId }: DeliveryMapProps) {
  const { delivery, loading, error } = useDeliveryTracking(bookingId);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950">
        <p className="text-zinc-400 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Conectando ao rastreio...</p>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950 text-red-500 text-sm">
        Erro ao buscar detalhes do rastreamento.
      </div>
    );
  }

  const position = delivery.current_lat != null && delivery.current_lng != null
    ? { lat: Number(delivery.current_lat), lng: Number(delivery.current_lng) }
    : null;
  const destination = delivery.dest_lat != null && delivery.dest_lng != null
    ? { lat: Number(delivery.dest_lat), lng: Number(delivery.dest_lng) }
    : null;

  return (
    <TrackingMap
      position={position}
      destination={destination}
      waitingMessage={delivery.status === 'shipped' ? 'Aguardando sinal GPS do veículo...' : 'O rastreio começa quando o pedido for enviado.'}
    />
  );
}
