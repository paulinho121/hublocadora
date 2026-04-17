import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Branch } from '@/types/database';

export function useBranches() {
    const queryClient = useQueryClient();

    const { data: branches, isLoading } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('branches')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data as Branch[];
        }
    });

    const createBranch = useMutation({
        mutationFn: async (newBranch: Partial<Branch>) => {
            const { data, error } = await supabase
                .from('branches')
                .insert([newBranch])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        }
    });

    return {
        branches,
        isLoading,
        createBranch
    };
}
