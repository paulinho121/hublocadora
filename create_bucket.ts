
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ktcmnjtnpnocitojgrxw.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

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
