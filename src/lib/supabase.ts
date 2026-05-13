import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    // Try multiple possible environment variable names to be flexible with different deployment setups
    const supabaseUrl = 
      import.meta.env.VITE_SUPABASE_URL || 
      import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
      import.meta.env.SUPABASE_URL ||
      'https://znbgocfkaedkepblwivc.supabase.co';
      
    const supabaseAnonKey = 
      import.meta.env.VITE_SUPABASE_ANON_KEY || 
      import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYmdvY2ZrYWVka2VwYmx3aXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDEzNjksImV4cCI6MjA5NDE3NzM2OX0.XrEy2mvcIlRASCW8SbQTtYp3nEq4nvhB_FDI5Pt6eSE';

    if (!supabaseUrl || !supabaseAnonKey) {
      const missing = [];
      if (!supabaseUrl) missing.push('URL');
      if (!supabaseAnonKey) missing.push('Anon Key');
      
      console.error(`Supabase configuration missing (${missing.join(', ')}). Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the project settings.`);
      throw new Error(`Supabase configuration missing: Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in project settings.`);
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}
