import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useEditBooking } from '@/hooks/useBookings';
import { Booking } from '@/types/database';

interface EditBookingModalProps {
    booking: any | null;
    isOpen: boolean;
    onClose: () => void;
}

const STATUS_OPTIONS: { value: Booking['status']; label: string }[] = [
    { value: 'pending', label: 'Pendente' },
    { value: 'approved', label: 'Aprovado' },
    { value: 'active', label: 'Ativo' },
    { value: 'completed', label: 'Concluído' },
    { value: 'rejected', label: 'Recusado' },
    { value: 'cancelled', label: 'Cancelado' },
];

export function EditBookingModal({ booking, isOpen, onClose }: EditBookingModalProps) {
    const editBooking = useEditBooking();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [status, setStatus] = useState<Booking['status']>('pending');
    const [notes, setNotes] = useState('');
    const [totalAmount, setTotalAmount] = useState(0);

    useEffect(() => {
        if (booking) {
            setStartDate(booking.start_date?.slice(0, 10) ?? '');
            setEndDate(booking.end_date?.slice(0, 10) ?? '');
            setQuantity(booking.quantity ?? 1);
            setStatus(booking.status ?? 'pending');
            setNotes(booking.notes ?? '');
            setTotalAmount(booking.total_amount ?? 0);
        }
    }, [booking]);

    if (!booking) return null;

    const handleSave = async () => {
        await editBooking.mutateAsync({
            id: booking.id,
            data: { start_date: startDate, end_date: endDate, quantity, status, notes, total_amount: totalAmount },
        });
        onClose();
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Editar Pedido">
            <div className="space-y-6">
                <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest -mt-4">{booking.equipment?.name}</p>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Retirada</p>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-zinc-900 border-zinc-800 rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Devolução</p>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-zinc-900 border-zinc-800 rounded-xl"
                            min={startDate}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Quantidade</p>
                        <Input
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="bg-zinc-900 border-zinc-800 rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Valor Total (R$)</p>
                        <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={totalAmount}
                            onChange={(e) => setTotalAmount(Number(e.target.value))}
                            className="bg-zinc-900 border-zinc-800 rounded-xl"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Status</p>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as Booking['status'])}
                        className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-xl px-3 text-sm font-bold text-zinc-100"
                    >
                        {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Observações</p>
                    <Input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Observações sobre o pedido..."
                        className="bg-zinc-900 border-zinc-800 rounded-xl"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 border-zinc-800 rounded-xl font-black uppercase text-xs tracking-widest"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={editBooking.isPending}
                        className="flex-1 bg-primary hover:bg-primary/90 rounded-xl font-black uppercase text-xs tracking-widest"
                    >
                        {editBooking.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
