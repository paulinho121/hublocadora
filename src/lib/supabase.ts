import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const env = typeof process !== 'undefined' ? process.env : (import.meta as any).env;

const supabaseUrl = env?.VITE_SUPABASE_URL || 'https://ktcmnjtnpnocitojgrxw.supabase.co';
const supabaseKey = env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
