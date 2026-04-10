import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { bookingId, amount } = await req.json();

    if (!bookingId || !amount) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: bookingId, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca o booking para garantir que existe e pegar o tenant_id
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('company_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aqui integraria com um gateway real (ex: MercadoPago, ASAAS, Stripe)
    // Usando secrects injetados no Deno.env
    
    // Simulação de geração de PIX
    const pixData = {
      qr_code: "00020126580014br.gov.bcb.pix..." + Math.random().toString(36).substring(7),
      qr_code_base64: "iVBORw0KGgoAAAANSUhEUgA...", // Mock base64
    };

    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert([{
        booking_id: bookingId,
        tenant_id: booking.company_id,
        amount: amount,
        payment_method: 'pix',
        status: 'pending',
        qr_code: pixData.qr_code,
        qr_code_base64: pixData.qr_code_base64,
      }])
      .select()
      .single();

    if (paymentError) {
      throw paymentError;
    }

    return new Response(JSON.stringify(payment), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-pix] Exceção:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
