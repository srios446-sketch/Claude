// Lógica de la dieta: qué tipo de día toca, suplementos del día y lista del súper.
import type { Alimento, Dieta, Suplemento, TipoDia } from './plan';

export interface Eleccion { tipo: TipoDia; motivo: string }

/**
 * Tipo de día de dieta para hoy:
 * 1) el que elegiste a mano; 2) el del entreno que hiciste hoy; 3) el del día que te toca entrenar;
 * 4) si la rutina no lo liga: un solo tipo → ese; si no, el primero que no sea de descanso.
 */
export function elegirTipoDia(
  dieta: Pick<Dieta, 'tipos_dia'>,
  opciones: { manualId?: string | null; diaHecho?: { nombre: string; tipo: string | null } | null; diaQueToca?: { nombre: string; tipo: string | null } | null },
): Eleccion {
  const porId = (id: string | null | undefined) => (id ? dieta.tipos_dia.find((t) => t.id === id) : undefined);
  const manual = porId(opciones.manualId);
  if (manual) return { tipo: manual, motivo: 'Elegido por ti' };
  const hecho = porId(opciones.diaHecho?.tipo);
  if (hecho) return { tipo: hecho, motivo: `Entrenaste ${opciones.diaHecho!.nombre}` };
  const toca = porId(opciones.diaQueToca?.tipo);
  if (toca) return { tipo: toca, motivo: `Hoy te toca ${opciones.diaQueToca!.nombre}` };
  if (dieta.tipos_dia.length === 1) return { tipo: dieta.tipos_dia[0], motivo: 'Tu dieta es igual todos los días' };
  const entreno = dieta.tipos_dia.find((t) => !t.es_descanso) ?? dieta.tipos_dia[0];
  return { tipo: entreno, motivo: 'Automático' };
}

export function suplementosDelDia(suplementos: Suplemento[], tipoId: string): Suplemento[] {
  return suplementos.filter((s) => !s.solo_tipos_dia || s.solo_tipos_dia.includes(tipoId));
}

/** Cuántos días de cada tipo hay en una semana, según cómo la rutina liga sus días a la dieta. */
export function diasPorTipo(dieta: Pick<Dieta, 'tipos_dia'>, ligas: (string | null)[]): Record<string, number> {
  const res: Record<string, number> = {};
  const validos = ligas.filter((x): x is string => !!x && dieta.tipos_dia.some((t) => t.id === x));
  if (!validos.length) {
    const t = dieta.tipos_dia.find((x) => !x.es_descanso) ?? dieta.tipos_dia[0];
    res[t.id] = 7;
    return res;
  }
  for (const id of validos.slice(0, 7)) res[id] = (res[id] ?? 0) + 1;
  const descanso = dieta.tipos_dia.find((t) => t.es_descanso);
  const resto = 7 - Math.min(7, validos.length);
  if (resto > 0) {
    const id = descanso?.id ?? validos[0];
    res[id] = (res[id] ?? 0) + resto;
  }
  return res;
}

export interface Renglon { nombre: string; unidad: Alimento['unidad']; cantidad: number | null }

/** Suma la primera opción de cada alimento para la cantidad de días de cada tipo. */
export function listaDelSuper(dieta: Pick<Dieta, 'tipos_dia'>, dias: Record<string, number>): Renglon[] {
  const mapa = new Map<string, Renglon>();
  for (const t of dieta.tipos_dia) {
    const n = dias[t.id] ?? 0;
    if (!n) continue;
    for (const c of t.comidas) {
      for (const a of c.alimentos) {
        const clave = `${a.nombre.toLowerCase()}|${a.unidad}`;
        const r = mapa.get(clave) ?? { nombre: a.nombre, unidad: a.unidad, cantidad: a.cantidad == null ? null : 0 };
        if (r.cantidad != null && a.cantidad != null) r.cantidad += a.cantidad * n;
        mapa.set(clave, r);
      }
    }
  }
  return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function textoCantidad(cantidad: number | null, unidad: Alimento['unidad']): string {
  if (unidad === 'al_gusto' || cantidad == null) return 'al gusto';
  const n = Math.round(cantidad * 100) / 100;
  const u: Record<Alimento['unidad'], [string, string]> = {
    g: ['g', 'g'], ml: ['ml', 'ml'], pieza: ['pieza', 'piezas'], taza: ['taza', 'tazas'], cda: ['cda', 'cdas'],
    cdita: ['cdita', 'cditas'], scoop: ['scoop', 'scoops'], rebanada: ['rebanada', 'rebanadas'], porcion: ['porción', 'porciones'], al_gusto: ['', ''],
  };
  if (unidad === 'g' && n >= 1000) return `${(n / 1000).toLocaleString('es-MX', { maximumFractionDigits: 2 })} kg`;
  if (unidad === 'ml' && n >= 1000) return `${(n / 1000).toLocaleString('es-MX', { maximumFractionDigits: 2 })} L`;
  return `${n.toLocaleString('es-MX')} ${n === 1 ? u[unidad][0] : u[unidad][1]}`;
}
