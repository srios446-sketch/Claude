// Lógica del entreno: qué día toca, sugerencia de progresión, 1RM estimado y volumen semanal.
import type { Bloque, Grupo } from './plan';
import { convertir, fmt, type UnidadPeso } from './unidades';
import { diaSemanaIdx, inicioSemana, sumarDias } from './fechas';
import { DIAS_SEMANA } from './plan';

/** 1RM estimado (Epley). Solo es confiable hasta ~15 reps. */
export function unoRM(peso: number, reps: number): number | null {
  if (!(peso > 0) || !(reps > 0) || reps > 15) return null;
  return reps === 1 ? peso : peso * (1 + reps / 30);
}

export interface SerieHecha {
  sesionId: string;
  fecha: string;
  bloque: number;
  tipo: Bloque['tipo'];
  peso: number | null;
  unidad: UnidadPeso;
  reps: number | null;
  hecha: boolean;
  creada: number;
}

export interface Sugerencia {
  tipo: 'subir' | 'repetir' | 'primera' | 'ninguna';
  peso: number | null;
  texto: string;
}

/**
 * Doble progresión: si en la última sesión llegaste al tope del rango de reps en todas las
 * series con tu peso de trabajo, sube; si no, repite ese peso.
 */
export function sugerirPeso(
  bloque: Bloque,
  indiceBloque: number,
  historial: SerieHecha[],      // series de este ejercicio, de cualquier fecha
  unidad: UnidadPeso,
  incremento: { kg: number; lb: number },
): Sugerencia {
  if (!['normal', 'rm'].includes(bloque.tipo) || bloque.reps_min == null || bloque.reps_max == null) {
    return { tipo: 'ninguna', peso: null, texto: '' };
  }
  const hechas = historial.filter((s) => s.hecha && s.peso != null && s.reps != null && s.tipo !== 'calentamiento');
  if (!hechas.length) return { tipo: 'primera', peso: null, texto: `Primera vez: elige un peso con el que llegues a ${bloque.reps_max} reps.` };

  // Última sesión con series de este ejercicio
  const ultimaSesion = hechas.reduce((a, b) => (b.creada > a.creada ? b : a)).sesionId;
  const deSesion = hechas.filter((s) => s.sesionId === ultimaSesion);
  let comparables = deSesion.filter((s) => s.bloque === indiceBloque && s.tipo === bloque.tipo);
  if (!comparables.length) comparables = deSesion.filter((s) => s.tipo === bloque.tipo);
  if (!comparables.length) comparables = deSesion;

  const pesos = comparables.map((s) => convertir(s.peso!, s.unidad, unidad));
  const trabajo = Math.max(...pesos);
  const enTrabajo = comparables.filter((s) => Math.abs(convertir(s.peso!, s.unidad, unidad) - trabajo) < 0.01);
  const todasAlTope = enTrabajo.length > 0 && enTrabajo.every((s) => s.reps! >= bloque.reps_max!);
  const algunaCorta = enTrabajo.some((s) => s.reps! < bloque.reps_min!);
  const inc = incremento[unidad];

  if (todasAlTope) {
    const nuevo = redondearA(trabajo + inc, inc);
    return { tipo: 'subir', peso: nuevo, texto: `Sube a ${fmt(nuevo)} ${unidad}: la vez pasada llegaste a ${bloque.reps_max} reps.` };
  }
  if (algunaCorta) {
    return { tipo: 'repetir', peso: trabajo, texto: `Repite ${fmt(trabajo)} ${unidad} y busca llegar a ${bloque.reps_min} reps en todas.` };
  }
  return { tipo: 'repetir', peso: trabajo, texto: `Repite ${fmt(trabajo)} ${unidad} y busca ${bloque.reps_max} reps en todas.` };
}

function redondearA(valor: number, paso: number): number {
  if (!(paso > 0)) return valor;
  return Math.round(valor / paso) * paso;
}

/** Día que toca: por día de la semana si la rutina los tiene; si no, el siguiente en la rotación. */
export function siguienteDia<D extends { id: string; dia_semana: string | null }>(
  dias: D[],
  ultimaSesionDiaId: string | null,
  hoy: string,
): D {
  const conSemana = dias.filter((d) => d.dia_semana);
  if (conSemana.length) {
    const idx = diaSemanaIdx(hoy);
    for (let k = 0; k < 7; k++) {
      const nombre = DIAS_SEMANA[(idx + k) % 7];
      const d = conSemana.find((x) => x.dia_semana === nombre);
      if (d) return d;
    }
  }
  if (!ultimaSesionDiaId) return dias[0];
  const i = dias.findIndex((d) => d.id === ultimaSesionDiaId);
  return dias[(i + 1) % dias.length] ?? dias[0];
}

/** Series por grupo muscular en la semana: el grupo principal cuenta 1 y los secundarios ½. */
export function volumenSemanal(
  series: { fecha: string; ejercicioId: string; tipo: Bloque['tipo']; hecha: boolean }[],
  gruposDe: (ejercicioId: string) => Grupo[],
  semana: string, // lunes
): Partial<Record<Grupo, number>> {
  const fin = sumarDias(semana, 7);
  const res: Partial<Record<Grupo, number>> = {};
  for (const s of series) {
    if (!s.hecha || s.tipo === 'calentamiento' || s.fecha < semana || s.fecha >= fin) continue;
    gruposDe(s.ejercicioId).forEach((g, i) => { res[g] = (res[g] ?? 0) + (i === 0 ? 1 : 0.5); });
  }
  return res;
}

export { inicioSemana };
