import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load .env
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listProfiles() {
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, email, role, full_name, company_id')
    .limit(10);
    
  if (pError) {
    console.error('Error fetching profiles:', pError);
    return;
  }
  
  console.log('PROFILES:');
  console.log(JSON.stringify(profiles, null, 2));

  const { data: companies, error: cError } = await supabase
    .from('companies')
    .select('id, name, status')
    .limit(10);

  if (cError) {
    console.error('Error fetching companies:', cError);
    return;
  }

  console.log('COMPANIES:');
  console.log(JSON.stringify(companies, null, 2));
}

listProfiles();
