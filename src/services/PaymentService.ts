import { supabase } from '@/lib/supabase';
import { Payment } from '@/types/database';

export class PaymentService {
    static async generatePixPayment(bookingId: string, amount: number) {
        const { data, error } = await supabase.functions.invoke('generate-pix', {
            body: { bookingId, amount },
        });

        if (error) {
            console.error("Payment Error:", error);
            throw new Error(error.message || "Falha ao gerar pagamento");
        }

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
