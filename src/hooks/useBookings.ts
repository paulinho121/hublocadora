import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Booking } from '@/types/database';

export function useBookings(options?: {
    companyId?: string; // Para locadoras verem reservas recebidas
    renterId?: string;  // Para produtores verem suas locações
    status?: Booking['status'];
}) {
    return useQuery({
        queryKey: ['bookings', options],
        queryFn: async () => {
            let query = supabase
                .from('bookings')
                .select(`
          *,
          equipment:equipments(name, category, daily_rate, images),
          renter:profiles(full_name, email)
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
