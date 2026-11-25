import { describe, expect, it } from 'vitest';
import { adherenciaComidas, adherenciaEntrenos, promedioMovil, progresoFuerza, sentidoCambio, type SerieFuerza } from './progreso';

describe('promedioMovil', () => {
  it('promedia los últimos 7 días por fecha', () => {
    const r = promedioMovil([
      { fecha: '2026-11-01', valor: 80 }, { fecha: '2026-11-03', valor: 79 }, { fecha: '2026-11-07', valor: 78 }, { fecha: '2026-11-09', valor: 77 },
    ]);
    expect(r.map((p) => p.valor)).toEqual([80, 79.5, 79, 78]);
  });
});

describe('adherencia', () => {
  it('entrenos contra días de rutina por semana', () => {
    // 2 semanas completas (lun 16 – dom 29 nov), rutina de 4 días por semana, 7 sesiones
    const fechas = ['2026-11-16', '2026-11-17', '2026-11-19', '2026-11-21', '2026-11-23', '2026-11-25', '2026-11-27'];
    const a = adherenciaEntrenos(fechas, 4, '2026-11-16', '2026-11-29');
    expect(a).toMatchObject({ hechos: 7, esperados: 8, pct: 88 });
    expect(a.porSemana.map((s) => s.pct)).toEqual([100, 75]);
  });
  it('comidas palomeadas', () => {
    const a = adherenciaComidas([{ fecha: '2026-11-24', hechas: 5, total: 5 }, { fecha: '2026-11-25', hechas: 2, total: 4 }], '2026-11-23', '2026-11-29');
    expect(a).toMatchObject({ hechos: 7, esperados: 9, pct: 78 });
  });
});

describe('progresoFuerza', () => {
  const s = (sesionId: string, creada: number, peso: number, reps: number): SerieFuerza => ({ sesionId, fecha: '2026-11-01', creada, peso, unidad: 'kg', reps, hecha: true, tipo: 'normal' });
  it('toma la mejor serie por sesión y marca récords', () => {
    const r = progresoFuerza([s('a', 1, 80, 8), s('a', 2, 80, 6), s('b', 3, 82.5, 8), s('c', 4, 80, 8)]);
    expect(r.metrica).toBe('1rm');
    expect(r.puntos.map((p) => p.esPR)).toEqual([false, true, false]);
  });
  it('usa el mejor peso si solo hay reps altas', () => {
    const r = progresoFuerza([s('a', 1, 20, 25), s('b', 2, 22, 25)]);
    expect(r.metrica).toBe('peso');
    expect(r.puntos[1]).toMatchObject({ valorKg: 22, esPR: true });
  });
});

describe('sentidoCambio', () => {
  it('cintura abajo es bueno; brazo arriba es bueno', () => {
    expect(sentidoCambio('cintura', -2, 'bajar')).toBe(1);
    expect(sentidoCambio('brazo', 0.5, 'bajar')).toBe(1);
    expect(sentidoCambio('peso', 1, 'bajar')).toBe(-1);
    expect(sentidoCambio('muslo', 0, 'bajar')).toBe(0);
  });
});
