import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    // Prefer env vars, fall back to defaults
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://znbgocfkaedkepblwivc.supabase.co';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYmdvY2ZrYWVka2VwYmx3aXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDEzNjksImV4cCI6MjA5NDE3NzM2OX0.XrEy2mvcIlRASCW8SbQTtYp3nEq4nvhB_FDI5Pt6eSE';

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}
