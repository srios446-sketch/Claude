import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { db } from './db';
import { buscarCoincidencias, decisionesPorDefecto, guardarPlan, rutinaActiva } from './catalogo';
import { leerPlan } from '../lib/importar';

const ejemplo = readFileSync(new URL('../../importacion/ejemplo.json', import.meta.url), 'utf8');

beforeEach(async () => { await db.delete(); await db.open(); });

describe('importar al catálogo', () => {
  it('crea los ejercicios y la rutina activa', async () => {
    const plan = leerPlan(ejemplo).plan!;
    const cs = await buscarCoincidencias(plan);
    expect(cs.every((c) => c.estado === 'nueva')).toBe(true);
    await guardarPlan(plan, cs, decisionesPorDefecto(cs));
    // 3 del día 1 + Press militar y sus 2 alternativas
    expect(await db.ejercicios.count()).toBe(6);
    const r = await rutinaActiva();
    expect(r?.dias[0].ejercicios[0].ejercicioId).toBeTruthy();
  });

  it('una rutina nueva con nombres un poco distintos se liga a los mismos ejercicios y archiva la anterior', async () => {
    const p1 = leerPlan(ejemplo).plan!;
    const c1 = await buscarCoincidencias(p1);
    await guardarPlan(p1, c1, decisionesPorDefecto(c1), '2026-10-01');
    const idJalon = (await rutinaActiva())!.dias[0].ejercicios[0].ejercicioId;

    const p2 = leerPlan(ejemplo.replace('"Jalón en supinación"', '"JALON EN SUPINACIÓN"').replace('"Pullover"', '"Pullover en polea alta"')).plan!;
    const c2 = await buscarCoincidencias(p2);
    expect(c2.find((c) => c.nombre === 'JALON EN SUPINACIÓN')?.estado).toBe('exacta');
    expect(c2.find((c) => c.nombre === 'Pullover en polea alta')?.estado).toBe('parecida');
    await guardarPlan(p2, c2, decisionesPorDefecto(c2), '2026-11-01');

    const activa = (await rutinaActiva())!;
    expect(activa.dias[0].ejercicios[0].ejercicioId).toBe(idJalon);
    expect(await db.rutinas.count()).toBe(2);
    const vieja = (await db.rutinas.where('activa').equals(0).first())!;
    expect(vieja.fechaFin).toBe('2026-11-01');
    expect(await db.ejercicios.count()).toBe(6); // no se duplicó nada
  });
});
