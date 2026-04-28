import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Booking } from '@/types/database';
import { BookingService } from '@/services/BookingService';

export function useBookings(options?: {
    companyId?: string; // Para locadoras verem reservas recebidas
    renterId?: string;  // Para produtores verem suas locações
    status?: Booking['status'];
    includeEquipmentSubrental?: boolean; 
    branchId?: string | null;
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
                  ),
                  delivery:deliveries(fulfilling_company_id)
                `);

            if (options?.companyId) {
                // Busca IDs de pedidos onde esta empresa é a responsável pela entrega (sub-locação)
                const { data: delegated } = await supabase
                    .from('deliveries')
                    .select('booking_id')
                    .eq('fulfilling_company_id', options.companyId);
                
                const delegatedIds = delegated?.map(d => d.booking_id) || [];
                
                if (delegatedIds.length > 0) {
                    // Filtra reservas onde a empresa é a dona OU onde ela é a encarregada da entrega
                    query = query.or(`company_id.eq.${options.companyId},id.in.(${delegatedIds.join(',')})`);
                } else {
                    query = query.eq('company_id', options.companyId);
                }
            }

            if (options?.renterId) {
                query = query.eq('renter_id', options.renterId);
            }

            if (options?.status) {
                query = query.eq('status', options.status);
            }

            if (options?.branchId) {
                // Filtra reservas que foram atribuídas a esta filial via Deliveries
                // Precisamos fazer um join ou usar subquery
                const { data: deliveryBookings } = await supabase
                    .from('deliveries')
                    .select('booking_id')
                    .eq('origin_branch_id', options.branchId);
                
                const bookingIds = deliveryBookings?.map(d => d.booking_id) || [];
                if (bookingIds.length > 0) {
                    query = query.in('id', bookingIds);
                } else {
                    // Se não há entregas para esta filial, não deve retornar nada de reservas atribuídas
                    // mas pode retornar as que ela mesma recebeu se for o caso? 
                    // No fluxo do diagrama, as reservas "caem" na sub escolhida.
                    query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // No results
                }
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
