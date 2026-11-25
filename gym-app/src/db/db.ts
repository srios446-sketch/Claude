// Base de datos local (IndexedDB vía Dexie). Todo funciona sin internet; la
// sincronización con la nube se agrega encima más adelante.
import Dexie, { type EntityTable } from 'dexie';
import type { Bloque, Cardio, Dia, Dieta, Ejercicio, Grupo } from '../lib/plan';
import type { UnidadPeso } from '../lib/unidades';

export interface Perfil {
  id: 'yo';
  nombre: string;
  unidadPeso: UnidadPeso;
  unidadMedida: 'cm' | 'in';
  campos: { rir: boolean; tempo: boolean; descanso: boolean };
  descansoDefectoSeg: number;
  incremento: { kg: number; lb: number };
  rangosSeries: Partial<Record<Grupo, [number, number]>>;
  objetivo: 'bajar' | 'subir' | 'mantener';
  metaAguaL: number;
  avisos: { descanso: boolean; comidas: boolean; agua: boolean };
}

/** Ejercicio del catálogo personal: todas las rutinas apuntan aquí para que el historial no se parta. */
export interface EjercicioCatalogo {
  id: string;
  nombre: string;
  clave: string;
  grupos: Grupo[];
  unidad: UnidadPeso | null;
  creado: string;
}

export interface EjercicioPlan extends Ejercicio {
  ejercicioId: string;          // catálogo
  alternativasIds: string[];    // catálogo, mismo orden que `alternativas`
}
export interface DiaPlan extends Omit<Dia, 'ejercicios'> { ejercicios: EjercicioPlan[] }

export interface RutinaGuardada {
  id: string;
  nombre: string;
  notasGenerales: string | null;
  dias: DiaPlan[];
  activa: 0 | 1;
  importada: string;            // fecha ISO de importación
  fechaInicio: string;
  fechaFin: string | null;
  dudas: string[];
}

export interface DietaGuardada extends Dieta {
  id: string;
  activa: 0 | 1;
  importada: string;
  fechaInicioUso: string;
  fechaFin: string | null;
  dudas: string[];
}

export interface Sesion {
  id: string;
  fecha: string;                // AAAA-MM-DD
  rutinaId: string;
  diaId: string;
  inicio: number;               // epoch ms
  fin: number | null;
  notas: string;
}

/** Una serie registrada. Para drop sets / clusters, `partes` guarda cada caída o mini-serie. */
export interface SerieRegistrada {
  id: string;
  sesionId: string;
  fecha: string;
  ejercicioId: string;          // lo que realmente se hizo (catálogo)
  planEjercicioId: string;      // lo que decía la rutina (catálogo)
  diaId: string;
  orden: number;                // orden del ejercicio en el día
  bloque: number;               // índice del bloque
  serie: number;                // índice de la serie dentro del bloque
  tipo: Bloque['tipo'];
  peso: number | null;
  unidad: UnidadPeso;
  reps: number | null;          // reps (o segundos si tipo = segundos)
  partes: { peso: number | null; reps: number | null }[] | null;
  rir: number | null;
  tempo: string | null;
  descansoSeg: number | null;
  hecha: boolean;
  creada: number;
}

export interface CardioRegistrado {
  id: string;
  sesionId: string;
  fecha: string;
  indice: number;
  plan: Cardio;
  minutos: number | null;
  calorias: number | null;
  distanciaKm: number | null;
  inclinacion: number | null;
  velocidad: number | null;
  nivel: number | null;
  fcPromedio: number | null;
  hecho: boolean;
}

export interface RegistroDieta {
  fecha: string;                // clave
  dietaId: string;
  tipoDiaId: string;
  tipoManual: boolean;
  comidas: Record<number, boolean>;     // orden → cumplida
  suplementos: Record<string, boolean>; // nombre → tomado
  aguaMl: number;
}

export interface Metrica {
  id: string;
  fecha: string;
  pesoKg: number | null;
  grasaPct: number | null;
  medidasCm: Partial<Record<'cintura' | 'cadera' | 'pecho' | 'brazo' | 'muslo' | 'pantorrilla', number>>;
}

export interface CheckIn {
  semana: string;               // lunes de la semana (clave)
  energia: number;
  sueno: number;
  hambre: number;
  estres: number;
  notas: string;
  actualizado: number;
}

/** Hash del último estado sincronizado de cada fila (clave "tabla|id"). */
export interface EstadoSync { k: string; h: string }
export interface Meta { k: string; v: unknown }

class BaseLocal extends Dexie {
  perfil!: EntityTable<Perfil, 'id'>;
  ejercicios!: EntityTable<EjercicioCatalogo, 'id'>;
  rutinas!: EntityTable<RutinaGuardada, 'id'>;
  dietas!: EntityTable<DietaGuardada, 'id'>;
  sesiones!: EntityTable<Sesion, 'id'>;
  series!: EntityTable<SerieRegistrada, 'id'>;
  cardio!: EntityTable<CardioRegistrado, 'id'>;
  registroDieta!: EntityTable<RegistroDieta, 'fecha'>;
  metricas!: EntityTable<Metrica, 'id'>;
  checkins!: EntityTable<CheckIn, 'semana'>;
  syncEstado!: EntityTable<EstadoSync, 'k'>;
  meta!: EntityTable<Meta, 'k'>;

  constructor(nombre = 'evasof') {
    super(nombre);
    this.version(1).stores({
      perfil: 'id',
      ejercicios: 'id, clave',
      rutinas: 'id, activa, importada',
      dietas: 'id, activa, importada',
      sesiones: 'id, fecha, [rutinaId+diaId], inicio',
      series: 'id, sesionId, fecha, ejercicioId, [ejercicioId+fecha]',
      cardio: 'id, sesionId, fecha',
      registroDieta: 'fecha',
      metricas: 'id, fecha',
      checkins: 'semana',
    });
    this.version(2).stores({ syncEstado: 'k', meta: 'k' });
  }
}

export const db = new BaseLocal();

export function nuevoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const RANGOS_SERIES_DEFECTO: Record<Grupo, [number, number]> = {
  pecho: [10, 20], espalda: [10, 20], hombro: [8, 16], trapecio: [4, 12], biceps: [8, 14], triceps: [8, 14],
  antebrazo: [4, 10], abdomen: [6, 16], lumbar: [0, 8], cuadriceps: [10, 20], femoral: [8, 16], gluteo: [10, 20],
  aductores: [4, 10], abductores: [4, 12], pantorrilla: [8, 16], cuerpo_completo: [0, 20],
};

export const PERFIL_DEFECTO: Perfil = {
  id: 'yo',
  nombre: '',
  unidadPeso: 'kg',
  unidadMedida: 'cm',
  campos: { rir: false, tempo: false, descanso: false },
  descansoDefectoSeg: 90,
  incremento: { kg: 2.5, lb: 5 },
  rangosSeries: {},
  objetivo: 'bajar',
  metaAguaL: 3,
  avisos: { descanso: true, comidas: true, agua: true },
};

export async function obtenerPerfil(): Promise<Perfil> {
  return { ...PERFIL_DEFECTO, ...(await db.perfil.get('yo')) };
}

export async function actualizarPerfil(cambios: Partial<Omit<Perfil, 'id'>>) {
  const actual = await obtenerPerfil();
  await db.perfil.put({ ...actual, ...cambios, id: 'yo' });
}
