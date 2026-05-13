import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function monitor() {
  console.log('\n--- MONITORAMENTO DE TESTE LOGÍSTICO ---\n');
  
  // 1. Verificar últimos pedidos
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, created_at, equipment:equipments(name)')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('ÚLTIMOS PEDIDOS (Bookings):');
  bookings?.forEach(b => {
    console.log(`ID: ${b.id.slice(0,8)} | Status: ${b.status} | Item: ${(b.equipment as any)?.name} | Data: ${b.created_at}`);
  });

  // 2. Verificar entregas vinculadas
  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('id, booking_id, status, fulfilling_company_id')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('\nÚLTIMAS ENTREGAS (Deliveries):');
  deliveries?.forEach(d => {
    console.log(`ID: ${d.id.slice(0,8)} | Booking: ${d.booking_id.slice(0,8)} | Status: ${d.status} | Empresa: ${d.fulfilling_company_id}`);
  });

  // 3. Verificar Tokens gerados
  const { data: secrets } = await supabase
    .from('delivery_secrets')
    .select('delivery_id, token')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('\nÚLTIMOS TOKENS (Secrets):');
  secrets?.forEach(s => {
    console.log(`Delivery: ${s.delivery_id.slice(0,8)} | Token: ${s.token}`);
  });
}

monitor();
