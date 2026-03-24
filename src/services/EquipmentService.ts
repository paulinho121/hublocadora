import { supabase } from '@/lib/supabase';
import { Equipment } from '@/types/database';

export class EquipmentService {
    /**
     * Busca todos os equipamentos filtrados por empresa (Tenant)
     */
    static async getAllByTenant(companyId: string) {
        const { data, error } = await supabase
            .from('equipments')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Equipment[];
    }

    /**
     * Busca um único equipamento por ID
     */
    static async getById(id: string) {
        const { data, error } = await supabase
            .from('equipments')
            .select(`
                *,
                company:companies(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Cria um novo equipamento injetando o ID da empresa (Tenant)
     */
    static async create(companyId: string, equipment: Omit<Equipment, 'id' | 'created_at' | 'company_id'>) {
        const { data, error } = await supabase
            .from('equipments')
            .insert([{
                ...equipment,
                company_id: companyId,
                status: equipment.status || 'available'
            }])
            .select()
            .single();

        if (error) throw error;
        return data as Equipment;
    }

    /**
     * Atualiza dados de um equipamento existente
     */
    static async update(id: string, updates: Partial<Equipment>) {
        const { data, error } = await supabase
            .from('equipments')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Equipment;
    }

    /**
     * Remove um equipamento permanentemente
     */
    static async delete(id: string) {
        const { error } = await supabase
            .from('equipments')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    /**
     * Upload de imagens para o storage
     */
    static async uploadImage(file: File) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
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
}
