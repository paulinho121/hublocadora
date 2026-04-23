
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ktcmnjtnpnocitojgrxw.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

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
