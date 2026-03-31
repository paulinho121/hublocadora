import { supabase } from '@/lib/supabase';
import { Payment } from '@/types/database';

export class PaymentService {
    static async generatePixPayment(bookingId: string, amount: number) {
        const { data: booking } = await supabase
            .from('bookings')
            .select('company_id')
            .eq('id', bookingId)
            .single();

        if (!booking) throw new Error("Booking not found");

        const { data, error } = await supabase
            .from('payments')
            .insert([{
                booking_id: bookingId,
                tenant_id: booking.company_id,
                amount: amount,
                payment_method: 'pix',
                status: 'pending',
                qr_code: "00020126580014br.gov.bcb.pix...", 
                qr_code_base64: "iVBORw0KGgoAAAANSUhEUgA...",
            }])
            .select()
            .single();

        if (error) throw error;
        return data as Payment;
    }

    static async checkPaymentStatus(paymentId: string) {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (error) throw error;
        return data as Payment;
    }
}
