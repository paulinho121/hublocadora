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
            let bookingIds: string[] = [];
            
            if (options?.tenantId) {
                // 1. Busca perfis da empresa para filtrar como renter
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('company_id', options.tenantId);
                
                const profileIds = profiles?.map(p => p.id) || [];

                // 2. Busca Bookings onde a empresa participa (Master, Sub ou Renter)
                const orFilters = [
                    `company_id.eq.${options.tenantId}`,
                    `subrental_company_id.eq.${options.tenantId}`
                ];

                if (profileIds.length > 0) {
                    orFilters.push(`renter_id.in.(${profileIds.join(',')})`);
                }

                const { data: relatedBookings } = await supabase
                    .from('bookings')
                    .select('id')
                    .or(orFilters.join(','));
                
                if (relatedBookings) {
                    bookingIds = relatedBookings.map(b => b.id);
                }
            }

            // 3. Busca as entregas finais
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
                    // Traz entregas onde sou o fornecedor OU onde o booking me pertence
                    query = query.or(`fulfilling_company_id.eq.${options.tenantId},booking_id.in.(${bookingIds.join(',')})`);
                } else {
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
