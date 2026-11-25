import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { db } from '../../db/db';
import { actualizarRutina, buscarCoincidencias, decisionesPorDefecto, guardarPlan, rutinaActiva } from '../../db/catalogo';
import { leerPlan } from '../../lib/importar';
import { bloqueNuevo, comoPlan, dietaNueva, ejercicioNuevo, limpiarDieta, limpiarRutina, rutinaABorrador, rutinaNueva, siguienteId } from './borrador';

const ejemplo = readFileSync(new URL('../../../importacion/ejemplo.json', import.meta.url), 'utf8');
beforeEach(async () => { await db.delete(); await db.open(); });

describe('borrador', () => {
  it('siguienteId no reutiliza ids (el historial apunta a ellos)', () => {
    expect(siguienteId('D', ['D1', 'D2', 'D5'])).toBe('D6');
    expect(siguienteId('TD', [])).toBe('TD1');
  });
  it('una rutina capturada a mano pasa la validación del formato', () => {
    const r = rutinaNueva();
    r.nombre = '  Mi rutina ';
    const e = ejercicioNuevo(1);
    e.nombre = 'Sentadilla hack'; e.grupos_musculares = ['cuadriceps', 'gluteo'];
    e.bloques = [bloqueNuevo('normal'), { ...bloqueNuevo('dropset'), series: 1, secuencia: [10, 12, 15] }];
    e.alternativas = ['Sentadilla libre', ' '];
    r.dias[0].ejercicios.push(e);
    const lectura = leerPlan(JSON.stringify(comoPlan({ rutina: limpiarRutina(r) })));
    expect(lectura.errores).toEqual([]);
    expect(lectura.plan!.rutina!.nombre).toBe('Mi rutina');
    expect(lectura.plan!.rutina!.dias[0].ejercicios[0].alternativas).toEqual(['Sentadilla libre']);
  });
  it('avisa lo que falta con mensajes claros', () => {
    const r = rutinaNueva();
    r.dias[0].ejercicios.push(ejercicioNuevo(1)); // sin nombre ni grupos
    const lectura = leerPlan(JSON.stringify(comoPlan({ rutina: limpiarRutina(r) })));
    expect(lectura.plan).toBeNull();
    expect(lectura.errores).toContain('Rutina: falta el nombre');
    expect(lectura.errores).toContain('Rutina › D1 › ejercicio 1: falta el nombre');
    expect(lectura.errores).toContain('Rutina › D1 › ejercicio 1: falta al menos un grupo muscular');
  });
  it('una dieta a mano: quita alimentos vacíos y valida horas', () => {
    const d = dietaNueva();
    d.nombre = 'Mi dieta';
    d.tipos_dia[0].comidas[0].hora = '07:30';
    d.tipos_dia[0].comidas[0].alimentos = [{ nombre: 'Avena', cantidad: 60, unidad: 'g', opciones: [{ nombre: '', cantidad: null, unidad: 'g' }], notas: null }, { nombre: ' ', cantidad: null, unidad: 'g', opciones: [], notas: null }];
    const lectura = leerPlan(JSON.stringify(comoPlan({ dieta: limpiarDieta(d) })));
    expect(lectura.errores).toEqual([]);
    expect(lectura.plan!.dieta!.tipos_dia[0].comidas[0].alimentos).toHaveLength(1);
    expect(lectura.plan!.dieta!.tipos_dia[0].macros_objetivo).toBeNull();
  });
});

describe('editar la rutina actual', () => {
  it('guarda en la misma rutina y conserva los ejercicios del catálogo', async () => {
    const p = leerPlan(ejemplo).plan!;
    const cs = await buscarCoincidencias(p);
    await guardarPlan(p, cs, decisionesPorDefecto(cs));
    const antes = (await rutinaActiva())!;
    const borrador = rutinaABorrador(antes);
    borrador.nombre = 'Rutina editada';
    borrador.dias[0].ejercicios[0].bloques[0].reps_min = 12;
    const lectura = leerPlan(JSON.stringify(comoPlan({ rutina: limpiarRutina(borrador) })));
    const cs2 = await buscarCoincidencias(lectura.plan!);
    await actualizarRutina(antes.id, lectura.plan!.rutina!, cs2, decisionesPorDefecto(cs2));
    const despues = (await rutinaActiva())!;
    expect(despues.id).toBe(antes.id);
    expect(await db.rutinas.count()).toBe(1);
    expect(despues.nombre).toBe('Rutina editada');
    expect(despues.dias[0].ejercicios[0].ejercicioId).toBe(antes.dias[0].ejercicios[0].ejercicioId);
    expect(await db.ejercicios.count()).toBe(6);
  });
});
