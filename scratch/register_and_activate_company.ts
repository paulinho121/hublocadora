import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function registerAndActivateCompany() {
  const email = 'paulinho121test@yopmail.com';
  const password = 'Password123!';
  
  console.log(`1. Logging in as ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error('Login error:', authError);
    return;
  }

  const userId = authData.user.id;
  console.log(`Logged in successfully! User ID: ${userId}`);

  // Check if profile already exists
  const { data: profile, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  console.log('Current profile:', profile);

  // Update profile details
  console.log('2. Updating profile...');
  const { error: upError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      full_name: 'Paulinho 121 Test',
      phone: '(11) 99999-9999',
    });

  if (upError) {
    console.error('Error updating profile:', upError);
  } else {
    console.log('Profile updated successfully!');
  }

  // Insert company
  console.log('3. Inserting company with status = approved...');
  const companyData = {
    name: 'Paulinho Locações 121',
    document: '12.121.121/0001-21',
    description: 'Locações de Equipamentos de Cinema',
    address_street: 'Avenida Paulista',
    address_number: '1000',
    address_neighborhood: 'Bela Vista',
    address_city: 'São Paulo',
    address_state: 'SP',
    address_zip: '01310-100',
    phone: '(11) 99999-9999',
    owner_id: userId,
    status: 'approved', // Try 'approved' or 'active'
  };

  const { data: company, error: cError } = await supabase
    .from('companies')
    .insert([companyData])
    .select();

  if (cError) {
    console.error('Error inserting company:', cError);
    // If it's a duplicate or something, try to fetch it
    const { data: existingComp } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle();
      
    if (existingComp) {
      console.log('Found existing company:', existingComp);
      if (existingComp.status !== 'approved' && existingComp.status !== 'active') {
        console.log('Updating status to approved...');
        const { error: statusError } = await supabase
          .from('companies')
          .update({ status: 'approved' })
          .eq('id', existingComp.id);
          
        if (statusError) {
          console.error('Error updating status:', statusError);
        } else {
          console.log('Company status updated to approved successfully!');
        }
      }
    }
  } else {
    console.log('Company inserted successfully:', company);
    
    // Now update profile to have the company_id and role
    if (company && company[0]) {
      console.log('4. Linking company to profile...');
      const { error: linkError } = await supabase
        .from('profiles')
        .update({ 
          company_id: company[0].id,
          role: 'rental_house' 
        })
        .eq('id', userId);
        
      if (linkError) {
        console.error('Error linking company to profile:', linkError);
      } else {
        console.log('Profile successfully linked to company!');
      }
    }
  }
}

registerAndActivateCompany();
