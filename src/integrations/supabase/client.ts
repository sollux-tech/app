import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Adicionar logs para verificar se as chaves estão sendo carregadas corretamente no cliente
console.log('Client Supabase URL:', supabaseUrl);
console.log('Client Supabase Anon Key (first 5 chars):', supabaseAnonKey?.substring(0, 5));

export const supabase = createClient(supabaseUrl, supabaseAnonKey);