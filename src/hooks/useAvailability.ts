import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useEquipmentAvailability(equipmentId: string, startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['availability', equipmentId, startDate, endDate],
        queryFn: async () => {
            if (!equipmentId || !startDate || !endDate) return null;

            // 1. Pegar a quantidade total em estoque do equipamento
            const { data: equipment, error: eqError } = await supabase
                .from('equipments')
                .select('stock_quantity')
                .eq('id', equipmentId)
                .single();

            if (eqError) throw eqError;

            // 2. Buscar as reservas pendentes/aprovadas/ativas que se sobrepõem ao período.
            //    Usa a RPC SECURITY DEFINER: um SELECT direto em bookings só enxerga as
            //    reservas do próprio usuário (RLS) e mostraria unidades livres a mais.
            const { data: occupied, error: bkError } = await supabase
                .rpc('get_equipment_occupied_dates', { p_equipment_id: equipmentId });

            if (bkError) throw bkError;
            const bookings = (occupied as { start_date: string; end_date: string; quantity: number }[])
                .filter(b => b.start_date <= endDate && b.end_date >= startDate);

            // 3. Calcular a soma das quantidades reservadas
            const reservedQuantity = bookings.reduce((sum, b) => sum + (b.quantity || 1), 0);

            // 4. Retornar o saldo disponível
            const availableQuantity = equipment.stock_quantity - reservedQuantity;

            return {
                total: equipment.stock_quantity,
                reserved: reservedQuantity,
                available: availableQuantity,
                isAvailable: availableQuantity > 0
            };
        },
        enabled: !!equipmentId && !!startDate && !!endDate,
    });
}
