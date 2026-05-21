import { supabase } from '@/lib/supabase';
import { Booking } from '@/types/database';
import { addDays, isWithinInterval, parseISO } from 'date-fns';

export class BookingService {
    /**
     * Busca todas as datas ocupadas de um equipamento (reservas aprovadas/ativas)
     */
    static async getOccupiedDates(equipmentId: string) {
        // Uses SECURITY DEFINER RPC to bypass RLS — regular SELECT is restricted
        // to the authenticated user's own bookings, causing false availability.
        const { data, error } = await supabase
            .rpc('get_equipment_occupied_dates', { p_equipment_id: equipmentId });

        if (error) throw error;
        return data as { start_date: string; end_date: string; quantity: number; status: string }[];
    }

    /**
     * Verifica se um equipamento tem disponibilidade para um determinado range e quantidade
     */
    static async checkAvailability(
        equipmentId: string, 
        startDate: string, 
        endDate: string, 
        requestedQuantity: number,
        totalStock: number
    ) {
        const start = parseISO(startDate);
        const end = parseISO(endDate);

        const occupied = await this.getOccupiedDates(equipmentId);
        
        // Lógica simplificada: para cada dia no intervalo, somamos o que já está reservado
        // Se em algum dia a soma ultrapassar o totalStock, não tem vaga.
        let tempDate = start;
        while (tempDate <= end) {
            const bookedThatDay = occupied.reduce((acc, booking) => {
                const bStart = parseISO(booking.start_date);
                const bEnd = parseISO(booking.end_date);
                
                if (isWithinInterval(tempDate, { start: bStart, end: bEnd })) {
                    return acc + booking.quantity;
                }
                return acc;
            }, 0);

            if (bookedThatDay + requestedQuantity > totalStock) {
                return false;
            }
            tempDate = addDays(tempDate, 1);
        }

        return true;
    }

    /**
     * Cria uma nova reserva
     */
    static async createBooking(booking: Omit<Booking, 'id' | 'created_at'>) {
        const { data: equipment, error: equipError } = await supabase
            .from('equipments')
            .select('stock_quantity')
            .eq('id', booking.equipment_id)
            .single();

        if (equipError || !equipment) throw new Error('Equipamento não encontrado');

        const available = await this.checkAvailability(
            booking.equipment_id,
            booking.start_date,
            booking.end_date,
            booking.quantity,
            equipment.stock_quantity
        );

        if (!available) throw new Error('Equipamento indisponível para o período solicitado');

        const { data, error } = await supabase
            .from('bookings')
            .insert([booking])
            .select();

        if (error) throw error;
        return data?.[0] as Booking;
    }
}
