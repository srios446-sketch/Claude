// Cálculos de la pantalla de Progreso (funciones puras, fáciles de probar).
import { unoRM } from './entreno';
import { diasEntre, inicioSemana, sumarDias } from './fechas';
import { aKg } from './unidades';
import type { UnidadPeso } from './unidades';

export type Rango = '4s' | '8s' | '6m' | 'todo';
export const NOMBRE_RANGO: Record<Rango, string> = { '4s': '4 sem', '8s': '8 sem', '6m': '6 meses', todo: 'Todo' };

export function desdeRango(rango: Rango, hoy: string, primera?: string): string {
  if (rango === '4s') return sumarDias(hoy, -27);
  if (rango === '8s') return sumarDias(hoy, -55);
  if (rango === '6m') return sumarDias(hoy, -181);
  return primera && primera < hoy ? primera : sumarDias(hoy, -55);
}

export interface Punto { fecha: string; valor: number }

/** Promedio de los registros de los últimos `dias` días (incluido el día del punto). */
export function promedioMovil(puntos: Punto[], dias = 7): Punto[] {
  const orden = [...puntos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  return orden.map((p) => {
    const desde = sumarDias(p.fecha, -(dias - 1));
    const ventana = orden.filter((q) => q.fecha >= desde && q.fecha <= p.fecha);
    return { fecha: p.fecha, valor: ventana.reduce((s, q) => s + q.valor, 0) / ventana.length };
  });
}

/** Semanas (lunes) entre dos fechas, inclusive. */
export function semanasEntre(desde: string, hasta: string): string[] {
  const res: string[] = [];
  for (let s = inicioSemana(desde); s <= hasta; s = sumarDias(s, 7)) res.push(s);
  return res;
}

export interface Adherencia { hechos: number; esperados: number; pct: number; porSemana: { semana: string; pct: number }[] }

/** Entrenos hechos contra los días de rutina por semana (máx. 7). */
export function adherenciaEntrenos(fechasSesion: string[], diasPorSemana: number, desde: string, hasta: string): Adherencia {
  const porSemana = semanasEntre(desde, hasta).map((semana) => {
    const ini = semana < desde ? desde : semana;
    const fin = sumarDias(semana, 6) > hasta ? hasta : sumarDias(semana, 6);
    const fraccion = (diasEntre(ini, fin) + 1) / 7;
    const esperados = Math.max(1, Math.round(diasPorSemana * fraccion));
    const hechos = fechasSesion.filter((f) => f >= ini && f <= fin).length;
    return { semana, hechos, esperados };
  });
  const hechos = porSemana.reduce((s, x) => s + Math.min(x.hechos, x.esperados), 0);
  const esperados = porSemana.reduce((s, x) => s + x.esperados, 0);
  return {
    hechos, esperados, pct: esperados ? Math.round((hechos / esperados) * 100) : 0,
    porSemana: porSemana.map((x) => ({ semana: x.semana, pct: Math.round((Math.min(x.hechos, x.esperados) / x.esperados) * 100) })),
  };
}

/** Comidas palomeadas contra las comidas del tipo de día de cada fecha. */
export function adherenciaComidas(
  dias: { fecha: string; hechas: number; total: number }[],
  desde: string,
  hasta: string,
): Adherencia {
  const enRango = dias.filter((d) => d.fecha >= desde && d.fecha <= hasta);
  const hechos = enRango.reduce((s, d) => s + Math.min(d.hechas, d.total), 0);
  const esperados = enRango.reduce((s, d) => s + d.total, 0);
  const porSemana = semanasEntre(desde, hasta).map((semana) => {
    const sem = enRango.filter((d) => d.fecha >= semana && d.fecha < sumarDias(semana, 7));
    const t = sem.reduce((s, d) => s + d.total, 0);
    return { semana, pct: t ? Math.round((sem.reduce((s, d) => s + Math.min(d.hechas, d.total), 0) / t) * 100) : 0 };
  });
  return { hechos, esperados, pct: esperados ? Math.round((hechos / esperados) * 100) : 0, porSemana };
}

export interface SerieFuerza { sesionId: string; fecha: string; creada: number; peso: number | null; unidad: UnidadPeso; reps: number | null; hecha: boolean; tipo: string }
export interface PuntoFuerza { fecha: string; sesionId: string; valorKg: number; peso: number; reps: number; unidad: UnidadPeso; esPR: boolean }

/**
 * Mejor serie de cada sesión. Si el ejercicio tiene series de ≤15 reps se usa el 1RM estimado;
 * si solo se trabaja a reps altas, el mejor peso.
 */
export function progresoFuerza(series: SerieFuerza[]): { metrica: '1rm' | 'peso'; puntos: PuntoFuerza[] } {
  const validas = series.filter((s) => s.hecha && s.peso != null && s.peso > 0 && s.reps != null && s.reps > 0 && s.tipo !== 'calentamiento' && s.tipo !== 'segundos');
  const metrica = validas.some((s) => s.reps! <= 15) ? '1rm' : 'peso';
  const valor = (s: SerieFuerza) => (metrica === '1rm' ? unoRM(aKg(s.peso!, s.unidad), s.reps!) : aKg(s.peso!, s.unidad));
  const porSesion = new Map<string, { s: SerieFuerza; v: number }>();
  for (const s of validas) {
    const v = valor(s);
    if (v == null) continue;
    const previo = porSesion.get(s.sesionId);
    if (!previo || v > previo.v) porSesion.set(s.sesionId, { s, v });
  }
  const orden = [...porSesion.values()].sort((a, b) => a.s.creada - b.s.creada);
  let max = 0;
  const puntos = orden.map(({ s, v }, i) => {
    const esPR = i > 0 && v > max + 0.01;
    max = Math.max(max, v);
    return { fecha: s.fecha, sesionId: s.sesionId, valorKg: v, peso: s.peso!, reps: s.reps!, unidad: s.unidad, esPR };
  });
  return { metrica, puntos };
}

export type ClaveMedida = 'cintura' | 'cadera' | 'pecho' | 'brazo' | 'muslo' | 'pantorrilla';
export const MEDIDAS: { clave: ClaveMedida; nombre: string }[] = [
  { clave: 'cintura', nombre: 'Cintura' }, { clave: 'cadera', nombre: 'Cadera' }, { clave: 'pecho', nombre: 'Pecho' },
  { clave: 'brazo', nombre: 'Brazo' }, { clave: 'muslo', nombre: 'Muslo' }, { clave: 'pantorrilla', nombre: 'Pantorrilla' },
];

/** ¿Un cambio en esta medida va a favor de la meta? +1 bueno, −1 malo, 0 neutral. */
export function sentidoCambio(medida: ClaveMedida | 'grasa' | 'peso', delta: number, objetivo: 'bajar' | 'subir' | 'mantener'): -1 | 0 | 1 {
  if (Math.abs(delta) < 0.05) return 0;
  const bajaEsBueno = ['cintura', 'grasa'].includes(medida) || (objetivo === 'bajar' && ['cadera', 'peso'].includes(medida));
  const subeEsBueno = medida === 'brazo' || (objetivo === 'subir' && ['pecho', 'muslo', 'pantorrilla', 'peso', 'cadera'].includes(medida));
  if (bajaEsBueno) return delta < 0 ? 1 : -1;
  if (subeEsBueno) return delta > 0 ? 1 : -1;
  return 0;
}
