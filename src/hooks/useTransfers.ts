import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';

export type TransferStatus = 'pending_master' | 'pending_source' | 'shipping' | 'completed' | 'rejected';

export interface InternalTransfer {
    id: string;
    company_id: string;
    requester_branch_id: string;
    source_branch_id: string | null;
    equipment_id: string;
    quantity: number;
    status: TransferStatus;
    tracking_code: string | null;
    created_at: string;
    requester_branch?: { name: string; city: string };
    source_branch?: { name: string; city: string };
    equipment?: { name: string; category: string; images: string[] };
}

export function useTransfers() {
    const { tenantId } = useTenant();
    const queryClient = useQueryClient();

    const { data: transfers, isLoading } = useQuery({
        queryKey: ['internal-transfers', tenantId],
        queryFn: async () => {
            if (!tenantId) return [];
            const { data, error } = await supabase
                .from('internal_transfers')
                .select(`
                    *,
                    requester_branch:branches!requester_branch_id(name, city),
                    source_branch:branches!source_branch_id(name, city),
                    equipment:equipments(name, category, images)
                `)
                .eq('company_id', tenantId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data as InternalTransfer[];
        },
        enabled: !!tenantId
    });

    const createTransfer = useMutation({
        mutationFn: async (params: { requesterBranchId: string, equipmentId: string, quantity: number }) => {
            const { data, error } = await supabase
                .from('internal_transfers')
                .insert({
                    company_id: tenantId,
                    requester_branch_id: params.requesterBranchId,
                    equipment_id: params.equipmentId,
                    quantity: params.quantity,
                    status: 'pending_master'
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['internal-transfers'] });
        }
    });

    const updateTransfer = useMutation({
        mutationFn: async ({ id, ...updates }: Partial<InternalTransfer> & { id: string }) => {
            const { data, error } = await supabase
                .from('internal_transfers')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['internal-transfers'] });
        }
    });

    return {
        transfers,
        isLoading,
        createTransfer,
        updateTransfer
    };
}
