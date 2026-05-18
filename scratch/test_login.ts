import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignIn() {
  const email = 'test_1779052859820@movinghub.com';
  const password = 'TestPassword123!';
  
  console.log(`Trying to sign in: ${email}`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Sign in error:', error);
    return;
  }

  console.log('Sign in successful!');
  console.log('Session data:', JSON.stringify(data.session, null, 2));
}

testSignIn();
