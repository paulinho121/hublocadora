import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import dns from 'dns';
import { promisify } from 'util';
import path from 'path';
import { performance } from 'perf_hooks';

// Load variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const resolveDns = promisify(dns.resolve);

async function runDiagnostic() {
  console.log('--- SUPABASE DIAGNOSTIC STARTED ---\n');
  
  // 1. Basic validation
  console.log('[1] VALIDATING CREDENTIALS');
  if (!url || !key) {
    console.error('ERROR: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
    return;
  }
  console.log(' - URL:', url);
  console.log(' - KEY format valid:', key.startsWith('eyJ') ? 'Yes (Looks like JWT)' : 'No');
  
  // 2. Network & DNS
  console.log('\n[2] NETWORK & DNS DIAGNOSTIC');
  let networkOk = false;
  try {
    const hostname = new URL(url).hostname;
    const startTime = performance.now();
    const addresses = await resolveDns(hostname);
    const dnsTime = performance.now() - startTime;
    console.log(` - DNS Resolution for ${hostname}:`, addresses);
    console.log(` - DNS Latency: ${dnsTime.toFixed(2)}ms`);
    networkOk = true;
  } catch (err: any) {
    console.error(' - ERROR resolving DNS:', err.message);
  }

  // 3. HTTP Health Check latency
  console.log('\n[3] HTTP/LATENCY DIAGNOSTIC (Auth Health)');
  let healthOk = false;
  try {
    const startTime = performance.now();
    const res = await fetch(`${url}/auth/v1/health`, {
      method: 'GET',
      headers: {
        'apikey': key,
      }
    });
    const httpTime = performance.now() - startTime;
    console.log(` - HTTP Status: ${res.status} ${res.statusText}`);
    console.log(` - Latency: ${httpTime.toFixed(2)}ms`);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      console.log(' - Health Data:', data);
      healthOk = true;
    } else {
      const text = await res.text().catch(() => null);
      console.log(' - Response body:', text);
    }
  } catch (err: any) {
    console.error(' - ERROR connecting to Supabase HTTP endpoint:', err.message);
  }

  // 4. Supabase JS Client & Query Check
  console.log('\n[4] SUPABASE JS CLIENT DIAGNOSTIC');
  const supabase = createClient(url, key, {
    auth: {
      persistSession: false
    }
  });

  try {
      // Trying to fetch a commonly existing table (usually 'profiles' or 'users')
      const startDb = performance.now();
      const { data, error, status, statusText } = await supabase.from('profiles').select('*').limit(1);
      const endDb = performance.now();
      
      console.log(` - DB Query Latency: ${(endDb - startDb).toFixed(2)}ms`);
      if (error) {
          console.log(` - Query responded with error format:`);
          console.log(`   [Normal if table 'profiles' doesn't exist, but indicates PostgREST is reachable]`);
          console.log('   Error:', error.message);
          console.log('   Code:', error.code);
          console.log('   Hint:', error.hint);
          console.log(`   HTTP Status: ${status} ${statusText}`);
      } else {
          console.log(` - DB Query Success [HTTP ${status}]:`, data ? 'Data returned' : 'No data');
      }
  } catch (err: any) {
      console.error(' - ERROR executing DB Query:', err.message);
  }
  
  // 5. Postgres Direct Query Check via RPC (To test DB logic if possible)
  try {
      console.log('\n[5] EXECUTE SIMPLE RPC (if available)');
      const startRpc = performance.now();
      const { data, error, status } = await supabase.rpc('hello_world'); // likely doesn't exist, but checks RPC endpoint
      const endRpc = performance.now();
      console.log(` - RPC Latency: ${(endRpc - startRpc).toFixed(2)}ms`);
      if (error) {
          console.log('   Error (Expected if hello_world missing):', error.message);
      }
  } catch (err: any) {
      console.log('   Error running RPC:', err.message);
  }

  console.log('\n--- DIAGNOSTIC COMPLETE ---');
}

runDiagnostic();
