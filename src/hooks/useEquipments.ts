import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Equipment, Company, MasterCatalog } from '@/types/database';
import { EquipmentService } from '@/services/EquipmentService';

export function useEquipment(id: string) {
    return useQuery({
        queryKey: ['equipment', id],
        queryFn: () => EquipmentService.getById(id),
        enabled: !!id,
    });
}

export function useEquipments(options?: {
    companyId?: string;
    branchId?: string | null;
    category?: string;
    searchQuery?: string;
}) {
    return useQuery({
        queryKey: ['equipments', options],
        queryFn: async () => {
             // Se é um gerente de filial, precisa filtrar pelo estoque da filial dele
             if (options?.branchId) {
                 const { data: stockData, error: stockError } = await supabase
                    .from('equipment_stock')
                    .select('equipment_id, quantity')
                    .eq('branch_id', options.branchId)
                    .gt('quantity', 0);
                 
                 if (stockError) throw stockError;
                 
                 if (!stockData || stockData.length === 0) return [];
                 
                 const equipmentIds = stockData.map(s => s.equipment_id);
                 
                 let query = supabase
                    .from('equipments')
                    .select('*')
                    .in('id', equipmentIds);
                    
                 if (options?.category) query = query.eq('category', options.category);
                 if (options?.searchQuery) query = query.ilike('name', `%${options.searchQuery}%`);
                 
                 const { data, error } = await query.order('created_at', { ascending: false });
                 if (error) throw error;
                 
                 // Pode injetar a quantidade em estoque real se quiser (opcional)
                 return data as Equipment[];
             }

             // Caso base (Master): se temos companyId sem outros filtros
             if (options?.companyId && !options.category && !options.searchQuery) {
                 return EquipmentService.getAllByTenant(options.companyId);
             }

            // Fallback para filtros complexos (Marketplace)
            let query = supabase
                .from('equipments')
                .select('*')
                .neq('status', 'unavailable');

            if (options?.companyId) {
                query = query.eq('company_id', options.companyId);
            }

            if (options?.category) {
                query = query.eq('category', options.category);
            }

            if (options?.searchQuery) {
                query = query.ilike('name', `%${options.searchQuery}%`);
            }

            query = query.order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;
            return data as Equipment[];
        },
    });
}

export function useMasterCatalog() {
    return useQuery({
        queryKey: ['master-catalog'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('master_catalog')
                .select('*')
                .order('brand', { ascending: true })
                .order('name', { ascending: true });

            if (error) throw error;
            return data as MasterCatalog[];
        },
    });
}

export function useCreateEquipment(companyId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (equipment: Omit<Equipment, 'id' | 'created_at' | 'company_id'>) => {
            if (!companyId) throw new Error('Empresa não identificada para o cadastro.');
            return EquipmentService.create(companyId, equipment);
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
            return EquipmentService.update(id, updates);
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
            return EquipmentService.delete(id);
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
    return EquipmentService.uploadImage(file);
}
