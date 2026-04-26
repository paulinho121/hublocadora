import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Booking } from '@/types/database';
import { BookingService } from '@/services/BookingService';

export function useBookings(options?: {
    companyId?: string; // Para locadoras verem reservas recebidas
    renterId?: string;  // Para produtores verem suas locações
    status?: Booking['status'];
    includeEquipmentSubrental?: boolean; // Inclui subrental_company_id no equipamento
}) {
    return useQuery({
        queryKey: ['bookings', options],
        queryFn: async () => {
            const equipmentSelect = options?.includeEquipmentSubrental
                ? 'name, category, daily_rate, images, subrental_company_id'
                : 'name, category, daily_rate, images';

            let query = supabase
                .from('bookings')
                .select(`
          *,
          equipment:equipments(${equipmentSelect}),
          renter:profiles(
            full_name, 
            email,
            company:companies!company_id(name)
          )
        `);

            if (options?.companyId) {
                query = query.eq('company_id', options.companyId);
            }

            if (options?.renterId) {
                query = query.eq('renter_id', options.renterId);
            }

            if (options?.status) {
                query = query.eq('status', options.status);
            }

            query = query.order('created_at', { ascending: false });

            const { data, error } = await query;

            if (error) throw error;
            return data;
        },
    });
}

export function useCreateBooking() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (booking: Omit<Booking, 'id' | 'created_at'>) => {
            return BookingService.createBooking(booking);
        },
        onSuccess: () => {
           queryClient.invalidateQueries({ queryKey: ['bookings'] });
        }
    });
}

export function useUpdateBookingStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: Booking['status'] }) => {
            const { error } = await supabase
                .from('bookings')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
    });
}

export function useEquipmentOccupiedDates(id: string) {
    return useQuery({
        queryKey: ['equipment-occupied', id],
        queryFn: () => BookingService.getOccupiedDates(id),
        enabled: !!id,
    });
}
