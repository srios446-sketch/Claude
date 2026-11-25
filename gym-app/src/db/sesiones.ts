// Sesiones de entreno: iniciar, registrar series, terminar y resumir.
import { db, nuevoId, type CardioRegistrado, type RutinaGuardada, type SerieRegistrada, type Sesion } from './db';
import { hoyISO } from '../lib/fechas';
import { unoRM } from '../lib/entreno';
import { aKg } from '../lib/unidades';

export async function iniciarSesion(rutina: RutinaGuardada, diaId: string): Promise<Sesion> {
  const s: Sesion = { id: nuevoId(), fecha: hoyISO(), rutinaId: rutina.id, diaId, inicio: Date.now(), fin: null, notas: '' };
  await db.sesiones.add(s);
  return s;
}

export async function sesionAbierta() {
  return (await db.sesiones.filter((s) => s.fin === null).first()) ?? null;
}

export type DatosSerie = Omit<SerieRegistrada, 'id' | 'creada'>;

/** Crea o actualiza la serie (identificada por sesión + ejercicio del día + bloque + serie). */
export async function guardarSerie(datos: DatosSerie): Promise<SerieRegistrada> {
  const existentes = await db.series.where('sesionId').equals(datos.sesionId).toArray();
  const previa = existentes.find((x) => x.orden === datos.orden && x.bloque === datos.bloque && x.serie === datos.serie);
  const registro: SerieRegistrada = { ...datos, id: previa?.id ?? nuevoId(), creada: previa?.creada ?? Date.now() };
  await db.series.put(registro);
  return registro;
}

/** Cambia el ejercicio realizado (sustitución) en todas las series ya registradas de ese ejercicio del día. */
export async function cambiarEjercicioEnSesion(sesionId: string, orden: number, ejercicioId: string) {
  await db.series.where('sesionId').equals(sesionId).filter((s) => s.orden === orden).modify({ ejercicioId });
}

export async function guardarCardio(c: Omit<CardioRegistrado, 'id'>) {
  const previo = await db.cardio.where('sesionId').equals(c.sesionId).filter((x) => x.indice === c.indice).first();
  await db.cardio.put({ ...c, id: previo?.id ?? nuevoId() });
}

export async function terminarSesion(id: string, notas: string) {
  await db.sesiones.update(id, { fin: Date.now(), notas });
}

export async function cancelarSesion(id: string) {
  await db.transaction('rw', db.sesiones, db.series, db.cardio, async () => {
    await db.series.where('sesionId').equals(id).delete();
    await db.cardio.where('sesionId').equals(id).delete();
    await db.sesiones.delete(id);
  });
}

export interface Resumen {
  minutos: number;
  series: number;
  ejercicios: number;
  volumenKg: number;
  prs: { ejercicioId: string; unoRMKg: number; antesKg: number; peso: number; reps: number; unidad: 'kg' | 'lb' }[];
}

/** Resumen de una sesión, con los récords (1RM estimado) que superan todo lo anterior. */
export async function resumenSesion(sesion: Sesion): Promise<Resumen> {
  const series = (await db.series.where('sesionId').equals(sesion.id).toArray()).filter((s) => s.hecha && s.tipo !== 'calentamiento');
  const ejercicios = new Set(series.map((s) => s.orden));
  let volumenKg = 0;
  for (const s of series) if (s.peso != null && s.reps != null && s.tipo !== 'segundos') volumenKg += aKg(s.peso, s.unidad) * s.reps;

  const prs: Resumen['prs'] = [];
  for (const ejercicioId of new Set(series.map((s) => s.ejercicioId))) {
    const mejor = series
      .filter((s) => s.ejercicioId === ejercicioId && s.peso != null && s.reps != null && s.tipo !== 'segundos')
      .map((s) => ({ s, rm: unoRM(aKg(s.peso!, s.unidad), s.reps!) }))
      .filter((x) => x.rm != null)
      .sort((a, b) => b.rm! - a.rm!)[0];
    if (!mejor) continue;
    const anteriores = await db.series.where('ejercicioId').equals(ejercicioId).filter((s) => s.sesionId !== sesion.id && s.creada < sesion.inicio && s.hecha).toArray();
    const antes = Math.max(0, ...anteriores.map((s) => (s.peso != null && s.reps != null ? unoRM(aKg(s.peso, s.unidad), s.reps) ?? 0 : 0)));
    if (antes > 0 && mejor.rm! > antes + 0.01) {
      prs.push({ ejercicioId, unoRMKg: mejor.rm!, antesKg: antes, peso: mejor.s.peso!, reps: mejor.s.reps!, unidad: mejor.s.unidad });
    }
  }
  return {
    minutos: Math.round(((sesion.fin ?? Date.now()) - sesion.inicio) / 60000),
    series: series.length,
    ejercicios: ejercicios.size,
    volumenKg,
    prs,
  };
}
