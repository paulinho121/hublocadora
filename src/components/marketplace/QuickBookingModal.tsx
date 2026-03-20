import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Truck, 
  Store, 
  ChevronRight, 
  ArrowRight, 
  Info, 
  CheckCircle2, 
  Clock,
  ShieldCheck,
  Calendar as CalendarIcon
} from 'lucide-react';
import { 
  Dialog 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Equipment } from '@/types/database';
import { useCreateBooking } from '@/hooks/useBookings';
import { useTenant } from '@/contexts/TenantContext';

interface QuickBookingModalProps {
    equipment: Equipment | null;
    isOpen: boolean;
    onClose: () => void;
}

export function QuickBookingModal({ equipment, isOpen, onClose }: QuickBookingModalProps) {
    const { tenantId, company } = useTenant();
    const createBooking = useCreateBooking();
    const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
    const [quantity, setQuantity] = useState(1);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!equipment) return null;

    const handleReserve = async () => {
        if (!tenantId) return;

        try {
            await createBooking.mutateAsync({
                equipment_id: equipment.id,
                company_id: equipment.company_id,
                renter_id: company?.owner_id || '', // Renter is the current user/company
                start_date: new Date().toISOString(), // Mocking dates for now
                end_date: new Date(Date.now() + 86400000).toISOString(),
                total_amount: equipment.daily_rate * quantity,
                status: 'pending',
                quantity,
                delivery_method: deliveryMethod,
                delivery_address: deliveryMethod === 'delivery' ? company?.address_street : null,
                notes: `Reserva rápida via HUB`
            });
            setIsSuccess(true);
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
            }, 3000);
        } catch (error) {
            console.error('Erro ao reservar:', error);
            alert('Não foi possível processar a reserva agora.');
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose}>
            <div className="max-w-xl bg-zinc-950 border-zinc-800 p-0 overflow-y-auto rounded-3xl -m-6 max-h-[90vh] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                <AnimatePresence mode="wait">
                    {isSuccess ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-12 text-center flex flex-col items-center gap-6"
                        >
                            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Reserva Solicitada!</h3>
                                <p className="text-zinc-500">A equipe do HUB já recebeu o seu pedido e está separando o equipamento.</p>
                            </div>
                            <Button variant="ghost" className="text-emerald-500" onClick={onClose}>Fechar</Button>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            {/* Hero Header */}
                            <div className="relative h-48 bg-zinc-900 overflow-hidden">
                                {equipment.images?.[0] && (
                                    <img 
                                        src={equipment.images[0]} 
                                        className="w-full h-full object-cover opacity-60 scale-105" 
                                        alt={equipment.name}
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                                <div className="absolute bottom-6 left-6 right-6">
                                    <Badge className="bg-primary/20 text-primary border-primary/20 mb-2 uppercase font-black tracking-widest text-[10px]">
                                        Disponível no HUB
                                    </Badge>
                                    <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic leading-none">
                                        {equipment.name}
                                    </h2>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Stats Bar */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-900">
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Estoque HUB</p>
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-emerald-500" />
                                            <span className="text-lg font-black text-zinc-100 italic">{equipment.stock_quantity || 0} Unidades</span>
                                        </div>
                                    </div>
                                    <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-900">
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Custo Diária</p>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-primary" />
                                            <span className="text-lg font-black text-zinc-100 italic">R$ {equipment.daily_rate}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Logistics Selector */}
                                <div>
                                    <h4 className="text-[10px] uppercase font-black text-zinc-500 mb-4 tracking-widest flex items-center gap-2">
                                        <Truck className="w-3 h-3" /> Escolha como deseja receber
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => setDeliveryMethod('pickup')}
                                            className={`group relative p-6 rounded-2xl border-2 transition-all text-left ${
                                                deliveryMethod === 'pickup' 
                                                ? 'bg-emerald-500/10 border-emerald-500' 
                                                : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                                            }`}
                                        >
                                            <Store className={`w-6 h-6 mb-3 ${deliveryMethod === 'pickup' ? 'text-emerald-500' : 'text-zinc-500'}`} />
                                            <p className="font-bold text-sm mb-1">Retirada no HUB</p>
                                            <p className="text-[10px] text-zinc-500 line-clamp-1 italic">Grátis - Disponível Hoje</p>
                                            {deliveryMethod === 'pickup' && (
                                                <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-0.5">
                                                    <CheckCircle2 className="w-3 h-3 text-black" />
                                                </div>
                                            )}
                                        </button>

                                        <button 
                                            onClick={() => setDeliveryMethod('delivery')}
                                            className={`group relative p-6 rounded-2xl border-2 transition-all text-left ${
                                                deliveryMethod === 'delivery' 
                                                ? 'bg-primary/10 border-primary' 
                                                : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                                            }`}
                                        >
                                            <Truck className={`w-6 h-6 mb-3 ${deliveryMethod === 'delivery' ? 'text-primary' : 'text-zinc-500'}`} />
                                            <p className="font-bold text-sm mb-1">Entrega Local</p>
                                            <p className="text-[10px] text-zinc-500 line-clamp-1 italic">Frete fixo na sua locadora</p>
                                            {deliveryMethod === 'delivery' && (
                                                <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5">
                                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Value Info */}
                                <div className="bg-zinc-900/50 p-6 rounded-3xl border border-dashed border-zinc-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-zinc-200">Garantia Cinehub Authority</p>
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Equipamento revisado e segurado</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Investimento Total</p>
                                        <p className="text-2xl font-black text-white tracking-tighter italic">R$ {equipment.daily_rate * quantity}</p>
                                    </div>
                                </div>

                                {/* CTA Button */}
                                <div className="flex gap-4">
                                    <Button 
                                        className="flex-1 h-14 rounded-2xl bg-white text-black hover:bg-zinc-200 font-black italic uppercase tracking-tighter group transition-all"
                                        onClick={handleReserve}
                                        disabled={createBooking.isPending}
                                    >
                                        {createBooking.isPending ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                Confirmar Reserva Agora
                                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="h-14 w-14 rounded-2xl border-zinc-800 bg-transparent"
                                        onClick={onClose}
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Dialog>
    );
}

function Loader2({ className }: { className?: string }) {
    return <Clock className={`${className} animate-spin`} />;
}

function X({ className }: { className?: string }) {
    return <ChevronRight className={`${className} rotate-180`} />;
}
