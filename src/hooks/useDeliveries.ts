import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Delivery, DeliveryStatus } from '@/types/database';

export function useDeliveries(options?: {
    bookingId?: string;
    tenantId?: string;
}) {
    return useQuery({
        queryKey: ['deliveries', options],
        queryFn: async () => {
            let query = supabase
                .from('deliveries')
                .select(`
                    *,
                    booking:bookings(
                        *,
                        equipment:equipments(name, images),
                        renter:profiles(full_name, email, company:companies!company_id(name))
                    )
                `);

            if (options?.bookingId) {
                query = query.eq('booking_id', options.bookingId);
            }
            
            // Excluir entregas ainda aguardando aceite da sub-locadora
            query = query.or('subrental_status.is.null,subrental_status.eq.accepted');
            
            const { data, error } = await query.order('updated_at', { ascending: false });

            if (error) throw error;
            return data;
        },
    });
}

export function useUpdateDeliveryStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status, driver_name, driver_phone, serial_number, origin_branch_id }: { 
            id: string; 
            status: DeliveryStatus; 
            driver_name?: string; 
            driver_phone?: string; 
            serial_number?: string;
            origin_branch_id?: string;
        }) => {
            const { error } = await supabase
                .from('deliveries')
                .update({ 
                    status, 
                    ...(driver_name && { driver_name }),
                    ...(driver_phone && { driver_phone }),
                    ...(serial_number && { serial_number }),
                    ...(origin_branch_id && { origin_branch_id })
                })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deliveries'] });
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
    });
}

export function useCreateDelivery() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (delivery: Omit<Delivery, 'id' | 'created_at' | 'updated_at'>) => {
            const { data, error } = await supabase
                .from('deliveries')
                .insert([delivery])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deliveries'] });
        },
    });
}
