
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktcmnjtnpnocitojgrxw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Y21uanRucG5vY2l0b2pncnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5ODM3NzMsImV4cCI6MjA4NjU1OTc3M30.F3fnURud1Pg_Wz-7InglwmOw4uCo0tgg9cIKMSe4bmI';

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
