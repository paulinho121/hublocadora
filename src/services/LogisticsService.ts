import { supabase } from '@/lib/supabase';
import { LogisticsTracking } from '@/types/database';

export class LogisticsService {
    static async processCheckout(bookingId: string, inspectorId: string, notes: string, images: string[]) {
        const { data, error } = await supabase
            .from('logistics_tracking')
            .upsert({
                booking_id: bookingId,
                status: 'checked_out',
                checkout_inspector_id: inspectorId,
                checkout_at: new Date().toISOString(),
                checkout_notes: notes,
                checkout_images: images
            })
            .select()
            .single();

        if (error) throw error;
        await supabase.from('bookings').update({ status: 'active' }).eq('id', bookingId);
        return data as LogisticsTracking;
    }
}
