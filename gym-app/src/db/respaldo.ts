// Respaldo completo de los datos locales, unir ejercicios del catálogo y reactivar planes.
import { db } from './db';
import { hoyISO } from '../lib/fechas';

const TABLAS = ['perfil', 'ejercicios', 'rutinas', 'dietas', 'sesiones', 'series', 'cardio', 'registroDieta', 'metricas', 'checkins'] as const;
type Tabla = (typeof TABLAS)[number];

export interface Respaldo { app: 'evasof'; version: 1; creado: string; tablas: Record<Tabla, unknown[]> }

export async function crearRespaldo(): Promise<Respaldo> {
  const tablas = {} as Record<Tabla, unknown[]>;
  for (const t of TABLAS) tablas[t] = await db.table(t).toArray();
  return { app: 'evasof', version: 1, creado: new Date().toISOString(), tablas };
}

export async function descargarRespaldo() {
  const r = await crearRespaldo();
  const blob = new Blob([JSON.stringify(r)], { type: 'application/json' });
  const archivo = new File([blob], `evasof-respaldo-${hoyISO()}.json`, { type: 'application/json' });
  if (navigator.canShare?.({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: 'Respaldo de EvaSof' }); return; } catch { /* cancelado: descargar */ }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(archivo); a.download = archivo.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Reemplaza todos los datos por los del respaldo. Lanza un Error con mensaje en español si no es válido. */
export async function restaurarRespaldo(texto: string) {
  let r: Respaldo;
  try { r = JSON.parse(texto); } catch { throw new Error('El archivo no es un respaldo válido.'); }
  if (r?.app !== 'evasof' || r.version !== 1 || typeof r.tablas !== 'object') throw new Error('El archivo no es un respaldo de esta app.');
  await db.transaction('rw', TABLAS.map((t) => db.table(t)), async () => {
    for (const t of TABLAS) {
      await db.table(t).clear();
      const filas = r.tablas[t];
      if (Array.isArray(filas) && filas.length) await db.table(t).bulkPut(filas);
    }
  });
}

export async function borrarTodo() {
  await db.transaction('rw', TABLAS.map((t) => db.table(t)), async () => { for (const t of TABLAS) await db.table(t).clear(); });
}

/** Une `origenId` dentro de `destinoId`: mueve su historial y sus apariciones en rutinas, y lo borra. */
export async function unirEjercicios(origenId: string, destinoId: string) {
  if (origenId === destinoId) return;
  await db.transaction('rw', db.ejercicios, db.series, db.rutinas, async () => {
    await db.series.where('ejercicioId').equals(origenId).modify({ ejercicioId: destinoId });
    await db.series.filter((s) => s.planEjercicioId === origenId).modify({ planEjercicioId: destinoId });
    await db.rutinas.toCollection().modify((r) => {
      for (const d of r.dias) for (const e of d.ejercicios) {
        if (e.ejercicioId === origenId) e.ejercicioId = destinoId;
        e.alternativasIds = e.alternativasIds.map((x) => (x === origenId ? destinoId : x));
      }
    });
    await db.ejercicios.delete(origenId);
  });
}

/** Vuelve a activar una rutina o dieta del historial (archiva la actual). */
export async function activarPlan(tipo: 'rutina' | 'dieta', id: string) {
  const hoy = hoyISO();
  if (tipo === 'rutina') {
    await db.transaction('rw', db.rutinas, async () => {
      await db.rutinas.where('activa').equals(1).modify({ activa: 0, fechaFin: hoy });
      await db.rutinas.update(id, { activa: 1, fechaFin: null, fechaInicio: hoy });
    });
  } else {
    await db.transaction('rw', db.dietas, async () => {
      await db.dietas.where('activa').equals(1).modify({ activa: 0, fechaFin: hoy });
      await db.dietas.update(id, { activa: 1, fechaFin: null, fechaInicioUso: hoy });
    });
  }
}
