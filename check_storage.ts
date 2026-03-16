
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktcmnjtnpnocitojgrxw.supabase.co';
const supabaseKey = '[REMOVIDO_POR_SEGURANCA]';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error fetching buckets:', error);
    return;
  }
  console.log('Buckets:', JSON.stringify(data, null, 2));
}

checkStorage();
