import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RUNTIME_CONFIG } from '../../../config/runtime.config';

let supabase: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      RUNTIME_CONFIG.supabaseUrl,
      RUNTIME_CONFIG.supabasePublishableKey,
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
