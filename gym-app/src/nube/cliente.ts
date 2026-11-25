import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NUBE, nubeConfigurada } from './config';

let cliente: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!nubeConfigurada) throw new Error('La nube no está configurada');
  cliente ??= createClient(NUBE.url!, NUBE.clave!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'evasof.auth' },
  });
  return cliente;
}
