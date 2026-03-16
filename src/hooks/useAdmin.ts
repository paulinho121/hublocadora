import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Company, Profile, Booking } from '@/types/database';

export function useAdminStats() {
    return useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            // GMV: Soma de todas as reservas concluídas ou aprovadas
            const { data: bookings } = await supabase
                .from('bookings')
                .select('total_amount, status');

            const gmv = bookings?.reduce((acc, b) => {
                if (['approved', 'active', 'completed'].includes(b.status)) {
                    return acc + b.total_amount;
                }
                return acc;
            }, 0) || 0;

            const revenue = gmv * 0.15; // Comissão de 15%

            // Contagem de locadoras
            const { count: companiesCount } = await supabase
                .from('companies')
                .select('*', { count: 'exact', head: true });

            const { count: pendingCompaniesCount } = await supabase
                .from('companies')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            // Contagem de usuários
            const { count: usersCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            return {
                gmv,
                revenue,
                companiesTotal: companiesCount || 0,
                companiesPending: pendingCompaniesCount || 0,
                usersTotal: usersCount || 0,
            };
        },
    });
}

export function usePendingCompanies() {
    return useQuery({
        queryKey: ['pending-companies'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Company[];
        },
    });
}

export function useAllCompanies() {
    return useQuery({
        queryKey: ['all-companies'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Company[];
        },
    });
}

export function useDeleteCompany() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('companies')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-companies'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        },
    });
}

export function useApproveCompany() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
            const { error } = await supabase
                .from('companies')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-companies'] });
            queryClient.invalidateQueries({ queryKey: ['all-companies'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        },
    });
}

export function useAllBookings() {
    return useQuery({
        queryKey: ['all-bookings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    equipment:equipments(name, category),
                    renter:profiles(full_name, email),
                    company:companies(name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
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
            queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        },
    });
}
