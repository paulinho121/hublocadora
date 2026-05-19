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

export interface EquipmentPage {
    items: Equipment[];
    count: number;
}

export function useEquipments(options?: {
    companyId?: string;
    branchId?: string | null;
    category?: string;
    subCategory?: string;
    brand?: string;
    searchQuery?: string;
    ids?: string[];
    page?: number;
    pageSize?: number;
}) {
    const page = options?.page ?? 0;
    const pageSize = options?.pageSize;

    return useQuery({
        queryKey: ['equipments', options],
        queryFn: async (): Promise<EquipmentPage> => {
             // Caminho 1: Gerente de filial — filtra pelo estoque da sua unidade
             if (options?.branchId) {
                 const { data: stockData, error: stockError } = await supabase
                    .from('equipment_stock')
                    .select('equipment_id, quantity')
                    .eq('branch_id', options.branchId)
                    .gt('quantity', 0);

                 if (stockError) throw stockError;
                 if (!stockData || stockData.length === 0) return { items: [], count: 0 };

                 const equipmentIds = stockData.map(s => s.equipment_id);

                 let query = supabase
                    .from('equipments')
                    .select('*', { count: 'exact' })
                    .in('id', equipmentIds);

                 if (options?.category) query = query.eq('category', options.category);
                 if (options?.subCategory) query = query.eq('sub_category', options.subCategory);
                 if (options?.brand) query = query.eq('brand', options.brand);
                 if (options?.searchQuery) query = query.ilike('name', `%${options.searchQuery}%`);

                 query = query.order('created_at', { ascending: false });
                 if (pageSize !== undefined) query = query.range(page * pageSize, (page + 1) * pageSize - 1);

                 const { data, error, count } = await query;
                 if (error) throw error;
                 return { items: (data ?? []) as Equipment[], count: count ?? 0 };
             }

             // Caminho 2: Empresa — busca itens próprios + cedidos (merge, sem filtros)
             if (options?.companyId && !options.category && !options.searchQuery) {
                 const [ownResult, assignedResult] = await Promise.all([
                     EquipmentService.getAllByTenant(options.companyId),
                     supabase
                         .from('equipments')
                         .select('*')
                         .eq('subrental_company_id', options.companyId)
                         .neq('company_id', options.companyId)
                 ]);

                 const ownItems = (ownResult || []) as Equipment[];
                 const assignedItems = (assignedResult.data || []) as Equipment[];

                 const allIds = new Set(ownItems.map(e => e.id));
                 const merged = [...ownItems, ...assignedItems.filter(e => !allIds.has(e.id))];
                 const count = merged.length;
                 const items = pageSize !== undefined ? merged.slice(page * pageSize, (page + 1) * pageSize) : merged;
                 return { items, count };
             }

            // Caminho 3: Fallback genérico (Marketplace + filtros)
            let query = supabase
                .from('equipments')
                .select('*', { count: 'exact' })
                .neq('status', 'unavailable');

            if (options?.companyId) {
                query = query.or(`company_id.eq.${options.companyId},subrental_company_id.eq.${options.companyId}`);
            }
            if (options?.category) query = query.eq('category', options.category);
            if (options?.subCategory) query = query.eq('sub_category', options.subCategory);
            if (options?.brand) query = query.eq('brand', options.brand);
            if (options?.searchQuery) query = query.ilike('name', `%${options.searchQuery}%`);
            if (options?.ids && options.ids.length > 0) query = query.in('id', options.ids);

            query = query.order('created_at', { ascending: false });
            if (pageSize !== undefined) query = query.range(page * pageSize, (page + 1) * pageSize - 1);

            const { data, error, count } = await query;
            if (error) throw error;
            return { items: (data ?? []) as Equipment[], count: count ?? 0 };
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
