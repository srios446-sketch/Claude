export type UnidadPeso = 'kg' | 'lb';
export const LB_POR_KG = 2.2046226218;

export function aKg(valor: number, unidad: UnidadPeso): number { return unidad === 'kg' ? valor : valor / LB_POR_KG; }
export function deKg(kg: number, unidad: UnidadPeso): number { return unidad === 'kg' ? kg : kg * LB_POR_KG; }
export function convertir(valor: number, de: UnidadPeso, a: UnidadPeso): number { return de === a ? valor : deKg(aKg(valor, de), a); }

/** Redondea a 1 decimal y quita ".0": 82.5 → "82.5", 80 → "80". */
export function fmt(n: number, dec = 1): string {
  const f = 10 ** dec; const r = Math.round(n * f) / f;
  return r.toLocaleString('es-MX', { maximumFractionDigits: dec });
}
