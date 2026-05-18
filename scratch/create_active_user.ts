import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignUp() {
  const email = `test_${Date.now()}@movinghub.com`;
  const password = 'TestPassword123!';
  
  console.log(`Trying to sign up: ${email}`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('Sign up error:', error);
    return;
  }

  console.log('Sign up successful!');
  console.log('User data:', JSON.stringify(data.user, null, 2));
  console.log('Session data:', JSON.stringify(data.session, null, 2));
}

testSignUp();
