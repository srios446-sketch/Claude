// Catálogo de ejercicios y guardado de planes importados.
import { db, nuevoId, type DietaGuardada, type EjercicioCatalogo, type RutinaGuardada } from './db';
import type { Dieta, Grupo, Plan, Rutina } from '../lib/plan';
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

/** Crea en el catálogo los ejercicios nuevos y devuelve cómo pasar de nombre a id. (Dentro de una transacción.) */
async function resolverCatalogo(coincidencias: Coincidencia[], decisiones: Decisiones, hoy: string, renombrar = false) {
  const idPorClave = new Map<string, string>();
  for (const c of coincidencias) {
    const d = decisiones[c.clave] ?? 'nuevo';
    if (d !== 'nuevo') {
      idPorClave.set(c.clave, d);
      // En el editor manual, si cambiaste el nombre de un ejercicio y confirmaste que es el mismo, se usa tu nombre nuevo.
      if (renombrar) {
        const existente = await db.ejercicios.get(d);
        if (existente && existente.nombre !== c.nombre) await db.ejercicios.update(d, { nombre: c.nombre, clave: c.clave });
      }
      continue;
    }
    const nuevo: EjercicioCatalogo = { id: nuevoId(), nombre: c.nombre, clave: c.clave, grupos: c.grupos, unidad: c.unidad, creado: hoy };
    await db.ejercicios.add(nuevo);
    idPorClave.set(c.clave, nuevo.id);
  }
  return (nombre: string) => idPorClave.get(claveNombre(nombre))!;
}

function diasConIds(rutina: Rutina, idDe: (n: string) => string) {
  return rutina.dias.map((d) => ({
    ...d,
    ejercicios: d.ejercicios.map((e) => ({ ...e, ejercicioId: idDe(e.nombre), alternativasIds: e.alternativas.map(idDe) })),
  }));
}

/** Guarda los cambios de una rutina existente (editada a mano), sin archivarla. */
export async function actualizarRutina(id: string, rutina: Rutina, coincidencias: Coincidencia[], decisiones: Decisiones, hoy = hoyISO()) {
  return db.transaction('rw', db.ejercicios, db.rutinas, async () => {
    const idDe = await resolverCatalogo(coincidencias, decisiones, hoy, true);
    await db.rutinas.update(id, { nombre: rutina.nombre, notasGenerales: rutina.notas_generales, dias: diasConIds(rutina, idDe) });
  });
}

/** Guarda los cambios de una dieta existente (editada a mano), sin archivarla. */
export async function actualizarDieta(id: string, dieta: Dieta) {
  await db.dietas.update(id, {
    nombre: dieta.nombre, fecha_inicio: dieta.fecha_inicio, agua_litros: dieta.agua_litros,
    notas_generales: dieta.notas_generales, tipos_dia: dieta.tipos_dia, suplementos: dieta.suplementos,
  });
}

/** Guarda el plan: crea/liga ejercicios del catálogo y archiva la rutina/dieta anterior. */
export async function guardarPlan(plan: Plan, coincidencias: Coincidencia[], decisiones: Decisiones, hoy = hoyISO(), renombrar = false) {
  return db.transaction('rw', db.ejercicios, db.rutinas, db.dietas, async () => {
    const idDe = await resolverCatalogo(coincidencias, decisiones, hoy, renombrar);

    let rutinaId: string | null = null, dietaId: string | null = null;
    if (plan.rutina) {
      await db.rutinas.where('activa').equals(1).modify({ activa: 0, fechaFin: hoy });
      const r: RutinaGuardada = {
        id: nuevoId(),
        nombre: plan.rutina.nombre,
        notasGenerales: plan.rutina.notas_generales,
        dias: diasConIds(plan.rutina, idDe),
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
