import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Delivery } from '@/types/database';

export function useDeliveries(options?: { 
    tenantId?: string; 
    branchId?: string;
    status?: string;
}) {
    return useQuery({
        queryKey: ['deliveries', options],
        queryFn: async () => {
            // 1. Inicia a query básica com os joins necessários
            let query = supabase
                .from('deliveries')
                .select(`
                    *,
                    booking:bookings!inner(
                        *,
                        equipment:equipments(name, images, subrental_company_id),
                        renter:profiles(
                            id,
                            full_name,
                            company_id,
                            company:companies!company_id(id, name, address_city)
                        )
                    )
                `);

            // 2. Aplica filtros de visibilidade contextual
            if (options?.tenantId) {
                // Busca todos os IDs de bookings que o usuário tem acesso (já filtrado por RLS)
                // Isso garante que veremos pedidos de outros membros da mesma empresa/filial
                const { data: bookings } = await supabase.from('bookings').select('id');
                const bookingIds = bookings?.map(b => b.id) || [];

                if (options.branchId) {
                    if (bookingIds.length > 0) {
                        query = query.or(`origin_branch_id.eq.${options.branchId},fulfilling_company_id.eq.${options.tenantId},booking_id.in.(${bookingIds.join(',')})`);
                    } else {
                        query = query.or(`origin_branch_id.eq.${options.branchId},fulfilling_company_id.eq.${options.tenantId}`);
                    }
                } else {
                    if (bookingIds.length > 0) {
                        query = query.or(`fulfilling_company_id.eq.${options.tenantId},booking_id.in.(${bookingIds.join(',')})`);
                    } else {
                        query = query.eq('fulfilling_company_id', options.tenantId);
                    }
                }
            } else if (options?.branchId) {
                query = query.eq('origin_branch_id', options.branchId);
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
            driver_phone 
        }: { 
            id: string; 
            status: string; 
            serial_number?: string;
            driver_name?: string;
            driver_phone?: string;
        }) => {
            const { error } = await supabase
                .from('deliveries')
                .update({ 
                    status, 
                    ...(serial_number && { serial_number }),
                    ...(driver_name && { driver_name }),
                    ...(driver_phone && { driver_phone }),
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
