// Formato "evasof-plan" v2: lo que devuelve la IA al leer el PDF del coach.
// Debe coincidir con importacion/esquema.json.
import type * as E from './esquema';

export const GRUPOS = [
  'pecho', 'espalda', 'hombro', 'trapecio', 'biceps', 'triceps', 'antebrazo', 'abdomen', 'lumbar',
  'cuadriceps', 'femoral', 'gluteo', 'aductores', 'abductores', 'pantorrilla', 'cuerpo_completo',
] as const;
export type Grupo = (typeof GRUPOS)[number];

export const NOMBRE_GRUPO: Record<Grupo, string> = {
  pecho: 'Pecho', espalda: 'Espalda', hombro: 'Hombro', trapecio: 'Trapecio', biceps: 'Bíceps',
  triceps: 'Tríceps', antebrazo: 'Antebrazo', abdomen: 'Abdomen', lumbar: 'Lumbar', cuadriceps: 'Cuádriceps',
  femoral: 'Femoral', gluteo: 'Glúteo', aductores: 'Aductores', abductores: 'Abductores',
  pantorrilla: 'Pantorrilla', cuerpo_completo: 'Cuerpo completo',
};

export const TIPOS_BLOQUE = [
  'normal', 'rm', 'fallo', 'amrap', 'segundos', 'dropset', 'cluster', 'rest_pause', 'myo_reps', 'calentamiento',
] as const;
export type TipoBloque = (typeof TIPOS_BLOQUE)[number];

export const NOMBRE_TIPO: Record<TipoBloque, string> = {
  normal: 'Normal', rm: 'RM', fallo: 'Al fallo', amrap: 'AMRAP', segundos: 'Segundos', dropset: 'Drop set',
  cluster: 'Cluster', rest_pause: 'Rest-pause', myo_reps: 'Myo-reps', calentamiento: 'Calentamiento',
};


export type Bloque = E.Bloque;
export type Ejercicio = E.Ejercicio;
export type Cardio = E.Cardio;
export type Dia = E.Dia;
export type Rutina = E.Rutina;
export type Alimento = E.Alimento;
export type Comida = E.Comida;
export type TipoDia = E.TipoDia;
export type Suplemento = E.Suplemento;
export type Dieta = E.Dieta;
export type Plan = E.Plan;

export const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
export const UNIDADES_ALIMENTO = ['g', 'ml', 'pieza', 'taza', 'cda', 'cdita', 'scoop', 'rebanada', 'porcion', 'al_gusto'] as const;

/** Series efectivas de un ejercicio (sin calentamiento). */
export function seriesEfectivas(ej: Ejercicio): number {
  return ej.bloques.filter((b) => b.tipo !== 'calentamiento').reduce((s, b) => s + b.series, 0);
}

/** Texto corto de un bloque: "3 × 8–10", "2 × drop set 10-12-15", "3 × al fallo". */
export function describirBloque(b: Bloque): string {
  const reps = b.reps_min != null && b.reps_max != null ? (b.reps_min === b.reps_max ? `${b.reps_min}` : `${b.reps_min}–${b.reps_max}`) : null;
  switch (b.tipo) {
    case 'normal': return `${b.series} × ${reps}`;
    case 'rm': return `${b.series} × ${reps} RM`;
    case 'segundos': return `${b.series} × ${reps} s`;
    case 'fallo': return `${b.series} × al fallo${reps ? ` (${reps})` : ''}`;
    case 'amrap': return `${b.series} × AMRAP${reps ? ` (${reps})` : ''}`;
    case 'dropset': return `${b.series} × drop set${b.secuencia ? ` ${b.secuencia.join('-')}` : b.caidas ? ` ${b.caidas === 2 ? 'doble' : b.caidas === 3 ? 'triple' : `${b.caidas} caídas`}` : ''}`;
    case 'cluster': return `${b.series} × cluster ${b.secuencia?.join('-') ?? ''}`.trim();
    case 'rest_pause': return `${b.series} × rest-pause${reps ? ` ${reps}` : ''}`;
    case 'myo_reps': return `${b.series} × myo-reps${reps ? ` ${reps}` : ''}`;
    case 'calentamiento': return `${b.series} × calentamiento${reps ? ` ${reps}` : ''}`;
  }
}
