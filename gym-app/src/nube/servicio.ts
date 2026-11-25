// Sesión, sincronización automática y cuenta. Todo lo de la nube pasa por aquí.
import type { Session } from '@supabase/supabase-js';
import { supabase } from './cliente';
import { correoDe, nubeConfigurada } from './config';
import { alCambiarDatos, limpiarLocal, sincronizar, type Remoto } from './sync';
import { actualizarPerfil, obtenerPerfil } from '../db/db';

const MARCA_USUARIO = 'evasof.usuarioId';

// ── Estado observable (para la interfaz) ──
export interface EstadoNube {
  sesion: Session | null;
  cargando: boolean;
  sync: 'inactivo' | 'sincronizando' | 'error' | 'sin-conexion';
  ultimaSync: number | null;
  errorSync: string | null;
  esAdmin: boolean;
  usuario: string | null;
}
let estado: EstadoNube = { sesion: null, cargando: nubeConfigurada, sync: 'inactivo', ultimaSync: leerNumero('evasof.ultimaSync'), errorSync: null, esAdmin: false, usuario: null };
const oyentes = new Set<() => void>();
function cambiar(p: Partial<EstadoNube>) { estado = { ...estado, ...p }; oyentes.forEach((f) => f()); }
export const leerEstado = () => estado;
export function suscribir(f: () => void) { oyentes.add(f); return () => { oyentes.delete(f); }; }
function leerNumero(k: string) { try { const v = localStorage.getItem(k); return v ? Number(v) : null; } catch { return null; } }

export function hayUsuarioEnDispositivo() { try { return !!localStorage.getItem(MARCA_USUARIO); } catch { return false; } }

// ── Remoto real ──
const remoto: Remoto = {
  async subir(cambios) {
    const uid = estado.sesion!.user.id;
    const { error } = await supabase().from('registros').upsert(
      cambios.map((c) => ({ usuario_id: uid, tabla: c.tabla, id: c.id, datos: c.datos, borrado: c.borrado })),
      { onConflict: 'usuario_id,tabla,id' },
    );
    if (error) throw new Error(error.message);
  },
  async bajar(desde, limite) {
    let q = supabase().from('registros').select('tabla,id,datos,borrado,actualizado').order('actualizado', { ascending: true }).limit(limite);
    if (desde) q = q.gt('actualizado', desde);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

// ── Sincronización automática ──
let enCurso: Promise<void> | null = null;
let repetir = false;
let temporizador: ReturnType<typeof setTimeout> | undefined;

export function sincronizarAhora(): Promise<void> {
  if (!nubeConfigurada || !estado.sesion) return Promise.resolve();
  if (enCurso) { repetir = true; return enCurso; }
  enCurso = (async () => {
    if (!navigator.onLine) { cambiar({ sync: 'sin-conexion' }); return; }
    cambiar({ sync: 'sincronizando', errorSync: null });
    try {
      await sincronizar(remoto);
      const ahora = Date.now();
      try { localStorage.setItem('evasof.ultimaSync', String(ahora)); } catch { /* */ }
      cambiar({ sync: 'inactivo', ultimaSync: ahora });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      cambiar({ sync: navigator.onLine ? 'error' : 'sin-conexion', errorSync: msg });
    }
  })().finally(() => {
    enCurso = null;
    if (repetir) { repetir = false; programarSync(1500); }
  });
  return enCurso;
}

export function programarSync(ms = 4000) {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { void sincronizarAhora(); }, ms);
}

let iniciado = false;
export function iniciarNube() {
  if (!nubeConfigurada || iniciado) { if (!nubeConfigurada) cambiar({ cargando: false }); return; }
  iniciado = true;
  const sb = supabase();
  sb.auth.getSession().then(async ({ data }) => {
    await alIniciarSesion(data.session);
    cambiar({ cargando: false });
  });
  sb.auth.onAuthStateChange((evento, sesion) => {
    if (evento === 'SIGNED_OUT') cambiar({ sesion: null, esAdmin: false, usuario: null });
    else if (sesion) cambiar({ sesion });
  });
  alCambiarDatos(() => { if (!enCurso) programarSync(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void sincronizarAhora();
    else programarSync(500);
  });
  window.addEventListener('online', () => programarSync(500));
  setInterval(() => { if (document.visibilityState === 'visible') void sincronizarAhora(); }, 60_000);
}

async function alIniciarSesion(sesion: Session | null) {
  if (!sesion) { cambiar({ sesion: null }); return; }
  // Si en este celular estaba otra persona, se limpia lo local antes de bajar lo nuevo.
  let anterior: string | null = null;
  try { anterior = localStorage.getItem(MARCA_USUARIO); } catch { /* */ }
  if (anterior && anterior !== sesion.user.id) await limpiarLocal();
  try { localStorage.setItem(MARCA_USUARIO, sesion.user.id); } catch { /* */ }
  cambiar({ sesion, usuario: (sesion.user.user_metadata?.usuario as string) ?? sesion.user.email?.split('@')[0] ?? null });
  void cargarPerfilNube(sesion);
  await sincronizarAhora();
}

async function cargarPerfilNube(sesion: Session) {
  const { data } = await supabase().from('perfiles').select('usuario, nombre, es_admin').eq('id', sesion.user.id).maybeSingle();
  if (!data) return;
  cambiar({ esAdmin: !!data.es_admin, usuario: data.usuario });
  const local = await obtenerPerfil();
  if (!local.nombre && data.nombre) await actualizarPerfil({ nombre: data.nombre });
}

// ── Cuenta ──
function mensajeAuth(msg: string): string {
  if (/invalid login|invalid credentials/i.test(msg)) return 'Usuario o contraseña incorrectos.';
  if (/fetch|network|failed to/i.test(msg)) return 'Sin conexión. Conéctate a internet para entrar.';
  if (/rate|too many/i.test(msg)) return 'Demasiados intentos. Espera un momento.';
  return msg;
}

export async function entrar(usuario: string, contrasena: string) {
  const { data, error } = await supabase().auth.signInWithPassword({ email: correoDe(usuario), password: contrasena });
  if (error) throw new Error(mensajeAuth(error.message));
  await alIniciarSesion(data.session);
}

export async function registrar(datos: { codigo: string; nombre: string; usuario: string; contrasena: string }) {
  const { data, error } = await supabase().functions.invoke('registrar', { body: datos });
  if (error) {
    let msg = 'No se pudo crear la cuenta.';
    try { msg = (await (error as { context?: Response }).context?.json())?.error ?? msg; } catch { /* */ }
    if (/fetch|network/i.test(error.message)) msg = 'Sin conexión. Conéctate a internet para crear tu cuenta.';
    throw new Error(msg);
  }
  if (!data?.ok) throw new Error(data?.error ?? 'No se pudo crear la cuenta.');
  await entrar(datos.usuario, datos.contrasena);
  if (datos.nombre) await actualizarPerfil({ nombre: datos.nombre });
}

export async function cambiarContrasena(nueva: string) {
  const { error } = await supabase().auth.updateUser({ password: nueva });
  if (error) throw new Error(/should be different/i.test(error.message) ? 'La nueva contraseña debe ser distinta.' : mensajeAuth(error.message));
}

export async function cerrarSesion() {
  try { await sincronizarAhora(); } catch { /* sin conexión: lo local se pierde si no se subió */ }
  await limpiarLocal();
  try { localStorage.removeItem(MARCA_USUARIO); localStorage.removeItem('evasof.ultimaSync'); } catch { /* */ }
  await supabase().auth.signOut({ scope: 'local' });
  cambiar({ sesion: null, esAdmin: false, usuario: null, ultimaSync: null });
}

/** Llama a la función de administración. */
export async function admin<T = unknown>(accion: string, datos: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase().functions.invoke('admin', { body: { accion, ...datos } });
  if (error) {
    let msg = 'No se pudo completar.';
    try { msg = (await (error as { context?: Response }).context?.json())?.error ?? msg; } catch { /* */ }
    throw new Error(msg);
  }
  return data as T;
}
