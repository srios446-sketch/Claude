import { describe, expect, it } from 'vitest';
import { siguienteDia, sugerirPeso, unoRM, volumenSemanal, type SerieHecha } from './entreno';
import type { Bloque } from './plan';

const bloque = (tipo: Bloque['tipo'], min: number | null, max: number | null): Bloque => ({
  series: 3, tipo, reps_min: min, reps_max: max, secuencia: null, caidas: null, descanso_intra_seg: null, rir: null, peso_indicado: null, notas: null,
});
let t = 0;
const serie = (peso: number, reps: number, sesion = 's1', unidad: 'kg' | 'lb' = 'kg', b = 0): SerieHecha => ({
  sesionId: sesion, fecha: '2026-11-20', bloque: b, tipo: 'normal', peso, unidad, reps, hecha: true, creada: ++t,
});
const inc = { kg: 2.5, lb: 5 };

describe('sugerirPeso (doble progresión)', () => {
  it('sube cuando llegaste al tope en todas', () => {
    const s = sugerirPeso(bloque('normal', 6, 8), 0, [serie(80, 8), serie(80, 8), serie(80, 8)], 'kg', inc);
    expect(s).toMatchObject({ tipo: 'subir', peso: 82.5 });
  });
  it('repite si alguna serie se quedó corta', () => {
    const s = sugerirPeso(bloque('normal', 6, 8), 0, [serie(80, 8), serie(80, 7), serie(80, 5)], 'kg', inc);
    expect(s).toMatchObject({ tipo: 'repetir', peso: 80 });
    expect(s.texto).toMatch(/6 reps/);
  });
  it('usa solo la última sesión', () => {
    const viejas = [serie(70, 8, 'a'), serie(70, 8, 'a')];
    const s = sugerirPeso(bloque('normal', 6, 8), 0, [...viejas, serie(75, 7, 'b'), serie(75, 6, 'b')], 'kg', inc);
    expect(s).toMatchObject({ tipo: 'repetir', peso: 75 });
  });
  it('convierte libras a kilos', () => {
    const s = sugerirPeso(bloque('normal', 10, 12), 0, [serie(100, 12, 's', 'lb'), serie(100, 12, 's', 'lb')], 'kg', inc);
    expect(s.tipo).toBe('subir');
    expect(s.peso).toBe(47.5); // 45.4 kg + 2.5 → redondeado a múltiplo de 2.5
  });
  it('primera vez y técnicas sin sugerencia', () => {
    expect(sugerirPeso(bloque('normal', 8, 10), 0, [], 'kg', inc).tipo).toBe('primera');
    expect(sugerirPeso(bloque('dropset', null, null), 0, [serie(50, 10)], 'kg', inc).tipo).toBe('ninguna');
  });
});

describe('unoRM', () => {
  it('usa Epley y descarta series de muchas reps', () => {
    expect(unoRM(100, 1)).toBe(100);
    expect(unoRM(82.5, 8)).toBeCloseTo(104.5, 1);
    expect(unoRM(40, 20)).toBeNull();
  });
});

describe('siguienteDia', () => {
  const dias = [{ id: 'D1', dia_semana: null }, { id: 'D2', dia_semana: null }, { id: 'D3', dia_semana: null }];
  it('rota en orden', () => {
    expect(siguienteDia(dias, null, '2026-11-25').id).toBe('D1');
    expect(siguienteDia(dias, 'D1', '2026-11-25').id).toBe('D2');
    expect(siguienteDia(dias, 'D3', '2026-11-25').id).toBe('D1');
  });
  it('respeta el día de la semana si lo tiene', () => {
    const fijos = [{ id: 'D1', dia_semana: 'lunes' }, { id: 'D2', dia_semana: 'miercoles' }, { id: 'D3', dia_semana: 'viernes' }];
    expect(siguienteDia(fijos, null, '2026-11-25').id).toBe('D2'); // miércoles
    expect(siguienteDia(fijos, null, '2026-11-26').id).toBe('D3'); // jueves → viernes
  });
});

describe('volumenSemanal', () => {
  it('cuenta 1 al grupo principal y ½ a los secundarios, sin calentamiento', () => {
    const grupos: Record<string, ('espalda' | 'biceps')[]> = { jalon: ['espalda', 'biceps'] };
    const s = [
      { fecha: '2026-11-24', ejercicioId: 'jalon', tipo: 'normal' as const, hecha: true },
      { fecha: '2026-11-24', ejercicioId: 'jalon', tipo: 'normal' as const, hecha: true },
      { fecha: '2026-11-24', ejercicioId: 'jalon', tipo: 'calentamiento' as const, hecha: true },
      { fecha: '2026-11-17', ejercicioId: 'jalon', tipo: 'normal' as const, hecha: true }, // otra semana
    ];
    expect(volumenSemanal(s, (id) => grupos[id], '2026-11-23')).toEqual({ espalda: 2, biceps: 1 });
  });
});
