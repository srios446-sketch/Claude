import { describe, expect, it } from 'vitest';
import { claveNombre, similitud } from './texto';

describe('claveNombre', () => {
  it('quita acentos, mayúsculas, relleno y plurales', () => {
    expect(claveNombre('Elevaciones laterales en polea baja')).toBe('elevacion lateral polea baja');
    expect(claveNombre('ELEVACIÓN LATERAL EN POLEA BAJA')).toBe('elevacion lateral polea baja');
    expect(claveNombre('Pájaros en máquina')).toBe('pajaro maquina');
  });
});

describe('similitud', () => {
  it('reconoce el mismo ejercicio con una palabra de más', () => {
    expect(similitud('Elevaciones laterales en polea baja unilateral', 'Elevaciones laterales en polea baja')).toBeGreaterThan(0.8);
  });
  it('detecta parecidos para preguntar', () => {
    expect(similitud('Hip thrust', 'Hip thrust con barra libre')).toBeGreaterThanOrEqual(0.6);
    expect(similitud('Elevation con disco', 'Elevación con disco')).toBeGreaterThanOrEqual(0.6);
  });
  it('no confunde ejercicios distintos', () => {
    expect(similitud('Sentadilla hack', 'Sentadilla búlgara con mancuernas')).toBeLessThan(0.6);
    expect(similitud('Press militar', 'Remo con barra')).toBeLessThan(0.6);
  });
});
