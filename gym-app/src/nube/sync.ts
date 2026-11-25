// Sincronización local ↔ nube.
// Subida: se compara cada fila local contra el hash de su último estado sincronizado; las que
// cambiaron se suben y las que desaparecieron se suben como borradas. Bajada: se piden los cambios
// del servidor desde el último cursor. Si una fila cambió en los dos lados, gana la local (se sube
// en la siguiente vuelta). Funciona igual tras restaurar un respaldo o borrar datos.
import Dexie from 'dexie';
import { db } from '../db/db';

export const TABLAS_SYNC = {
  perfil: 'id', ejercicios: 'id', rutinas: 'id', dietas: 'id', sesiones: 'id', series: 'id',
  cardio: 'id', registroDieta: 'fecha', metricas: 'id', checkins: 'semana',
} as const;
type TablaSync = keyof typeof TABLAS_SYNC;
const esTablaSync = (t: string): t is TablaSync => t in TABLAS_SYNC;

export interface CambioLocal { tabla: string; id: string; datos: unknown | null; borrado: boolean }
export interface FilaRemota extends CambioLocal { actualizado: string }
export interface Remoto {
  subir(cambios: CambioLocal[]): Promise<void>;
  /** Filas con actualizado > desde, en orden ascendente. */
  bajar(desde: string | null, limite: number): Promise<FilaRemota[]>;
}

const LOTE_SUBIDA = 400, LOTE_BAJADA = 1000, MARGEN_MS = 10_000;

/** JSON con llaves ordenadas (para que el hash no dependa del orden). */
export function jsonEstable(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(jsonEstable).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${jsonEstable(o[k])}`).join(',')}}`;
}

/** cyrb53: hash rápido de 53 bits. */
export function hashTexto(str: string, semilla = 0): string {
  let h1 = 0xdeadbeef ^ semilla, h2 = 0x41c6ce57 ^ semilla;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const hashFila = (f: unknown) => hashTexto(jsonEstable(f));
const claveDe = (tabla: string, id: string) => `${tabla}|${id}`;

export interface ResultadoSync { subidos: number; bajados: number }

export async function sincronizar(remoto: Remoto): Promise<ResultadoSync> {
  // ── 1. Subir ──
  const estado = new Map((await db.syncEstado.toArray()).map((e) => [e.k, e.h]));
  const cambios: CambioLocal[] = [];
  const nuevos: { k: string; h: string }[] = [];
  const borrados: string[] = [];
  const vistos = new Set<string>();
  for (const [tabla, llave] of Object.entries(TABLAS_SYNC)) {
    const filas = (await db.table(tabla).toArray()) as Record<string, unknown>[];
    for (const f of filas) {
      const id = String(f[llave]);
      const k = claveDe(tabla, id);
      vistos.add(k);
      const h = hashFila(f);
      if (estado.get(k) !== h) { cambios.push({ tabla, id, datos: f, borrado: false }); nuevos.push({ k, h }); }
    }
  }
  for (const k of estado.keys()) {
    if (vistos.has(k)) continue;
    const i = k.indexOf('|');
    cambios.push({ tabla: k.slice(0, i), id: k.slice(i + 1), datos: null, borrado: true });
    borrados.push(k);
  }
  for (let i = 0; i < cambios.length; i += LOTE_SUBIDA) await remoto.subir(cambios.slice(i, i + LOTE_SUBIDA));
  if (nuevos.length || borrados.length) {
    await db.transaction('rw', db.syncEstado, async () => {
      await db.syncEstado.bulkPut(nuevos);
      await db.syncEstado.bulkDelete(borrados);
    });
  }

  // ── 2. Bajar ──
  let bajados = 0;
  let cursor = ((await db.meta.get('cursor'))?.v as string | undefined) ?? null;
  for (let vuelta = 0; vuelta < 50; vuelta++) {
    const desde = cursor ? new Date(new Date(cursor).getTime() - MARGEN_MS).toISOString() : null;
    const filas = await remoto.bajar(desde, LOTE_BAJADA);
    if (!filas.length) break;
    bajados += await aplicar(filas);
    const ultimo = filas[filas.length - 1].actualizado;
    const avanzo = !cursor || ultimo > cursor;
    cursor = avanzo ? ultimo : cursor;
    await db.meta.put({ k: 'cursor', v: cursor });
    if (filas.length < LOTE_BAJADA || !avanzo) break;
  }
  return { subidos: cambios.length, bajados };
}

/** Aplica filas del servidor sin pisar cambios locales que aún no se suben. */
async function aplicar(filas: FilaRemota[]): Promise<number> {
  const tablas = [...new Set(filas.map((f) => f.tabla).filter(esTablaSync))];
  let aplicadas = 0;
  await db.transaction('rw', [...tablas.map((t) => db.table(t)), db.syncEstado], async () => {
    for (const f of filas) {
      if (!esTablaSync(f.tabla)) continue;
      const tabla = db.table(f.tabla);
      const k = claveDe(f.tabla, f.id);
      const guardado = (await db.syncEstado.get(k))?.h;
      const local = await tabla.get(f.id);
      const localSinSubir = local ? hashFila(local) !== guardado : guardado !== undefined;
      if (localSinSubir) continue; // gana lo local; se sube en la siguiente vuelta
      if (f.borrado) {
        if (local) { await tabla.delete(f.id); aplicadas++; }
        await db.syncEstado.delete(k);
      } else {
        const h = hashFila(f.datos);
        if (!local || hashFila(local) !== h) { await tabla.put(f.datos); aplicadas++; }
        await db.syncEstado.put({ k, h });
      }
    }
  });
  return aplicadas;
}

/** Borra todo lo local (al cerrar sesión o cambiar de usuario) sin generar borrados en la nube. */
export async function limpiarLocal() {
  const tablas = [...Object.keys(TABLAS_SYNC), 'syncEstado', 'meta'].map((t) => db.table(t));
  await db.transaction('rw', tablas, async () => { for (const t of tablas) await t.clear(); });
}

/** Avisa cuando cambian tablas sincronizables (para subir pronto). */
export function alCambiarDatos(cb: () => void): () => void {
  const manejador = (partes: Record<string, unknown>) => {
    if (Object.keys(partes).some((p) => Object.keys(TABLAS_SYNC).some((t) => p.includes(`/${t}/`)))) cb();
  };
  Dexie.on('storagemutated', manejador);
  return () => Dexie.on('storagemutated').unsubscribe(manejador);
}
