// Notificaciones push: suscripción del celular y programación de avisos en el servidor.
// El servidor (pg_cron + función) las manda a la hora exacta, aunque la app esté cerrada.
import { db, obtenerPerfil, type DietaGuardada, type Perfil, type RegistroDieta } from '../db/db';
import { textoCantidad } from '../lib/dieta';
import { hoyISO, sumarDias } from '../lib/fechas';
import { supabase } from './cliente';
import { NUBE, nubeConfigurada } from './config';
import { leerEstado } from './servicio';

export type TipoAviso = 'descanso' | 'comida' | 'agua';
export interface Aviso { id: string; tipo: TipoAviso; enviar_en: string; titulo: string; cuerpo: string; url: string }

export const HORAS_AGUA = ['10:00', '13:00', '16:00', '19:00'];
const DIAS_ADELANTE = 7;

const aISO = (fecha: string, hora: string) => {
  const [y, m, d] = fecha.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
};

/**
 * Avisos de comida y agua para hoy y los próximos días. Devuelve los que deben quedar
 * pendientes y los ids que hay que cancelar (comidas ya palomeadas, meta de agua cumplida,
 * tipos apagados).
 */
export function planearAvisos(opc: {
  dieta: DietaGuardada | null;
  registros: RegistroDieta[];
  activos: Perfil['avisos'];
  metaAguaMl: number;
  ahora: Date;
}): { programar: Aviso[]; cancelar: string[] } {
  const programar: Aviso[] = [], cancelar: string[] = [];
  const hoy = hoyISO(opc.ahora);
  const porFecha = new Map(opc.registros.map((r) => [r.fecha, r]));
  for (let i = 0; i < DIAS_ADELANTE; i++) {
    const fecha = sumarDias(hoy, i);
    const reg = porFecha.get(fecha);
    if (opc.dieta) {
      const tipo = opc.dieta.tipos_dia.find((t) => t.id === reg?.tipoDiaId) ?? opc.dieta.tipos_dia.find((t) => !t.es_descanso) ?? opc.dieta.tipos_dia[0];
      for (const c of tipo.comidas) {
        if (!c.hora) continue;
        const id = `comida-${fecha}-${c.orden}`;
        const cuando = aISO(fecha, c.hora);
        if (new Date(cuando) <= opc.ahora) continue;
        if (!opc.activos.comidas || reg?.comidas?.[c.orden]) { cancelar.push(id); continue; }
        const lista = c.alimentos.slice(0, 3).map((a) => (a.unidad === 'al_gusto' ? a.nombre : `${textoCantidad(a.cantidad, a.unidad)} ${a.nombre.toLowerCase()}`)).join(', ');
        programar.push({ id, tipo: 'comida', enviar_en: cuando, titulo: `${c.nombre} · ${c.hora}`, cuerpo: lista + (c.alimentos.length > 3 ? '…' : ''), url: '/dieta' });
      }
    }
    const metaL = opc.metaAguaMl / 1000;
    for (const h of HORAS_AGUA) {
      const id = `agua-${fecha}-${h.slice(0, 2)}`;
      const cuando = aISO(fecha, h);
      if (new Date(cuando) <= opc.ahora) continue;
      if (!opc.activos.agua || (reg?.aguaMl ?? 0) >= opc.metaAguaMl) { cancelar.push(id); continue; }
      const llevas = (reg?.aguaMl ?? 0) / 1000;
      programar.push({ id, tipo: 'agua', enviar_en: cuando, titulo: 'Hora de tomar agua 💧', cuerpo: fecha === hoy && llevas > 0 ? `Llevas ${llevas.toLocaleString('es-MX')} de ${metaL} L.` : `Tu meta de hoy: ${metaL} L.`, url: '/dieta' });
    }
  }
  return { programar, cancelar };
}

// ── Servidor ──
const conSesion = () => nubeConfigurada && !!leerEstado().sesion;

async function subirAvisos(avisos: Aviso[]) {
  if (!avisos.length) return;
  const uid = leerEstado().sesion!.user.id;
  const { error } = await supabase().from('notificaciones').upsert(
    avisos.map((a) => ({ ...a, usuario_id: uid, estado: 'pendiente', intentos: 0, actualizado: new Date().toISOString() })),
    { onConflict: 'usuario_id,id' },
  );
  if (error) throw new Error(error.message);
}
async function cancelarAvisos(ids: string[]) {
  if (!ids.length) return;
  const uid = leerEstado().sesion!.user.id;
  for (let i = 0; i < ids.length; i += 100) {
    await supabase().from('notificaciones').update({ estado: 'cancelada' }).eq('usuario_id', uid).eq('estado', 'pendiente').in('id', ids.slice(i, i + 100));
  }
}

/** Vuelve a calcular y subir los avisos de comida y agua (al abrir la app y al cambiar la dieta). */
export async function reprogramarAvisos() {
  if (!conSesion() || !navigator.onLine) return;
  const perfil = await obtenerPerfil();
  const dieta = (await db.dietas.where('activa').equals(1).first()) ?? null;
  const hoy = hoyISO();
  const registros = await db.registroDieta.where('fecha').between(hoy, sumarDias(hoy, DIAS_ADELANTE), true, true).toArray();
  const metaAguaMl = (dieta?.agua_litros ?? perfil.metaAguaL) * 1000;
  const { programar, cancelar } = planearAvisos({ dieta, registros, activos: perfil.avisos, metaAguaMl, ahora: new Date() });
  await subirAvisos(programar);
  await cancelarAvisos(cancelar);
}

let pendienteDescanso: Promise<unknown> = Promise.resolve();
/** Aviso de fin de descanso (se reemplaza en cada serie). */
export function programarDescanso(fin: number, etiqueta: string) {
  if (!conSesion()) return;
  pendienteDescanso = pendienteDescanso.then(async () => {
    const perfil = await obtenerPerfil();
    if (!perfil.avisos.descanso) return;
    await subirAvisos([{ id: 'descanso', tipo: 'descanso', enviar_en: new Date(fin).toISOString(), titulo: '¡A darle! ⏱️', cuerpo: `Terminó tu descanso (${etiqueta}).`, url: '/' }]);
  }).catch(() => undefined);
}
export function cancelarDescanso() {
  if (!conSesion()) return;
  pendienteDescanso = pendienteDescanso.then(() => cancelarAvisos(['descanso'])).catch(() => undefined);
}

// ── Suscripción del celular ──
export function esIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
export function instalada() { return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true; }
export function soportaPush() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }

function claveAplicacion(base64: string) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export type EstadoPush = 'activo' | 'inactivo' | 'bloqueado' | 'instalar' | 'no-soportado';
export async function estadoPush(): Promise<EstadoPush> {
  if (esIOS() && !instalada()) return 'instalar';
  if (!soportaPush() || !NUBE.vapid) return 'no-soportado';
  if (Notification.permission === 'denied') return 'bloqueado';
  if (Notification.permission !== 'granted') return 'inactivo';
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ? 'activo' : 'inactivo';
}

/** Pide permiso y registra este celular para recibir avisos. Debe llamarse desde un toque. */
export async function activarPush(): Promise<EstadoPush> {
  if (esIOS() && !instalada()) return 'instalar';
  if (!soportaPush() || !NUBE.vapid) return 'no-soportado';
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return permiso === 'denied' ? 'bloqueado' : 'inactivo';
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveAplicacion(NUBE.vapid) }));
  const j = sub.toJSON();
  const { error } = await supabase().from('suscripciones_push').upsert({ endpoint: sub.endpoint, usuario_id: leerEstado().sesion!.user.id, p256dh: j.keys!.p256dh, auth: j.keys!.auth }, { onConflict: 'endpoint' });
  if (error) throw new Error(error.message);
  await reprogramarAvisos();
  return 'activo';
}

/** Manda un aviso de prueba en 5 segundos. */
export async function probarAviso() {
  await subirAvisos([{ id: `prueba-${Date.now()}`, tipo: 'agua', enviar_en: new Date(Date.now() + 5000).toISOString(), titulo: 'Avisos activados ✅', cuerpo: 'Así te llegarán los avisos de EvaSof.', url: '/perfil' }]);
}

/** Reprograma los avisos al cambiar la dieta, lo palomeado o los ajustes (con una pausa). */
export function iniciarAvisos(): () => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  const programar = () => { clearTimeout(t); t = setTimeout(() => { void reprogramarAvisos().catch(() => undefined); }, 3000); };
  const manejador = (partes: Record<string, unknown>) => {
    if (Object.keys(partes).some((p) => /\/(registroDieta|dietas|perfil)\//.test(p))) programar();
  };
  import('dexie').then(({ default: Dexie }) => Dexie.on('storagemutated', manejador));
  document.addEventListener('visibilitychange', programar);
  programar();
  return () => { clearTimeout(t); document.removeEventListener('visibilitychange', programar); };
}
