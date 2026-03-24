
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktcmnjtnpnocitojgrxw.supabase.co';
const supabaseKey = '[REMOVIDO_POR_SEGURANCA]';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
  const { data, error } = await supabase.storage.createBucket('images', {
    public: true,
    allowedMimeTypes: ['image/*'],
    fileSizeLimit: 5242880 // 5MB
  });
  
  if (error) {
    console.error('Error creating bucket:', error);
    return;
  }
  console.log('Bucket created:', data);
}

createBucket();
