import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useDeliveryTracking } from '../hooks/useDeliveryTracking';
import { Truck, MapPin, Package, CheckCircle, Clock } from 'lucide-react';

// Corrigindo o problema padrão dos ícones do Leaflet com webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Ícone customizado para o caminhão (opcional)
const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2769/2769339.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

// Componente utilitário para mover o mapa suavemente até a nova posição
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom());
  }, [center, map]);
  return null;
}

interface DeliveryMapProps {
  bookingId: string;
}

export function DeliveryMap({ bookingId }: DeliveryMapProps) {
  const { delivery, loading, error } = useDeliveryTracking(bookingId);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center bg-zinc-900 rounded-lg border border-zinc-800 animate-pulse">
        <p className="text-zinc-400 flex items-center gap-2"><Truck className="animate-bounce" /> Conectando ao Satélite...</p>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="flex h-64 items-center justify-center bg-zinc-900 rounded-lg text-red-500 border border-zinc-800">
        Erro ao buscar detalhes do rastreamento.
      </div>
    );
  }

  const hasLocation = delivery.current_lat !== null && delivery.current_lng !== null;
  const position: [number, number] = hasLocation ? [delivery.current_lat!, delivery.current_lng!] : [0, 0];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'preparing': return 'text-yellow-500';
      case 'in_transit': return 'text-blue-500';
      case 'delivered': return 'text-green-500';
      default: return 'text-zinc-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'preparing': return <Package className="w-5 h-5" />;
      case 'in_transit': return <Truck className="w-5 h-5 animate-pulse" />;
      case 'delivered': return <CheckCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const statusMap: Record<string, string> = {
    preparing: 'Preparando Kit na Locadora',
    in_transit: 'Em Trânsito para o Set',
    delivered: 'Equipamento Entregue',
    cancelled: 'Entrega Cancelada'
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header Info */}
      <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            Rastreio de Entrega
            <span className="text-xs bg-red-600/20 text-red-500 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              Ao Vivo
            </span>
          </h3>
          <p className="text-zinc-400 text-sm mt-1">Motorista: {delivery.driver_name || 'A definir'} • {delivery.driver_phone || '--'}</p>
        </div>
        
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-800 w-full md:w-auto ${getStatusColor(delivery.status)}`}>
          {getStatusIcon(delivery.status)}
          <span className="font-medium whitespace-nowrap">{statusMap[delivery.status] || delivery.status}</span>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-[400px] rounded-xl overflow-hidden border border-zinc-800 z-0">
        {!hasLocation && (
           <div className="absolute inset-0 bg-zinc-950/80 z-10 flex items-center justify-center">
             <p className="text-white font-medium flex items-center gap-2">
               <MapPin className="text-red-500" /> Aguardando sinal GPS do veículo...
             </p>
           </div>
        )}
        
        {hasLocation && (
          <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }}>
            {/* Tema Escuro do OpenStreetMap via CartoDB */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {hasLocation && <MapUpdater center={position} />}
            <Marker position={position} icon={truckIcon}>
              <Popup className="text-zinc-900 rounded-lg">
                <div className="font-semibold text-sm">Caminhão Localizado</div>
                <div className="text-xs text-zinc-600">Atualizado instantes atrás</div>
              </Popup>
            </Marker>
          </MapContainer>
        )}
      </div>
    </div>
  );
}
