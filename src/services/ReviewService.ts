import { supabase } from '@/lib/supabase';

export class ReviewService {
    static async getByEquipment(equipmentId: string) {
        const { data, error } = await supabase
            .from('reviews')
            .select('*, renter:profiles(full_name)')
            .eq('equipment_id', equipmentId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    static async create(review: any) {
        const { data, error } = await supabase.from('reviews').insert([review]).select().single();
        if (error) throw error;
        return data;
    }
}
