// Utilidades compartidas por las funciones de EvaSof.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const DOMINIO_USUARIOS = 'usuarios.evasof.app';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
export const error = (mensaje: string, status = 400) => json({ error: mensaje }, status);

/** Cliente con permisos de servicio (solo dentro de funciones). */
export function clienteServicio(): SupabaseClient {
  let clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!clave) {
    try { const ks = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}'); clave = Object.values(ks)[0] as string; } catch { /* */ }
  }
  if (!clave) throw new Error('Falta la clave de servicio');
  return createClient(Deno.env.get('SUPABASE_URL')!, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const normalizarUsuario = (u: string) => (u ?? '').trim().toLowerCase();
export const usuarioValido = (u: string) => /^[a-z0-9._-]{3,24}$/.test(u);
export const normalizarCodigo = (c: string) => (c ?? '').trim().toUpperCase().replace(/\s+/g, '');
