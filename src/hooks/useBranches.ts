import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Branch } from '@/types/database';
import { EmailService } from '@/services/EmailService';

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
            return data as Branch;
        },
        onSuccess: async (branch) => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });

            if (!branch.manager_email || !branch.invite_token) return;

            const inviteLink = `${window.location.origin}/invite/${branch.invite_token}`;

            // Busca o nome do master para personalizar o e-mail
            const { data: profile } = await supabase.auth.getUser();
            const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', profile?.user?.id ?? '')
                .single();

            try {
                await EmailService.sendBranchInvite({
                    to: branch.manager_email,
                    branchName: branch.name,
                    inviteLink,
                    masterName: profileData?.full_name ?? 'CineHub',
                });
            } catch (e) {
                console.error('[useBranches] Falha ao enviar e-mail de convite:', e);
            }
        }
    });

    const updateBranch = useMutation({
        mutationFn: async ({ id, ...updates }: { id: string } & Partial<Branch>) => {
            const { data, error } = await supabase
                .from('branches')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Branch;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        }
    });

    const resendInvite = useMutation({
        mutationFn: async (branch: Branch) => {
            if (!branch.manager_email || !branch.invite_token) {
                throw new Error('Branch sem e-mail ou token de convite.');
            }

            const inviteLink = `${window.location.origin}/invite/${branch.invite_token}`;

            const { data: profile } = await supabase.auth.getUser();
            const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', profile?.user?.id ?? '')
                .single();

            await EmailService.sendBranchInvite({
                to: branch.manager_email,
                branchName: branch.name,
                inviteLink,
                masterName: profileData?.full_name ?? 'CineHub',
            });
        },
    });

    return {
        branches,
        isLoading,
        createBranch,
        updateBranch,
        resendInvite,
    };
}
