import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { leerPlan, limpiarTexto, detectarSeparados, unirConAnterior } from './importar';
import { seriesEfectivas } from './plan';

const ejemplo = readFileSync(new URL('../../importacion/ejemplo.json', import.meta.url), 'utf8');

describe('limpiarTexto', () => {
  it('quita las comillas de bloque y el texto alrededor', () => {
    const t = 'Aquí está tu plan:\n```json\n{"a": 1}\n```\n¡Éxito!';
    expect(limpiarTexto(t)).toBe('{"a": 1}');
  });
  it('une dos respuestas partidas', () => {
    const t = '```json\n{"a": [1,\n```\n```json\n2]}\n```';
    expect(JSON.parse(limpiarTexto(t))).toEqual({ a: [1, 2] });
  });
});

describe('leerPlan', () => {
  it('acepta el ejemplo del prompt', () => {
    const r = leerPlan(ejemplo);
    expect(r.errores).toEqual([]);
    expect(r.plan?.rutina?.dias).toHaveLength(2);
  });
  it('avisa cuando el JSON viene cortado', () => {
    const r = leerPlan(ejemplo.slice(0, 900));
    expect(r.errores[0]).toMatch(/incompleto|no es un JSON válido/);
  });
  it('rechaza la versión 1', () => {
    const r = leerPlan(ejemplo.replace('"version": 2', '"version": 1'));
    expect(r.errores[0]).toMatch(/versión 1/);
  });
  it('explica el error con el nombre del ejercicio', () => {
    const r = leerPlan(ejemplo.replace('"tipo": "rm"', '"tipo": "RM"'));
    expect(r.plan).toBeNull();
    expect(r.errores.join('\n')).toMatch(/Jalón en supinación.*bloque 3.*tipo/);
  });
  it('vuelve a poner letras cuando dos biseries usan la misma', () => {
    const p = JSON.parse(ejemplo);
    const d = p.rutina.dias[0];
    const copia = (n: string, orden: number) => ({ ...structuredClone(d.ejercicios[1]), nombre: n, orden, grupo: 'A' });
    // como en la rutina real: otra biserie "A" separada por un ejercicio suelto
    d.ejercicios.push({ ...copia('Pájaros en máquina', 4), grupo: null }, copia('Curl de bíceps', 5), copia('Fondos', 6));
    const r = leerPlan(JSON.stringify(p));
    const grupos = r.plan!.rutina!.dias[0].ejercicios.map((e) => e.grupo);
    expect(grupos).toEqual([null, 'A', 'A', null, 'B', 'B']);
    expect(r.correcciones.some((c) => c.includes('biserie A a la B'))).toBe(true);
  });
  it('detecta un cluster separado y lo une al ejercicio anterior', () => {
    const p = JSON.parse(ejemplo);
    const d = p.rutina.dias[1];
    const cluster = d.ejercicios[0].bloques.pop();
    d.ejercicios.push({ ...structuredClone(d.ejercicios[0]), orden: 2, nombre: 'Press militar - cluster set', alternativas: [], bloques: [cluster] });
    const r = leerPlan(JSON.stringify(p));
    const sep = detectarSeparados(r.plan!);
    expect(sep).toHaveLength(1);
    const unido = unirConAnterior(r.plan!, sep[0].diaId, sep[0].orden);
    const ej = unido.rutina!.dias[1].ejercicios;
    expect(ej).toHaveLength(1);
    expect(ej[0].bloques.map((b) => b.tipo)).toEqual(['normal', 'cluster']);
  });
});

// Prueba opcional con una rutina real (no se sube al repositorio): EVASOF_RUTINA=/ruta/al.json npm test
const real = process.env.EVASOF_RUTINA;
describe.runIf(real && existsSync(real))('rutina real', () => {
  it('se lee completa y sin errores', () => {
    const r = leerPlan(readFileSync(real!, 'utf8'));
    expect(r.errores).toEqual([]);
    const dias = r.plan!.rutina!.dias;
    const total = dias.reduce((s, d) => s + d.ejercicios.length, 0);
    console.log(`rutina real: ${dias.length} días, ${total} ejercicios, ${dias.reduce((s, d) => s + d.ejercicios.reduce((x, e) => x + seriesEfectivas(e), 0), 0)} series; correcciones: ${r.correcciones.length}, avisos: ${r.avisos.length}`);
  });
});
