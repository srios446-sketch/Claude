// Catálogo de ejercicios y guardado de planes importados.
import { db, nuevoId, type DietaGuardada, type EjercicioCatalogo, type RutinaGuardada } from './db';
import type { Grupo, Plan } from '../lib/plan';
import { claveNombre, similitud } from '../lib/texto';
import { hoyISO } from '../lib/fechas';
import type { UnidadPeso } from '../lib/unidades';

export const UMBRAL_PARECIDO = 0.6;

export interface Coincidencia {
  clave: string;
  nombre: string;                       // como viene en el plan
  grupos: Grupo[];
  unidad: UnidadPeso | null;
  estado: 'exacta' | 'parecida' | 'nueva';
  candidato: EjercicioCatalogo | null;  // mejor coincidencia del catálogo
  parecido: number;
}

/** Nombres únicos del plan (ejercicios y alternativas), comparados con el catálogo. */
export async function buscarCoincidencias(plan: Plan, catalogo?: EjercicioCatalogo[]): Promise<Coincidencia[]> {
  const cat = catalogo ?? (await db.ejercicios.toArray());
  const porClave = new Map<string, Coincidencia>();
  const agregar = (nombre: string, grupos: Grupo[], unidad: UnidadPeso | null) => {
    const clave = claveNombre(nombre);
    if (!clave || porClave.has(clave)) return;
    let mejor: EjercicioCatalogo | null = null, valor = 0;
    for (const c of cat) {
      const s = c.clave === clave ? 1 : similitud(nombre, c.nombre);
      if (s > valor) { valor = s; mejor = c; }
    }
    const estado = valor >= 0.999 ? 'exacta' : valor >= UMBRAL_PARECIDO ? 'parecida' : 'nueva';
    porClave.set(clave, { clave, nombre, grupos, unidad, estado, candidato: estado === 'nueva' ? null : mejor, parecido: valor });
  };
  for (const d of plan.rutina?.dias ?? []) {
    for (const e of d.ejercicios) {
      agregar(e.nombre, e.grupos_musculares, e.unidad);
      for (const a of e.alternativas) agregar(a, e.grupos_musculares, e.unidad);
    }
  }
  return [...porClave.values()];
}

/** Decisión por clave: id de un ejercicio del catálogo, o 'nuevo'. */
export type Decisiones = Record<string, string | 'nuevo'>;

export function decisionesPorDefecto(cs: Coincidencia[]): Decisiones {
  return Object.fromEntries(cs.map((c) => [c.clave, c.estado === 'nueva' ? 'nuevo' : c.candidato!.id]));
}

/** Guarda el plan: crea/liga ejercicios del catálogo y archiva la rutina/dieta anterior. */
export async function guardarPlan(plan: Plan, coincidencias: Coincidencia[], decisiones: Decisiones, hoy = hoyISO()) {
  return db.transaction('rw', db.ejercicios, db.rutinas, db.dietas, async () => {
    const idPorClave = new Map<string, string>();
    for (const c of coincidencias) {
      const d = decisiones[c.clave] ?? 'nuevo';
      if (d !== 'nuevo') { idPorClave.set(c.clave, d); continue; }
      const nuevo: EjercicioCatalogo = { id: nuevoId(), nombre: c.nombre, clave: c.clave, grupos: c.grupos, unidad: c.unidad, creado: hoy };
      await db.ejercicios.add(nuevo);
      idPorClave.set(c.clave, nuevo.id);
    }
    const idDe = (nombre: string) => idPorClave.get(claveNombre(nombre))!;

    let rutinaId: string | null = null, dietaId: string | null = null;
    if (plan.rutina) {
      await db.rutinas.where('activa').equals(1).modify({ activa: 0, fechaFin: hoy });
      const r: RutinaGuardada = {
        id: nuevoId(),
        nombre: plan.rutina.nombre,
        notasGenerales: plan.rutina.notas_generales,
        dias: plan.rutina.dias.map((d) => ({
          ...d,
          ejercicios: d.ejercicios.map((e) => ({ ...e, ejercicioId: idDe(e.nombre), alternativasIds: e.alternativas.map(idDe) })),
        })),
        activa: 1,
        importada: new Date().toISOString(),
        fechaInicio: plan.rutina.fecha_inicio ?? hoy,
        fechaFin: null,
        dudas: plan.dudas,
      };
      await db.rutinas.add(r);
      rutinaId = r.id;
    }
    if (plan.dieta) {
      await db.dietas.where('activa').equals(1).modify({ activa: 0, fechaFin: hoy });
      const dg: DietaGuardada = {
        ...plan.dieta,
        id: nuevoId(),
        activa: 1,
        importada: new Date().toISOString(),
        fechaInicioUso: plan.dieta.fecha_inicio ?? hoy,
        fechaFin: null,
        dudas: plan.dudas,
      };
      await db.dietas.add(dg);
      dietaId = dg.id;
    }
    return { rutinaId, dietaId };
  });
}

export async function rutinaActiva() { return db.rutinas.where('activa').equals(1).first(); }
export async function dietaActiva() { return db.dietas.where('activa').equals(1).first(); }
