import { useDeliveries } from '@/hooks/useDeliveries';
import { OrderStatusTracker } from './OrderStatusTracker';
import { DeliveryMap } from '../DeliveryMap';
import { Loader2, Package, Truck, MapPin, Phone, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';

interface BookingTrackingModalProps {
  bookingId: string;
}

export function BookingTrackingModal({ bookingId }: BookingTrackingModalProps) {
  const { data: deliveries, isLoading } = useDeliveries({ bookingId });
  const delivery = deliveries?.[0];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Localizando Pedido...</p>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
           <Info className="h-8 w-8 text-zinc-700" />
        </div>
        <h3 className="text-xl font-black uppercase text-zinc-200">Aguardando Processamento</h3>
        <p className="text-zinc-500 text-sm mt-2 font-medium">A locadora está revisando seu pedido. Assim que aprovarem, o rastreio em tempo real será ativado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="flex items-center justify-between bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50">
        <div className="flex gap-4 items-center">
            <div className="h-14 w-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden">
                {delivery.booking?.equipment?.images?.[0] ? (
                    <img src={delivery.booking.equipment.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                    <Package className="h-6 w-6 text-zinc-700" />
                )}
            </div>
            <div>
                <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-0.5">Equipamento</p>
                <h4 className="text-lg font-black uppercase text-zinc-100 leading-none">
                    {delivery.booking?.equipment?.name}
                </h4>
            </div>
        </div>
        <div className="text-right">
            <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-1">Status iFood Hub</p>
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black uppercase text-[10px] px-3">
                Ao Vivo
            </Badge>
        </div>
      </div>

      {/* Stepper */}
      <div className="px-2">
        <OrderStatusTracker status={delivery.status} updatedAt={delivery.updated_at} />
      </div>

      {/* Real-Time Map or Driver Info */}
      {delivery.status === 'shipped' && (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
        >
            <div className="h-64 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl relative">
                <DeliveryMap bookingId={bookingId} />
                <div className="absolute top-4 left-4 z-10">
                    <Badge className="bg-black/80 backdrop-blur-md text-white border-zinc-800 font-black uppercase text-[9px] px-3 py-1">
                        GPS Ativo
                    </Badge>
                </div>
            </div>

            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                        <Truck className="h-6 w-6 text-black" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">Motorista Designado</p>
                        <p className="text-sm font-black text-zinc-200 uppercase">{delivery.driver_name || 'Equipe Hub'}</p>
                    </div>
                </div>
                <button className="h-12 w-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 transition-colors">
                    <Phone className="h-5 w-5 text-primary" />
                </button>
            </div>
        </motion.div>
      )}

      {/* General Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
            <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-1">Previsão</p>
            <p className="text-xs font-bold text-zinc-300">
                {delivery.estimated_arrival ? new Date(delivery.estimated_arrival).toLocaleTimeString() : 'Calculando...'}
            </p>
        </div>
        <div className="bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
            <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-1">Origem</p>
            <p className="text-xs font-bold text-zinc-300 truncate">
                {delivery.booking?.company?.name || 'Locadora'}
            </p>
        </div>
      </div>
    </div>
  );
}
