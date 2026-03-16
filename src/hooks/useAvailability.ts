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

            // 2. Buscar todas as reservas aprovadas/ativas no período
            const { data: bookings, error: bkError } = await supabase
                .from('bookings')
                .select('quantity')
                .eq('equipment_id', equipmentId)
                .in('status', ['approved', 'active', 'pending']) // Pending também bloqueia por segurança
                .filter('start_date', 'lte', endDate)
                .filter('end_date', 'gte', startDate);

            if (bkError) throw bkError;

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
