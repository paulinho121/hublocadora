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
            // 1. Primeiro, buscamos os IDs de bookings onde a empresa é dona ou sub-locadora
            // Isso evita o erro 400 de joins complexos no filtro OR
            let bookingIds: string[] = [];
            
            if (options?.tenantId) {
                const { data: relatedBookings } = await supabase
                    .from('bookings')
                    .select('id')
                    .or(`company_id.eq.${options.tenantId},subrental_company_id.eq.${options.tenantId},renter_id.in.(select id from profiles where company_id = '${options.tenantId}')`);
                
                if (relatedBookings) {
                    bookingIds = relatedBookings.map(b => b.id);
                }
            }

            // 2. Agora buscamos as entregas
            let query = supabase
                .from('deliveries')
                .select(`
                    *,
                    booking:bookings(
                        *,
                        equipment:equipments(name, images, subrental_company_id),
                        renter:profiles(
                            full_name,
                            company:companies!company_id(name, address_city)
                        )
                    )
                `);

            if (options?.tenantId) {
                if (bookingIds.length > 0) {
                    // Traz entregas onde sou o fornecedor OU onde a reserva é minha
                    query = query.or(`fulfilling_company_id.eq.${options.tenantId},booking_id.in.(${bookingIds.join(',')})`);
                } else {
                    // Se não tem bookings relacionados, traz apenas onde sou o fornecedor direto
                    query = query.eq('fulfilling_company_id', options.tenantId);
                }
            }

            if (options?.branchId) {
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
