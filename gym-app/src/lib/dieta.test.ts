import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { leerPlan } from './importar';
import { diasPorTipo, elegirTipoDia, listaDelSuper, suplementosDelDia, textoCantidad } from './dieta';

const dieta = leerPlan(readFileSync(new URL('../../importacion/ejemplo-dieta.json', import.meta.url), 'utf8')).plan!.dieta!;

describe('elegirTipoDia', () => {
  it('prioriza lo elegido a mano, luego lo entrenado, luego lo que toca', () => {
    expect(elegirTipoDia(dieta, { manualId: 'TD3', diaHecho: { nombre: 'Día 1', tipo: 'TD2' } }).tipo.id).toBe('TD3');
    expect(elegirTipoDia(dieta, { diaHecho: { nombre: 'Día 1', tipo: 'TD2' }, diaQueToca: { nombre: 'Día 2', tipo: 'TD1' } }).tipo.id).toBe('TD2');
    expect(elegirTipoDia(dieta, { diaQueToca: { nombre: 'Día 2', tipo: 'TD1' } }).motivo).toBe('Hoy te toca Día 2');
    expect(elegirTipoDia(dieta, {}).tipo.id).toBe('TD1');
  });
});

describe('suplementos y súper', () => {
  it('filtra suplementos por tipo de día', () => {
    expect(suplementosDelDia(dieta.suplementos, 'TD3').map((s) => s.nombre)).toEqual(['Creatina', 'Omega 3']);
    expect(suplementosDelDia(dieta.suplementos, 'TD1')).toHaveLength(3);
  });
  it('reparte la semana según los días de la rutina y suma cantidades', () => {
    const dias = diasPorTipo(dieta, ['TD1', 'TD2', 'TD1', 'TD2', null]);
    expect(dias).toEqual({ TD1: 2, TD2: 2, TD3: 3 });
    const lista = listaDelSuper(dieta, dias);
    const huevo = lista.find((r) => r.nombre === 'Huevo entero')!;
    expect(huevo.cantidad).toBe(21); // 3 por día × 7
    const arroz = lista.find((r) => r.nombre === 'Arroz blanco cocido')!;
    expect(arroz.cantidad).toBe(150 * 2 + 200 * 2 + 80 * 3);
    expect(textoCantidad(arroz.cantidad, 'g')).toBe('940 g');
    expect(textoCantidad(1250, 'g')).toBe('1.25 kg');
    expect(textoCantidad(null, 'al_gusto')).toBe('al gusto');
  });
});
