import { supabase } from '../lib/supabase';

export interface Favorite {
  id: string;
  user_id: string;
  equipment_id: string;
  created_at: string;
}

export class FavoriteService {
  /**
   * Get all favorite equipment IDs for the current user
   */
  static async getMyFavorites(): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('favorites')
      .select('equipment_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }

    return data.map(f => f.equipment_id);
  }

  /**
   * Toggle a favorite status for an equipment
   * @returns true if added, false if removed
   */
  static async toggleFavorite(equipmentId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated to favorite items');

    // Check if already exists
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('equipment_id', equipmentId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id);
      
      if (error) throw error;
      return false; // Removed
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          equipment_id: equipmentId
        });
      
      if (error) throw error;
      return true; // Added
    }
  }
}
