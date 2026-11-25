import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { db, nuevoId } from './db';
import { buscarCoincidencias, decisionesPorDefecto, guardarPlan, rutinaActiva } from './catalogo';
import { activarPlan, crearRespaldo, restaurarRespaldo, unirEjercicios } from './respaldo';
import { leerPlan } from '../lib/importar';

const ejemplo = readFileSync(new URL('../../importacion/ejemplo.json', import.meta.url), 'utf8');

async function importar(texto: string, hoy: string) {
  const plan = leerPlan(texto).plan!;
  const cs = await buscarCoincidencias(plan);
  await guardarPlan(plan, cs, decisionesPorDefecto(cs), hoy);
}
const serie = (ejercicioId: string, sesionId: string) => ({
  id: nuevoId(), sesionId, fecha: '2026-11-20', ejercicioId, planEjercicioId: ejercicioId, diaId: 'D1', orden: 1, bloque: 0, serie: 0,
  tipo: 'normal' as const, peso: 50, unidad: 'kg' as const, reps: 10, partes: null, rir: null, tempo: null, descansoSeg: null, hecha: true, creada: 1,
});

beforeEach(async () => { await db.delete(); await db.open(); });

describe('respaldo', () => {
  it('exporta y restaura todo', async () => {
    await importar(ejemplo, '2026-11-01');
    await db.metricas.add({ id: 'm1', fecha: '2026-11-02', pesoKg: 70, grasaPct: null, medidasCm: {} });
    const r = await crearRespaldo();
    await db.delete(); await db.open();
    expect(await db.rutinas.count()).toBe(0);
    await restaurarRespaldo(JSON.stringify(r));
    expect(await db.rutinas.count()).toBe(1);
    expect((await db.metricas.get('m1'))?.pesoKg).toBe(70);
  });
  it('rechaza archivos que no son respaldos', async () => {
    await expect(restaurarRespaldo('{"hola": 1}')).rejects.toThrow(/no es un respaldo/);
  });
});

describe('unirEjercicios', () => {
  it('mueve el historial y las referencias de la rutina', async () => {
    await importar(ejemplo, '2026-11-01');
    const [a, b] = (await rutinaActiva())!.dias[0].ejercicios.map((e) => e.ejercicioId);
    await db.series.bulkAdd([serie(a, 's1'), serie(b, 's1'), serie(b, 's2')]);
    await unirEjercicios(b, a);
    expect(await db.series.where('ejercicioId').equals(a).count()).toBe(3);
    expect(await db.ejercicios.get(b)).toBeUndefined();
    expect((await rutinaActiva())!.dias[0].ejercicios[1].ejercicioId).toBe(a);
  });
});

describe('activarPlan', () => {
  it('reactiva una rutina anterior y archiva la actual', async () => {
    await importar(ejemplo, '2026-10-01');
    const vieja = (await rutinaActiva())!.id;
    await importar(ejemplo.replace('"Rutina noviembre"', '"Rutina diciembre"'), '2026-11-01');
    await activarPlan('rutina', vieja);
    expect((await rutinaActiva())!.id).toBe(vieja);
    expect(await db.rutinas.where('activa').equals(1).count()).toBe(1);
  });
});
