import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { EquipmentStock, Equipment } from '@/types/database';

export function useBranchStock(branchId: string) {
    const queryClient = useQueryClient();

    const { data: stock, isLoading } = useQuery({
        queryKey: ['branch-stock', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase
                .from('equipment_stock')
                .select(`
                    *,
                    equipment:equipments(*)
                `)
                .eq('branch_id', branchId);
            
            if (error) throw error;
            return data as (EquipmentStock & { equipment: Equipment })[];
        },
        enabled: !!branchId
    });

    const updateStock = useMutation({
        mutationFn: async ({ equipmentId, quantity }: { equipmentId: string, quantity: number }) => {
            const { data, error } = await supabase
                .from('equipment_stock')
                .upsert({
                    branch_id: branchId,
                    equipment_id: equipmentId,
                    quantity: quantity,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'branch_id,equipment_id'
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branch-stock', branchId] });
        }
    });

    return {
        stock,
        isLoading,
        updateStock
    };
}
