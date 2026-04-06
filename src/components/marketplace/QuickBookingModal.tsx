import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Truck, 
  Store, 
  ChevronRight, 
  ArrowRight, 
  CheckCircle2, 
  Clock,
  ShieldCheck,
  Calendar as CalendarIcon,
  AlertCircle
} from 'lucide-react';
import { 
  Dialog 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Equipment } from '@/types/database';
import { useCreateBooking, useEquipmentOccupiedDates } from '@/hooks/useBookings';
import { useTenant } from '@/contexts/TenantContext';
import { format, differenceInDays, isWithinInterval, parseISO, isAfter, startOfDay, addDays } from 'date-fns';

interface QuickBookingModalProps {
    equipment: Equipment | null;
    isOpen: boolean;
    onClose: () => void;
}

export function QuickBookingModal({ equipment, isOpen, onClose }: QuickBookingModalProps) {
    const { tenantId, company } = useTenant();
    const createBooking = useCreateBooking();
    
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
    const [quantity, setQuantity] = useState(1);
    const [isSuccess, setIsSuccess] = useState(false);

    const { data: occupiedDates } = useEquipmentOccupiedDates(equipment?.id || '');

    const totalDays = useMemo(() => {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        if (isAfter(start, end)) return 0;
        const diff = differenceInDays(end, start);
        return diff === 0 ? 1 : diff;
    }, [startDate, endDate]);

    const isAvailable = useMemo(() => {
        if (!occupiedDates || !equipment) return true;
        
        const start = startOfDay(parseISO(startDate));
        const end = startOfDay(parseISO(endDate));

        let current = start;
        while (current <= end) {
            const bookedThatDay = occupiedDates.reduce((acc, booking) => {
                const bStart = startOfDay(parseISO(booking.start_date));
                const bEnd = startOfDay(parseISO(booking.end_date));
                
                if (isWithinInterval(current, { start: bStart, end: bEnd })) {
                    return acc + booking.quantity;
                }
                return acc;
            }, 0);

            if (bookedThatDay + quantity > equipment.stock_quantity) {
                return false;
            }
            current = addDays(current, 1);
        }
        return true;
    }, [occupiedDates, equipment, startDate, endDate, quantity]);

    if (!equipment) return null;

    const handleReserve = async () => {
        if (!tenantId || !isAvailable) return;

        try {
            await createBooking.mutateAsync({
                equipment_id: equipment.id,
                company_id: equipment.company_id,
                renter_id: company?.owner_id || '', 
                start_date: parseISO(startDate).toISOString(),
                end_date: parseISO(endDate).toISOString(),
                total_amount: equipment.daily_rate * totalDays * quantity,
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
            <div className="w-full max-w-xl bg-zinc-950 border-zinc-800 p-0 overflow-y-auto rounded-3xl max-h-[90vh] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
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
                            <div className="relative h-56 bg-zinc-900 flex items-center justify-center overflow-hidden">
                                {equipment.images?.[0] && (
                                    <img 
                                        src={equipment.images[0]} 
                                        className="w-full h-full object-contain p-4 scale-100 mix-blend-screen opacity-90 transition-all duration-300" 
                                        alt={equipment.name}
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                                <div className="absolute bottom-6 left-6 right-6">
                                    <Badge className={`${isAvailable ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20' : 'bg-red-500/20 text-red-500 border-red-500/20'} mb-2 uppercase font-black tracking-widest text-[10px]`}>
                                        {isAvailable ? `${equipment.stock_quantity || 0} Disponíveis no HUB` : 'Limite de Estoque Atingido'}
                                    </Badge>
                                    <h2 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">
                                        {equipment.name}
                                    </h2>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] uppercase font-black text-zinc-500 tracking-widest flex items-center gap-2">
                                        <CalendarIcon className="w-3 h-3" /> Período da Reserva
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <p className="text-[10px] text-zinc-400 font-bold uppercase">Retirada</p>
                                            <Input 
                                                type="date" 
                                                value={startDate} 
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="bg-zinc-900 border-zinc-800 rounded-xl"
                                                min={format(new Date(), 'yyyy-MM-dd')}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] text-zinc-400 font-bold uppercase">Devolução</p>
                                            <Input 
                                                type="date" 
                                                value={endDate} 
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="bg-zinc-900 border-zinc-800 rounded-xl"
                                                min={startDate}
                                            />
                                        </div>
                                    </div>
                                    
                                    {!isAvailable && (
                                        <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 flex items-center gap-3 text-red-500">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                            <p className="text-[11px] font-bold">Opa! Este item já está reservado por outra produtora neste período.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-900">
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Duração</p>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-emerald-500" />
                                            <span className="text-lg font-black text-zinc-100">{totalDays} Diárias</span>
                                        </div>
                                    </div>
                                    <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-900">
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Custo Diária</p>
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-primary" />
                                            <span className="text-lg font-black text-zinc-100">R$ {equipment.daily_rate}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] uppercase font-black text-zinc-500 mb-4 tracking-widest flex items-center gap-2">
                                        <Truck className="w-3 h-3" /> Logística Flexível
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => setDeliveryMethod('pickup')}
                                            className={`group relative p-4 sm:p-6 rounded-2xl border-2 transition-all text-left ${
                                                deliveryMethod === 'pickup' 
                                                ? 'bg-emerald-500/10 border-emerald-500' 
                                                : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                                            }`}
                                        >
                                            <Store className={`w-6 h-6 mb-3 ${deliveryMethod === 'pickup' ? 'text-emerald-500' : 'text-zinc-500'}`} />
                                            <p className="font-bold text-sm mb-1 uppercase tracking-tighter">Retirada HUB</p>
                                            <p className="text-[10px] text-zinc-500 line-clamp-1">Grátis - Próximo ao set</p>
                                            {deliveryMethod === 'pickup' && (
                                                <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-0.5">
                                                    <CheckCircle2 className="w-3 h-3 text-black" />
                                                </div>
                                            )}
                                        </button>

                                        <button 
                                            onClick={() => setDeliveryMethod('delivery')}
                                            className={`group relative p-4 sm:p-6 rounded-2xl border-2 transition-all text-left ${
                                                deliveryMethod === 'delivery' 
                                                ? 'bg-primary/10 border-primary' 
                                                : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                                            }`}
                                        >
                                            <Truck className={`w-6 h-6 mb-3 ${deliveryMethod === 'delivery' ? 'text-primary' : 'text-zinc-500'}`} />
                                            <p className="font-bold text-sm mb-1 uppercase tracking-tighter">Na Locadora</p>
                                            <p className="text-[10px] text-zinc-500 line-clamp-1">Frete fixo simplificado</p>
                                            {deliveryMethod === 'delivery' && (
                                                <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5">
                                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-zinc-900/50 p-6 rounded-3xl border border-dashed border-zinc-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-zinc-200 uppercase tracking-tighter">Proteção Cinehub</p>
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Seguro incluso no período</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Total do Aluguel</p>
                                        <p className="text-2xl font-black text-white tracking-tighter">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(equipment.daily_rate * totalDays * quantity)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <Button 
                                        className={`flex-1 h-14 rounded-2xl font-black uppercase tracking-tighter group transition-all ${
                                            isAvailable 
                                            ? 'bg-white text-black hover:bg-zinc-200' 
                                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border-zinc-700'
                                        }`}
                                        onClick={handleReserve}
                                        disabled={createBooking.isPending || !isAvailable}
                                    >
                                        {createBooking.isPending ? (
                                            <Clock className="w-5 h-5 animate-spin" />
                                        ) : isAvailable ? (
                                            <>
                                                <span className="hidden sm:inline">Confirmar Reserva para o Futuro</span>
                                                <span className="sm:hidden">Confirmar Reserva</span>
                                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        ) : (
                                            'Equipamento Indisponível'
                                        )}
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="h-14 w-14 rounded-2xl border-zinc-800 bg-transparent flex-shrink-0"
                                        onClick={onClose}
                                    >
                                        <ChevronRight className="w-5 h-5 rotate-180" />
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
