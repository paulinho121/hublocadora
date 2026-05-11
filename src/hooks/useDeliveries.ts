import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Delivery } from '@/types/database';

export function useDeliveries(options?: { 
    tenantId?: string; 
    branchId?: string;
    status?: string;
    bookingId?: string;
}) {
    return useQuery({
        queryKey: ['deliveries', options],
        queryFn: async () => {
            // 1. Inicia a query básica com os joins necessários
            let query = supabase
                .from('deliveries')
                .select(`
                    *,
                    booking:bookings(
                        *,
                        equipment:equipments(name, images),
                        renter:profiles(
                            id,
                            full_name,
                            company_id,
                            company:companies!profiles_company_id_fkey(id, name, address_city)
                        )
                    )
                `);

            // 2. A visibilidade é controlada automaticamente pelo RLS do banco de dados.
            // Não precisamos de filtros manuais complexos aqui que podem quebrar a query.
            if (options?.bookingId) {
                query = query.eq('booking_id', options.bookingId);
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

export function useUpdateDeliveryStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ 
            id, 
            status, 
            serial_number, 
            driver_name, 
            driver_phone,
            origin_branch_id
        }: { 
            id: string; 
            status: string; 
            serial_number?: string;
            driver_name?: string;
            driver_phone?: string;
            origin_branch_id?: string | null;
        }) => {
            const { error } = await supabase
                .from('deliveries')
                .update({ 
                    status, 
                    ...(serial_number && { serial_number }),
                    ...(driver_name && { driver_name }),
                    ...(driver_phone && { driver_phone }),
                    ...(origin_branch_id !== undefined && { origin_branch_id }),
                    updated_at: new Date().toISOString()
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
