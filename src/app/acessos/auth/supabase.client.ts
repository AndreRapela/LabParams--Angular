import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

let supabase: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        auth: {
          // A API renova o token sob demanda ao receber 401. Desativar o ticker
          // concorrente evita disputas do Navigator Lock em navegadores com Zone.js.
          autoRefreshToken: false,
        },
      }
    );
  }

  return supabase;
}
