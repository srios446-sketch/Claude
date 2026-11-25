import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { leerPlan } from '../lib/importar';
import { planearAvisos } from './avisos';
import type { DietaGuardada } from '../db/db';

const plan = leerPlan(readFileSync(new URL('../../importacion/ejemplo-dieta.json', import.meta.url), 'utf8')).plan!;
const dieta = { ...plan.dieta!, id: 'd1', activa: 1, importada: '', fechaInicioUso: '2026-11-01', fechaFin: null, dudas: [] } as DietaGuardada;
const activos = { descanso: true, comidas: true, agua: true };

describe('planearAvisos', () => {
  const ahora = new Date(2026, 10, 25, 12, 0); // 25 nov, 12:00
  it('programa comidas y agua futuras de 7 días, sin las que ya pasaron', () => {
    const { programar } = planearAvisos({ dieta, registros: [], activos, metaAguaMl: 3000, ahora });
    const hoy = programar.filter((a) => a.id.includes('2026-11-25'));
    expect(hoy.map((a) => a.id)).toEqual(['comida-2026-11-25-3', 'comida-2026-11-25-4', 'comida-2026-11-25-5', 'agua-2026-11-25-13', 'agua-2026-11-25-16', 'agua-2026-11-25-19']);
    expect(programar.filter((a) => a.tipo === 'comida')).toHaveLength(3 + 6 * 5);
    expect(new Date(hoy[0].enviar_en).getHours()).toBe(14);
    expect(hoy[0].titulo).toBe('Comida 3 · 14:00');
  });
  it('cancela comidas palomeadas y el agua si ya llegaste a la meta', () => {
    const reg = { fecha: '2026-11-25', dietaId: 'd1', tipoDiaId: 'TD1', tipoManual: false, comidas: { 3: true }, suplementos: {}, aguaMl: 3000 };
    const { programar, cancelar } = planearAvisos({ dieta, registros: [reg], activos, metaAguaMl: 3000, ahora });
    expect(cancelar).toContain('comida-2026-11-25-3');
    expect(cancelar).toEqual(expect.arrayContaining(['agua-2026-11-25-13', 'agua-2026-11-25-16', 'agua-2026-11-25-19']));
    expect(programar.some((a) => a.id === 'comida-2026-11-25-4')).toBe(true);
  });
  it('usa el tipo de día elegido (descanso tiene 4 comidas) y respeta tipos apagados', () => {
    const reg = { fecha: '2026-11-26', dietaId: 'd1', tipoDiaId: 'TD3', tipoManual: true, comidas: {}, suplementos: {}, aguaMl: 0 };
    const r = planearAvisos({ dieta, registros: [reg], activos: { ...activos, agua: false }, metaAguaMl: 3000, ahora });
    expect(r.programar.filter((a) => a.id.startsWith('comida-2026-11-26'))).toHaveLength(4);
    expect(r.programar.some((a) => a.tipo === 'agua')).toBe(false);
    expect(r.cancelar.some((id) => id.startsWith('agua-'))).toBe(true);
  });
});
