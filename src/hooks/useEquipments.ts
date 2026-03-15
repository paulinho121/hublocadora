import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Equipment, Company } from '@/types/database';

export function useEquipment(id: string) {
    return useQuery({
        queryKey: ['equipment', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('equipments')
                .select('*, company:companies(*)') // Puxando dados da locadora
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });
}

export function useEquipments(options?: {
    companyId?: string;
    category?: string;
    searchQuery?: string;
}) {
    return useQuery({
        queryKey: ['equipments', options],
        queryFn: async () => {
            let query = supabase
                .from('equipments')
                .select('*');

            if (options?.companyId) {
                query = query.eq('company_id', options.companyId);
            }

            if (options?.category) {
                query = query.eq('category', options.category);
            }

            if (options?.searchQuery) {
                query = query.ilike('name', `%${options.searchQuery}%`);
            }

            // Ordem decrescente de criação
            query = query.order('created_at', { ascending: false });

            const { data, error } = await query;

            if (error) throw error;
            return data as Equipment[];
        },
    });
}

export function useCreateEquipment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (equipment: Omit<Equipment, 'id' | 'created_at'>) => {
            const { data, error } = await supabase
                .from('equipments')
                .insert([equipment])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipments'] });
        },
    });
}

export function useUpdateEquipment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Equipment> & { id: string }) => {
            const { data, error } = await supabase
                .from('equipments')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['equipments'] });
            queryClient.invalidateQueries({ queryKey: ['equipment', variables.id] });
        },
    });
}

export function useDeleteEquipment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('equipments')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipments'] });
        },
    });
}

export function useCompany(ownerId?: string) {
    return useQuery({
        queryKey: ['company', ownerId],
        queryFn: async () => {
            if (!ownerId) return null;
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .eq('owner_id', ownerId)
                .maybeSingle();

            if (error) throw error;
            return data as Company;
        },
        enabled: !!ownerId,
    });
}

export async function uploadEquipmentImage(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `equipment-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

    return publicUrl;
}
