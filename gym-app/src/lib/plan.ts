// Formato "evasof-plan" v2: lo que devuelve la IA al leer el PDF del coach.
// Debe coincidir con importacion/esquema.json.
import { z } from 'zod';

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

const texto = z.string().min(1);
const textoNulo = z.string().nullable();
const num0 = z.number().min(0).nullable();
const entero1 = z.number().int().min(1);
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'usa el formato AAAA-MM-DD').nullable();
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'usa el formato HH:MM (24 h)').nullable();

export const BloqueSchema = z
  .object({
    series: entero1,
    tipo: z.enum(TIPOS_BLOQUE),
    reps_min: num0,
    reps_max: num0,
    secuencia: z.array(z.number().min(0)).min(2).nullable(),
    caidas: z.number().int().min(1).nullable().optional(),
    descanso_intra_seg: z.number().int().min(0).nullable(),
    rir: num0,
    peso_indicado: num0,
    notas: textoNulo,
  })
  .strict()
  .superRefine((b, ctx) => {
    if (['normal', 'rm', 'segundos'].includes(b.tipo)) {
      if (b.reps_min == null) ctx.addIssue({ code: 'custom', path: ['reps_min'], message: `un bloque "${b.tipo}" necesita reps_min` });
      if (b.reps_max == null) ctx.addIssue({ code: 'custom', path: ['reps_max'], message: `un bloque "${b.tipo}" necesita reps_max` });
      if (b.secuencia != null) ctx.addIssue({ code: 'custom', path: ['secuencia'], message: `un bloque "${b.tipo}" no lleva secuencia` });
    }
    if (b.tipo === 'cluster' && b.secuencia == null)
      ctx.addIssue({ code: 'custom', path: ['secuencia'], message: 'un cluster necesita su secuencia (ej. [8, 8, 8])' });
    if (b.reps_min != null && b.reps_max != null && b.reps_min > b.reps_max)
      ctx.addIssue({ code: 'custom', path: ['reps_min'], message: 'reps_min es mayor que reps_max' });
  });
export type Bloque = z.infer<typeof BloqueSchema>;

export const EjercicioSchema = z
  .object({
    orden: entero1,
    nombre: texto,
    alternativas: z.array(texto),
    grupos_musculares: z.array(z.enum(GRUPOS)).min(1),
    bloques: z.array(BloqueSchema).min(1),
    tempo: textoNulo,
    descanso_seg: z.number().int().min(0).nullable(),
    unidad: z.enum(['kg', 'lb']).nullable(),
    grupo: z.string().regex(/^[A-Z]$/, 'debe ser una sola letra mayúscula').nullable(),
    notas: textoNulo,
  })
  .strict();
export type Ejercicio = z.infer<typeof EjercicioSchema>;

export const CardioSchema = z
  .object({
    maquina: texto,
    momento: z.enum(['antes', 'despues', 'separado']).nullable(),
    meta_tipo: z.enum(['tiempo', 'calorias', 'distancia']),
    meta_valor: z.number().positive(),
    inclinacion_pct: num0,
    velocidad: num0,
    velocidad_unidad: z.enum(['km/h', 'mph']).nullable(),
    nivel: num0,
    fc_objetivo: textoNulo,
    notas: textoNulo,
  })
  .strict();
export type Cardio = z.infer<typeof CardioSchema>;

export const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;

export const DiaSchema = z
  .object({
    id: z.string().regex(/^D\d+$/, 'debe ser "D1", "D2"…'),
    nombre: texto,
    dia_semana: z.enum(DIAS_SEMANA).nullable(),
    tipo_dia_dieta: z.string().regex(/^TD\d+$/, 'debe ser "TD1", "TD2"…').nullable(),
    ejercicios: z.array(EjercicioSchema),
    cardio: z.array(CardioSchema),
  })
  .strict();
export type Dia = z.infer<typeof DiaSchema>;

export const RutinaSchema = z
  .object({ nombre: texto, fecha_inicio: fecha, notas_generales: textoNulo, dias: z.array(DiaSchema).min(1) })
  .strict();
export type Rutina = z.infer<typeof RutinaSchema>;

export const UNIDADES_ALIMENTO = ['g', 'ml', 'pieza', 'taza', 'cda', 'cdita', 'scoop', 'rebanada', 'porcion', 'al_gusto'] as const;
const OpcionSchema = z.object({ nombre: texto, cantidad: num0, unidad: z.enum(UNIDADES_ALIMENTO) }).strict();
export const AlimentoSchema = z
  .object({ nombre: texto, cantidad: num0, unidad: z.enum(UNIDADES_ALIMENTO), opciones: z.array(OpcionSchema), notas: textoNulo })
  .strict();
export type Alimento = z.infer<typeof AlimentoSchema>;

export const ComidaSchema = z
  .object({ orden: entero1, nombre: texto, hora, alimentos: z.array(AlimentoSchema), notas: textoNulo })
  .strict();
export type Comida = z.infer<typeof ComidaSchema>;

export const TipoDiaSchema = z
  .object({
    id: z.string().regex(/^TD\d+$/, 'debe ser "TD1", "TD2"…'),
    nombre: texto,
    es_descanso: z.boolean(),
    macros_objetivo: z
      .object({ kcal: num0, proteina_g: num0, carbohidratos_g: num0, grasa_g: num0 })
      .strict()
      .nullable(),
    comidas: z.array(ComidaSchema).min(1),
  })
  .strict();
export type TipoDia = z.infer<typeof TipoDiaSchema>;

export const SuplementoSchema = z
  .object({
    nombre: texto,
    dosis: textoNulo,
    momento: textoNulo,
    hora,
    solo_tipos_dia: z.array(z.string().regex(/^TD\d+$/)).nullable(),
    notas: textoNulo,
  })
  .strict();
export type Suplemento = z.infer<typeof SuplementoSchema>;

export const DietaSchema = z
  .object({
    nombre: texto,
    fecha_inicio: fecha,
    agua_litros: num0,
    notas_generales: textoNulo,
    tipos_dia: z.array(TipoDiaSchema).min(1),
    suplementos: z.array(SuplementoSchema),
  })
  .strict();
export type Dieta = z.infer<typeof DietaSchema>;

export const PlanSchema = z
  .object({
    formato: z.literal('evasof-plan'),
    version: z.literal(2),
    rutina: RutinaSchema.nullable(),
    dieta: DietaSchema.nullable(),
    dudas: z.array(z.string()),
  })
  .strict()
  .refine((p) => p.rutina !== null || p.dieta !== null, { message: 'el plan no trae ni rutina ni dieta' });
export type Plan = z.infer<typeof PlanSchema>;

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
