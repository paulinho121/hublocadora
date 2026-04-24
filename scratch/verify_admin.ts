import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function checkAdmin() {
    const email = 'paulofernandoautomacao@gmail.com';
    const { data, error } = await supabase.from('profiles').select('id, email, role').eq('email', email).single();
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('User status:', data);
    }
}

checkAdmin();
