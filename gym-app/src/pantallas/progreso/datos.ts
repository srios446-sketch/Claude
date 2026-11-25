// Consultas para Progreso: reúne de la base local lo que piden las gráficas.
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type DietaGuardada, type Metrica, type RegistroDieta } from '../../db/db';
import { adherenciaComidas, adherenciaEntrenos, promedioMovil, type Adherencia } from '../../lib/progreso';
import { hoyISO, sumarDias } from '../../lib/fechas';

export function useMetricas(): Metrica[] | undefined {
  return useLiveQuery(() => db.metricas.orderBy('fecha').toArray(), []);
}

export interface ResumenPeso { diarios: { fecha: string; valor: number }[]; promedio: { fecha: string; valor: number }[] }
export function resumenPeso(metricas: Metrica[]): ResumenPeso {
  const diarios = metricas.filter((m) => m.pesoKg != null).map((m) => ({ fecha: m.fecha, valor: m.pesoKg! }));
  return { diarios, promedio: promedioMovil(diarios) };
}

export function useAdherencia(desdeRango: string, hasta = hoyISO()): { entrenos: Adherencia; comidas: Adherencia | null } | undefined {
  return useLiveQuery(async () => {
    const rutina = await db.rutinas.where('activa').equals(1).first();
    // No contar semanas antes de que empezaras a usar la app
    const inicios = (await db.rutinas.toArray()).map((r) => r.fechaInicio).concat((await db.dietas.toArray()).map((d) => d.fechaInicioUso));
    const primera = inicios.length ? inicios.sort()[0] : hasta;
    const desde = primera > desdeRango ? primera : desdeRango;
    const sesiones = await db.sesiones.where('fecha').between(desde, hasta, true, true).filter((s) => s.fin !== null).toArray();
    const fechas = [...new Set(sesiones.map((s) => s.fecha))];
    const entrenos = adherenciaEntrenos(fechas, Math.min(7, rutina?.dias.length ?? 4), desde, hasta);
    const dietas = await db.dietas.toArray();
    if (!dietas.length) return { entrenos, comidas: null };
    const registros = await db.registroDieta.where('fecha').between(desde, hasta, true, true).toArray();
    return { entrenos, comidas: adherenciaComidas(diasDieta(dietas, registros, desde, hasta), desde, hasta) };
  }, [desdeRango, hasta]);
}

/** Para cada día con dieta vigente: comidas palomeadas y comidas del tipo de día. */
function diasDieta(dietas: DietaGuardada[], registros: RegistroDieta[], desde: string, hasta: string) {
  const res: { fecha: string; hechas: number; total: number }[] = [];
  const porFecha = new Map(registros.map((r) => [r.fecha, r]));
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    const dieta = dietas.find((d) => d.fechaInicioUso <= f && (d.fechaFin == null || f < d.fechaFin));
    if (!dieta) continue;
    const r = porFecha.get(f);
    const tipo = dieta.tipos_dia.find((t) => t.id === r?.tipoDiaId) ?? dieta.tipos_dia.find((t) => !t.es_descanso) ?? dieta.tipos_dia[0];
    const hechas = r ? tipo.comidas.filter((c) => r.comidas?.[c.orden]).length : 0;
    res.push({ fecha: f, hechas, total: tipo.comidas.length });
  }
  return res;
}
