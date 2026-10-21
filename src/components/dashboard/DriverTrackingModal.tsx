import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { TrackingMap } from '@/components/DeliveryMap';
import { supabase } from '@/lib/supabase';
import { geocodeAddress, distanceMeters, LatLng, Route } from '@/lib/geo';
import { AlertCircle, Radio } from 'lucide-react';

// Envia um novo ponto quando andou isso OU passou esse tempo desde o último envio
const SEND_MIN_METERS = 30;
const SEND_MIN_MS = 15_000;

interface DriverTrackingModalProps {
  delivery: any | null;
  onClose: () => void;
}

/**
 * Aberto pela logística ao marcar "Enviado". Enquanto estiver aberto, envia o GPS
 * do celular para deliveries.current_lat/current_lng — cliente e locadora acompanham pelo OrderLiveLocation, no detalhe do pedido.
 */
export function DriverTrackingModal({ delivery, onClose }: DriverTrackingModalProps) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const lastSent = useRef<{ pos: LatLng; at: number } | null>(null);

  const deliveryId: string | undefined = delivery?.id;
  const address: string | null = delivery?.booking?.delivery_address ?? null;

  // Destino: usa o já salvo ou geocodifica o endereço de entrega uma única vez
  useEffect(() => {
    if (!deliveryId) return;
    if (delivery.dest_lat != null && delivery.dest_lng != null) {
      setDestination({ lat: Number(delivery.dest_lat), lng: Number(delivery.dest_lng) });
      return;
    }
    if (!address) return;
    geocodeAddress(address).then(async coords => {
      if (!coords) return;
      setDestination(coords);
      await supabase.from('deliveries').update({ dest_lat: coords.lat, dest_lng: coords.lng }).eq('id', deliveryId);
    }).catch(() => {});
  }, [deliveryId]);

  // GPS do aparelho
  useEffect(() => {
    if (!deliveryId) return;
    if (!('geolocation' in navigator)) {
      setGpsError('Este aparelho não oferece GPS pelo navegador.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude };
        setPosition(pos);
        setGpsError(null);

        const prev = lastSent.current;
        const now = Date.now();
        if (prev && distanceMeters(prev.pos, pos) < SEND_MIN_METERS && now - prev.at < SEND_MIN_MS) return;
        lastSent.current = { pos, at: now };

        const { error } = await supabase
          .from('deliveries')
          .update({ current_lat: pos.lat, current_lng: pos.lng, location_updated_at: new Date(now).toISOString() })
          .eq('id', deliveryId);
        if (!error) setLastSentAt(new Date(now));
      },
      err => {
        setGpsError(err.code === err.PERMISSION_DENIED
          ? 'Permissão de localização negada. Libere o GPS para este site nas configurações do navegador.'
          : 'Não foi possível obter o sinal de GPS. Tentando novamente...');
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }
    );

    // Mantém a tela acesa durante a entrega (quando o navegador suporta)
    let wakeLock: any = null;
    (navigator as any).wakeLock?.request('screen').then((lock: any) => { wakeLock = lock; }).catch(() => {});

    return () => {
      navigator.geolocation.clearWatch(watchId);
      wakeLock?.release?.().catch?.(() => {});
      lastSent.current = null;
    };
  }, [deliveryId]);

  // Grava a previsão de chegada para o cliente (campo "Previsão" do rastreio)
  const handleRoute = (route: Route) => {
    if (!deliveryId) return;
    const eta = new Date(Date.now() + route.durationMin * 60_000).toISOString();
    supabase.from('deliveries').update({ estimated_arrival: eta }).eq('id', deliveryId).then(() => {});
  };

  return (
    <Dialog isOpen={!!delivery} onClose={onClose} title="Entrega em Andamento">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold ">
          <Radio className={gpsError ? 'h-4 w-4 text-zinc-400' : 'h-4 w-4 text-emerald-500 animate-pulse'} />
          {gpsError
            ? <span className="text-zinc-500">GPS inativo</span>
            : <span className="text-emerald-500">
                Compartilhando localização{lastSentAt && ` • ${lastSentAt.toLocaleTimeString().slice(0, 5)}`}
              </span>}
        </div>

        {gpsError && (
          <div className="flex gap-2 items-start bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-2xl p-4">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {gpsError}
          </div>
        )}

        <div className="h-[55vh] rounded-2xl overflow-hidden border border-zinc-800">
          <TrackingMap position={position} destination={destination} title="Você está a caminho do cliente" waitingMessage="Obtendo sua localização..." onRoute={handleRoute} />
        </div>

        {address && (
          <p className="text-xs text-zinc-400"><span className="font-semibold text-zinc-400 text-[11px] ">Destino: </span>{address}</p>
        )}

        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Mantenha esta tela aberta até chegar ao cliente. Ao fechar, o envio da localização é pausado —
          reabra pelo botão <span className="text-zinc-300 font-bold">“Abrir Mapa da Entrega”</span>.
        </p>
      </div>
    </Dialog>
  );
}
