import { supabase } from '@/lib/supabase';
import { Booking } from '@/types/database';
import { addDays, isWithinInterval, parseISO } from 'date-fns';

export class BookingService {
    /**
     * Busca todas as datas ocupadas de um equipamento (reservas aprovadas/ativas)
     */
    static async getOccupiedDates(equipmentId: string) {
        const { data, error } = await supabase
            .from('bookings')
            .select('start_date, end_date, quantity, status')
            .eq('equipment_id', equipmentId)
            .in('status', ['approved', 'active', 'pending', 'completed']);

        if (error) throw error;
        return data;
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
        const { data, error } = await supabase
            .from('bookings')
            .insert([booking])
            .select();

        if (error) throw error;
        return data?.[0] as Booking;
    }
}
