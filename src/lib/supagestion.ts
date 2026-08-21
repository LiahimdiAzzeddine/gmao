import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabaseGes = createClient(supabaseUrl, supabaseAnonKey);

// Instance pour les requêtes anonymes
export const supabaseAnon = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false, // Ne pas persister la session
      autoRefreshToken: false,
    }
  }
);

// Export par défaut pour la compatibilité
export const supabaseGestion = supabaseGes;