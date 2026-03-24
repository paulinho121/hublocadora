import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// IMPORTANTE: Para inserir/atualizar ignorando RLS via script, normalmente usaríamos a SERVICE_ROLE_KEY.
// Como não temos ela no .env por segurança, usaremos a anon, mas você precisa ter garantido acesso via RLS,
// ou rodar este script logado no supabase (se implementássemos auth de script).
// Para testes rápidos, certifique-se que as políticas permitam o update ou teste via painel do Supabase.
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Rota de exemplo (Avenida Paulista, São Paulo)
const route = [
  { lat: -23.5709, lng: -46.6450 },
  { lat: -23.5715, lng: -46.6461 },
  { lat: -23.5721, lng: -46.6472 },
  { lat: -23.5728, lng: -46.6483 },
  { lat: -23.5735, lng: -46.6495 },
  { lat: -23.5741, lng: -46.6506 }
];

async function simulate(deliveryId: string) {
  console.log(`Iniciando simulação para a entrega: ${deliveryId}`);
  
  for (let i = 0; i < route.length; i++) {
    const pos = route[i];
    console.log(`Movendo caminhão para Lat: ${pos.lat}, Lng: ${pos.lng}...`);
    
    const { error } = await supabase
      .from('deliveries')
      .update({
         current_lat: pos.lat,
         current_lng: pos.lng,
         status: i === route.length - 1 ? 'delivered' : 'in_transit'
      })
      .eq('id', deliveryId);
      
    if (error) {
      console.error('Erro ao atualizar posição:', error);
    } else {
      console.log('Posição atualizada com sucesso. Supabase Realtime detectará.');
    }
    
    // Aguarda 3 segundos antes do próximo "ping"
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('Simulação concluída! Caminhão chegou no destino.');
}

const targetDeliveryId = process.argv[2];
if (!targetDeliveryId) {
  console.log('Uso: npx tsx simulate_delivery.ts <DELIVERY_ID>');
} else {
  simulate(targetDeliveryId);
}
