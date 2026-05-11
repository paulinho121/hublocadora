import { supabase } from '@/lib/supabase';
import { Notification } from '@/types/database';

export class NotificationService {
    static subscribe(userId: string, onNotify: (payload: any) => void) {
        return supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (payload) => onNotify(payload.new)
            )
            .subscribe();
    }

    static async getByUser(userId: string) {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Notification[];
    }

    static async markAsRead(id: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

        if (error) throw error;
    }

    static async markAllAsRead(userId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) throw error;
    }
}
