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
                    booking:bookings(
                        *,
                        equipment:equipments(name, images),
                        renter:profiles(
                            id,
                            full_name,
                            company:companies(id, name, address_city)
                        )
                    )
                `);

            // 2. Aplica filtros de visibilidade contextual
            if (options?.tenantId) {
                // Se eu tenho uma empresa, vejo o que eu envio OU o que eu recebo
                if (options.branchId) {
                    // Visão de Gerente de Filial
                    query = query.or(`origin_branch_id.eq.${options.branchId},fulfilling_company_id.eq.${options.tenantId}`);
                } else {
                    // Visão de Dono de Empresa (Master)
                    query = query.or(`fulfilling_company_id.eq.${options.tenantId},booking.company_id.eq.${options.tenantId},booking.renter.company_id.eq.${options.tenantId}`);
                }
            } else if (options?.branchId) {
                query = query.eq('origin_branch_id', options.branchId);
            } else {
                // Se não sou empresa nem filial (sou um cliente individual), 
                // o RLS do banco já vai filtrar para ver apenas meus próprios bookings.
                // Mas podemos reforçar aqui se necessário.
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
